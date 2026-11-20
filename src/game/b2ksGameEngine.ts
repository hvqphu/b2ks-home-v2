import confetti from 'canvas-confetti';
import {
  ActivityConfigId,
  ActivityConfigItem,
  ActivityLogEntry,
  ActiveReactModal,
  B2KSBridge,
  B2KSState,
  BgmThemeId,
  BuildingLayoutOverride,
  CrossWorldRequest,
  EnglishQuestion,
  FleaMarketListing,
  Member,
  NavDestination,
  OtherFamilySummary,
  OwnedPet,
  PetStage,
  SoccerOnlineRoom,
  SoccerPlayerInput,
  TaskItem,
  WeatherInfo
} from '../types/b2ks';
import {
  ACTIVITY_RULES,
  BGM_THEME_OPTIONS,
  DAILY_PARENT_ALLOWANCE,
  DEFAULT_ACTIVITY_CONFIGS,
  DEFAULT_CROSS_WORLD_ITEMS,
  DEFAULT_ENGLISH_BANK,
  DEFAULT_FIREBASE_URL,
  DEFAULT_MEMBER_AGES,
  DINING_FOOD_PUZZLES,
  ENGLISH_WORDS,
  FASHION_CATALOG,
  HAIR_COLORS,
  HAIR_STYLES_VISUAL,
  HOUSE_WORLD,
  LEGACY_VOUCHERS,
  MAX_PARENT_POINTS,
  NEIGHBORHOOD_LOCATIONS,
  PANTS_VISUAL_OPTIONS,
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SHOP_POS,
  PET_SPECIES,
  PET_VARIANT_DEFS,
  PLOTS,
  PRIVATE_ROOM_WORLD,
  ROOM_DECOR_SLOTS,
  SHIRT_VISUAL_OPTIONS,
  SHOP_CATALOG,
  SOCCER_PITCH_POS,
  STREET_WORLD,
  formatFamilyBrand,
  getFamilyFirebaseRoot,
  normalizeFamilySlug,
  resolveNeighborhoodLocations
} from './constants';
import {
  buildLabSVGMarkup,
  getLabItemCanvasImage,
  isValidEnglishLabPrompt,
  LAB_SIZE_TIERS,
  LabSizeTier,
  parsePromptToLabSpec,
  RANDOM_LAB_IDEAS
} from './inventionLab';
import {
  computePetStageFromXp,
  drawCompanionPetOnContext,
  getMemberPetBonuses,
  getNextStageRequirement,
  getPetAccessoryDef,
  getPetFoodDef,
  getPetLevelFromXp,
  getPetSpecies,
  getPetStageBadgeLabel,
  getPetVariantDef,
  renderPetArtSVG,
  rollPetHatchTraits
} from './petSystem';
import {
  renderFashionItemPreviewMini,
  renderHairIconSVG,
  renderItemIllustrationSVG,
  renderPantsIconSVG,
  renderShirtIconSVG
} from './svgHelpers';
import {
  drawDetailedChibiOnContext,
  drawHouseInteriorWorld,
  drawNeighborhoodMinimap,
  drawNeighborhoodWorld,
  drawPrivateRoomWorld,
  HouseRoomDef,
  LightingInfo,
  StreetCar
} from './worldRenderer';
import { ARCADE_GAME_CATALOG, createArcadeEngine } from './arcadeEngine';
import { createSoccerMiniGame } from './soccerGame';
import { fetchLiveWeatherInfo, getCachedWeatherInfo } from './weatherService';

let initialized = false;

export function initB2KSGameEngine() {
  if (initialized) return;
  initialized = true;

  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number | number[] = 0) {
      const radius = Array.isArray(r) ? (r[0] || 0) : r;
      const rad = Math.max(0, Math.min(radius, Math.abs(w) / 2, Math.abs(h) / 2));
      this.moveTo(x + rad, y);
      this.arcTo(x + w, y, x + w, y + h, rad);
      this.arcTo(x + w, y + h, x, y + h, rad);
      this.arcTo(x, y + h, x, y, rad);
      this.arcTo(x, y, x + w, y, rad);
      this.closePath();
      return this;
    };
  }

  const subscribers = new Set<() => void>();
  const notifySubscribers = () => {
    subscribers.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener error
      }
    });
  };

  /* ==================== 1. AUDIO ENGINE & CONFETTI & SPEECH ==================== */
  const AudioEngine = {
    ctx: null as AudioContext | null,
    isMuted: localStorage.getItem('b2ks_bgm_muted') === '1',
    themeId: (localStorage.getItem('b2ks_bgm_theme') as BgmThemeId) || 'sunny_town',
    bgmTimer: null as number | null,
    noteIndex: 0,
    getActiveTheme() {
      return BGM_THEME_OPTIONS.find((t) => t.id === this.themeId) || BGM_THEME_OPTIONS[0];
    },
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.startBGM();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    setTheme(nextThemeId: BgmThemeId) {
      const valid = BGM_THEME_OPTIONS.find((t) => t.id === nextThemeId);
      if (!valid) return;
      this.themeId = valid.id;
      this.noteIndex = 0;
      localStorage.setItem('b2ks_bgm_theme', valid.id);
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      if (this.ctx) this.startBGM();
    },
    toggleMute(): boolean {
      this.init();
      this.isMuted = !this.isMuted;
      localStorage.setItem('b2ks_bgm_muted', this.isMuted ? '1' : '0');
      const btn = document.getElementById('audio-toggle-btn');
      if (btn) btn.innerText = this.isMuted ? '🔇 Tắt' : '🔊 Nhạc';
      return this.isMuted;
    },
    playTone(freq: number, type: OscillatorType = 'sine', duration = 0.1, vol = 0.08) {
      if (this.isMuted || !this.ctx || freq <= 0) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch {
        // ignore audio context error
      }
    },
    playClick() {
      this.playTone(580, 'sine', 0.06, 0.05);
    },
    playCoin() {
      this.playTone(987.77, 'square', 0.08, 0.06);
      setTimeout(() => this.playTone(1318.51, 'square', 0.18, 0.06), 70);
    },
    playSuccess() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.07), i * 85);
      });
    },
    playError() {
      this.playTone(180, 'sawtooth', 0.22, 0.08);
    },
    startBGM() {
      if (this.bgmTimer) {
        clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
      const theme = this.getActiveTheme();
      this.bgmTimer = window.setInterval(() => {
        if (!this.isMuted && this.ctx && this.ctx.state === 'running' && isGameUnlocked) {
          const t = this.getActiveTheme();
          const idx = this.noteIndex % t.melody.length;
          const freq = t.melody[idx];
          const bassFreq = t.bass[idx % t.bass.length] || 0;
          this.playTone(freq, t.oscType, Math.min(0.28, (t.stepMs / 1000) * 0.72), t.oscType === 'square' ? 0.012 : 0.022);
          if (bassFreq > 0) {
            this.playTone(bassFreq, t.bassType, Math.min(0.32, (t.stepMs / 1000) * 0.8), 0.012);
          }
          this.noteIndex++;
        }
      }, theme.stepMs);
    }
  };

  function triggerConfetti() {
    try {
      confetti({
        particleCount: 85,
        spread: 72,
        origin: { y: 0.62 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 55,
          origin: { x: 0.15, y: 0.7 }
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 55,
          origin: { x: 0.85, y: 0.7 }
        });
      }, 220);
    } catch {
      // ignore confetti fail in headless environment
    }
  }

  function speakEnglish(text: string, rate = 0.85) {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const cleanText = String(text).replace(/_+/g, 'blank');
      const utter = new SpeechSynthesisUtterance(cleanText);
      utter.lang = 'en-US';
      utter.rate = rate;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utter.voice = enVoice;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis unsupported
    }
  }

  /* ==================== 2. LIGHTING & FORMATTERS ==================== */
  function getRealTimeLighting(): LightingInfo {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (h >= 5 && h < 7) {
      return { phase: 'dawn', label: `🌅 ${timeStr}`, skyTop: '#F39C12', skyBottom: '#FAD7A0', overlayAlpha: 0.15, overlayColor: 'rgba(243, 156, 18, 0.16)', isNight: false };
    }
    if (h >= 7 && h < 17) {
      return { phase: 'day', label: `☀️ ${timeStr}`, skyTop: '#5DADE2', skyBottom: '#D6EAF8', overlayAlpha: 0, overlayColor: 'rgba(0,0,0,0)', isNight: false };
    }
    if (h >= 17 && h < 19) {
      return { phase: 'sunset', label: `🌇 ${timeStr}`, skyTop: '#8E44AD', skyBottom: '#E67E22', overlayAlpha: 0.24, overlayColor: 'rgba(142, 68, 173, 0.24)', isNight: true };
    }
    return { phase: 'night', label: `🌙 ${timeStr}`, skyTop: '#0B132B', skyBottom: '#1C2541', overlayAlpha: 0.45, overlayColor: 'rgba(11, 19, 43, 0.46)', isNight: true };
  }

  function formatTimestamp(ts?: number | null): string {
    if (!ts) return '';
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${hh}:${mm} - ${day}/${mon}/${d.getFullYear()}`;
  }

  function escapeHtml(str: string): string {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ==================== 3. STATE & STORAGE & NAMESPACE ISOLATION ==================== */
  let zoomLevel = 1.0;
  let wardrobeOpenedRoomId: string | null = null;
  let activePrivateRoomId: string | null = null;
  let selectedRoomSlotId: string | null = null;
  let pendingBagDeleteKey: string | null = null;
  let isGameUnlocked = false;
  let hasHydratedRemote = false;
  let hasLocalSaveFile = false;
  let currentWeather: WeatherInfo | null = getCachedWeatherInfo();
  const livePosTimestamps = new Map<string, number>();
  let lastSavedPointsMap: Record<string, number> = {};

  let deviceConfig: { currentMemberId: string; isLockedToMember: boolean; firebaseUrl: string; lastFamilyName?: string } = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('b2ks_v16_device') || 'null');
      if (parsed) {
        if (!parsed.firebaseUrl) parsed.firebaseUrl = DEFAULT_FIREBASE_URL;
        return parsed;
      }
    } catch {
      // ignore
    }
    return { currentMemberId: 'dad', isLockedToMember: false, firebaseUrl: DEFAULT_FIREBASE_URL, lastFamilyName: 'B2KS' };
  })();

  function saveDeviceConfig() {
    localStorage.setItem('b2ks_v16_device', JSON.stringify(deviceConfig));
  }

  const LAST_FAMILY_KEY = 'b2ks_last_login_family_v1';
  const LEGACY_STORAGE_KEY = 'b2ks_daily_routines_rpg_v16';

  function getActiveFamilySlug(overrideName?: string): string {
    return normalizeFamilySlug(overrideName ?? state?.familyName ?? localStorage.getItem(LAST_FAMILY_KEY) ?? 'B2KS');
  }

  function getFamilyStorageKey(overrideName?: string): string {
    const slug = getActiveFamilySlug(overrideName);
    return slug === 'b2ks' ? LEGACY_STORAGE_KEY : `b2ks_state_${slug}`;
  }

  function getFirebaseBasePath(overrideName?: string): string {
    return getFamilyFirebaseRoot(overrideName ?? state?.familyName ?? 'B2KS');
  }

  function getPointsLedgerKey(overrideName?: string): string {
    return `b2ks_points_ledger_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function getDurableSecretsKey(overrideName?: string): string {
    return `b2ks_durable_secrets_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function getMemberArchiveKey(overrideName?: string): string {
    return `b2ks_member_archive_v1_${getActiveFamilySlug(overrideName)}`;
  }

  function createFreshDefaultState(familyDisplayName = 'B2KS'): B2KSState {
    const cleanName = (familyDisplayName || 'B2KS').trim() || 'B2KS';
    const storedPin = localStorage.getItem('b2ks_parent_pin');
    const validPin = storedPin && storedPin.length >= 4 && storedPin !== '1111' ? storedPin : '1234';
    return {
      currentUserId: deviceConfig.currentMemberId || 'dad',
      familyName: cleanName,
      familyNameUpdatedAt: 0,
      gamePassword: '1111',
      gamePasswordUpdatedAt: 0,
      parentPin: validPin,
      parentPinUpdatedAt: parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10),
      bgmTheme: AudioEngine.themeId || 'sunny_town',
      buildingLayouts: {},
      buildingLayoutsUpdatedAt: 0,
      updatedAt: 0,
      familyMessages: [],
      house: { plotIndex: 1, style: 'modern' },
      members: [
        {
          id: 'dad', name: 'Bố', role: 'Bố', age: DEFAULT_MEMBER_AGES.dad, points: 200, pointsUpdatedAt: 0,
          hairStyle: 'short', hairColor: '#2C3E50',
          shirtColor: '#2980B9', shirtPattern: 'collar',
          pantsColor: '#34495E', pantsStyle: 'pants',
          outfit: '', inventory: ['d_pc'], vouchers: [], petAccessories: [],
          roomUnlocked: false, roomWall: '#D6EAF8',
          roomDecor: [{ id: 'd_pc', icon: '💻', x: 650, y: 470 }],
          unlockedZooAnimals: [], englishQuizHistory: [],
          scene: 'neighborhood', x: 860, y: 435, dir: 'down', speech: null
        },
        {
          id: 'mom', name: 'Mẹ', role: 'Mẹ', age: DEFAULT_MEMBER_AGES.mom, points: 200, pointsUpdatedAt: 0,
          hairStyle: 'long', hairColor: '#5D4037',
          shirtColor: '#E91E63', shirtPattern: 'heart',
          pantsColor: '#8E44AD', pantsStyle: 'skirt',
          outfit: '', inventory: ['d_plant'], vouchers: [], petAccessories: [],
          roomUnlocked: true, roomWall: '#FADBD8',
          roomDecor: [{ id: 'd_plant', icon: '🪴', x: 960, y: 470 }],
          unlockedZooAnimals: [], englishQuizHistory: [],
          scene: 'neighborhood', x: 815, y: 445, dir: 'down', speech: null
        },
        {
          id: 'kid1', name: 'Kem', role: 'Con gái', age: DEFAULT_MEMBER_AGES.kid1, points: 40, pointsUpdatedAt: 0,
          hairStyle: 'pigtails', hairColor: '#4E342E',
          shirtColor: '#F39C12', shirtPattern: 'star',
          pantsColor: '#C0392B', pantsStyle: 'skirt',
          outfit: '', inventory: [], vouchers: [], petAccessories: [],
          roomUnlocked: false, roomWall: '#FADBD8',
          roomDecor: [],
          unlockedZooAnimals: [], englishQuizHistory: [],
          scene: 'neighborhood', x: 905, y: 445, dir: 'left', speech: null
        },
        {
          id: 'kid2', name: 'Sóc', role: 'Con trai', age: DEFAULT_MEMBER_AGES.kid2, points: 40, pointsUpdatedAt: 0,
          hairStyle: 'spiky', hairColor: '#1A252F',
          shirtColor: '#27AE60', shirtPattern: 'stripe',
          pantsColor: '#1F618D', pantsStyle: 'shorts',
          outfit: '', inventory: [], vouchers: [], petAccessories: [],
          roomUnlocked: false, roomWall: '#D5F5E3',
          roomDecor: [{ id: 'd_bear', icon: '🧸', x: 860, y: 230 }],
          unlockedZooAnimals: [], englishQuizHistory: [],
          scene: 'neighborhood', x: 945, y: 445, dir: 'left', speech: null
        }
      ],
      tasks: [
        {
          id: 1, type: 'chore', title: 'Dọn dẹp đồ chơi phòng khách',
          creatorId: 'mom', assigneeId: 'kid1', reward: 15,
          status: 'pending', createdAt: Date.now() - 3600000, completedAt: null,
          parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
        },
        {
          id: 2, type: 'homework', title: 'Viết 3 câu tiếng Anh về ngôi nhà của em',
          creatorId: 'dad', assigneeId: 'kid2', reward: 25,
          status: 'pending', createdAt: Date.now() - 1800000, completedAt: null,
          parentFile: null, parentFileName: '', childFile: null, childFileName: '', childNote: '', grade: null
        }
      ],
      crossWorldItems: DEFAULT_CROSS_WORLD_ITEMS.map((x) => ({ ...x })),
      crossWorldRequests: [],
      fleaMarketListings: [],
      activityLogs: [],
      englishQuestions: DEFAULT_ENGLISH_BANK.map((q) => ({ ...q })),
      activityConfigs: { ...DEFAULT_ACTIVITY_CONFIGS },
      activityConfigsUpdatedAt: 0,
      chatHistory: [
        { sender: 'Hệ thống', text: `Chào mừng gia đình ${cleanName}! Hãy gõ tiếng Anh để hiện bong bóng thoại và nhận +2⭐!`, isEng: false, ts: Date.now() }
      ],
      lastDailyReset: new Date().toDateString()
    };
  }

  let state: B2KSState = createFreshDefaultState(localStorage.getItem(LAST_FAMILY_KEY) || deviceConfig.lastFamilyName || 'B2KS');

  function getCurrentUser(): Member {
    return state.members.find((m) => m.id === state.currentUserId) || state.members[0];
  }

  function isParent(member: Member): boolean {
    return member.role === 'Bố' || member.role === 'Mẹ';
  }

  function getRoleEmoji(role: string): string {
    if (role === 'Bố') return '👨';
    if (role === 'Mẹ') return '👩';
    if (role === 'Con trai') return '👦';
    return '👧';
  }

  function ensureMemberProps(m: Member & { activityLogs?: Record<string, { date: string; count: number; lastAt: number }> }) {
    if (!Array.isArray(m.inventory)) m.inventory = [];
    if (!Array.isArray(m.vouchers)) m.vouchers = [];
    if (!Array.isArray(m.roomDecor)) m.roomDecor = [];
    if (!Array.isArray(m.customLabItems)) m.customLabItems = [];
    if (!Array.isArray(m.unlockedZooAnimals)) m.unlockedZooAnimals = [];
    if (!Array.isArray(m.englishQuizHistory)) m.englishQuizHistory = [];
    if (!Array.isArray(m.pets)) m.pets = [];
    m.pets.forEach((p) => {
      if (!p.variant) p.variant = 'classic';
      if (!p.gender) p.gender = 'female';
      if (p.accessoryId === undefined) p.accessoryId = null;
      p.xp = Math.max(0, Number(p.xp) || 0);
      p.hatchProgress = Math.max(0, Math.min(100, Number(p.hatchProgress) || 0));
      if (p.hatched) {
        const sp = getPetSpecies(p.speciesId);
        p.level = Math.max(1, Number(p.level) || 1, getPetLevelFromXp(p.xp));
        p.stage = Math.max(1, Number(p.stage) || 1, computePetStageFromXp(sp, p.xp, true)) as PetStage;
      } else {
        p.stage = 0;
        p.level = Math.max(1, Number(p.level) || 1);
      }
    });
    if (!Array.isArray(m.petAccessories)) m.petAccessories = [];
    if (!m.petFoodInventory || typeof m.petFoodInventory !== 'object') m.petFoodInventory = {};
    if (m.activePetId === undefined) m.activePetId = null;
    if (typeof m.age !== 'number' || m.age <= 0) {
      m.age = DEFAULT_MEMBER_AGES[m.id] || (m.role === 'Bố' ? 38 : m.role === 'Mẹ' ? 36 : 10);
    }
    if (typeof m.memberUpdatedAt !== 'number') m.memberUpdatedAt = 0;
    if (typeof m.adminPointsUpdatedAt !== 'number') m.adminPointsUpdatedAt = 0;
    if (typeof m.pointsUpdatedAt !== 'number') m.pointsUpdatedAt = m.adminPointsUpdatedAt || 0;
    if (typeof m.tvSecondsUsedToday !== 'number') m.tvSecondsUsedToday = 0;
    if (typeof m.tvBonusSecondsToday !== 'number') m.tvBonusSecondsToday = 0;
    if (!m.tvLastDate) m.tvLastDate = new Date().toDateString();
    const today = new Date().toDateString();
    if (m.tvLastDate !== today) {
      m.tvSecondsUsedToday = 0;
      m.tvBonusSecondsToday = 0;
      m.tvLastDate = today;
    }
    if (!m.englishChatStats || typeof m.englishChatStats !== 'object') {
      m.englishChatStats = { date: today, count: 0, lastRewardAt: 0, recentPhrases: [] };
    }
    if (m.englishChatStats.date !== today) {
      m.englishChatStats = { date: today, count: 0, lastRewardAt: m.englishChatStats.lastRewardAt || 0, recentPhrases: [] };
    }
    if (!Array.isArray(m.englishChatStats.recentPhrases)) {
      m.englishChatStats.recentPhrases = [];
    }
    if (!m.comicReadStats || typeof m.comicReadStats !== 'object') {
      m.comicReadStats = { date: today, count: 0, lastReadAt: 0, completedIds: [] };
    }
    if (m.comicReadStats.date !== today) {
      m.comicReadStats = {
        date: today,
        count: 0,
        lastReadAt: m.comicReadStats.lastReadAt || 0,
        completedIds: Array.isArray(m.comicReadStats.completedIds) ? m.comicReadStats.completedIds : []
      };
    }
    if (!Array.isArray(m.comicReadStats.completedIds)) {
      m.comicReadStats.completedIds = [];
    }
    if (m.roomDecor.some((d) => d.id === 'd_bookshelf')) {
      m.roomDecor = m.roomDecor.filter((d) => d.id !== 'd_bookshelf');
    }
    if (m.roomSlots && typeof m.roomSlots === 'object') {
      Object.keys(m.roomSlots).forEach((slotKey) => {
        if (m.roomSlots && m.roomSlots[slotKey] === 'd_bookshelf') {
          delete m.roomSlots[slotKey];
        }
      });
    }
  }

  function getActivityConfig(actId: ActivityConfigId): ActivityConfigItem {
    const base = DEFAULT_ACTIVITY_CONFIGS[actId];
    const custom = state.activityConfigs?.[actId];
    return custom ? { ...base, ...custom } : { ...base };
  }

  function ensureStateArrays() {
    if (!state.familyName || typeof state.familyName !== 'string') state.familyName = 'B2KS';
    state.familyName = state.familyName.trim() || 'B2KS';
    if (typeof state.familyNameUpdatedAt !== 'number') state.familyNameUpdatedAt = 0;
    if (!state.gamePassword || typeof state.gamePassword !== 'string') state.gamePassword = '1111';
    if (typeof state.gamePasswordUpdatedAt !== 'number') state.gamePasswordUpdatedAt = 0;
    if (!state.parentPin || typeof state.parentPin !== 'string') state.parentPin = '1234';
    if (typeof state.parentPinUpdatedAt !== 'number') state.parentPinUpdatedAt = 0;
    if (!state.bgmTheme) state.bgmTheme = AudioEngine.themeId || 'sunny_town';
    if (!state.buildingLayouts || typeof state.buildingLayouts !== 'object') state.buildingLayouts = {};
    if (typeof state.buildingLayoutsUpdatedAt !== 'number') state.buildingLayoutsUpdatedAt = 0;

    if (!Array.isArray(state.crossWorldItems)) {
      state.crossWorldItems = DEFAULT_CROSS_WORLD_ITEMS.map((x) => ({ ...x }));
    }
    if (!Array.isArray(state.crossWorldRequests)) state.crossWorldRequests = [];
    if (!Array.isArray(state.fleaMarketListings)) state.fleaMarketListings = [];
    if (!Array.isArray(state.activityLogs)) state.activityLogs = [];
    if (!Array.isArray(state.englishQuestions) || state.englishQuestions.length === 0) {
      state.englishQuestions = DEFAULT_ENGLISH_BANK.map((q) => ({ ...q }));
    }
    if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
    if (!Array.isArray(state.chatHistory)) state.chatHistory = [];
    if (!Array.isArray(state.tasks)) state.tasks = [];
    const mergedCfg: Record<ActivityConfigId, ActivityConfigItem> = { ...DEFAULT_ACTIVITY_CONFIGS };
    if (state.activityConfigs) {
      (Object.keys(DEFAULT_ACTIVITY_CONFIGS) as ActivityConfigId[]).forEach((k) => {
        if (state.activityConfigs && state.activityConfigs[k]) {
          mergedCfg[k] = { ...DEFAULT_ACTIVITY_CONFIGS[k], ...state.activityConfigs[k] };
        }
      });
    }
    state.activityConfigs = mergedCfg;
    state.members.forEach(ensureMemberProps);
  }

  function snapshotSavedPointsMap() {
    const map: Record<string, number> = {};
    state.members.forEach((m) => {
      map[m.id] = m.points;
    });
    lastSavedPointsMap = map;
  }

  function persistPointsLedger() {
    try {
      const ledger: Record<string, { points: number; pointsUpdatedAt: number; adminPointsUpdatedAt: number }> = {};
      state.members.forEach((m) => {
        ledger[m.id] = {
          points: m.points,
          pointsUpdatedAt: m.pointsUpdatedAt || 0,
          adminPointsUpdatedAt: m.adminPointsUpdatedAt || 0
        };
      });
      localStorage.setItem(getPointsLedgerKey(), JSON.stringify(ledger));
    } catch {
      // ignore storage quota errors
    }
  }

  function persistDurableSecrets() {
    try {
      const payload = {
        familyName: state.familyName || 'B2KS',
        familyNameUpdatedAt: state.familyNameUpdatedAt || 0,
        gamePassword: state.gamePassword || '1111',
        gamePasswordUpdatedAt: state.gamePasswordUpdatedAt || 0,
        parentPin: state.parentPin || '1234',
        parentPinUpdatedAt: state.parentPinUpdatedAt || 0
      };
      localStorage.setItem(getDurableSecretsKey(), JSON.stringify(payload));
      localStorage.setItem('b2ks_parent_pin', String(payload.parentPin));
      localStorage.setItem('b2ks_parent_pin_ts', String(payload.parentPinUpdatedAt));
    } catch {
      // ignore
    }
  }

  function unionStringLists(a: string[] = [], b: string[] = []): string[] {
    return Array.from(new Set([...(a || []), ...(b || [])]));
  }

  function petsProgressSignature(pets: OwnedPet[] = []): string {
    return pets
      .map(
        (p) =>
          `${p.id}:${p.speciesId}:${p.hatched ? 1 : 0}:${Math.round(p.hatchProgress || 0)}:${p.xp || 0}:${p.level || 1}:${p.stage || 0}:${Math.round(p.hunger || 0)}:${p.nickname || ''}:${p.variant || 'classic'}:${p.gender || 'female'}:${p.accessoryId || ''}`
      )
      .sort()
      .join('|');
  }

  function mergeQuizHistory(
    a: Member['englishQuizHistory'] = [],
    b: Member['englishQuizHistory'] = []
  ): NonNullable<Member['englishQuizHistory']> {
    const byKey = new Map<string, NonNullable<Member['englishQuizHistory']>[number]>();
    [...(a || []), ...(b || [])].forEach((r) => {
      if (!r) return;
      const key = `${r.ts || r.date}_${r.score}_${r.total}`;
      byKey.set(key, r);
    });
    return Array.from(byKey.values()).sort((x, y) => (y.ts || 0) - (x.ts || 0)).slice(0, 60);
  }

  function mergeCustomLabItems(
    a: Member['customLabItems'] = [],
    b: Member['customLabItems'] = []
  ): NonNullable<Member['customLabItems']> {
    const byId = new Map<string, NonNullable<Member['customLabItems']>[number]>();
    [...(a || []), ...(b || [])].forEach((item) => {
      if (item && item.id) byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }

  function persistDurableMemberArchive() {
    try {
      const key = getMemberArchiveKey();
      let existing: Record<string, any> = {};
      try {
        existing = JSON.parse(localStorage.getItem(key) || '{}') || {};
      } catch {
        existing = {};
      }
      state.members.forEach((m) => {
        ensureMemberProps(m);
        const prev = existing[m.id];
        existing[m.id] = {
          id: m.id,
          name: m.name,
          role: m.role,
          age: m.age,
          points: m.points,
          pointsUpdatedAt: m.pointsUpdatedAt || 0,
          adminPointsUpdatedAt: m.adminPointsUpdatedAt || 0,
          memberUpdatedAt: m.memberUpdatedAt || Date.now(),
          hairStyle: m.hairStyle,
          hairColor: m.hairColor,
          shirtColor: m.shirtColor,
          shirtPattern: m.shirtPattern,
          pantsColor: m.pantsColor,
          pantsStyle: m.pantsStyle,
          outfit: m.outfit,
          roomUnlocked: m.roomUnlocked,
          roomWall: m.roomWall,
          inventory: m.inventory || [],
          vouchers: m.vouchers || [],
          customLabItems: mergeCustomLabItems(prev?.customLabItems || [], m.customLabItems || []),
          roomSlots: m.roomSlots || {},
          roomDecor: m.roomDecor || [],
          unlockedZooAnimals: unionStringLists(prev?.unlockedZooAnimals || [], m.unlockedZooAnimals || []),
          englishQuizHistory: mergeQuizHistory(prev?.englishQuizHistory || [], m.englishQuizHistory || []),
          comicReadStats: {
            ...(m.comicReadStats || { date: new Date().toDateString(), count: 0, lastReadAt: 0, completedIds: [] }),
            completedIds: unionStringLists(prev?.comicReadStats?.completedIds || [], m.comicReadStats?.completedIds || [])
          },
          pets: mergeOwnedPets(m.pets || [], prev?.pets || []),
          petAccessories: mergeAccessoryLists(m.petAccessories || [], prev?.petAccessories || []),
          petFoodInventory: m.petFoodInventory || {},
          activePetId: m.activePetId ?? null
        };
      });
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // ignore storage quota errors
    }
  }

  function restoreDurableMemberArchive(famName?: string) {
    try {
      const raw = localStorage.getItem(getMemberArchiveKey(famName));
      if (!raw) return;
      const arch = JSON.parse(raw);
      if (!arch || typeof arch !== 'object') return;
      state.members.forEach((m) => {
        const entry = arch[m.id];
        if (!entry || typeof entry !== 'object') return;
        ensureMemberProps(m);
        if (Array.isArray(entry.pets) && entry.pets.length > 0) {
          m.pets = mergeOwnedPets(m.pets || [], entry.pets);
        }
        if (Array.isArray(entry.petAccessories)) {
          m.petAccessories = mergeAccessoryLists(m.petAccessories, entry.petAccessories);
        }
        if (!m.activePetId && entry.activePetId) {
          m.activePetId = entry.activePetId;
        }
        if (Array.isArray(entry.unlockedZooAnimals)) {
          m.unlockedZooAnimals = unionStringLists(m.unlockedZooAnimals, entry.unlockedZooAnimals);
        }
        if (Array.isArray(entry.englishQuizHistory)) {
          m.englishQuizHistory = mergeQuizHistory(m.englishQuizHistory, entry.englishQuizHistory);
        }
        if (entry.comicReadStats && Array.isArray(entry.comicReadStats.completedIds)) {
          if (!m.comicReadStats) {
            m.comicReadStats = { date: new Date().toDateString(), count: 0, lastReadAt: 0, completedIds: [] };
          }
          m.comicReadStats.completedIds = unionStringLists(
            m.comicReadStats.completedIds,
            entry.comicReadStats.completedIds
          );
          if ((entry.comicReadStats.lastReadAt || 0) > (m.comicReadStats.lastReadAt || 0)) {
            m.comicReadStats.lastReadAt = entry.comicReadStats.lastReadAt;
          }
        }
        if (Array.isArray(entry.customLabItems)) {
          m.customLabItems = mergeCustomLabItems(m.customLabItems, entry.customLabItems);
        }
        if ((entry.memberUpdatedAt || 0) > (m.memberUpdatedAt || 0)) {
          if (entry.name) m.name = entry.name;
          if (entry.role) m.role = entry.role;
          if (typeof entry.age === 'number') m.age = entry.age;
          if (entry.outfit !== undefined) m.outfit = entry.outfit;
          if (entry.hairStyle) m.hairStyle = entry.hairStyle;
          if (entry.hairColor) m.hairColor = entry.hairColor;
          if (entry.shirtColor) m.shirtColor = entry.shirtColor;
          if (entry.shirtPattern) m.shirtPattern = entry.shirtPattern;
          if (entry.pantsColor) m.pantsColor = entry.pantsColor;
          if (entry.pantsStyle) m.pantsStyle = entry.pantsStyle;
          if (typeof entry.roomUnlocked === 'boolean') m.roomUnlocked = entry.roomUnlocked;
          if (entry.roomWall) m.roomWall = entry.roomWall;
          if (Array.isArray(entry.inventory) && entry.inventory.length >= (m.inventory || []).length) {
            m.inventory = unionStringLists(m.inventory, entry.inventory);
          }
          if (Array.isArray(entry.vouchers) && entry.vouchers.length >= (m.vouchers || []).length) {
            m.vouchers = entry.vouchers;
          }
          if (entry.roomSlots && Object.keys(entry.roomSlots).length >= Object.keys(m.roomSlots || {}).length) {
            m.roomSlots = { ...(m.roomSlots || {}), ...entry.roomSlots };
          }
          if (Array.isArray(entry.roomDecor) && entry.roomDecor.length > (m.roomDecor || []).length) {
            m.roomDecor = entry.roomDecor;
          }
          if (entry.petFoodInventory && Object.keys(entry.petFoodInventory).length > 0) {
            m.petFoodInventory = { ...(entry.petFoodInventory || {}), ...(m.petFoodInventory || {}) };
          }
          m.memberUpdatedAt = entry.memberUpdatedAt;
        }
      });
    } catch {
      // ignore archive parse error
    }
  }

  function showToast(msg: string) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function findAnyCatalogItem(id: string): any {
    if (!id) return null;
    const shopHit =
      SHOP_CATALOG.find((i) => i.id === id) ||
      FASHION_CATALOG.find((f) => f.id === id) ||
      LEGACY_VOUCHERS.find((v) => v.id === id);
    if (shopHit) return shopHit;
    for (const m of state.members) {
      if (Array.isArray(m.customLabItems)) {
        const labHit = m.customLabItems.find((x) => x.id === id);
        if (labHit) return labHit;
      }
    }
    return null;
  }

  /* ==================== 4. FIREBASE REALTIME DB SYNC ==================== */
  function syncToFirebase(extraMemberIds: string[] = []) {
    if (!deviceConfig.firebaseUrl) return;
    const fbBase = getFirebaseBasePath();
    const cur = getCurrentUser();
    cur.memberUpdatedAt = cur.memberUpdatedAt || Date.now();
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/shared.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/auth_meta.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familyName: state.familyName || 'B2KS',
        familyNameUpdatedAt: state.familyNameUpdatedAt || 0,
        gamePassword: state.gamePassword || '1111',
        gamePasswordUpdatedAt: state.gamePasswordUpdatedAt || 0,
        parentPin: state.parentPin || '1234',
        parentPinUpdatedAt: state.parentPinUpdatedAt || 0
      })
    }).catch(() => {});

    const memberIdsToPush = new Set<string>([cur.id, ...extraMemberIds]);
    memberIdsToPush.forEach((mId) => {
      const mObj = state.members.find((x) => x.id === mId);
      if (!mObj) return;
      fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data/${mObj.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mObj)
      }).catch(() => {});
    });

    const liveTs = Date.now();
    livePosTimestamps.set(cur.id, liveTs);
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos/${cur.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.round(cur.x),
        y: Math.round(cur.y),
        dir: cur.dir || 'down',
        scene: cur.scene || 'neighborhood',
        privateRoomId: cur.privateRoomId || null,
        speech: cur.speech || null,
        ts: liveTs
      })
    }).catch(() => {});

    publishFamilyDirectorySummary();
  }

  function publishFamilyDirectorySummary() {
    if (!deviceConfig.firebaseUrl) return;
    const slug = getActiveFamilySlug();
    const summary: OtherFamilySummary = {
      slug,
      familyName: state.familyName || 'B2KS',
      updatedAt: Date.now(),
      members: state.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        age: m.age,
        outfit: m.outfit || '',
        points: m.points
      }))
    };
    fetch(`${deviceConfig.firebaseUrl}/b2ks_family_directory/${slug}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary)
    }).catch(() => {});
  }

  function syncEnglishBankToFirebase(questions: EnglishQuestion[]) {
    state.englishQuestions = questions;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/english_questions.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questions)
    }).catch(() => {});
  }

  function syncCrossWorldRequestsToFirebase(reqs: CrossWorldRequest[]) {
    state.crossWorldRequests = reqs;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/cross_world_requests.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqs)
    }).catch(() => {});
  }

  function syncFleaMarketToFirebase(listings: FleaMarketListing[]) {
    state.fleaMarketListings = listings;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/flea_market.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listings)
    }).catch(() => {});
  }

  function syncActivityLogsToFirebase(logs: ActivityLogEntry[]) {
    state.activityLogs = logs;
    if (!deviceConfig.firebaseUrl) return;
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/activity_logs.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logs)
    }).catch(() => {});
  }

  function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'ts'>) {
    ensureStateArrays();
    const fullEntry: ActivityLogEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      ...entry
    };
    state.activityLogs.unshift(fullEntry);
    if (state.activityLogs.length > 200) {
      state.activityLogs = state.activityLogs.slice(0, 200);
    }
    syncActivityLogsToFirebase(state.activityLogs);
  }

  function saveGame(pushCloud = true) {
    try {
      const now = Date.now();
      state.updatedAt = now;
      const changedPointMembers: string[] = [];
      state.members.forEach((m) => {
        if (lastSavedPointsMap[m.id] !== undefined && m.points !== lastSavedPointsMap[m.id]) {
          m.pointsUpdatedAt = now;
          m.memberUpdatedAt = Math.max(m.memberUpdatedAt || 0, now);
          changedPointMembers.push(m.id);
        }
      });
      const cur = getCurrentUser();
      if (cur) cur.memberUpdatedAt = now;

      snapshotSavedPointsMap();
      hasLocalSaveFile = true;
      localStorage.setItem(getFamilyStorageKey(), JSON.stringify(state));
      persistPointsLedger();
      persistDurableSecrets();
      persistDurableMemberArchive();

      if (pushCloud && deviceConfig.firebaseUrl) {
        syncToFirebase(changedPointMembers);
      }
      notifySubscribers();
    } catch {
      showToast('⚠️ Bộ nhớ trình duyệt đầy, hãy dùng ảnh dung lượng nhẹ hơn.');
    }
  }

  /* ==================== 5. HOUSE ROOMS & COLLISION ==================== */
  function getHouseRooms(): HouseRoomDef[] {
    const kids = state.members.filter((m) => !isParent(m));
    const parents = state.members.filter((m) => isParent(m));
    const kid1 = kids[0] || null;
    const kid2 = kids[1] || null;
    const dad = parents.find((p) => p.role === 'Bố') || parents[0];

    const extraMembers = state.members.filter(
      (m) =>
        !parents.some((p) => p.id === m.id) &&
        (!kid1 || m.id !== kid1.id) &&
        (!kid2 || m.id !== kid2.id)
    );
    const commonOwners = extraMembers.map((m) => m.id);

    return [
      { id: 'f1_living', name: '🛋️ Phòng Khách (Tầng 1)', x: 100, y: 570, w: 400, h: 180, wall: '#FCF3CF', floor: '#E59866', ownerIds: [], isUnlocked: true, doorSide: 'right', wardrobe: null },
      { id: 'f1_dining', name: '🍽️ Phòng Ăn & Bếp (Tầng 1)', x: 620, y: 570, w: 400, h: 180, wall: '#FDEBD0', floor: '#DC7633', ownerIds: [], isUnlocked: true, doorSide: 'left', wardrobe: null },
      {
        id: 'f2_common',
        name: extraMembers.length > 0 ? `🛏️ Phòng ${extraMembers[0].name} (Tầng 2)` : '🛋️ Sinh Hoạt Chung (Tầng 2)',
        x: 100, y: 340, w: 400, h: 200,
        wall: '#D6EAF8', floor: '#CA6F1E',
        ownerIds: commonOwners,
        isUnlocked: extraMembers.length === 0 ? true : extraMembers.some((m) => m.roomUnlocked),
        doorSide: 'right',
        wardrobe: extraMembers.length > 0 ? { x: 145, y: 382 } : null
      },
      {
        id: 'f2_parents',
        name: '🛏️ Phòng Bố Mẹ (Tầng 2)',
        x: 620, y: 340, w: 400, h: 200,
        wall: (dad && dad.roomWall) || '#FADBD8',
        floor: '#BA4A00',
        ownerIds: parents.map((p) => p.id),
        isUnlocked: parents.some((p) => p.roomUnlocked),
        doorSide: 'left',
        wardrobe: { x: 760, y: 382 }
      },
      {
        id: 'f3_kid1',
        name: kid1 ? `🛏️ Phòng ${kid1.name} (Tầng 3)` : '🛏️ Phòng Ngủ 1 (Tầng 3)',
        x: 100, y: 110, w: 400, h: 200,
        wall: (kid1 && kid1.roomWall) || '#D5F5E3',
        floor: '#E59866',
        ownerIds: kid1 ? [kid1.id] : [],
        isUnlocked: kid1 ? kid1.roomUnlocked : true,
        doorSide: 'right',
        wardrobe: { x: 335, y: 152 }
      },
      {
        id: 'f3_kid2',
        name: kid2 ? `🛏️ Phòng ${kid2.name} (Tầng 3)` : '🛏️ Phòng Ngủ 2 (Tầng 3)',
        x: 620, y: 110, w: 400, h: 200,
        wall: (kid2 && kid2.roomWall) || '#EBDEF0',
        floor: '#E59866',
        ownerIds: kid2 ? [kid2.id] : [],
        isUnlocked: kid2 ? kid2.roomUnlocked : true,
        doorSide: 'left',
        wardrobe: { x: 775, y: 152 }
      }
    ];
  }

  function getRoomAtPosition(x: number, y: number): HouseRoomDef | null {
    return getHouseRooms().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null;
  }

  function getMemberPrivateRoom(member: Member): HouseRoomDef | null {
    return getHouseRooms().find((r) => r.ownerIds && r.ownerIds.includes(member.id)) || null;
  }

  function getActivePrivateRoom(): HouseRoomDef | null {
    const user = getCurrentUser();
    if (user.scene !== 'private_room') return null;
    const roomId = user.privateRoomId || activePrivateRoomId;
    return getHouseRooms().find((r) => r.id === roomId) || null;
  }

  function isMemberAtOwnWardrobe(member: Member): boolean {
    const myRoom = getMemberPrivateRoom(member);
    if (!myRoom) return false;
    if (member.scene === 'private_room' && (member.privateRoomId || activePrivateRoomId) === myRoom.id) {
      return Math.hypot(member.x - 670, member.y - 235) <= 95;
    }
    if (member.scene !== 'house' || !myRoom.wardrobe) return false;
    const curRoom = getRoomAtPosition(member.x, member.y);
    if (!curRoom || curRoom.id !== myRoom.id) return false;
    return Math.hypot(member.x - myRoom.wardrobe.x, member.y - (myRoom.wardrobe.y + 38)) <= 85;
  }

  function canMoveInsideHouse(member: Member, nextX: number, nextY: number): { allowed: boolean; blockedRoom?: HouseRoomDef | null } {
    if (nextX >= 500 && nextX <= 620 && nextY >= 155 && nextY <= 745) return { allowed: true };
    const rooms = getHouseRooms();
    for (const r of rooms) {
      const doorTop = r.y + r.h - 95;
      const doorBottom = r.y + r.h - 5;
      const inDoorway =
        nextY >= doorTop &&
        nextY <= doorBottom &&
        ((r.doorSide === 'right' && nextX >= r.x + r.w - 30 && nextX <= 525) ||
          (r.doorSide === 'left' && nextX >= 595 && nextX <= r.x + 30));
      const inRoomFloor = nextX >= r.x + 14 && nextX <= r.x + r.w - 14 && nextY >= r.y + 42 && nextY <= r.y + r.h - 8;

      if (inDoorway || inRoomFloor) {
        const currentRoom = getRoomAtPosition(member.x, member.y);
        if ((!currentRoom || currentRoom.id !== r.id) && r.ownerIds && r.ownerIds.length > 0) {
          const isOwner = r.ownerIds.includes(member.id);
          if (!isOwner && !r.isUnlocked) return { allowed: false, blockedRoom: r };
        }
        return { allowed: true };
      }
    }
    return { allowed: false, blockedRoom: null };
  }

  /* ==================== 6. MESSENGER & TASKS & FAMILY QUEST & NAVIGATION ==================== */
  const MSG_RETENTION_MS = 72 * 60 * 60 * 1000;
  let smartphoneCurrentView: 'home' | 'messenger' | 'tasks' | 'maps' = 'home';
  let smartphoneChatTargetId = 'family_group';
  let activeNavTargetId: string | null = null;
  let petShopTab: 'eggs' | 'food' | 'accessories' | 'my_pets' = 'eggs';
  let petModalMode: 'shop' | 'hud_collection' = 'shop';
  let lastEggWarmAt = 0;

  function getResolvedNavTarget(): NavDestination | null {
    if (!activeNavTargetId) return null;
    const resolved = resolveNeighborhoodLocations(state);
    return resolved.find((l) => l.id === activeNavTargetId) || null;
  }

  function pruneExpiredFamilyMessages() {
    if (!Array.isArray(state.familyMessages)) {
      state.familyMessages = [];
      return;
    }
    const cutoff = Date.now() - MSG_RETENTION_MS;
    const before = state.familyMessages.length;
    state.familyMessages = (state.familyMessages as any[]).filter((m) => (m.ts || 0) >= cutoff);
    if (state.familyMessages.length !== before) {
      localStorage.setItem(getFamilyStorageKey(), JSON.stringify(state));
    }
  }

  function getUnreadMessageCount(member: Member): number {
    if (!member || !Array.isArray(state.familyMessages)) return 0;
    const cutoff = Date.now() - MSG_RETENTION_MS;
    let count = 0;
    (state.familyMessages as any[]).forEach((msg) => {
      if ((msg.ts || 0) < cutoff || msg.senderId === member.id) return;
      const isForMe = msg.recipientId === 'family_group' || msg.recipientId === member.id;
      if (!isForMe) return;
      const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      if (!readBy.includes(member.id)) count++;
    });
    return count;
  }

  function getPendingTasksCountForMember(member: Member): number {
    if (!member || !Array.isArray(state.tasks)) return 0;
    if (isParent(member)) {
      return state.tasks.filter((t) => {
        if (t.status === 'submitted') return true;
        if (t.type === 'family_quest' && t.status !== 'completed') {
          const pIds = t.participantIds || [];
          const pMap = t.progressMap || {};
          return pIds.length > 0 && pIds.every((id) => pMap[id] === 'done');
        }
        return false;
      }).length;
    }
    return state.tasks.filter((t) => {
      if (t.status === 'completed') return false;
      if (t.type === 'family_quest') {
        return (t.participantIds || []).includes(member.id) && (t.progressMap || {})[member.id] !== 'done';
      }
      return t.assigneeId === member.id && t.status === 'pending';
    }).length;
  }

  function triggerSpeechBubble(member: Member, text: string, isEng: boolean) {
    const now = Date.now();
    member.speech = { text, isEng, expiresAt: now + 5500 };
    state.chatHistory.push({ sender: member.name, text, isEng, ts: now });
    if (state.chatHistory.length > 40) state.chatHistory.shift();
    renderChatLog();
  }

  function checkAllDailyTasksCompleted(memberId: string) {
    const m = state.members.find((x) => x.id === memberId);
    if (!m || isParent(m)) return;
    const assigned = state.tasks.filter(
      (t) => t.assigneeId === memberId || (t.type === 'family_quest' && (t.participantIds || []).includes(memberId))
    );
    if (assigned.length === 0) return;
    const hasIncomplete = assigned.some((t) => {
      if (t.type === 'family_quest') return t.status !== 'completed' && (t.progressMap || {})[memberId] !== 'done';
      return t.status !== 'completed';
    });
    if (!hasIncomplete) {
      triggerConfetti();
      AudioEngine.playSuccess();
      triggerSpeechBubble(m, `Hurray! Hoàn thành tất cả nhiệm vụ hôm nay rồi! 🎉🏆`, false);
      showToast(`🎆 CHÚC MỪNG ${m.name.toUpperCase()} ĐÃ HOÀN TẤT TOÀN BỘ NHIỆM VỤ TRONG NGÀY!`);
    }
  }

  /* ==================== 7. HUD & DAILY RESET ==================== */
  let lastHudSignature = '';
  let hudToolsExpanded = false;

  function syncHudToolsVisibility() {
    const extraEl = document.getElementById('hud-extra-tools');
    const toggleBtn = document.getElementById('hud-more-toggle-btn');
    if (extraEl) {
      extraEl.style.display = hudToolsExpanded ? 'inline-flex' : 'none';
    }
    if (toggleBtn) {
      toggleBtn.textContent = hudToolsExpanded ? '<' : '>';
      toggleBtn.title = hudToolsExpanded ? 'Thu gọn thanh công cụ' : 'Mở rộng thanh công cụ';
    }
  }

  function getMemberLocationText(user: Member): string {
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    if (user.scene === 'neighborhood') return `🏘️ Khu phố ${brand}`;
    if (user.scene === 'private_room') return getActivePrivateRoom()?.name.split(' (')[0] || '🛏️ Phòng riêng';
    return getRoomAtPosition(user.x, user.y)?.name.split(' (')[0] || '🪜 Cầu thang trong nhà';
  }

  function updateFamilyBrandingDOM() {
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    document.title = `${brand} Daily Routines`;
    const brandMappings: [string, string][] = [
      ['guide-title-brand', `🏡 ${brand} Daily Routines — Khu Phố Gia Đình`],
      ['house-modal-title', `🏢 Nhà Phố Gia Đình ${brand}`],
      ['shop-modal-title', `🏪 Siêu Thị Gia Đình ${brand} — Khu Mua Sắm`],
      ['shop-npc-greeting', `“Chào mừng quý khách tới Siêu Thị ${brand}! Chọn kệ hàng bên dưới để đổi điểm lấy nội thất phòng & thẻ xem YouTube nhé! (Đặc quyền ngoài đời hãy ghé 🌌 Trung Tâm Xuyên Thế Giới)”`],
      ['fashion-modal-title', `👗 ${brand} Fashion Boutique & Sàn Thử Đồ`],
      ['salon-modal-title', `💇 ${brand} Hair Studio & Nhuộm Nghệ Thuật`],
      ['english-modal-title', `🎓 ${brand} English Academy (Chuẩn Lớp 6 & Phát Âm)`],
      ['arcade-modal-title', `🕹️ ${brand} eSports & Arcade Arena`],
      ['lab-modal-title', `🧪 Phòng Thí Nghiệm Sáng Tạo ${brand}`],
      ['soccer-modal-title', `⚽ Sân Bóng Đá ${brand} (Miễn Phí 0⭐)`],
      ['phone-carrier-label', `📶 ${brand}-5G 🔋100%`]
    ];
    brandMappings.forEach(([id, txt]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    });
    const famBadge = document.getElementById('hud-family-badge');
    if (famBadge) famBadge.textContent = `🏡 ${brand}`;
  }

  function renderMemberDropdownList() {
    const menu = document.getElementById('member-dropdown-menu');
    if (!menu) return;
    menu.innerHTML = '';
    state.members.forEach((m) => {
      const isCur = m.id === state.currentUserId;
      const locLabel = m.scene === 'house' ? '🏠 Trong nhà' : m.scene === 'private_room' ? '🛏️ Phòng riêng' : '🏘️ Ngoài phố';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'member-option-item' + (isCur ? ' active' : '');
      btn.innerHTML = `
        <span style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:16px;">${m.outfit || getRoleEmoji(m.role)}</span>
          <span>${escapeHtml(m.name)} <small style="color:#666;">(${m.role}${m.age ? `, ${m.age}t` : ''})</small></span>
        </span>
        <span style="font-size:10.5px; color:#2980B9;">${locLabel}</span>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        selectMemberById(m.id);
      };
      menu.appendChild(btn);
    });
  }

  function updateHUD() {
    const user = getCurrentUser();
    const lighting = getRealTimeLighting();
    const locText = getMemberLocationText(user);
    const unreadCount = getUnreadMessageCount(user);
    const pendingTasksCount = getPendingTasksCountForMember(user);
    const pendingCWCount = state.crossWorldRequests.filter((r) => r.status === 'pending').length;
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';

    const lockTag = document.getElementById('hud-device-lock-tag');
    if (lockTag) lockTag.style.display = deviceConfig.isLockedToMember ? 'inline-block' : 'none';

    const badgeEl = document.getElementById('hud-phone-unread-badge');
    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.style.display = 'inline-block';
        badgeEl.textContent = unreadCount > 9 ? '9+' : String(unreadCount);
      } else {
        badgeEl.style.display = 'none';
      }
    }

    const parentBadgeEl = document.getElementById('hud-parent-pending-badge');
    if (parentBadgeEl) {
      if (pendingCWCount > 0) {
        parentBadgeEl.style.display = 'inline-block';
        parentBadgeEl.textContent = pendingCWCount > 9 ? '9+' : String(pendingCWCount);
      } else {
        parentBadgeEl.style.display = 'none';
      }
    }

    const showParentTools = isParent(user);
    const miniWinBtn = document.getElementById('hud-mini-window-btn');
    if (miniWinBtn) {
      miniWinBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    const parentalBtn = document.getElementById('hud-parental-btn');
    if (parentalBtn) {
      parentalBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    const familySyncBtn = document.getElementById('hud-family-sync-btn');
    if (familySyncBtn) {
      familySyncBtn.style.display = showParentTools ? 'inline-flex' : 'none';
    }
    syncHudToolsVisibility();

    const ptsEl = document.getElementById('hud-points');
    if (ptsEl) ptsEl.textContent = `${user.points}⭐`;

    const weatherPill = document.getElementById('hud-weather-pill');
    if (weatherPill) {
      weatherPill.textContent = currentWeather
        ? `${currentWeather.icon} ${currentWeather.tempC}°C`
        : lighting.label;
      weatherPill.title = currentWeather
        ? `${currentWeather.label} (${currentWeather.locationLabel}) • Gió ${currentWeather.windKmh} km/h`
        : 'Đang cập nhật thời tiết thực tế...';
    }

    const audioBtn = document.getElementById('audio-toggle-btn');
    if (audioBtn) audioBtn.innerText = AudioEngine.isMuted ? '🔇 Tắt' : '🔊 Nhạc';

    const phoneTimeEl = document.getElementById('phone-status-time');
    if (phoneTimeEl) phoneTimeEl.textContent = lighting.label;
    const phoneHomePoints = document.getElementById('phone-home-points');
    if (phoneHomePoints) phoneHomePoints.textContent = `${user.points}⭐`;
    const phoneHomeLoc = document.getElementById('phone-home-loc');
    if (phoneHomeLoc) phoneHomeLoc.textContent = locText;

    const petSummary = getMemberPetBonuses(user);
    const sig = `${brand}|${user.id}|${user.name}|${user.role}|${user.age || ''}|${user.outfit}|${user.points}|${lighting.label}|${currentWeather?.condition || ''}|${currentWeather?.tempC || ''}|${locText}|${deviceConfig.isLockedToMember}|${unreadCount}|${pendingTasksCount}|${pendingCWCount}|${petSummary.pet?.id || ''}|${petSummary.pet?.stage || 0}|${activeNavTargetId || ''}`;
    if (sig === lastHudSignature) return;
    lastHudSignature = sig;

    updateFamilyBrandingDOM();

    const avEl = document.getElementById('hud-avatar');
    const nameEl = document.getElementById('hud-name');
    const roleEl = document.getElementById('hud-role');
    if (avEl) avEl.innerText = user.outfit || getRoleEmoji(user.role);
    if (nameEl) nameEl.innerText = user.name;
    if (roleEl) roleEl.innerText = user.role;

    const menu = document.getElementById('member-dropdown-menu');
    if (menu && menu.classList.contains('open')) renderMemberDropdownList();
  }

  function checkDailyAllowance(pushCloud = true) {
    const today = new Date().toDateString();
    ensureStateArrays();
    if (state.lastDailyReset !== today) {
      state.members.forEach((m) => {
        if (isParent(m)) m.points = Math.min(MAX_PARENT_POINTS, m.points + DAILY_PARENT_ALLOWANCE);
        m.tvSecondsUsedToday = 0;
        m.tvBonusSecondsToday = 0;
        m.tvLastDate = today;
      });
      state.lastDailyReset = today;
      showToast(`🌅 Ngày mới! Bố và Mẹ nhận thêm +${DAILY_PARENT_ALLOWANCE}⭐ ngân sách!`);
      saveGame(pushCloud);
    }
  }

  /* ==================== 8. PASSCODE PIN & SYNC ==================== */
  let pendingParentAction: (() => void) | null = null;
  let enteredPin = '';

  function updatePinDisplay() {
    const box = document.getElementById('pin-display-box');
    if (box) box.textContent = '●'.repeat(enteredPin.length) + '_'.repeat(4 - enteredPin.length);
  }

  function requestParentAccess(callback: () => void) {
    const m = getCurrentUser();
    const isKid = !isParent(m);
    if (deviceConfig.isLockedToMember || isKid) {
      pendingParentAction = callback;
      enteredPin = '';
      updatePinDisplay();
      const resetBox = document.getElementById('pin-reset-container');
      if (resetBox) resetBox.style.display = !isKid && !deviceConfig.isLockedToMember ? 'block' : 'none';
      openModal('pin-modal');
    } else {
      callback();
    }
  }

  function verifyPin() {
    const activePin = String(state.parentPin || localStorage.getItem('b2ks_parent_pin') || '1234');
    if (String(enteredPin) === activePin) {
      closeModal('pin-modal');
      enteredPin = '';
      AudioEngine.playSuccess();
      if (typeof pendingParentAction === 'function') {
        const fn = pendingParentAction;
        pendingParentAction = null;
        fn();
      }
    } else {
      AudioEngine.playError();
      showToast('❌ Sai Passcode Phụ huynh!');
      enteredPin = '';
      updatePinDisplay();
    }
  }

  /* ==================== 9. ACTIVITY COOLDOWN & DINING PUZZLE ==================== */
  function getActivityStatus(member: Member & { activityLogs?: any }, actKey: keyof typeof ACTIVITY_RULES) {
    ensureMemberProps(member);
    const rule = ACTIVITY_RULES[actKey];
    const cfg = getActivityConfig(actKey as ActivityConfigId);
    const maxPerDay = cfg.maxPerDay ?? rule.maxPerDay;
    const cooldownMs = cfg.cooldownMs ?? rule.cooldownMs;
    const today = new Date().toDateString();
    if (!member.activityLogs) member.activityLogs = {};
    let log = member.activityLogs[actKey];
    if (!log || log.date !== today) {
      log = { date: today, count: 0, lastAt: 0 };
      member.activityLogs[actKey] = log;
    }
    if (!cfg.enabled) return { canEarn: false, disabled: true, isParent: isParent(member), onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    if (isParent(member)) return { canEarn: false, disabled: false, isParent: true, onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    if (log.count >= maxPerDay) return { canEarn: false, disabled: false, isParent: false, onCooldown: false, capped: true, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
    const elapsed = Date.now() - (log.lastAt || 0);
    if (log.lastAt > 0 && elapsed < cooldownMs) {
      return { canEarn: false, disabled: false, isParent: false, onCooldown: true, capped: false, remainMs: cooldownMs - elapsed, count: log.count, maxPerDay, reward: cfg.reward };
    }
    return { canEarn: true, disabled: false, isParent: false, onCooldown: false, capped: false, remainMs: 0, count: log.count, maxPerDay, reward: cfg.reward };
  }

  function performRoutineActivity(member: Member & { activityLogs?: any }, actKey: keyof typeof ACTIVITY_RULES, successSpeech: string) {
    const rule = ACTIVITY_RULES[actKey];
    const status = getActivityStatus(member, actKey);
    if (status.isParent) {
      AudioEngine.playSuccess();
      triggerSpeechBubble(member, successSpeech, true);
      return;
    }
    if (status.disabled) {
      AudioEngine.playClick();
      triggerSpeechBubble(member, successSpeech, true);
      showToast(`ℹ️ Hoạt động "${rule.label}" đang tạm tắt cộng ⭐ bởi Phụ huynh (+0⭐).`);
      return;
    }
    if (!status.canEarn) {
      AudioEngine.playClick();
      if (status.capped) {
        triggerSpeechBubble(member, rule.doneMsg, false);
        showToast(`ℹ️ ${rule.doneMsg} (+0⭐)`);
      } else {
        const minsLeft = Math.max(1, Math.ceil(status.remainMs / 60000));
        triggerSpeechBubble(member, rule.fullMsg, false);
        showToast(`⏳ ${rule.fullMsg} (Chờ ${minsLeft} phút nữa để nhận ⭐)`);
      }
      return;
    }
    const petBonus = getMemberPetBonuses(member);
    const totalReward = status.reward + petBonus.starBonus;
    member.activityLogs[actKey].count += 1;
    member.activityLogs[actKey].lastAt = Date.now();
    member.points += totalReward;
    AudioEngine.playCoin();
    triggerSpeechBubble(member, successSpeech, true);
    showToast(
      petBonus.starBonus > 0
        ? `⭐ ${member.name} +${totalReward}⭐ (+${petBonus.starBonus}⭐ từ ${petBonus.pet?.nickname})!`
        : `⭐ ${member.name} +${status.reward}⭐ (${rule.label} lần ${member.activityLogs[actKey].count}/${status.maxPerDay} hôm nay)!`
    );
    updateHUD();
    saveGame();
  }

  /* ==================== 10. ARCADE ENGINE ==================== */
  const arcadeEngine = createArcadeEngine({
    getState: () => state,
    getCurrentUser,
    isParent,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    getRoleEmoji,
    playClick: () => AudioEngine.playClick(),
    playCoin: () => AudioEngine.playCoin(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    playTone: (f, t, d, v) => AudioEngine.playTone(f, t, d, v),
    showToast,
    updateHUD,
    saveGame,
    triggerSpeechBubble,
    closeModal,
    maxParentPoints: MAX_PARENT_POINTS
  });

  const soccerGame = createSoccerMiniGame({
    getState: () => state,
    getCurrentUser,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    playClick: () => AudioEngine.playClick(),
    playCoin: () => AudioEngine.playCoin(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    triggerConfetti,
    triggerSpeechBubble,
    showToast
  });

  /* ==================== 11. PRIVATE ROOM & MODAL ACTIONS ==================== */
  function syncPrivateRoomToolbar() {
    const toolbar = document.getElementById('private-room-toolbar');
    if (!toolbar) return;
    const room = getActivePrivateRoom();
    if (!room) {
      toolbar.style.display = 'none';
      return;
    }
    const user = getCurrentUser();
    const isOwner = Boolean(room.ownerIds && room.ownerIds.includes(user.id));
    toolbar.style.display = 'flex';
    const badge = document.getElementById('pr-room-badge');
    if (badge) badge.innerText = room.name;

    const privacyLabel = document.getElementById('pr-privacy-label');
    const wallSelect = document.getElementById('pr-wall-select') as HTMLSelectElement | null;
    const privCheck = document.getElementById('pr-privacy-check') as HTMLInputElement | null;
    if (isOwner) {
      if (privacyLabel) privacyLabel.style.display = 'flex';
      if (privCheck) privCheck.checked = !!user.roomUnlocked;
      if (wallSelect) {
        wallSelect.style.display = 'inline-block';
        wallSelect.value = user.roomWall || room.wall;
      }
    } else {
      if (privacyLabel) privacyLabel.style.display = 'none';
      if (wallSelect) wallSelect.style.display = 'none';
    }
  }

  function openModal(id: string) {
    AudioEngine.init();
    AudioEngine.playClick();
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
    if (id === 'tasks-modal') renderTasksModal();
    if (id === 'shop-modal') renderShop('decor');
    if (id === 'bag-modal') renderBagModal('decor');
    if (id === 'fashion-modal') renderFashionStore('set');
    if (id === 'salon-modal') renderSalonModal();
    if (id === 'custom-modal') renderCustomModal();
    if (id === 'donate-modal') renderDonateModal();
    if (id === 'house-modal') renderHouseModal();
    if (id === 'tv-modal') openTvModal();
    if (id === 'family-sync-modal') renderFamilySyncModal();
    if (id === 'english-center-modal') openEnglishCenterLobby();
    if (id === 'arcade-modal') {
      arcadeEngine.pullArcadeRoomFromFirebase();
      arcadeEngine.renderArcadeLobby();
    }
    if (id === 'invention-lab-modal') openInventionLabModal();
    if (id === 'soccer-modal') soccerGame.startMatch();
    if (id === 'pet-shop-modal') renderPetShopModal();
  }

  function closeModal(id: string) {
    AudioEngine.playClick();
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
    if (id === 'custom-modal') wardrobeOpenedRoomId = null;
    if (id === 'arcade-modal') arcadeEngine.stopArcadeLoop();
    if (id === 'soccer-modal') soccerGame.stopMatch();
  }

  function openReactModal(modal: ActiveReactModal) {
    AudioEngine.init();
    AudioEngine.playClick();
    if (window.__OPEN_B2KS_MODAL__) {
      window.__OPEN_B2KS_MODAL__(modal);
    }
  }

  function closeReactModal() {
    if (window.__OPEN_B2KS_MODAL__) {
      window.__OPEN_B2KS_MODAL__(null);
    }
  }

  function renderHouseModal() {
    const list = document.getElementById('family-members-list');
    if (!list) return;
    list.innerHTML = state.members
      .map((m) => {
        let locText = '🏘️ Đang ở ngoài Khu phố';
        if (m.scene === 'house') {
          const r = getRoomAtPosition(m.x, m.y);
          locText = r ? `🏠 ${r.name}` : '🪜 Cầu thang trong nhà';
        } else if (m.scene === 'private_room') {
          locText = '🛏️ Trong phòng riêng';
        }
        return `
          <div class="card-item" style="flex-direction:row; align-items:center;">
            <div style="font-size:26px;">${m.outfit || getRoleEmoji(m.role)}</div>
            <div>
              <div style="font-weight:700;">${escapeHtml(m.name)} <span class="tag">${m.role}</span></div>
              <div style="font-size:12px; color:#555;">${locText}</div>
              <div style="font-size:11px; color:#2980B9;">Phòng riêng: ${m.roomUnlocked ? '🔓 Đang mở' : '🔒 Đang khóa'}</div>
            </div>
          </div>`;
      })
      .join('');
  }

  /* ==================== 12. TASKS + FAMILY QUEST RENDERING ==================== */
  function buildTaskCardHtml(t: TaskItem, user: Member, compact: boolean): string {
    const creator = state.members.find((m) => m.id === t.creatorId);
    if (!creator) return '';

    if (t.type === 'family_quest') {
      const pIds = t.participantIds || [];
      const pMap = t.progressMap || {};
      const myDone = pMap[user.id] === 'done';
      const isParticipant = pIds.includes(user.id);
      const allDone = pIds.length > 0 && pIds.every((pid) => pMap[pid] === 'done');

      let badge = `<span class="tag" style="background:#EDE9FE; color:#5B21B6;">🤝 Đồng đội (${pIds.filter((id) => pMap[id] === 'done').length}/${pIds.length})</span>`;
      if (t.status === 'completed') {
        badge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Xong Đồng Đội</span>`;
      } else if (allDone) {
        badge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Cả hai đã xong — Chờ duyệt</span>`;
      }

      let actions = '';
      if (t.status !== 'completed') {
        if (isParticipant && !myDone) {
          actions += `<button class="btn btn-sm btn-purple" onclick="submitFamilyQuestPart(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">🙋 Con Đã Xong Phần Mình</button>`;
        }
        if (isParent(user) && allDone) {
          actions += `<button class="btn btn-sm btn-primary" onclick="approveFamilyQuest(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">🎉 Duyệt (+${t.reward}⭐/bé)</button>`;
        }
      }
      if (isParent(user)) {
        actions += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}" title="Xóa">🗑️</button>`;
      }

      const memberStatusChips = pIds
        .map((pid) => {
          const km = state.members.find((x) => x.id === pid);
          const done = pMap[pid] === 'done';
          return `<span class="tag" style="background:${done ? '#D4EDDA' : '#FFF3CD'}; color:${done ? '#155724' : '#856404'}; margin-right:4px;">${escapeHtml(km?.name || pid)}: ${done ? '✅' : '⏳'}</span>`;
        })
        .join('');

      return `
        <div class="card-item" style="background:#FAF5FF; border-color:#7C3AED; ${compact ? 'padding:8px;' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
            <div>
              <span class="tag" style="background:#7C3AED; color:#FFF;">🤝 Nhiệm vụ Đồng đội</span>
              <b style="font-size:${compact ? '13px' : '14px'}; margin-left:4px;">${escapeHtml(t.title)}</b>
              <div style="font-size:${compact ? '11px' : '12px'}; color:#555; margin-top:3px;">
                Giao bởi: <b>${escapeHtml(creator.name)}</b> | Thưởng: <b>+${t.reward}⭐/bé</b>
              </div>
              <div style="margin-top:4px;">${memberStatusChips}</div>
            </div>
            ${badge}
          </div>
          <div style="display:flex; gap:6px; justify-content:flex-end; flex-wrap:wrap;">${actions}</div>
        </div>
      `;
    }

    const assignee = state.members.find((m) => m.id === t.assigneeId);
    if (!assignee) return '';

    let statusBadge = '';
    let actionButtons = '';

    if (t.status === 'pending') {
      statusBadge = `<span class="tag" style="background:#FFF3CD; color:#856404;">⏳ Đang làm</span>`;
      if (user.id === assignee.id) {
        actionButtons +=
          t.type === 'chore'
            ? `<button class="btn btn-sm btn-accent" onclick="submitChore(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">✅ Báo cáo xong</button>`
            : `<button class="btn btn-sm btn-purple" onclick="openSubmitHomeworkModal(${t.id})">📤 Nộp bài</button>`;
      }
    } else if (t.status === 'submitted') {
      statusBadge = `<span class="tag" style="background:#CCE5FF; color:#004085;">📩 Chờ duyệt</span>`;
      if (isParent(user)) {
        actionButtons +=
          t.type === 'chore'
            ? `<button class="btn btn-sm btn-primary" onclick="approveChore(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}">👍 Duyệt (+${t.reward}⭐)</button>`
            : `<button class="btn btn-sm btn-primary" onclick="openGradeHomeworkModal(${t.id})">📝 Chấm điểm</button>`;
      }
    } else if (t.status === 'completed') {
      statusBadge = `<span class="tag" style="background:#D4EDDA; color:#155724;">🎉 Xong ${t.grade !== null && t.grade !== undefined ? `(${t.grade}/10)` : ''}</span>`;
    }

    if (isParent(user)) {
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteTask(${t.id})${compact ? '; renderSmartphoneScreen()' : ''}" title="Xóa">🗑️</button>`;
    }

    const createdTime = formatTimestamp(t.createdAt || t.id);
    const completedTime = t.completedAt ? ` | ✅ Xong lúc: <b>${formatTimestamp(t.completedAt)}</b>` : '';

    return `
      <div class="card-item" style="${compact ? 'padding:8px;' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px;">
          <div>
            <span class="tag">${t.type === 'chore' ? '🧹 Việc nhà' : '📚 Bài tập'}</span>
            <b style="font-size:${compact ? '13px' : '14px'}; margin-left:4px;">${escapeHtml(t.title)}</b>
            <div style="font-size:${compact ? '11px' : '12px'}; color:#555; margin-top:3px;">
              <b>${escapeHtml(creator.name)}</b> ➔ <b>${escapeHtml(assignee.name)}</b> | Thưởng: <b>${t.reward}⭐</b>
            </div>
            ${!compact ? `<div style="font-size:11px; color:#7F8C8D; margin-top:2px;">🕒 Tạo lúc: <b>${createdTime}</b>${completedTime}</div>` : ''}
          </div>
          ${statusBadge}
        </div>
        ${t.parentFile ? `<div style="font-size:11.5px;">📎 Đề bài: <b>${escapeHtml(t.parentFileName || '')}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'parent')">Xem</button></div>` : ''}
        ${t.childFile ? `<div style="font-size:11.5px;">📄 Bài nộp: <b>${escapeHtml(t.childFileName || '')}</b> <button class="btn btn-sm" style="padding:2px 6px; font-size:10px;" onclick="viewAttachment(${t.id}, 'child')">Xem</button></div>` : ''}
        <div style="display:flex; gap:5px; justify-content:flex-end; flex-wrap:wrap;">${actionButtons}</div>
      </div>
    `;
  }

  function renderTasksModal() {
    const user = getCurrentUser();
    const creatorBox = document.getElementById('parent-task-creator');
    if (creatorBox) {
      if (isParent(user)) {
        creatorBox.style.display = 'block';
        const assigneeSel = document.getElementById('task-assignee') as HTMLSelectElement | null;
        if (assigneeSel) {
          assigneeSel.innerHTML = state.members
            .filter((m) => !isParent(m))
            .map((kid) => `<option value="${kid.id}">${escapeHtml(kid.name)} (${kid.role})</option>`)
            .join('');
        }
      } else {
        creatorBox.style.display = 'none';
      }
    }
    const list = document.getElementById('tasks-list');
    if (!list) return;
    if (state.tasks.length === 0) {
      list.innerHTML = '<p style="color:#666; text-align:center;">Chưa có nhiệm vụ nào.</p>';
      return;
    }
    list.innerHTML = state.tasks
      .slice()
      .reverse()
      .map((t) => buildTaskCardHtml(t, user, false))
      .join('');
  }

  function toggleHomeworkUpload() {
    const typeEl = document.getElementById('task-type') as HTMLSelectElement | null;
    const fileGrp = document.getElementById('parent-file-group');
    const assigneeGrp = document.getElementById('task-assignee-group');
    if (!typeEl) return;
    if (fileGrp) fileGrp.style.display = typeEl.value === 'homework' ? 'block' : 'none';
    if (assigneeGrp) assigneeGrp.style.display = typeEl.value === 'family_quest' ? 'none' : 'block';
  }

  function createTask() {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const type = ((document.getElementById('task-type') as HTMLSelectElement)?.value || 'chore') as TaskItem['type'];
    const assigneeId = (document.getElementById('task-assignee') as HTMLSelectElement)?.value || '';
    const title = (document.getElementById('task-title') as HTMLInputElement)?.value.trim() || '';
    const reward = parseInt((document.getElementById('task-reward') as HTMLInputElement)?.value || '0', 10) || 0;
    const fileInput = document.getElementById('task-parent-file') as HTMLInputElement | null;

    if (!title) return showToast('⚠️ Vui lòng nhập tên nhiệm vụ!');

    if (type === 'family_quest') {
      const kids = state.members.filter((m) => !isParent(m));
      const participantIds = kids.map((k) => k.id);
      const totalCost = reward * participantIds.length;
      if (participantIds.length < 2) {
        AudioEngine.playError();
        return showToast('⚠️ Cần ít nhất 2 bé để giao Nhiệm Vụ Đồng Đội!');
      }
      if (reward <= 0 || user.points < totalCost) {
        AudioEngine.playError();
        return showToast(`❌ Cần ${totalCost}⭐ ngân sách (${reward}⭐/bé)!`);
      }
      user.points -= totalCost;
      const progressMap: Record<string, 'pending' | 'done'> = {};
      participantIds.forEach((id) => {
        progressMap[id] = 'pending';
      });
      state.tasks.push({
        id: Date.now(),
        type: 'family_quest',
        title,
        creatorId: user.id,
        assigneeId: participantIds[0],
        participantIds,
        progressMap,
        reward,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null
      });
      const titleInput = document.getElementById('task-title') as HTMLInputElement | null;
      if (titleInput) titleInput.value = '';
      AudioEngine.playSuccess();
      showToast(`🤝 Đã giao Nhiệm Vụ Đồng Đội (-${totalCost}⭐ ngân sách)!`);
      triggerSpeechBubble(user, `Nhiệm vụ đồng đội mới: ${title}! 🤝`, false);
      updateHUD();
      renderTasksModal();
      saveGame();
      return;
    }

    if (reward <= 0 || user.points < reward) {
      AudioEngine.playError();
      return showToast(`❌ Không đủ điểm ngân sách! (Hiện có: ${user.points}⭐)`);
    }

    const finalize = (fileData: string | null, fileName: string) => {
      user.points -= reward;
      const now = Date.now();
      state.tasks.push({
        id: now, type, title, creatorId: user.id, assigneeId, reward,
        status: 'pending', createdAt: now, completedAt: null,
        parentFile: fileData, parentFileName: fileName,
        childFile: null, childFileName: '', childNote: '', grade: null
      });
      const titleInput = document.getElementById('task-title') as HTMLInputElement | null;
      if (titleInput) titleInput.value = '';
      if (fileInput) fileInput.value = '';
      AudioEngine.playSuccess();
      showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
      triggerSpeechBubble(user, `Giao việc mới: ${title}!`, false);
      updateHUD();
      renderTasksModal();
      const phoneModal = document.getElementById('smartphone-modal');
      if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
      saveGame();
    };

    if (type === 'homework' && fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => finalize((e.target?.result as string) || null, file.name);
      reader.readAsDataURL(file);
    } else {
      finalize(null, '');
    }
  }

  function submitFamilyQuestPart(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId && t.type === 'family_quest');
    if (!task || task.status === 'completed') return;
    const user = getCurrentUser();
    if (!task.progressMap) task.progressMap = {};
    task.progressMap[user.id] = 'done';

    const pIds = task.participantIds || [];
    const allDone = pIds.length > 0 && pIds.every((id) => task.progressMap![id] === 'done');
    if (allDone) task.status = 'submitted';

    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'quest_part',
      detail: `Hoàn thành phần mình trong Nhiệm vụ Đồng đội "${task.title}"`,
      taskId: task.id
    });

    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Đã xong phần mình trong nhiệm vụ "${task.title}"! 🤝`, false);
    showToast(allDone ? '🎉 Cả hai bé đã hoàn thành! Chờ Bố/Mẹ duyệt thưởng đồng đội!' : '✅ Đã ghi nhận phần của con! Chờ đồng đội xong cùng nhé!');
    updateHUD();
    renderTasksModal();
    saveGame();
    checkAllDailyTasksCompleted(user.id);
  }

  function approveFamilyQuest(taskId: number) {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const task = state.tasks.find((t) => t.id === taskId && t.type === 'family_quest');
    if (!task || task.status === 'completed') return;
    task.status = 'completed';
    task.completedAt = Date.now();
    (task.participantIds || []).forEach((pid) => {
      const m = state.members.find((x) => x.id === pid);
      if (m) {
        const pb = getMemberPetBonuses(m);
        m.points += task.reward + pb.starBonus;
      }
    });
    AudioEngine.playCoin();
    triggerConfetti();
    showToast(`🎉 Nhiệm vụ Đồng đội hoàn tất! Mỗi bé nhận +${task.reward}⭐ (+thưởng Thú cưng nếu có)!`);
    updateHUD();
    renderTasksModal();
    saveGame();
  }

  function submitChore(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = 'submitted';
    const user = getCurrentUser();
    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'task_done',
      detail: `Báo cáo hoàn thành việc nhà: "${task.title}"`,
      taskId: task.id
    });
    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Con đã làm xong: ${task.title}!`, false);
    showToast('📨 Đã báo cáo hoàn thành cho Bố/Mẹ!');
    renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
    saveGame();
  }

  function approveChore(taskId: number) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'completed') return;
    const assignee = state.members.find((m) => m.id === task.assigneeId);
    task.status = 'completed';
    task.completedAt = Date.now();
    if (assignee) {
      const pb = getMemberPetBonuses(assignee);
      const earned = task.reward + pb.starBonus;
      assignee.points += earned;
      AudioEngine.playCoin();
      showToast(
        pb.starBonus > 0
          ? `🎉 ${assignee.name} nhận +${earned}⭐ (gồm +${pb.starBonus}⭐ Thú cưng)!`
          : `🎉 ${assignee.name} nhận +${earned}⭐!`
      );
      checkAllDailyTasksCompleted(assignee.id);
    }
    updateHUD();
    renderTasksModal();
    const phoneModal = document.getElementById('smartphone-modal');
    if (phoneModal && phoneModal.style.display === 'flex') renderSmartphoneScreen();
    saveGame();
  }

  function deleteTask(taskId: number) {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const idx = state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    const task = state.tasks[idx];
    const refund =
      task.type === 'family_quest'
        ? task.reward * Math.max(1, (task.participantIds || []).length)
        : task.reward;
    if (task.status !== 'completed') {
      const creator = state.members.find((m) => m.id === task.creatorId);
      if (creator) creator.points = Math.min(MAX_PARENT_POINTS, creator.points + refund);
    }
    state.tasks.splice(idx, 1);
    AudioEngine.playClick();
    showToast(task.status !== 'completed' ? `🗑️ Đã xóa nhiệm vụ & hoàn lại +${refund}⭐ ngân sách!` : '🗑️ Đã xóa nhiệm vụ khỏi danh sách!');
    updateHUD();
    renderTasksModal();
    saveGame();
  }

  /* ==================== 13. BAG (WITH SAFE INLINE DELETE) & SHOP ==================== */
  let currentBagTab = 'decor';

  function renderShop(tab: string) {
    const grid = document.getElementById('shop-items-grid');
    if (!grid) return;
    const user = getCurrentUser();
    grid.innerHTML = SHOP_CATALOG.filter((i) => i.category === tab)
      .map((item) => {
        const owned = user.inventory.includes(item.id);
        const canBuyMultiple = item.category === 'voucher' || item.category === 'tv_card';
        return `
          <div class="card-item">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52, findAnyCatalogItem)}</div>
              <div>
                <b style="font-size:14px;">${item.name}</b>
                <div style="font-size:12px; color:#555; margin-top:2px;">${item.desc}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
              <span class="points-pill">⭐ ${item.price}</span>
              ${owned && !canBuyMultiple
                ? `<span class="tag" style="background:#D4EDDA;">Đã có trong túi</span>`
                : `<button class="btn btn-sm btn-accent" onclick="buySupermarketItem('${item.id}')">Mua bằng điểm</button>`}
            </div>
          </div>
        `;
      })
      .join('');
  }

  function buySupermarketItem(itemId: string) {
    const user = getCurrentUser();
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item || user.points < item.price) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua vật phẩm này!`);
    }
    user.points -= item.price;
    if (item.category === 'voucher') user.vouchers.push(item.id);
    else user.inventory.push(item.id);
    AudioEngine.playCoin();
    showToast(`🛍️ Đã mua ${item.name} và cất vào 🎒 Túi đồ!`);
    updateHUD();
    renderShop(item.category);
    saveGame();
  }

  function renderBagDeleteBtn(deleteKey: string, kind: string, targetId: string, indexOrEmpty = -1): string {
    if (pendingBagDeleteKey === deleteKey) {
      return `
        <div style="display:flex; gap:4px; align-items:center;">
          <button type="button" class="btn btn-sm btn-danger" onclick="confirmDeleteBagItem('${kind}', '${targetId}', ${indexOrEmpty})">✅ Xác nhận xóa</button>
          <button type="button" class="btn btn-sm" style="background:#64748B;" onclick="cancelDeleteBagItem()">Hủy</button>
        </div>
      `;
    }
    return `<button type="button" class="btn btn-sm btn-danger" onclick="requestDeleteBagItem('${deleteKey}')">🗑️ Xóa bỏ</button>`;
  }

  function renderBagModal(tab: string) {
    currentBagTab = tab || currentBagTab;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const ownerEl = document.getElementById('bag-owner-name');
    if (ownerEl) ownerEl.innerText = user.name;
    const grid = document.getElementById('bag-items-grid');
    if (!grid) return;

    if (currentBagTab === 'voucher') {
      if (user.vouchers.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có phiếu quà tặng nào trong túi.</p>';
        return;
      }
      grid.innerHTML = user.vouchers
        .map((vId, idx) => {
          const item = findAnyCatalogItem(vId);
          if (!item) return '';
          return `
            <div class="card-item" style="background:#FFF8E7;">
              <div><b>${item.icon} ${escapeHtml(item.name)}</b> <span class="tag">Phiếu quà</span></div>
              <div style="font-size:12px;">${escapeHtml(item.desc || '')}</div>
              <div style="display:flex; gap:6px; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-top:4px;">
                <button class="btn btn-sm btn-primary" onclick="useVoucher(${idx})">🎟️ Dùng phiếu ngay</button>
                ${renderBagDeleteBtn(`voucher:${idx}`, 'voucher', vId, idx)}
              </div>
            </div>
          `;
        })
        .join('');
      return;
    }

    if (currentBagTab === 'tv_card') {
      const cardCount = user.inventory.filter((id) => id === 'tv_30min').length;
      if (cardCount === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có Thẻ xem YouTube nào. Hãy mua tại <b>🏪 Siêu thị</b> nhé!</p>';
        return;
      }
      grid.innerHTML = `
        <div class="card-item" style="background:#FDEDEC;">
          <div style="display:flex; gap:10px; align-items:center;">
            <span style="font-size:32px;">📺</span>
            <div>
              <b>Thẻ Xem YouTube (+30 phút)</b>
              <div style="font-size:12px; color:#555;">Số lượng trong túi: <b>${cardCount} thẻ</b></div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:space-between; margin-top:4px;">
            <button class="btn btn-sm btn-danger" onclick="useTvCardFromBag()">▶️ Kích hoạt +30 phút</button>
            ${renderBagDeleteBtn('inv:tv_30min', 'inventory', 'tv_30min', -1)}
          </div>
        </div>
      `;
      return;
    }

    if (currentBagTab === 'outfit') {
      const ownedFashion = user.inventory
        .map((id, invIndex) => ({ item: FASHION_CATALOG.find((f) => f.id === id), invIndex }))
        .filter((x) => Boolean(x.item));
      if (ownedFashion.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</p>';
        return;
      }
      grid.innerHTML = ownedFashion
        .map(({ item, invIndex }) => `
          <div class="card-item">
            <div><b>${item!.icon} ${escapeHtml(item!.name)}</b></div>
            <div style="font-size:12px; color:#27AE60;">🚪 Đã cất trong Tủ quần áo phòng riêng</div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              ${renderBagDeleteBtn(`outfit:${invIndex}:${item!.id}`, 'inventory', item!.id, invIndex)}
            </div>
          </div>
        `)
        .join('');
      return;
    }

    if (currentBagTab === 'lab') {
      const labItems = user.customLabItems || [];
      if (labItems.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có vật phẩm sáng tạo nào. Hãy ghé <b>🧪 Phòng Thí Nghiệm B2KS</b> trên phố để chế tạo bằng Tiếng Anh nhé!</p>';
        return;
      }
      grid.innerHTML = labItems
        .map((item) => {
          const tier = item.labSpec?.sizeTier ? LAB_SIZE_TIERS[item.labSpec.sizeTier] : null;
          const sizeBadge = tier ? `<span class="tag" style="background:#E0F2FE; color:#0369A1; border-color:#38BDF8;">📏 ${tier.label}</span>` : '';
          return `
          <div class="card-item" style="background:#F0F9FF; border-color:#0284C7;">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="flex-shrink:0;">${renderItemIllustrationSVG(item.id, 52, findAnyCatalogItem)}</div>
              <div>
                <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                  <b style="color:#0369A1;">${escapeHtml(item.name)}</b>
                  ${sizeBadge}
                </div>
                <div style="font-size:11px; color:#0284C7; font-style:italic;">"${escapeHtml(item.prompt)}"</div>
                <div style="font-size:11.5px; color:#475569; margin-top:2px;">${escapeHtml(item.desc)}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
              <span style="font-size:11px; color:#0D9488;">✨ Có thể đặt lên 8 Slot phòng riêng</span>
              ${renderBagDeleteBtn(`lab:${item.id}`, 'lab', item.id, -1)}
            </div>
          </div>
        `;
        })
        .join('');
      return;
    }

    const ownedShopDecors = user.inventory
      .map((id, invIndex) => ({ item: SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor'), invIndex, kind: 'inventory' as const }))
      .filter((x) => Boolean(x.item));
    const ownedLabDecors = (user.customLabItems || []).map((item) => ({ item, invIndex: -1, kind: 'lab' as const }));
    const ownedDecors = [...ownedShopDecors, ...ownedLabDecors];

    if (ownedDecors.length === 0) {
      grid.innerHTML = '<p style="color:#666; font-size:13px;">Chưa có đồ trang trí phòng. Hãy mua tại <b>🏪 Siêu thị</b>!</p>';
      return;
    }
    grid.innerHTML = ownedDecors
      .map(({ item, invIndex, kind }) => `
        <div class="card-item">
          <div style="display:flex; gap:10px; align-items:center;">
            ${renderItemIllustrationSVG(item!.id, 48, findAnyCatalogItem)}
            <div>
              <b>${escapeHtml(item!.name)}</b>
              <div style="font-size:11.5px; color:#555;">${escapeHtml(item!.desc)}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:11px; color:#2980B9;">💡 Đặt tại Slot phòng riêng</span>
            ${renderBagDeleteBtn(`${kind}:${invIndex}:${item!.id}`, kind, item!.id, invIndex)}
          </div>
        </div>
      `)
      .join('');
  }

  function confirmDeleteBagItem(kind: string, targetId: string, index: number) {
    const user = getCurrentUser();
    ensureMemberProps(user);
    let removedName = 'Vật phẩm';

    if (kind === 'voucher') {
      const cat = findAnyCatalogItem(targetId);
      if (cat) removedName = cat.name;
      if (index >= 0 && user.vouchers[index] === targetId) user.vouchers.splice(index, 1);
      else {
        const idx = user.vouchers.indexOf(targetId);
        if (idx !== -1) user.vouchers.splice(idx, 1);
      }
    } else if (kind === 'lab') {
      const idx = (user.customLabItems || []).findIndex((x) => x.id === targetId);
      if (idx !== -1) {
        removedName = user.customLabItems![idx].name;
        user.customLabItems!.splice(idx, 1);
      }
    } else if (kind === 'inventory') {
      const cat = findAnyCatalogItem(targetId);
      if (cat) {
        removedName = cat.name;
        if (cat.icon && user.outfit === cat.icon) user.outfit = '';
      }
      if (index >= 0 && user.inventory[index] === targetId) user.inventory.splice(index, 1);
      else {
        const idx = user.inventory.indexOf(targetId);
        if (idx !== -1) user.inventory.splice(idx, 1);
      }
    }

    // Also clean up placed room slots / decor if no copies remain
    const remainingCopies =
      user.inventory.filter((id) => id === targetId).length +
      (user.customLabItems || []).filter((x) => x.id === targetId).length;
    if (remainingCopies === 0) {
      if (user.roomSlots) {
        Object.keys(user.roomSlots).forEach((slotKey) => {
          if (user.roomSlots![slotKey] === targetId) delete user.roomSlots![slotKey];
        });
      }
      user.roomDecor = user.roomDecor.filter((d) => d.id !== targetId);
    }

    pendingBagDeleteKey = null;
    AudioEngine.playClick();
    showToast(`🗑️ Đã xóa bỏ "${removedName}" khỏi túi đồ.`);
    updateHUD();
    renderBagModal(currentBagTab);
    saveGame();
  }

  /* ==================== 14. GRADE 6 ENGLISH QUIZ (WEB SPEECH + DYNAMIC FIREBASE BANK) ==================== */
  let engQuizSession: {
    questions: EnglishQuestion[];
    currentIndex: number;
    score: number;
    answered: boolean;
    topic: string;
  } = { questions: [], currentIndex: 0, score: 0, answered: false, topic: 'mix' };

  function openEnglishCenterLobby() {
    const body = document.getElementById('eng-quiz-body');
    if (!body) return;
    body.innerHTML = `
      <div style="background:#FFF; border:2.5px dashed #16A085; border-radius:12px; padding:24px 16px; text-align:center;">
        <div style="font-size:38px; margin-bottom:8px;">📚✨</div>
        <div style="font-weight:700; font-size:15px; color:#117864; margin-bottom:6px;">
          Sẵn sàng thử thách Tiếng Anh Lớp 6! (${state.englishQuestions.length} câu hỏi từ Firebase)
        </div>
        <div style="font-size:13px; color:#555; max-width:440px; margin:0 auto;">
          Hãy bấm chọn một thể loại đề thi ở phía trên (<b>Đề Tổng Hợp</b>, <b>Ngữ Pháp</b> hoặc <b>Từ Vựng & Giao Tiếp</b>) — hệ thống sẽ tự động đọc phát âm tiếng Anh chuẩn Mỹ để bạn luyện nghe song song!
        </div>
      </div>
    `;
  }

  function startEnglishGrade6Quiz(topic = 'mix') {
    AudioEngine.playClick();
    ensureStateArrays();
    const pool =
      topic === 'mix'
        ? [...state.englishQuestions]
        : state.englishQuestions.filter((item) => item.cat === topic);
    const effectivePool = pool.length > 0 ? pool : [...state.englishQuestions];
    for (let i = effectivePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [effectivePool[i], effectivePool[j]] = [effectivePool[j], effectivePool[i]];
    }
    engQuizSession = {
      questions: effectivePool.slice(0, 10),
      currentIndex: 0,
      score: 0,
      answered: false,
      topic
    };
    renderEnglishQuizQuestion();
  }

  function renderEnglishQuizQuestion() {
    const body = document.getElementById('eng-quiz-body');
    if (!body) return;

    if (engQuizSession.currentIndex >= engQuizSession.questions.length) {
      const total = engQuizSession.questions.length;
      const correct = engQuizSession.score;
      const user = getCurrentUser();
      ensureMemberProps(user);
      const petBonus = getMemberPetBonuses(user);
      const perCorrectCfg = getActivityConfig('english_quiz_per_correct');
      const highBonusCfg = getActivityConfig('english_quiz_high_bonus');
      let starsEarned = perCorrectCfg.enabled ? correct * perCorrectCfg.reward : 0;
      if (correct > 0 && starsEarned > 0) starsEarned += petBonus.starBonus;
      const gotHighBonus = correct >= 8 && highBonusCfg.enabled && highBonusCfg.reward > 0;
      if (gotHighBonus) starsEarned += highBonusCfg.reward;

      user.points = isParent(user) ? Math.min(MAX_PARENT_POINTS, user.points + starsEarned) : user.points + starsEarned;
      user.englishQuizHistory!.push({
        date: new Date().toDateString(),
        score: correct,
        total,
        stars: starsEarned,
        ts: Date.now()
      });
      logActivity({
        memberId: user.id,
        memberName: user.name,
        action: 'quiz_done',
        detail: `Hoàn thành bài thi Tiếng Anh (${correct}/${total} câu, +${starsEarned}⭐)`
      });
      AudioEngine.playSuccess();
      if (correct >= 8) triggerConfetti();
      updateHUD();
      saveGame();

      body.innerHTML = `
        <div style="text-align:center; background:#FEF9E7; border:2.5px solid #F39C12; border-radius:12px; padding:16px;">
          <div style="font-size:40px;">🏆</div>
          <h3 style="margin:6px 0; color:#2C3E50;">Hoàn Thành Bài Thi Tiếng Anh!</h3>
          <p style="font-size:15px; margin:6px 0;">Kết quả của <b>${escapeHtml(user.name)}</b>: <b style="color:#27AE60; font-size:18px;">${correct} / ${total} câu đúng</b></p>
          <p style="font-size:14px; color:#D35400; font-weight:700;">⭐ Phần thưởng: +${starsEarned}⭐ ${gotHighBonus ? `(Bao gồm +${highBonusCfg.reward}⭐ thưởng xuất sắc!)` : ''}</p>
          <button class="btn btn-primary" style="margin-top:8px;" onclick="startEnglishGrade6Quiz('${engQuizSession.topic}')">🔄 Làm Bộ Đề Ngẫu Nhiên Khác</button>
        </div>
      `;
      return;
    }

    const qObj = engQuizSession.questions[engQuizSession.currentIndex];
    const qNum = engQuizSession.currentIndex + 1;
    const letters = ['A', 'B', 'C', 'D'];

    body.innerHTML = `
      <div style="background:#FFF; border:2.5px solid #2C3E50; border-radius:12px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
          <span class="tag" style="background:#D6EAF8;">Câu ${qNum} / ${engQuizSession.questions.length}</span>
          <div style="display:flex; gap:6px; align-items:center;">
            <button type="button" class="btn btn-sm btn-accent" onclick="speakCurrentEnglishQuiz()">🔊 Nghe phát âm</button>
            <span class="points-pill">Đúng: ${engQuizSession.score} câu</span>
          </div>
        </div>
        <div style="font-size:15.5px; font-weight:700; color:#2C3E50; margin-bottom:12px; line-height:1.45;">
          ${qNum}. ${escapeHtml(qObj.q)}
        </div>
        <div id="eng-options-list" style="display:flex; flex-direction:column; gap:8px;">
          ${qObj.opts
            .map(
              (opt, idx) => `
              <button type="button" class="btn" id="eng-opt-${idx}"
                style="background:#F8F9F9; color:#2C3E50; justify-content:flex-start; text-align:left; padding:9px 12px; font-size:13.5px; white-space:normal;"
                onclick="selectEnglishQuizAnswer(${idx})">
                <b>${letters[idx]}.</b>&nbsp;${escapeHtml(opt)}
              </button>`
            )
            .join('')}
        </div>
        <div id="eng-feedback-box" style="display:none; margin-top:12px; padding:10px; border-radius:8px; font-size:13px;"></div>
      </div>
    `;

    // Automatically speak the current question aloud!
    speakEnglish(qObj.q, 0.88);
  }

  /* ==================== 15. INVENTION LAB UI HANDLERS ==================== */
  let currentLabMode: 'prompt' | 'fusion' = 'prompt';

  function getAvailableFusionIngredients(user: Member) {
    ensureMemberProps(user);
    const items: any[] = [];
    const placedCounts: Record<string, number> = {};
    if (user.roomSlots) {
      Object.values(user.roomSlots).forEach((id) => {
        if (id) placedCounts[id] = (placedCounts[id] || 0) + 1;
      });
    }
    if (Array.isArray(user.roomDecor)) {
      user.roomDecor.forEach((d) => {
        if (d && d.id) placedCounts[d.id] = (placedCounts[d.id] || 0) + 1;
      });
    }

    user.inventory.forEach((id, invIndex) => {
      const catItem: any = SHOP_CATALOG.find((i) => i.id === id) || FASHION_CATALOG.find((f) => f.id === id);
      if (!catItem) return;
      if (catItem.icon && user.outfit === catItem.icon) return;
      if (
        catItem.sub === 'set' &&
        user.shirtColor === catItem.shirtColor &&
        user.shirtPattern === catItem.shirtPattern &&
        user.pantsColor === catItem.pantsColor &&
        user.pantsStyle === catItem.pantsStyle
      ) return;
      if (placedCounts[id] && placedCounts[id] > 0) {
        placedCounts[id] -= 1;
        return;
      }
      items.push({
        uid: `inv:${invIndex}:${id}`,
        source: 'inventory',
        invIndex,
        itemId: id,
        rawName: catItem.name,
        label: `${catItem.icon || '📦'} ${catItem.name}`
      });
    });

    (user.customLabItems || []).forEach((labItem, labIndex) => {
      if (!labItem || !labItem.id) return;
      if (placedCounts[labItem.id] && placedCounts[labItem.id] > 0) {
        placedCounts[labItem.id] -= 1;
        return;
      }
      items.push({
        uid: `lab:${labIndex}:${labItem.id}`,
        source: 'customLabItems',
        labIndex,
        itemId: labItem.id,
        rawName: labItem.name.replace(/^🧪\s*/, ''),
        label: labItem.name
      });
    });
    return items;
  }

  function refreshLabFusionIngredientsUI() {
    const user = getCurrentUser();
    const available = getAvailableFusionIngredients(user);
    const selA = document.getElementById('lab-item-a') as HTMLSelectElement | null;
    const selB = document.getElementById('lab-item-b') as HTMLSelectElement | null;
    const emptyMsg = document.getElementById('lab-fusion-empty-msg');
    const selectorsWrap = document.getElementById('lab-fusion-selectors');
    const fusionSubmitBtn = document.getElementById('lab-fusion-submit-btn') as HTMLButtonElement | null;
    if (!selA || !selB) return;

    if (available.length < 2) {
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (selectorsWrap) selectorsWrap.style.display = 'none';
      if (fusionSubmitBtn) {
        fusionSubmitBtn.disabled = true;
        fusionSubmitBtn.style.opacity = '0.5';
      }
      selA.innerHTML = '';
      selB.innerHTML = '';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    if (selectorsWrap) selectorsWrap.style.display = 'grid';
    if (fusionSubmitBtn) {
      fusionSubmitBtn.disabled = false;
      fusionSubmitBtn.style.opacity = '1';
    }
    const optsHtml = available.map((it) => `<option value="${it.uid}">${escapeHtml(it.label)}</option>`).join('');
    selA.innerHTML = optsHtml;
    selB.innerHTML = optsHtml;
    selA.selectedIndex = 0;
    selB.selectedIndex = 1;
  }

  function renderLabRecentList(highlightedItem: any = null) {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const area = document.getElementById('lab-result-area');
    if (!area) return;

    let html = '';
    if (highlightedItem) {
      const hTier = highlightedItem.labSpec?.sizeTier ? LAB_SIZE_TIERS[highlightedItem.labSpec.sizeTier as LabSizeTier] : null;
      html += `
        <div style="background:linear-gradient(135deg,#042F2E 0%,#064E3B 50%,#0C4A6E 100%); border:3px solid #34D399; box-shadow:0 0 24px rgba(52,211,153,0.45); border-radius:16px; padding:16px; margin-bottom:14px; display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <div style="background:radial-gradient(circle at 30% 30%, #FFFFFF 0%, #E0F2FE 65%, #BAE6FD 100%); border-radius:16px; padding:10px; border:3px solid #FACC15; flex-shrink:0; display:flex; align-items:center; justify-content:center; width:126px; height:126px;">
            ${renderItemIllustrationSVG(highlightedItem.id, 102, findAnyCatalogItem)}
          </div>
          <div style="flex:1; min-width:200px;">
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              <span class="tag" style="background:linear-gradient(90deg,#10B981,#059669); color:#FFF; border-color:#FACC15; font-size:11.5px; padding:3px 9px;">✨ VẬT PHẨM MỚI RA LÒ!</span>
              <span class="tag" style="background:#0F172A; color:#FACC15; border-color:#FACC15; font-size:11px;">⭐ ${escapeHtml(highlightedItem.labSpec?.rarity || 'ĐỘC BẢN')}</span>
              ${hTier ? `<span class="tag" style="background:#0284C7; color:#FFF; border-color:#7DD3FC; font-size:11px;">📏 Cỡ: ${hTier.label}</span>` : ''}
            </div>
            <div style="font-size:18px; font-weight:700; color:#FFF; margin-top:6px;">${escapeHtml(highlightedItem.name)}</div>
            <div style="font-size:12.5px; color:#6EE7B7; font-weight:600; margin-top:3px;">🔬 ${escapeHtml(highlightedItem.desc)}</div>
          </div>
        </div>
      `;
    }

    const list = user.customLabItems || [];
    if (list.length > 0) {
      html += `<div style="font-size:13px; font-weight:700; color:#7DD3FC; margin-bottom:8px;">📚 Bộ sưu tập sáng chế của ${escapeHtml(user.name)} (${list.length} vật phẩm):</div>`;
      html += `<div class="grid-2">`;
      list.slice(0, 6).forEach((item) => {
        const tier = item.labSpec?.sizeTier ? LAB_SIZE_TIERS[item.labSpec.sizeTier] : null;
        html += `
          <div style="background:linear-gradient(145deg,#0F172A,#1E293B); border:2px solid #38BDF8; border-radius:12px; padding:10px; display:flex; gap:12px; align-items:center;">
            <div style="background:radial-gradient(circle, #FFFFFF 0%, #E0F2FE 100%); border-radius:11px; padding:5px; border:2px solid #7DD3FC; flex-shrink:0; width:68px; height:68px; display:flex; align-items:center; justify-content:center;">
              ${renderItemIllustrationSVG(item.id, 56, findAnyCatalogItem)}
            </div>
            <div style="min-width:0; flex:1;">
              <div style="font-weight:700; font-size:13.5px; color:#F8FAFC; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
              <div style="font-size:11.5px; color:#38BDF8; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">"${escapeHtml(item.prompt)}"</div>
              ${tier ? `<div style="font-size:10.5px; color:#7DD3FC; margin-top:2px;">📏 Kích thước: ${tier.label}</div>` : ''}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }
    area.innerHTML = html;
  }

  function openInventionLabModal() {
    ensureMemberProps(getCurrentUser());
    refreshLabFusionIngredientsUI();
    renderLabRecentList();
  }

  /* ==================== 16. FASHION, SALON, CUSTOMIZER, TV, SMARTPHONE, DINING PUZZLE ==================== */
  let tryOnFashionState: { setItem: any; shirtItem: any; pantsItem: any; accItem: any } = {
    setItem: null,
    shirtItem: null,
    pantsItem: null,
    accItem: null
  };
  let currentFashionTab = 'set';
  let salonDraft = { hairStyle: 'short', hairColor: '#2C3E50' };
  let draftChar = { hairStyle: 'short', hairColor: '#2C3E50', shirtColor: '#2980B9', shirtPattern: 'collar', pantsColor: '#34495E', pantsStyle: 'pants', outfit: '' };
  let tvTimerInterval: number | null = null;
  let currentTvVideoId = 'XqZsoesa55w';
  let activeFoodPuzzle: any = null;

  function drawFashionTryOnPreview() {
    const pCanvas = document.getElementById('fashion-tryon-canvas') as HTMLCanvasElement | null;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#FFF5F7';
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#FADBD8';
    pCtx.beginPath();
    pCtx.ellipse(52, 105, 35, 9, 0, 0, Math.PI * 2);
    pCtx.fill();

    const user = getCurrentUser();
    const setIt = tryOnFashionState.setItem;
    const shirtIt = tryOnFashionState.shirtItem;
    const pantsIt = tryOnFashionState.pantsItem;
    const accIt = tryOnFashionState.accItem;
    drawDetailedChibiOnContext(
      pCtx,
      {
        ...user,
        x: 52, y: 86, dir: 'down',
        shirtColor: shirtIt ? shirtIt.shirtColor : setIt ? setIt.shirtColor : user.shirtColor,
        shirtPattern: shirtIt ? shirtIt.shirtPattern : setIt ? setIt.shirtPattern : user.shirtPattern,
        pantsColor: pantsIt ? pantsIt.pantsColor : setIt ? setIt.pantsColor : user.pantsColor,
        pantsStyle: pantsIt ? pantsIt.pantsStyle : setIt ? setIt.pantsStyle : user.pantsStyle,
        outfit: accIt ? accIt.icon : user.outfit,
        speech: null
      },
      true,
      1.22
    );

    const statusEl = document.getElementById('fashion-tryon-status');
    const ctrlEl = document.getElementById('fashion-tryon-controls');
    const labels: string[] = [];
    if (setIt) labels.push(setIt.name);
    if (shirtIt) labels.push(shirtIt.name);
    if (pantsIt) labels.push(pantsIt.name);
    if (accIt) labels.push(accIt.name);
    if (statusEl && ctrlEl) {
      if (labels.length > 0) {
        statusEl.innerText = '✨ Đang mặc thử!';
        ctrlEl.innerHTML = `<span class="tag" style="background:#FFF; border-color:#E91E63; color:#C2185B;">Đang thử: ${escapeHtml(labels.join(' + '))}</span>
          <button type="button" class="btn btn-sm" style="background:#7F8C8D; padding:3px 7px; font-size:11px;" onclick="resetFashionTryOn(true)">↩️ Mặc lại đồ gốc</button>`;
      } else {
        statusEl.innerText = '🪞 Gương Soi Thời Trang';
        ctrlEl.innerHTML = `<span class="tag" style="background:#FFF;">Đang mặc trang phục hiện tại</span>`;
      }
    }
  }

  function renderFashionStore(subTab?: string) {
    currentFashionTab = subTab || currentFashionTab;
    ['set', 'shirt', 'pants', 'hat', 'acc'].forEach((t) => {
      const btn = document.getElementById(`fashion-tab-${t}`);
      if (btn) {
        btn.style.outline = t === currentFashionTab ? '3px solid #2C3E50' : 'none';
        btn.style.transform = t === currentFashionTab ? 'scale(1.04)' : 'none';
        btn.style.opacity = t === currentFashionTab ? '1' : '0.82';
      }
    });
    const grid = document.getElementById('fashion-items-grid');
    if (!grid) return;
    const user = getCurrentUser();
    grid.innerHTML = FASHION_CATALOG.filter((i) => i.sub === currentFashionTab)
      .map((item: any) => {
        const owned = user.inventory.includes(item.id);
        const isTrying =
          (tryOnFashionState.setItem && tryOnFashionState.setItem.id === item.id) ||
          (tryOnFashionState.shirtItem && tryOnFashionState.shirtItem.id === item.id) ||
          (tryOnFashionState.pantsItem && tryOnFashionState.pantsItem.id === item.id) ||
          (tryOnFashionState.accItem && tryOnFashionState.accItem.id === item.id);
        return `
          <div class="card-item" style="${isTrying ? 'border-color:#E91E63; background:#FFF8FA;' : ''}">
            <div style="display:flex; gap:10px; align-items:flex-start;">
              ${renderFashionItemPreviewMini(item)}
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:13.5px; color:#2C3E50;">${item.icon} ${item.name}</div>
                <div style="font-size:11.5px; color:#555; margin-top:3px; line-height:1.35;">${item.desc}</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; gap:6px; flex-wrap:wrap;">
              <span class="points-pill">⭐ ${item.price}</span>
              <div style="display:flex; gap:5px; align-items:center;">
                <button type="button" class="btn btn-sm ${isTrying ? 'btn-purple' : 'btn-accent'}" onclick="tryOnFashionItem('${item.id}')">${isTrying ? '✨ Đang thử' : '👀 Try on'}</button>
                ${owned ? `<span class="tag" style="background:#D4EDDA;">🚪 Đã có</span>` : `<button type="button" class="btn btn-sm btn-primary" onclick="buyFashionItem('${item.id}')">Đổi điểm</button>`}
              </div>
            </div>
          </div>
        `;
      })
      .join('');
    drawFashionTryOnPreview();
  }

  function getSalonCost(): number {
    const user = getCurrentUser();
    let cost = 0;
    if (salonDraft.hairStyle !== (user.hairStyle || 'short')) cost += 15;
    if (salonDraft.hairColor.toLowerCase() !== (user.hairColor || '#2C3E50').toLowerCase()) cost += 10;
    return cost;
  }

  function updateSalonUI() {
    const hairGrid = document.getElementById('salon-hair-grid');
    const colGrid = document.getElementById('salon-haircolor-grid');
    if (hairGrid) {
      hairGrid.innerHTML = HAIR_STYLES_VISUAL.map(
        (h) => `<div class="visual-option-card ${salonDraft.hairStyle === h.id ? 'selected' : ''}" onclick="selectSalonHair('${h.id}')">${renderHairIconSVG(h.id, salonDraft.hairColor)}<span>${h.label}</span></div>`
      ).join('');
    }
    if (colGrid) {
      colGrid.innerHTML = HAIR_COLORS.map(
        (c) => `<div class="color-swatch ${salonDraft.hairColor.toLowerCase() === c.toLowerCase() ? 'selected' : ''}" style="background:${c};" onclick="selectSalonColor('${c}')"></div>`
      ).join('');
    }
    const costPill = document.getElementById('salon-cost-pill');
    if (costPill) costPill.innerText = `${getSalonCost()}⭐`;

    const pCanvas = document.getElementById('salon-preview-canvas') as HTMLCanvasElement | null;
    if (pCanvas) {
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        pCtx.fillStyle = '#F5EEF8';
        pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
        drawDetailedChibiOnContext(pCtx, { ...getCurrentUser(), x: 50, y: 82, dir: 'down', hairStyle: salonDraft.hairStyle, hairColor: salonDraft.hairColor, speech: null }, true, 1.18);
      }
    }
  }

  function renderSalonModal() {
    const user = getCurrentUser();
    salonDraft = { hairStyle: user.hairStyle || 'short', hairColor: user.hairColor || '#2C3E50' };
    updateSalonUI();
  }

  function renderVisualCharacterPickers() {
    const user = getCurrentUser();
    const setGrid = document.getElementById('visual-fashion-set-grid');
    if (setGrid) {
      const ownedSets = user.inventory.map((id) => FASHION_CATALOG.find((f) => f.id === id && f.sub === 'set')).filter(Boolean);
      setGrid.innerHTML =
        ownedSets.length === 0
          ? `<div style="grid-column:1/-1; font-size:12px; color:#666; padding:6px; background:#F8F9F9; border-radius:8px;">Chưa mua Set trang phục nào. Hãy ghé <b>👗 Cửa Hàng Thời Trang</b> trên phố!</div>`
          : ownedSets
              .map((st: any) => {
                const isApplied =
                  draftChar.shirtColor === st.shirtColor &&
                  draftChar.shirtPattern === st.shirtPattern &&
                  draftChar.pantsColor === st.pantsColor &&
                  draftChar.pantsStyle === st.pantsStyle;
                return `<div class="visual-option-card ${isApplied ? 'selected' : ''}" onclick="applyFashionSet('${st.id}')"><span style="font-size:24px;">${st.icon}</span><span>${st.name}</span></div>`;
              })
              .join('');
    }
    const shirtGrid = document.getElementById('visual-shirt-grid');
    if (shirtGrid) {
      const ownedShirts = user.inventory
        .map((id) => FASHION_CATALOG.find((f: any) => f.id === id && f.sub === 'shirt'))
        .filter(Boolean)
        .map((f: any) => ({ id: f.id, label: `👗 ${f.name.split(' ').slice(0, 3).join(' ')}`, color: f.shirtColor, pattern: f.shirtPattern }));
      const allShirts = [...SHIRT_VISUAL_OPTIONS, ...ownedShirts];
      shirtGrid.innerHTML = allShirts.map(
        (s) => `<div class="visual-option-card ${draftChar.shirtColor.toLowerCase() === s.color.toLowerCase() && draftChar.shirtPattern === s.pattern ? 'selected' : ''}" onclick="selectDraftShirt('${s.color}', '${s.pattern}')">${renderShirtIconSVG(s)}<span>${escapeHtml(s.label)}</span></div>`
      ).join('');
    }
    const pantsGrid = document.getElementById('visual-pants-grid');
    if (pantsGrid) {
      const ownedPants = user.inventory
        .map((id) => FASHION_CATALOG.find((f: any) => f.id === id && f.sub === 'pants'))
        .filter(Boolean)
        .map((f: any) => ({ id: f.id, label: `👗 ${f.name.split(' ').slice(0, 3).join(' ')}`, color: f.pantsColor, style: f.pantsStyle }));
      const allPants = [...PANTS_VISUAL_OPTIONS, ...ownedPants];
      pantsGrid.innerHTML = allPants.map(
        (p) => `<div class="visual-option-card ${draftChar.pantsColor.toLowerCase() === p.color.toLowerCase() && draftChar.pantsStyle === p.style ? 'selected' : ''}" onclick="selectDraftPants('${p.color}', '${p.style}')">${renderPantsIconSVG(p)}<span>${escapeHtml(p.label)}</span></div>`
      ).join('');
    }
    const outfitGrid = document.getElementById('visual-outfit-grid');
    if (outfitGrid) {
      const hatAcc = user.inventory
        .map((id) => FASHION_CATALOG.find((i) => i.id === id && (i.sub === 'hat' || i.sub === 'acc')))
        .filter(Boolean);
      outfitGrid.innerHTML =
        `<div class="visual-option-card ${draftChar.outfit === '' ? 'selected' : ''}" style="padding:5px 10px;" onclick="selectDraftOutfit('')"><span style="font-size:18px;">🚫</span><span>Không đeo</span></div>` +
        hatAcc
          .map(
            (item: any) => `<div class="visual-option-card ${draftChar.outfit === item.icon ? 'selected' : ''}" style="padding:5px 10px;" onclick="selectDraftOutfit('${item.icon}')"><span style="font-size:18px;">${item.icon}</span><span>${item.name.split(' ').slice(0, 2).join(' ')}</span></div>`
          )
          .join('');
    }
    drawCharPreview();
  }

  function drawCharPreview() {
    const pCanvas = document.getElementById('char-preview-canvas') as HTMLCanvasElement | null;
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    if (!pCtx) return;
    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#D6EAF8';
    pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    pCtx.fillStyle = '#AED6F1';
    pCtx.beginPath();
    pCtx.ellipse(55, 108, 36, 10, 0, 0, Math.PI * 2);
    pCtx.fill();
    const nameInput = document.getElementById('custom-char-name') as HTMLInputElement | null;
    const curU = getCurrentUser();
    drawDetailedChibiOnContext(
      pCtx,
      {
        id: curU.id,
        role: curU.role,
        x: 55, y: 88, dir: 'down',
        name: nameInput?.value.trim() || curU.name,
        ...draftChar,
        speech: null
      },
      true,
      1.25
    );
  }

  function renderCustomModal() {
    const user = getCurrentUser();
    const myRoom = getMemberPrivateRoom(user);
    const inOwnPrivateRoom = myRoom && user.scene === 'private_room' && (user.privateRoomId || activePrivateRoomId) === myRoom.id;
    const canUseWardrobe =
      isMemberAtOwnWardrobe(user) ||
      Boolean(myRoom && wardrobeOpenedRoomId === myRoom.id && (inOwnPrivateRoom || (user.scene === 'house' && getRoomAtPosition(user.x, user.y)?.id === myRoom.id)));

    const lockedBanner = document.getElementById('wardrobe-locked-banner');
    const controlsWrap = document.getElementById('wardrobe-controls-wrapper');
    if (lockedBanner) lockedBanner.style.display = canUseWardrobe ? 'none' : 'block';
    if (controlsWrap) controlsWrap.style.display = canUseWardrobe ? 'block' : 'none';

    const nameEl = document.getElementById('custom-char-name') as HTMLInputElement | null;
    if (nameEl) nameEl.value = user.name;
    draftChar = {
      hairStyle: user.hairStyle || 'short',
      hairColor: user.hairColor || '#2C3E50',
      shirtColor: user.shirtColor || '#2980B9',
      shirtPattern: user.shirtPattern || 'collar',
      pantsColor: user.pantsColor || '#34495E',
      pantsStyle: user.pantsStyle || 'pants',
      outfit: user.outfit || ''
    };
    renderVisualCharacterPickers();

    const privCheck = document.getElementById('room-privacy-toggle') as HTMLInputElement | null;
    const wallSel = document.getElementById('room-wall-color') as HTMLSelectElement | null;
    if (privCheck) privCheck.checked = user.roomUnlocked;
    if (wallSel) wallSel.value = user.roomWall || '#FADBD8';

    const decorInv = document.getElementById('room-decor-inventory');
    if (decorInv) {
      const ownedDecors = user.inventory.map((id) => SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor')).filter(Boolean);
      decorInv.innerHTML =
        ownedDecors.length === 0
          ? '<p style="font-size:12px; color:#666;">Hãy mua đồ nội thất ở Cửa hàng trước nhé!</p>'
          : ownedDecors
              .map(
                (d: any) => `<div class="card-item" style="flex-direction:row; align-items:center;"><span>${d.icon} <b>${d.name}</b></span><button class="btn btn-sm btn-accent" onclick="placeDecorInRoom('${d.id}')">Đặt tại chỗ đứng</button></div>`
              )
              .join('');
    }

    const lockH = document.getElementById('house-builder-locked');
    const ctrlH = document.getElementById('house-builder-controls');
    const plotSel = document.getElementById('house-plot-select') as HTMLSelectElement | null;
    const styleSel = document.getElementById('house-style-select') as HTMLSelectElement | null;
    if (isParent(user)) {
      if (lockH) lockH.style.display = 'none';
      if (ctrlH) ctrlH.style.display = 'block';
      if (plotSel) plotSel.value = String(state.house.plotIndex);
      if (styleSel) styleSel.value = state.house.style;
    } else {
      if (lockH) lockH.style.display = 'block';
      if (ctrlH) ctrlH.style.display = 'none';
    }
  }

  function renderDonateModal() {
    const user = getCurrentUser();
    const availEl = document.getElementById('donate-avail');
    if (availEl) availEl.innerText = String(user.points);
    const sel = document.getElementById('donate-recipient') as HTMLSelectElement | null;
    if (sel) {
      sel.innerHTML = state.members
        .filter((m) => m.id !== user.id)
        .map((m) => `<option value="${m.id}">${escapeHtml(m.name)} (${m.role}) - Có ${m.points}⭐</option>`)
        .join('');
    }
  }

  function renderFamilySyncModal() {
    const u = getCurrentUser();
    const lbl = document.getElementById('sync-cur-member-label');
    if (lbl) lbl.textContent = `${u.name} (${u.role})`;
    const pinLbl = document.getElementById('current-pin-label');
    if (pinLbl) pinLbl.textContent = isParent(u) ? `(Đang đặt: ${state.parentPin || '1234'})` : '(Đã ẩn)';
    const fbInput = document.getElementById('firebase-url-input') as HTMLInputElement | null;
    if (fbInput) fbInput.value = deviceConfig.firebaseUrl || '';
    const btnLock = document.getElementById('btn-toggle-device-lock');
    if (btnLock) {
      if (deviceConfig.isLockedToMember) {
        btnLock.textContent = `🔓 Tắt Khóa Máy (Đang khóa cho ${u.name})`;
        btnLock.className = 'btn btn-accent';
      } else {
        btnLock.textContent = `🔒 Bật Khóa Máy Cố Định Cho ${u.name}`;
        btnLock.className = 'btn btn-danger';
      }
    }
    const statusEl = document.getElementById('firebase-status-text');
    if (statusEl) {
      statusEl.textContent = deviceConfig.firebaseUrl
        ? '🟢 Đang kết nối Firebase: Tự động đồng bộ 4 máy mỗi 2.5 giây'
        : '⚪ Chế độ Offline: Dữ liệu đang lưu trên máy này';
    }
  }

  function getRemainingTvSeconds(member: Member): number {
    ensureMemberProps(member);
    if (isParent(member)) return Infinity;
    return Math.max(0, 1800 + (member.tvBonusSecondsToday || 0) - (member.tvSecondsUsedToday || 0));
  }

  function updateTvStatusUI() {
    const user = getCurrentUser();
    const rem = getRemainingTvSeconds(user);
    const timeEl = document.getElementById('tv-time-remaining');
    const actionEl = document.getElementById('tv-card-action');
    if (!timeEl || !actionEl) return;
    if (isParent(user)) {
      timeEl.innerHTML = `👑 Chế độ Bố/Mẹ: <b>Không giới hạn thời gian</b>`;
      actionEl.innerHTML = '';
    } else {
      const m = Math.floor(rem / 60);
      const s = rem % 60;
      const fmt = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      timeEl.innerHTML = `⏳ Thời gian xem YouTube còn lại hôm nay: <b style="color:${rem <= 120 ? '#E74C3C' : '#27AE60'};">${fmt}</b>`;
      const cardCount = user.inventory.filter((id) => id === 'tv_30min').length;
      actionEl.innerHTML =
        cardCount > 0
          ? `<button class="btn btn-sm btn-accent" onclick="useTvCardFromBag()">🎟️ Dùng Thẻ +30p (Có ${cardCount})</button>`
          : `<span class="tag">Hết thẻ +30p (Mua tại Siêu thị)</span>`;
    }
  }

  function openTvModal() {
    const user = getCurrentUser();
    ensureMemberProps(user);
    updateTvStatusUI();
    const rem = getRemainingTvSeconds(user);
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = rem > 0 ? `https://www.youtube.com/embed/${currentTvVideoId}?autoplay=1` : '';
    if (tvTimerInterval) clearInterval(tvTimerInterval);
    tvTimerInterval = window.setInterval(() => {
      const tvModal = document.getElementById('tv-modal');
      if (!tvModal || tvModal.style.display !== 'flex') {
        if (tvTimerInterval) clearInterval(tvTimerInterval);
        return;
      }
      const cur = getCurrentUser();
      if (!isParent(cur)) {
        if (getRemainingTvSeconds(cur) > 0) {
          cur.tvSecondsUsedToday = (cur.tvSecondsUsedToday || 0) + 1;
          saveGame();
        }
        if (getRemainingTvSeconds(cur) <= 0 && iframe) {
          iframe.src = '';
          showToast('⏰ Đã hết 30 phút xem YouTube hôm nay! Hãy dùng thẻ xem YouTube nếu có.');
        }
      }
      updateTvStatusUI();
    }, 1000);
  }

  function getUnreadSummaryByChannel(me: Member) {
    const cutoff = Date.now() - MSG_RETENTION_MS;
    const channelUnreadCount: Record<string, number> = { family_group: 0 };
    const channelSenders: Record<string, string[]> = { family_group: [] };

    (state.familyMessages as any[]).forEach((msg) => {
      if ((msg.ts || 0) < cutoff || msg.senderId === me.id) return;
      const isForMe = msg.recipientId === 'family_group' || msg.recipientId === me.id;
      if (!isForMe) return;
      const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
      if (readBy.includes(me.id)) return;
      const chKey = msg.recipientId === 'family_group' ? 'family_group' : msg.senderId;
      channelUnreadCount[chKey] = (channelUnreadCount[chKey] || 0) + 1;
      const sObj = state.members.find((x) => x.id === msg.senderId);
      const sName = sObj ? sObj.name : msg.senderName || 'Gia đình';
      if (!channelSenders[chKey]) channelSenders[chKey] = [];
      if (!channelSenders[chKey].includes(sName)) channelSenders[chKey].push(sName);
    });

    const allUnreadSenders: string[] = [];
    Object.values(channelSenders).forEach((names) => {
      names.forEach((n) => {
        if (!allUnreadSenders.includes(n)) allUnreadSenders.push(n);
      });
    });

    return { channelUnreadCount, channelSenders, allUnreadSenders };
  }

  function renderSmartphoneScreen() {
    const body = document.getElementById('phone-screen-body');
    if (!body) return;
    const me = getCurrentUser();
    const lighting = getRealTimeLighting();
    const locText = getMemberLocationText(me);
    const unreadTotal = getUnreadMessageCount(me);
    const unreadSummary = getUnreadSummaryByChannel(me);
    const pendingTasks = getPendingTasksCountForMember(me);
    const statusTime = document.getElementById('phone-status-time');
    if (statusTime) statusTime.textContent = lighting.label;

    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    if (smartphoneCurrentView === 'home') {
      const senderHint =
        unreadSummary.allUnreadSenders.length > 0
          ? `<div style="font-size:10.5px; color:#DC2626; font-weight:700;">Mới từ: ${escapeHtml(unreadSummary.allUnreadSenders.join(', '))}</div>`
          : `<div style="font-size:10.5px; color:#666;">Nhắn tin (Lưu 72h)</div>`;
      body.innerHTML = `
        <div style="background:rgba(255,255,255,0.92); border:2.5px solid #2C3E50; border-radius:18px; padding:12px; margin-bottom:14px; box-shadow:0 3px 0 #2C3E50;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
            <div style="width:44px; height:44px; border-radius:50%; background:#FFE66D; border:2.5px solid #2C3E50; display:flex; align-items:center; justify-content:center; font-size:24px;">${me.outfit || getRoleEmoji(me.role)}</div>
            <div>
              <div style="font-weight:700; font-size:15px; color:#2C3E50;">${escapeHtml(me.name)} <span class="tag">${me.role}</span></div>
              <div style="font-size:11.5px; color:#555;">${escapeHtml(brand)} SmartOS PWA${currentWeather ? ` • ${currentWeather.icon} ${currentWeather.tempC}°C` : ''}</div>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#FEF9E7; border:2px solid #F39C12; border-radius:12px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#7E5109; font-weight:600;">⭐ Điểm hiện có</div>
              <div id="phone-home-points" style="font-size:17px; font-weight:700; color:#D35400;">${me.points}⭐</div>
            </div>
            <div style="background:#EBF5FB; border:2px solid #2980B9; border-radius:12px; padding:8px; text-align:center;">
              <div style="font-size:11px; color:#1B4F72; font-weight:600;">🕒 Thời gian</div>
              <div style="font-size:14px; font-weight:700; color:#1B4F72; margin-top:2px;">${lighting.label}</div>
            </div>
          </div>
          <div style="margin-top:8px; background:#EAFAF1; border:2px solid #27AE60; border-radius:12px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11.5px; font-weight:600; color:#145A32;">📍 Vị trí:</span>
            <span id="phone-home-loc" style="font-size:12px; font-weight:700; color:#1E8449;">${locText}</span>
          </div>
        </div>
        <div style="font-size:12px; font-weight:700; color:#2C3E50; margin-bottom:8px; padding-left:4px;">📱 Ứng dụng của ${escapeHtml(me.name)}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <button type="button" class="phone-app-icon-btn" style="${unreadTotal > 0 ? 'border-color:#EF4444; background:#FEF2F2;' : ''}" onclick="switchSmartphoneView('messenger')">
            ${unreadTotal > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px;">${unreadTotal}</span>` : ''}
            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #00B2FF, #006AFF); display:flex; align-items:center; justify-content:center; font-size:25px; color:#FFF; border:2px solid #2C3E50;">💬</div>
            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Messenger</div>
            ${senderHint}
          </button>
          <button type="button" class="phone-app-icon-btn" onclick="switchSmartphoneView('tasks')">
            ${pendingTasks > 0 ? `<span class="unread-badge-dot" style="top:-6px; right:-6px; background:#F39C12; color:#2C3E50;">${pendingTasks}</span>` : ''}
            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg, #FF6B6B, #EE5253); display:flex; align-items:center; justify-content:center; font-size:25px; color:#FFF; border:2px solid #2C3E50;">📋</div>
            <div style="font-weight:700; font-size:13px; color:#2C3E50;">Tasks</div>
            <div style="font-size:10.5px; color:#666;">Việc nhà & Đồng đội</div>
          </button>
          <button type="button" class="phone-app-icon-btn" style="grid-column:span 2; ${activeNavTargetId ? 'border-color:#16A34A; background:#ECFDF5;' : ''}" onclick="switchSmartphoneView('maps')">
            ${activeNavTargetId ? `<span class="unread-badge-dot" style="top:-6px; right:-6px; background:#16A34A;">ON</span>` : ''}
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:44px; height:44px; border-radius:13px; background:linear-gradient(135deg, #10B981, #0284C7); display:flex; align-items:center; justify-content:center; font-size:24px; color:#FFF; border:2px solid #2C3E50;">🗺️</div>
              <div style="text-align:left;">
                <div style="font-weight:700; font-size:13.5px; color:#2C3E50;">Chỉ Đường (${escapeHtml(brand)} Maps)</div>
                <div style="font-size:10.5px; color:${activeNavTargetId ? '#15803D' : '#666'}; font-weight:${activeNavTargetId ? '700' : '400'};">
                  ${activeNavTargetId ? `🧭 Đang dẫn tới: ${escapeHtml(getResolvedNavTarget()?.name || '')}` : 'Chọn địa điểm để bật mũi tên Minimap'}
                </div>
              </div>
            </div>
          </button>
        </div>
      `;
      return;
    }

    if (smartphoneCurrentView === 'messenger') {
      pruneExpiredFamilyMessages();
      // Compute unread channels & newly read bubbles BEFORE marking current channel read
      const beforeSummary = getUnreadSummaryByChannel(me);
      const newlyReadIds = new Set<string>();
      let changed = false;
      (state.familyMessages as any[]).forEach((msg) => {
        if (msg.senderId === me.id) return;
        const match =
          smartphoneChatTargetId === 'family_group'
            ? msg.recipientId === 'family_group'
            : (msg.senderId === smartphoneChatTargetId && msg.recipientId === me.id) || (msg.senderId === me.id && msg.recipientId === smartphoneChatTargetId);
        if (match) {
          if (!Array.isArray(msg.readBy)) msg.readBy = [];
          if (!msg.readBy.includes(me.id)) {
            if (msg.id) newlyReadIds.add(String(msg.id));
            msg.readBy.push(me.id);
            changed = true;
          }
        }
      });
      if (changed) {
        lastHudSignature = '';
        updateHUD();
        saveGame();
      }

      const channels = [
        { id: 'family_group', label: '👨‍👩‍👧‍👦 Nhóm Gia Đình' },
        ...state.members.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, label: `${m.outfit || getRoleEmoji(m.role)} ${m.name}` }))
      ];
      const otherUnreadChannels = channels.filter(
        (ch) => ch.id !== smartphoneChatTargetId && (beforeSummary.channelUnreadCount[ch.id] || 0) > 0
      );
      const msgs = (state.familyMessages as any[]).filter((msg) =>
        smartphoneChatTargetId === 'family_group'
          ? msg.recipientId === 'family_group'
          : (msg.senderId === me.id && msg.recipientId === smartphoneChatTargetId) || (msg.senderId === smartphoneChatTargetId && msg.recipientId === me.id)
      );

      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#006AFF;">💬 Family Messenger</b>
          <span class="tag" style="background:#D6EAF8; font-size:10px;">Lưu 72h</span>
        </div>
        <div style="display:flex; gap:5px; overflow-x:auto; padding-bottom:6px; margin-bottom:6px;">
          ${channels
            .map((ch) => {
              const active = smartphoneChatTargetId === ch.id;
              const unreadForCh = active ? 0 : (beforeSummary.channelUnreadCount[ch.id] || 0);
              const sendersForCh = beforeSummary.channelSenders[ch.id] || [];
              const extraLabel =
                unreadForCh > 0
                  ? ch.id === 'family_group' && sendersForCh.length > 0
                    ? ` 🔴${unreadForCh} (${sendersForCh.join(', ')})`
                    : ` 🔴${unreadForCh}`
                  : '';
              return `<button type="button" class="btn btn-sm ${active ? 'btn-primary' : unreadForCh > 0 ? 'phone-unread-channel' : ''}" style="${active ? '' : unreadForCh > 0 ? '' : 'background:#FFF; color:#2C3E50;'} flex-shrink:0;" onclick="switchSmartphoneView('messenger', '${ch.id}')">${escapeHtml(ch.label + extraLabel)}</button>`;
            })
            .join('')}
        </div>
        ${otherUnreadChannels.length > 0 ? `
          <div style="background:#FEF2F2; border:2px solid #EF4444; border-radius:10px; padding:6px 8px; margin-bottom:6px; font-size:11.5px; color:#991B1B; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span>🔔 <b>Tin nhắn mới từ:</b></span>
            ${otherUnreadChannels
              .map((ch) => {
                const cnt = beforeSummary.channelUnreadCount[ch.id] || 0;
                const sNames = (beforeSummary.channelSenders[ch.id] || []).join(', ');
                const titleTxt = ch.id === 'family_group' ? `Nhóm (${sNames})` : ch.label;
                return `<button type="button" class="btn btn-sm btn-danger" style="padding:2px 7px; font-size:11px;" onclick="switchSmartphoneView('messenger', '${ch.id}')">${escapeHtml(titleTxt)} (${cnt})</button>`;
              })
              .join('')}
          </div>
        ` : ''}
        <div id="phone-msg-feed" style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.85); border:2px solid #2C3E50; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:8px; margin-bottom:8px;">
          ${msgs.length === 0
            ? `<div style="text-align:center; color:#7F8C8D; font-size:12px; margin:auto;">Chưa có tin nhắn nào trong 72 giờ qua.</div>`
            : msgs
                .map((m) => {
                  const isMine = m.senderId === me.id;
                  const sObj = state.members.find((x) => x.id === m.senderId);
                  const isFreshUnread = !isMine && m.id && newlyReadIds.has(String(m.id));
                  return `<div class="msg-bubble-row ${isMine ? 'me' : 'other'}${isFreshUnread ? ' msg-unread-new' : ''}"><div style="font-size:10px; color:#555; margin-bottom:2px; font-weight:600;">${isMine ? 'Bạn' : escapeHtml(sObj ? sObj.name : m.senderName)} • ${formatTimestamp(m.ts)} ${isFreshUnread ? '<span class="tag" style="background:#EF4444; color:#FFF; border-color:#B91C1C; font-size:9px;">MỚI</span>' : ''}</div><div class="msg-bubble">${escapeHtml(m.text)}</div></div>`;
                })
                .join('')}
        </div>
        <div style="display:flex; gap:6px;">
          <input type="text" id="phone-msg-input" placeholder="Nhập tin nhắn..." style="flex:1; padding:7px 9px; border:2px solid #2C3E50; border-radius:10px; font-size:13px;" onkeypress="if(event.key==='Enter') sendSmartphoneMessage()">
          <button type="button" class="btn btn-primary btn-sm" onclick="sendSmartphoneMessage()">Gửi ➤</button>
        </div>
      `;
      const feed = document.getElementById('phone-msg-feed');
      if (feed) feed.scrollTop = feed.scrollHeight;
      return;
    }

    if (smartphoneCurrentView === 'tasks') {
      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#C0392B;">📋 Tasks & Đồng Đội</b>
          <span class="points-pill">${me.points}⭐</span>
        </div>
        <div id="phone-parent-task-creator" style="display:${isParent(me) ? 'block' : 'none'}; background:#FFF8E7; padding:9px; border:2px solid #2C3E50; border-radius:10px; margin-bottom:10px;">
          <div style="font-weight:700; font-size:12.5px; margin-bottom:6px;">➕ Giao việc / Đồng đội cho con</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
            <select id="phone-task-type" onchange="togglePhoneHomeworkUpload()" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
              <option value="chore">🧹 Việc nhà</option>
              <option value="homework">📚 Bài tập</option>
              <option value="family_quest">🤝 Đồng đội</option>
            </select>
            <select id="phone-task-assignee" style="padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
              ${state.members.filter((m) => !isParent(m)).map((kid) => `<option value="${kid.id}">${escapeHtml(kid.name)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:6px; margin-bottom:6px;">
            <input type="text" id="phone-task-title" placeholder="Tên nhiệm vụ..." style="flex:1; padding:5px 7px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
            <input type="number" id="phone-task-reward" value="20" min="5" max="100" style="width:62px; padding:5px; border:2px solid #2C3E50; border-radius:6px; font-size:12px;">
          </div>
          <div id="phone-parent-file-group" style="display:none; margin-bottom:6px;">
            <input type="file" id="phone-task-parent-file" accept="image/*,.pdf,.doc,.docx,.txt" style="font-size:11px; width:100%;">
          </div>
          <button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick="createTaskFromSmartphone()">Giao nhiệm vụ ngay</button>
        </div>
        <div id="phone-tasks-list" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
          ${state.tasks.length === 0 ? '<p style="color:#666; text-align:center; font-size:12.5px;">Chưa có nhiệm vụ nào.</p>' : state.tasks.slice().reverse().map((t) => buildTaskCardHtml(t, me, true)).join('')}
        </div>
      `;
      return;
    }

    if (smartphoneCurrentView === 'maps') {
      const currentTarget = getResolvedNavTarget();
      const resolvedLocs = resolveNeighborhoodLocations(state);
      const listHtml = resolvedLocs.map((loc) => {
        const distM = me.scene === 'neighborhood' ? Math.round(Math.hypot(me.x - loc.x, me.y - loc.y) / 10) : null;
        const isCurrent = currentTarget?.id === loc.id;
        return `
          <div style="background:${isCurrent ? '#ECFDF5' : '#FFFFFF'}; border:2px solid ${isCurrent ? '#16A34A' : '#2C3E50'}; border-radius:12px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:12.5px; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${loc.icon} ${escapeHtml(loc.name)}</div>
              <div style="font-size:10.5px; color:#64748B;">${distM !== null ? `📏 Cách ${distM}m` : '🏘️ Ngoài khu phố'}</div>
            </div>
            ${isCurrent
              ? `<button type="button" class="btn btn-sm btn-danger" onclick="cancelNavigationTarget(); renderSmartphoneScreen()">✖ Hủy</button>`
              : `<button type="button" class="btn btn-sm btn-primary" onclick="setNavigationTarget('${loc.id}')">🧭 Đi tới</button>`}
          </div>
        `;
      }).join('');

      body.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <button type="button" class="btn btn-sm" style="background:#34495E;" onclick="switchSmartphoneView('home')">◀ Trang chủ</button>
          <b style="font-size:14px; color:#0F766E;">🗺️ Chỉ Đường ${escapeHtml(brand)}</b>
          <span class="tag" style="background:#CCFBF1; font-size:10px;">Minimap</span>
        </div>
        ${currentTarget ? `
          <div style="background:#FEF3C7; border:2px solid #D97706; border-radius:10px; padding:8px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <div style="font-size:11.5px; font-weight:700; color:#92400E;">🧭 Đang chỉ đường tới:<br>${currentTarget.icon} ${escapeHtml(currentTarget.name)}</div>
            <button type="button" class="btn btn-sm btn-danger" onclick="cancelNavigationTarget(); renderSmartphoneScreen()">❌ Hủy</button>
          </div>
        ` : `
          <div style="background:#E0F2FE; border:1.5px solid #0284C7; border-radius:10px; padding:7px 9px; margin-bottom:8px; font-size:11.5px; color:#0369A1;">
            💡 Chọn địa điểm bên dưới để hiện <b>mũi tên chỉ đường</b> trên Minimap góc phải!
          </div>
        `}
        <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:7px; padding-right:2px;">
          ${listHtml}
        </div>
      `;
    }
  }

  function renderDiningFoodPuzzle() {
    const body = document.getElementById('dining-puzzle-body');
    if (!body || !activeFoodPuzzle) return;
    const { item, hiddenSet, eatStatus } = activeFoodPuzzle;
    let statusBanner = '';
    if (eatStatus.isParent) statusBanner = `<div class="tag" style="background:#D6EAF8; margin-bottom:8px;">👑 Chế độ Bố/Mẹ: Giải đố vui cùng con</div>`;
    else if (eatStatus.canEarn) statusBanner = `<div class="tag" style="background:#D4EDDA; color:#145A32; margin-bottom:8px;">⭐ Hoàn thành đúng nhận +2⭐ (Lượt ${eatStatus.count + 1}/${eatStatus.maxPerDay} hôm nay)</div>`;
    else if (eatStatus.capped) statusBanner = `<div class="tag" style="background:#FADBD8; color:#922B21; margin-bottom:8px;">🍽️ Đã nhận đủ ${eatStatus.maxPerDay}/${eatStatus.maxPerDay} lượt điểm ăn cơm hôm nay!</div>`;
    else statusBanner = `<div class="tag" style="background:#FEF9E7; color:#7E5109; margin-bottom:8px;">⏳ Chờ ${Math.max(1, Math.ceil(eatStatus.remainMs / 60000))} phút nữa để nhận sao tiếp!</div>`;

    const slotsHtml = item.word
      .split('')
      .map((ch: string, idx: number) =>
        !hiddenSet.has(idx)
          ? `<span class="puzzle-letter-slot">${ch}</span>`
          : `<input type="text" maxlength="1" class="puzzle-letter-slot missing" id="food-slot-${idx}" oninput="handleFoodPuzzleSlotInput(${idx}, this)" onkeydown="handleFoodPuzzleSlotKeydown(event, ${idx})" style="text-align:center; padding:0; outline:none;">`
      )
      .join('');

    body.innerHTML = `
      ${statusBanner}
      <div style="background:#FFF8E7; border:2.5px solid #2C3E50; border-radius:16px; padding:14px; margin-bottom:12px;">
        <div style="font-size:74px; line-height:1.1;">${item.emoji}</div>
        <div style="font-size:13px; color:#7E5109; font-weight:600; margin-top:6px;">💡 Gợi ý: ${item.hint}</div>
      </div>
      <div style="font-weight:700; font-size:14px; color:#2C3E50; margin-bottom:8px;">Điền các chữ cái tiếng Anh còn thiếu:</div>
      <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap; margin-bottom:14px;">${slotsHtml}</div>
      <div id="dining-puzzle-feedback" style="min-height:22px; font-size:13px; font-weight:700; margin-bottom:10px;"></div>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button type="button" class="btn btn-accent" onclick="openDiningFoodPuzzleModal()">🔄 Đổi món khác</button>
        <button type="button" class="btn btn-primary" onclick="submitDiningFoodPuzzle()">✅ Kiểm tra & Ăn cơm</button>
      </div>
    `;
    const firstEl = document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[0]}`);
    if (firstEl) setTimeout(() => firstEl.focus(), 50);
  }

  function renderChatLog() {
    const list = document.getElementById('chat-log-list');
    if (!list) return;
    list.innerHTML = state.chatHistory
      .map(
        (m) => `<div style="padding:4px 8px; border-radius:6px; background:${m.isEng ? '#D4EDDA' : '#F1F5F9'};"><b>${escapeHtml(m.sender)}:</b> ${escapeHtml(m.text)} ${m.isEng ? '<b style="color:#28A745;">(+5⭐ EN)</b>' : ''}</div>`
      )
      .join('');
    list.scrollTop = list.scrollHeight;
  }

  /* ==================== 17. GLOBAL WINDOW & REACT BRIDGE BINDINGS ==================== */
  function selectMemberById(memberId: string) {
    AudioEngine.playClick();
    state.currentUserId = memberId;
    deviceConfig.currentMemberId = memberId;
    saveDeviceConfig();
    const menu = document.getElementById('member-dropdown-menu');
    if (menu) menu.classList.remove('open');
    lastHudSignature = '';
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
    showToast(`👤 Đang điều khiển: ${getCurrentUser().name}`);
  }

  function openSmartphoneModal(initialView: 'home' | 'messenger' | 'tasks' | 'maps' = 'home') {
    AudioEngine.init();
    AudioEngine.playClick();
    pruneExpiredFamilyMessages();
    smartphoneCurrentView = initialView;
    const modal = document.getElementById('smartphone-modal');
    if (modal) modal.style.display = 'flex';
    renderSmartphoneScreen();
  }

  function renderPetShopModal() {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    const ptsPill = document.getElementById('pet-shop-points-pill');
    if (ptsPill) ptsPill.textContent = `${user.points}⭐`;

    const isHudCollection = petModalMode === 'hud_collection';
    if (isHudCollection) petShopTab = 'my_pets';

    const titleEl = document.getElementById('pet-modal-title');
    if (titleEl) {
      titleEl.textContent = isHudCollection
        ? '🐾 Thú Cưng Đồng Hành & Bộ Sưu Tập'
        : `🐾 Cửa Hàng & Chăm Sóc Thú Cưng ${brand}`;
    }
    const npcBanner = document.getElementById('pet-shop-npc-banner');
    if (npcBanner) npcBanner.style.display = isHudCollection ? 'none' : 'flex';
    const hudBanner = document.getElementById('pet-hud-guide-banner');
    if (hudBanner) hudBanner.style.display = isHudCollection ? 'flex' : 'none';
    const tabsBar = document.getElementById('pet-shop-tabs');
    if (tabsBar) tabsBar.style.display = isHudCollection ? 'none' : 'flex';

    (['eggs', 'food', 'accessories', 'my_pets'] as const).forEach((t) => {
      const btn = document.getElementById(`pet-tab-${t}`);
      if (btn) btn.style.background = petShopTab === t ? '#D97706' : '#64748B';
    });

    const body = document.getElementById('pet-shop-body');
    if (!body) return;

    if (!isHudCollection && petShopTab === 'eggs') {
      body.innerHTML = `
        <div style="background:#FFFBEB; border:1.5px solid #F59E0B; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; color:#92400E;">
          🎲 <b>Tỉ lệ nở ngẫu nhiên khi ấp thành công:</b> Giới tính (50% ♂️ / 50% ♀️) • Màu hiếm (${PET_VARIANT_DEFS.map((v) => `${v.label} ${v.chancePercent}%`).join(' • ')})
        </div>
        <div class="grid-2">${PET_SPECIES.map((sp) => {
          const s1 = sp.stages[1];
          const s4 = sp.stages[4];
          return `
            <div class="card-item" style="background:linear-gradient(180deg,#FFFFFF 0%, ${sp.accentColor} 100%); border-color:${sp.primaryColor};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="flex-shrink:0; background:#FFF; border-radius:12px; padding:4px; border:2px solid ${sp.primaryColor};">${renderPetArtSVG(sp.id, 0, 58)}</div>
                <div style="min-width:0;">
                  <b style="font-size:14px; color:#1E293B;">${escapeHtml(sp.eggName)}</b>
                  <div style="font-size:11px; color:${sp.primaryColor}; font-weight:700;">➔ Nở thành: ${escapeHtml(sp.name)}</div>
                  <div style="font-size:11px; color:#475569; margin-top:2px;">${escapeHtml(sp.statLabel)}</div>
                </div>
              </div>
              <div style="font-size:11.5px; color:#334155;">${escapeHtml(sp.desc)}</div>
              <div style="background:rgba(255,255,255,0.85); border-radius:8px; padding:5px 7px; font-size:10.5px; color:#475569;">
                • GĐ1: +${s1.speedBonus} Tốc độ, +${s1.starBonus}⭐<br>
                • GĐ4 (${escapeHtml(s4.title)}): <b>+${s4.speedBonus} Tốc độ, +${s4.starBonus}⭐</b>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span class="points-pill" style="font-size:12.5px;">⭐ ${sp.eggPrice}</span>
                <button type="button" class="btn btn-sm btn-primary" onclick="buyPetEgg('${sp.id}')">🥚 Đổi Điểm Nhận Trứng</button>
              </div>
            </div>
          `;
        }).join('')}</div>`;
      return;
    }

    if (!isHudCollection && petShopTab === 'food') {
      const foodInv = user.petFoodInventory || {};
      body.innerHTML = `<div class="grid-2">${PET_FOOD_CATALOG.map((fd) => {
        const count = foodInv[fd.id] || 0;
        return `
          <div class="card-item" style="background:#FFF;">
            <div style="display:flex; gap:10px; align-items:center;">
              <div style="font-size:36px; background:#FEF3C7; width:56px; height:56px; border-radius:12px; border:2px solid #F59E0B; display:flex; align-items:center; justify-content:center;">${fd.icon}</div>
              <div>
                <b style="font-size:14px;">${escapeHtml(fd.name)}</b>
                <div style="font-size:11.5px; color:#059669; font-weight:700;">+${fd.xpGain} XP • +${fd.hungerGain}% No bụng</div>
                <div style="font-size:11px; color:#64748B; margin-top:2px;">Trong túi: <b>${count}</b> phần</div>
              </div>
            </div>
            <div style="font-size:11.5px; color:#475569;">${escapeHtml(fd.desc)}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="points-pill">⭐ ${fd.price}</span>
              <button type="button" class="btn btn-sm btn-accent" onclick="buyPetFood('${fd.id}')">🛒 Mua Thức Ăn</button>
            </div>
          </div>
        `;
      }).join('')}</div>`;
      return;
    }

    if (!isHudCollection && petShopTab === 'accessories') {
      const ownedAccs = user.petAccessories || [];
      body.innerHTML = `
        <div style="background:#FDF2F8; border:1.5px solid #EC4899; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; color:#9D174D;">
          🎀 Mua phụ kiện một lần để mặc cho bất kỳ thú cưng đã nở nào trong <b>Bộ Sưu Tập</b> của bạn!
        </div>
        <div class="grid-2">${PET_ACCESSORY_CATALOG.map((acc) => {
          const isOwned = ownedAccs.includes(acc.id);
          return `
            <div class="card-item" style="background:${isOwned ? '#F0FDF4' : '#FFF'}; border-color:${isOwned ? '#16A34A' : '#2C3E50'};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="font-size:34px; background:#FCE7F3; width:54px; height:54px; border-radius:12px; border:2px solid #EC4899; display:flex; align-items:center; justify-content:center;">${acc.icon}</div>
                <div>
                  <b style="font-size:14px;">${escapeHtml(acc.name)}</b>
                  <div style="font-size:11px; color:#64748B; margin-top:2px;">${escapeHtml(acc.desc)}</div>
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span class="points-pill">⭐ ${acc.price}</span>
                ${isOwned
                  ? '<span class="tag" style="background:#DCFCE7; color:#15803D; border-color:#16A34A;">✅ Đã sở hữu (Vào Bộ Sưu Tập để đeo)</span>'
                  : `<button type="button" class="btn btn-sm btn-primary" onclick="buyPetAccessory('${acc.id}')">🛍️ Mua Phụ Kiện</button>`}
              </div>
            </div>
          `;
        }).join('')}</div>
      `;
      return;
    }

    // Tab: my_pets (Collection, Rename, Variant & Gender, Egg Hatching, Feeding, Accessories, Companion Toggle)
    const pets = user.pets || [];
    const foodInv = user.petFoodInventory || {};
    const ownedAccs = user.petAccessories || [];
    const foodChips = PET_FOOD_CATALOG.map((fd) => `${fd.icon} ${fd.name}: <b>${foodInv[fd.id] || 0}</b>`).join(' · ');

    if (pets.length === 0) {
      body.innerHTML = `
        <div style="text-align:center; background:#FFF; border:2.5px dashed #F59E0B; border-radius:14px; padding:24px 16px;">
          <div style="font-size:40px;">🥚🐾</div>
          <div style="font-weight:700; font-size:15px; color:#92400E; margin-top:6px;">Bạn chưa có Quả Trứng hay Thú Cưng nào!</div>
          <div style="font-size:12.5px; color:#64748B; margin:6px 0 12px;">Hãy làm nhiệm vụ chăm chỉ và ghé <b>🐾 Cửa Hàng Thú Cưng ${escapeHtml(brand)}</b> trên bản đồ để đổi sao lấy trứng nhé!</div>
          ${isHudCollection
            ? '<button type="button" class="btn btn-accent" onclick="navigateToPetShopFromHud()">🧭 Chỉ đường tới Cửa Hàng Thú Cưng</button>'
            : '<button type="button" class="btn btn-primary" onclick="switchPetShopTab(\'eggs\')">🥚 Xem Cửa Hàng Trứng</button>'}
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <div style="background:#FFF; border:2px solid #F59E0B; border-radius:10px; padding:7px 10px; margin-bottom:10px; font-size:11.5px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
        <span>🍖 <b>Thức ăn trong túi:</b> ${foodChips}</span>
        ${isHudCollection
          ? `<span style="font-size:11px; color:#B45309; font-weight:700;">Mua thức ăn & phụ kiện tại Cửa Hàng Thú Cưng ${escapeHtml(brand)}</span>`
          : '<button type="button" class="btn btn-sm btn-accent" onclick="switchPetShopTab(\'food\')">➕ Mua thêm</button>'}
      </div>
      <div class="grid-2">
        ${pets.map((pet) => {
          const sp = getPetSpecies(pet.speciesId);
          const stageDef = sp.stages.find((s) => s.stage === pet.stage) || sp.stages[0];
          const isEquipped = user.activePetId === pet.id;
          const nextReq = pet.hatched ? getNextStageRequirement(sp, pet.stage) : null;
          const variantDef = getPetVariantDef(pet.variant);
          const genderLabel = pet.gender === 'male' ? '♂️ Đực' : '♀️ Cái';
          const genderColor = pet.gender === 'male' ? '#0284C7' : '#DB2777';
          const equippedAcc = getPetAccessoryDef(pet.accessoryId);
          const xpText = nextReq
            ? `XP: <b>${pet.xp}/${nextReq.minXp}</b> (Lên ${escapeHtml(nextReq.nextStageTitle)})`
            : `XP: <b>${pet.xp}</b> (👑 Cấp Tối Thượng!)`;

          let actionHtml = '';
          if (!pet.hatched) {
            actionHtml = pet.hatchProgress >= 100
              ? `<button type="button" class="btn btn-sm btn-primary" style="width:100%;" onclick="hatchOwnedPet('${pet.id}')">🐣 NỞ TRỨNG NGAY!</button>`
              : `<button type="button" class="btn btn-sm btn-accent" style="width:100%;" onclick="warmPetEgg('${pet.id}')">🔥 Ủ Ấm Trứng (+35% tiến độ)</button>`;
          } else {
            const feedBtns = PET_FOOD_CATALOG.map((fd) => {
              const cnt = foodInv[fd.id] || 0;
              return `<button type="button" class="btn btn-sm" style="background:${cnt > 0 ? '#10B981' : '#CBD5E1'}; color:${cnt > 0 ? '#FFF' : '#475569'}; font-size:11px;" ${cnt > 0 ? '' : 'disabled'} onclick="feedOwnedPet('${pet.id}', '${fd.id}')">${fd.icon} Cho ăn (${cnt})</button>`;
            }).join('');
            const accButtons =
              ownedAccs.length > 0
                ? `<div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap; margin-top:2px;">
                     <span style="font-size:10.5px; color:#64748B; font-weight:700;">🎀 Đeo:</span>
                     <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:10.5px; background:${!pet.accessoryId ? '#1E293B' : '#E2E8F0'}; color:${!pet.accessoryId ? '#FFF' : '#334155'};" onclick="equipPetAccessory('${pet.id}', '')">Bỏ</button>
                     ${ownedAccs.map((aid) => {
                       const ad = getPetAccessoryDef(aid);
                       if (!ad) return '';
                       const on = pet.accessoryId === aid;
                       return `<button type="button" class="btn btn-sm" title="${escapeHtml(ad.name)}" style="padding:2px 6px; font-size:11px; background:${on ? '#DB2777' : '#FCE7F3'}; color:${on ? '#FFF' : '#831843'};" onclick="equipPetAccessory('${pet.id}', '${aid}')">${ad.icon}</button>`;
                     }).join('')}
                   </div>`
                : `<div style="font-size:10px; color:#94A3B8;">🎀 Ghé tab Phụ Kiện tại Cửa Hàng để làm đẹp cho bé!</div>`;
            actionHtml = `<div style="display:flex; gap:4px; flex-wrap:wrap;">${feedBtns}</div>${accButtons}`;
          }

          return `
            <div class="card-item" style="background:${isEquipped ? '#FFFBEB' : '#FFF'}; border-color:${isEquipped ? '#D97706' : '#2C3E50'};">
              <div style="display:flex; gap:10px; align-items:center;">
                <div style="flex-shrink:0; background:${sp.accentColor}; border-radius:12px; padding:4px; border:2px solid ${sp.primaryColor};">
                  ${renderPetArtSVG(sp.id, pet.stage, 64, { variant: pet.variant, gender: pet.gender, accessoryId: pet.accessoryId })}
                </div>
                <div style="min-width:0; flex:1;">
                  <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap; margin-bottom:3px;">
                    <input type="text" id="pet-name-input-${pet.id}" value="${escapeHtml(pet.nickname)}" maxlength="20" style="width:112px; font-size:13px; font-weight:700; padding:2px 6px; border:1.5px solid #CBD5E1; border-radius:6px; color:#0F172A;" />
                    <button type="button" class="btn btn-sm" style="padding:2px 6px; font-size:10.5px; background:#0284C7;" onclick="renameOwnedPet('${pet.id}')" title="Lưu tên thú cưng">✏️</button>
                    <span class="tag" style="background:${sp.accentColor}; color:#1E293B; border-color:${sp.primaryColor};">${getPetStageBadgeLabel(pet.stage)}</span>
                  </div>
                  <div style="font-size:11.5px; font-weight:700; color:${sp.primaryColor}; margin-top:2px;">${escapeHtml(stageDef.title)} ${pet.hatched ? `• Lv.${pet.level}` : ''}</div>
                  ${pet.hatched ? `
                    <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:3px;">
                      <span class="tag" style="font-size:10px; background:#F8FAFC; color:${genderColor}; border-color:${genderColor};">${genderLabel}</span>
                      <span class="tag" style="font-size:10px; background:#FFF; color:${variantDef.badgeColor}; border-color:${variantDef.badgeColor};">🎨 ${escapeHtml(variantDef.label)}</span>
                      ${equippedAcc ? `<span class="tag" style="font-size:10px; background:#FCE7F3; color:#9D174D; border-color:#EC4899;">${equippedAcc.icon}</span>` : ''}
                    </div>
                    <div style="font-size:11px; color:#334155; margin-top:2px;">⚡ +${stageDef.speedBonus} Tốc độ | ⭐ +${stageDef.starBonus} Sao</div>
                    <div style="font-size:10.5px; color:#64748B;">${xpText}</div>
                    <div style="font-size:10.5px; color:#059669;">😋 Độ no: ${Math.round(pet.hunger)}%</div>
                  ` : `
                    <div style="font-size:11px; color:#B45309; margin-top:3px;">🔥 Độ ấm ấp nở: <b>${Math.round(pet.hatchProgress)}%</b></div>
                    <div style="height:8px; background:#E2E8F0; border-radius:99px; overflow:hidden; margin-top:3px; border:1px solid #CBD5E1;">
                      <div style="height:100%; width:${Math.min(100, pet.hatchProgress)}%; background:linear-gradient(90deg,#F59E0B,#EC4899);"></div>
                    </div>
                  `}
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">
                ${actionHtml}
                <button type="button" class="btn btn-sm ${isEquipped ? 'btn-purple' : ''}" style="${isEquipped ? '' : 'background:#475569;'}" onclick="equipOwnedPet('${pet.id}')">
                  ${isEquipped ? '✨ Đang Đồng Hành (Bấm để cất)' : '🐾 Chọn Đồng Hành'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function exitPrivateRoomToHallway() {
    const user = getCurrentUser();
    const roomId = user.privateRoomId || activePrivateRoomId;
    const room = getHouseRooms().find((r) => r.id === roomId);
    user.scene = 'house';
    user.privateRoomId = null;
    activePrivateRoomId = null;
    if (room) {
      user.x = room.doorSide === 'right' ? 525 : 595;
      user.y = room.y + room.h - 45;
      user.dir = room.doorSide === 'right' ? 'right' : 'left';
    } else {
      user.x = 560;
      user.y = 450;
    }
    AudioEngine.playClick();
    showToast('🚪 Bạn đã ra hành lang cầu thang!');
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
  }

  function enterPrivateRoomScene(room: HouseRoomDef) {
    const user = getCurrentUser();
    activePrivateRoomId = room.id;
    user.scene = 'private_room';
    user.privateRoomId = room.id;
    user.x = 380;
    user.y = 335;
    user.dir = 'up';
    AudioEngine.playSuccess();
    showToast(`🚪 Bạn đã bước vào ${room.name}!`);
    syncPrivateRoomToolbar();
    updateHUD();
    saveGame();
  }

  function renderPrivateRoomSlotBar() {
    const user = getCurrentUser();
    const room = getActivePrivateRoom();
    if (!room) return;
    const owner = (room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || user;
    if (!owner.roomSlots) owner.roomSlots = {};
    const slotDef = ROOM_DECOR_SLOTS.find((s) => s.id === selectedRoomSlotId) || ROOM_DECOR_SLOTS[0];
    const currentAssignedId = owner.roomSlots[slotDef.id] || null;
    const titleEl = document.getElementById('slot-picker-title');
    const instrEl = document.getElementById('pr-slot-instruction');
    const bar = document.getElementById('pr-slot-items-bar');
    if (titleEl) titleEl.innerText = `📌 ${slotDef.label}`;
    if (instrEl) instrEl.innerHTML = `Chọn vật phẩm từ túi đồ để đặt tại <b style="color:#E67E22;">${slotDef.label}</b> (hiển thị đúng hình &amp; kích thước trong phòng):`;
    if (!bar) return;

    let html = currentAssignedId ? `<button class="btn btn-sm btn-danger" style="width:100%;" onclick="assignDecorToRoomSlot(null)">❌ Gỡ vật phẩm khỏi vị trí này</button>` : '';
    const ownedShopDecors = user.inventory.map((id) => SHOP_CATALOG.find((i) => i.id === id && i.category === 'decor')).filter(Boolean);
    const ownedDecors = [...ownedShopDecors, ...(user.customLabItems || [])];
    if (ownedDecors.length === 0) {
      html += `<span style="font-size:12.5px; color:#666;">Túi đồ chưa có vật phẩm trang trí. Hãy mua tại <b>🏪 Siêu thị</b> hoặc chế tạo ở <b>🧪 Phòng Thí Nghiệm</b>!</span>`;
    } else {
      html += ownedDecors
        .map((d: any) => {
          const isCur = currentAssignedId === d.id;
          const sizeTag = d.labSpec?.sizeTier ? LAB_SIZE_TIERS[d.labSpec.sizeTier as LabSizeTier]?.label : '';
          return `
            <button type="button" onclick="assignDecorToRoomSlot('${d.id}')" style="display:flex; align-items:center; gap:8px; width:100%; text-align:left; padding:7px 10px; border-radius:10px; border:2px solid ${isCur ? '#16A34A' : '#2C3E50'}; background:${isCur ? '#DCFCE7' : '#FFFFFF'}; cursor:pointer;">
              <div style="flex-shrink:0; width:38px; height:38px; display:flex; align-items:center; justify-content:center; background:#F8FAFC; border-radius:8px; border:1px solid #CBD5E1;">
                ${renderItemIllustrationSVG(d.id, 34, findAnyCatalogItem)}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:12.5px; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(d.name)} ${isCur ? '✓' : ''}</div>
                ${sizeTag ? `<div style="font-size:10.5px; color:#0284C7; font-weight:700;">📏 Cỡ: ${sizeTag}</div>` : ''}
              </div>
            </button>
          `;
        })
        .join('');
    }
    bar.innerHTML = html;
  }

  // Expose all legacy inline HTML handlers to window
  const w = window as unknown as Record<string, any>;
  w.openModal = openModal;
  w.closeModal = closeModal;
  w.openReactModal = openReactModal;
  w.startAudioOnce = () => AudioEngine.init();
  w.toggleAudio = () => {
    AudioEngine.toggleMute();
  };
  w.changeZoom = (delta: number) => {
    AudioEngine.playClick();
    zoomLevel = Math.max(0.65, Math.min(1.65, +(zoomLevel + delta).toFixed(2)));
    const btn = document.getElementById('zoom-level-btn');
    if (btn) btn.innerText = `${Math.round(zoomLevel * 100)}%`;
  };
  w.resetZoom = () => {
    AudioEngine.playClick();
    zoomLevel = 1.0;
    const btn = document.getElementById('zoom-level-btn');
    if (btn) btn.innerText = '100%';
  };
  w.requestParentAccess = requestParentAccess;
  w.toggleMemberDropdown = (e: Event) => {
    if (e) e.stopPropagation();
    AudioEngine.playClick();
    const menu = document.getElementById('member-dropdown-menu');
    if (!menu) return;
    if (!menu.classList.contains('open')) {
      renderMemberDropdownList();
      menu.classList.add('open');
    } else {
      menu.classList.remove('open');
    }
  };
  w.openSmartphoneModal = openSmartphoneModal;
  w.switchSmartphoneView = (viewName: 'home' | 'messenger' | 'tasks' | 'maps', targetId?: string) => {
    AudioEngine.playClick();
    smartphoneCurrentView = viewName;
    if (targetId) smartphoneChatTargetId = targetId;
    renderSmartphoneScreen();
  };
  w.renderSmartphoneScreen = renderSmartphoneScreen;
  w.setNavigationTarget = (locId: string) => {
    const loc = resolveNeighborhoodLocations(state).find((l) => l.id === locId);
    if (!loc) return;
    AudioEngine.playSuccess();
    activeNavTargetId = locId;
    const me = getCurrentUser();
    if (me.scene !== 'neighborhood') {
      showToast(`🧭 Đã đặt chỉ đường tới ${loc.name}! Hãy bước ra Khu phố để xem mũi tên trên Minimap!`);
    } else {
      showToast(`🧭 Đã bật mũi tên chỉ đường tới ${loc.name} trên Minimap!`);
    }
    updateHUD();
    renderSmartphoneScreen();
  };
  w.cancelNavigationTarget = () => {
    AudioEngine.playClick();
    activeNavTargetId = null;
    const banner = document.getElementById('minimap-nav-banner');
    if (banner) banner.style.display = 'none';
    showToast('✖ Đã hủy chỉ đường.');
    updateHUD();
  };
  w.openPetCollectionModal = () => {
    petModalMode = 'hud_collection';
    petShopTab = 'my_pets';
    openModal('pet-shop-modal');
  };
  w.navigateToPetShopFromHud = () => {
    closeModal('pet-shop-modal');
    w.setNavigationTarget('pet_shop');
  };
  w.switchPetShopTab = (tab: 'eggs' | 'food' | 'accessories' | 'my_pets') => {
    if (petModalMode === 'hud_collection') return;
    AudioEngine.playClick();
    petShopTab = tab;
    renderPetShopModal();
  };
  w.buyPetEgg = (speciesId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const sp = getPetSpecies(speciesId);
    if (user.points < sp.eggPrice) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${sp.eggPrice}⭐ để nhận ${sp.eggName}! Cố gắng làm thêm nhiệm vụ nhé!`);
    }
    user.points -= sp.eggPrice;
    const now = Date.now();
    user.memberUpdatedAt = now;
    const newPet: OwnedPet = {
      id: `pet_${now}_${Math.random().toString(36).slice(2, 6)}`,
      speciesId: sp.id,
      nickname: sp.name,
      hatched: false,
      hatchProgress: 0,
      xp: 0,
      level: 1,
      stage: 0,
      hunger: 100,
      lastFedAt: now,
      obtainedAt: now
    };
    user.pets!.unshift(newPet);
    if (!user.activePetId) user.activePetId = newPet.id;
    logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'pet_adopt',
      detail: `Đổi ${sp.eggPrice}⭐ nhận ${sp.eggName}`
    });
    AudioEngine.playCoin();
    triggerSpeechBubble(user, `Yay! Got ${sp.eggName}! 🥚✨`, true);
    showToast(`🥚 Đã nhận ${sp.eggName}! Chuyển sang tab Bộ Sưu Tập để ủ ấm & ấp nở nhé!`);
    petShopTab = 'my_pets';
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.buyPetFood = (foodId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const fd = getPetFoodDef(foodId);
    if (user.points < fd.price) {
      AudioEngine.playError();
      return showToast(`❌ Cần ${fd.price}⭐ để mua ${fd.name}!`);
    }
    user.points -= fd.price;
    user.memberUpdatedAt = Date.now();
    user.petFoodInventory![fd.id] = (user.petFoodInventory![fd.id] || 0) + 1;
    AudioEngine.playCoin();
    showToast(`🍖 Đã mua 1x ${fd.name}!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.warmPetEgg = (petId: string) => {
    const now = Date.now();
    if (now - lastEggWarmAt < 1200) return showToast('⏳ Chờ 1 giây để trứng hấp thụ hơi ấm nhé!');
    lastEggWarmAt = now;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet || pet.hatched) return;
    pet.hatchProgress = Math.min(100, (pet.hatchProgress || 0) + 35);
    user.memberUpdatedAt = now;
    AudioEngine.playSuccess();
    showToast(
      pet.hatchProgress >= 100
        ? '✨ Trứng đã nứt vỏ 100%! Bấm NỞ TRỨNG NGAY!'
        : `🔥 Trứng ấm lên rồi (${Math.round(pet.hatchProgress)}%)!`
    );
    renderPetShopModal();
    saveGame();
  };
  w.buyPetAccessory = (accId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const acc = getPetAccessoryDef(accId);
    if (!acc) return;
    if (user.petAccessories!.includes(acc.id)) {
      return showToast(`ℹ️ Bạn đã sở hữu ${acc.name} rồi! Mở Bộ Sưu Tập để đeo cho thú cưng nhé!`);
    }
    if (user.points < acc.price) {
      AudioEngine.playError();
      return showToast(`❌ Cần ${acc.price}⭐ để mua ${acc.name}!`);
    }
    user.points -= acc.price;
    user.memberUpdatedAt = Date.now();
    user.petAccessories!.push(acc.id);
    AudioEngine.playCoin();
    showToast(`🎀 Đã mua ${acc.name}! Vào Bộ Sưu Tập để đeo cho thú cưng nhé!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.equipPetAccessory = (petId: string, accId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId && p.hatched);
    if (!pet) return;
    if (!accId) {
      pet.accessoryId = null;
      AudioEngine.playClick();
      showToast(`🎀 Đã tháo phụ kiện của ${pet.nickname}.`);
    } else if (user.petAccessories!.includes(accId)) {
      pet.accessoryId = accId;
      const ad = getPetAccessoryDef(accId);
      AudioEngine.playSuccess();
      showToast(`✨ Đã đeo ${ad?.icon || '🎀'} ${ad?.name || 'phụ kiện'} cho ${pet.nickname}!`);
    }
    user.memberUpdatedAt = Date.now();
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.renameOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet) return;
    const inp = document.getElementById(`pet-name-input-${petId}`) as HTMLInputElement | null;
    const nextName = (inp?.value || '').trim();
    if (!nextName) return showToast('⚠️ Tên thú cưng không được để trống!');
    pet.nickname = nextName.slice(0, 20);
    user.memberUpdatedAt = Date.now();
    AudioEngine.playSuccess();
    showToast(`✏️ Đã đổi tên thú cưng thành "${pet.nickname}"!`);
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.hatchOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet || pet.hatched || pet.hatchProgress < 100) return;
    const sp = getPetSpecies(pet.speciesId);
    const rolled = rollPetHatchTraits();
    const vDef = getPetVariantDef(rolled.variant);
    pet.hatched = true;
    pet.stage = 1;
    pet.level = 1;
    pet.hunger = 100;
    pet.gender = rolled.gender;
    pet.variant = rolled.variant;
    user.activePetId = pet.id;
    user.memberUpdatedAt = Date.now();
    AudioEngine.playSuccess();
    triggerConfetti();
    triggerSpeechBubble(user, `Welcome ${pet.nickname}! 🐣💖`, true);
    showToast(
      `🐣 CHÚC MỪNG! Trứng nở thành ${sp.stages[1].title} (${rolled.gender === 'male' ? '♂️ Đực' : '♀️ Cái'} • Màu ${vDef.label})!`
    );
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.feedOwnedPet = (petId: string, foodId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId && p.hatched);
    if (!pet) return;
    const count = user.petFoodInventory![foodId] || 0;
    if (count <= 0) return showToast('⚠️ Hết loại thức ăn này rồi!');
    const fd = getPetFoodDef(foodId);
    const sp = getPetSpecies(pet.speciesId);
    const oldStage = pet.stage;
    const now = Date.now();

    user.petFoodInventory![foodId] = count - 1;
    pet.xp += fd.xpGain;
    pet.hunger = Math.min(100, (pet.hunger || 50) + fd.hungerGain);
    pet.lastFedAt = now;
    pet.level = getPetLevelFromXp(pet.xp);
    pet.stage = computePetStageFromXp(sp, pet.xp, true);
    user.memberUpdatedAt = now;

    if (pet.stage > oldStage) {
      const stageDef = sp.stages.find((s) => s.stage === pet.stage) || sp.stages[1];
      AudioEngine.playSuccess();
      triggerConfetti();
      triggerSpeechBubble(user, `${pet.nickname} evolved to ${stageDef.title}! 🌟🔥`, true);
      showToast(`🎆 TIẾN HÓA! ${pet.nickname} đã trưởng thành thành "${stageDef.title}" (+${stageDef.speedBonus} Tốc độ, +${stageDef.starBonus}⭐)!`);
      logActivity({
        memberId: user.id,
        memberName: user.name,
        action: 'pet_evolve',
        detail: `${pet.nickname} tiến hóa lên GĐ${pet.stage}: ${stageDef.title}`
      });
    } else {
      AudioEngine.playCoin();
      showToast(`🍖 Đã cho ${pet.nickname} ăn ${fd.name} (+${fd.xpGain} XP • Lv.${pet.level})!`);
    }
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.equipOwnedPet = (petId: string) => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const pet = user.pets!.find((p) => p.id === petId);
    if (!pet) return;
    if (user.activePetId === pet.id) {
      user.activePetId = 'none';
      AudioEngine.playClick();
      showToast(`💤 Đã cất ${pet.nickname} nghỉ ngơi.`);
    } else {
      user.activePetId = pet.id;
      AudioEngine.playClick();
      showToast(`🐾 Đã chọn ${pet.nickname} đồng hành bên cạnh bạn!`);
    }
    user.memberUpdatedAt = Date.now();
    updateHUD();
    renderPetShopModal();
    saveGame();
  };
  w.toggleHudTools = () => {
    AudioEngine.playClick();
    hudToolsExpanded = !hudToolsExpanded;
    syncHudToolsVisibility();
  };
  w.openParentMiniWindow = () => {
    if (window.__OPEN_PARENT_MINI__) {
      window.__OPEN_PARENT_MINI__();
    } else {
      showToast('⏳ Hệ thống Mini Window đang tải, thử lại sau 1 giây nhé!');
    }
  };
  w.sendSmartphoneMessage = () => {
    const inp = document.getElementById('phone-msg-input') as HTMLInputElement | null;
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    const me = getCurrentUser();
    if (!Array.isArray(state.familyMessages)) state.familyMessages = [];
    (state.familyMessages as any[]).push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: me.id,
      senderName: me.name,
      recipientId: smartphoneChatTargetId || 'family_group',
      text,
      ts: Date.now(),
      readBy: [me.id]
    });
    pruneExpiredFamilyMessages();
    AudioEngine.playClick();
    inp.value = '';
    saveGame();
    renderSmartphoneScreen();
  };
  w.togglePhoneHomeworkUpload = () => {
    const typeEl = document.getElementById('phone-task-type') as HTMLSelectElement | null;
    const grp = document.getElementById('phone-parent-file-group');
    const assigneeEl = document.getElementById('phone-task-assignee');
    if (grp && typeEl) grp.style.display = typeEl.value === 'homework' ? 'block' : 'none';
    if (assigneeEl && typeEl) assigneeEl.style.display = typeEl.value === 'family_quest' ? 'none' : 'block';
  };
  w.createTaskFromSmartphone = () => {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    const type = ((document.getElementById('phone-task-type') as HTMLSelectElement)?.value || 'chore') as TaskItem['type'];
    const assigneeId = (document.getElementById('phone-task-assignee') as HTMLSelectElement)?.value || '';
    const title = (document.getElementById('phone-task-title') as HTMLInputElement)?.value.trim() || '';
    const reward = parseInt((document.getElementById('phone-task-reward') as HTMLInputElement)?.value || '0', 10) || 0;
    if (!title) return showToast('⚠️ Vui lòng nhập tên nhiệm vụ!');

    if (type === 'family_quest') {
      const kids = state.members.filter((m) => !isParent(m));
      const participantIds = kids.map((k) => k.id);
      const totalCost = reward * participantIds.length;
      if (participantIds.length < 2 || reward <= 0 || user.points < totalCost) {
        AudioEngine.playError();
        return showToast(`❌ Cần ${totalCost}⭐ ngân sách (${reward}⭐/bé)!`);
      }
      user.points -= totalCost;
      const progressMap: Record<string, 'pending' | 'done'> = {};
      participantIds.forEach((id) => { progressMap[id] = 'pending'; });
      state.tasks.push({
        id: Date.now(), type: 'family_quest', title, creatorId: user.id,
        assigneeId: participantIds[0], participantIds, progressMap,
        reward, status: 'pending', createdAt: Date.now(), completedAt: null
      });
      AudioEngine.playSuccess();
      showToast(`🤝 Đã giao Nhiệm Vụ Đồng Đội (-${totalCost}⭐)!`);
      lastHudSignature = '';
      updateHUD();
      renderSmartphoneScreen();
      saveGame();
      return;
    }

    if (reward <= 0 || user.points < reward) {
      AudioEngine.playError();
      return showToast(`❌ Không đủ điểm ngân sách!`);
    }
    const fileInput = document.getElementById('phone-task-parent-file') as HTMLInputElement | null;
    const finalize = (fileData: string | null, fileName: string) => {
      user.points -= reward;
      state.tasks.push({
        id: Date.now(), type, title, creatorId: user.id, assigneeId, reward,
        status: 'pending', createdAt: Date.now(), completedAt: null,
        parentFile: fileData, parentFileName: fileName, childFile: null, childFileName: '', childNote: '', grade: null
      });
      AudioEngine.playSuccess();
      showToast(`✅ Đã giao nhiệm vụ (-${reward}⭐ ngân sách)`);
      lastHudSignature = '';
      updateHUD();
      renderSmartphoneScreen();
      saveGame();
    };
    if (type === 'homework' && fileInput && fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => finalize((ev.target?.result as string) || null, f.name);
      reader.readAsDataURL(f);
    } else finalize(null, '');
  };

  w.toggleChatLog = () => {
    const box = document.getElementById('chat-log-popup');
    if (!box) return;
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
    renderChatLog();
  };
  w.sendChat = () => {
    AudioEngine.init();
    const input = document.getElementById('chat-input') as HTMLInputElement | null;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const user = getCurrentUser();
    ensureMemberProps(user);
    const hasVN = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
    const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
    const count = words.filter((wd) => ENGLISH_WORDS.has(wd)).length;
    const isEng = !hasVN && words.length >= 2 && (count >= 2 || (words.length >= 3 && count >= 1));

    if (isEng) {
      speakEnglish(text, 0.9);
      const chatCfg = getActivityConfig('english_chat');
      const now = Date.now();
      const stats = user.englishChatStats!;
      const normPhrase = words.join(' ');
      const cooldownMs = chatCfg.cooldownMs ?? 30000;
      const maxPerDay = chatCfg.maxPerDay ?? 10;

      if (!chatCfg.enabled || chatCfg.reward <= 0) {
        AudioEngine.playClick();
        showToast(`🇬🇧 Đã nói Tiếng Anh (+0⭐ — phần thưởng chat đang tắt).`);
      } else if (isParent(user)) {
        AudioEngine.playSuccess();
        showToast(`🇬🇧 ${user.name} giao tiếp Tiếng Anh mẫu mực!`);
      } else if (normPhrase.length < 6 || new Set(words).size < 2) {
        AudioEngine.playClick();
        showToast(`💡 Hãy dùng ít nhất 2 từ Tiếng Anh khác nhau để nhận +${chatCfg.reward}⭐ (+0⭐)!`);
      } else if (stats.recentPhrases.includes(normPhrase)) {
        AudioEngine.playClick();
        showToast(`🔁 Bạn vừa nói câu này rồi! Hãy thử câu Tiếng Anh mới để nhận ⭐ (+0⭐).`);
      } else if (stats.lastRewardAt > 0 && now - stats.lastRewardAt < cooldownMs) {
        const secsLeft = Math.max(1, Math.ceil((cooldownMs - (now - stats.lastRewardAt)) / 1000));
        AudioEngine.playClick();
        showToast(`⏳ Chờ ${secsLeft}s nữa để nhận +${chatCfg.reward}⭐ khi nói Tiếng Anh (+0⭐)!`);
      } else if (stats.count >= maxPerDay) {
        AudioEngine.playClick();
        showToast(`🎓 Hôm nay đã đạt tối đa ${maxPerDay}/${maxPerDay} lượt thưởng nói Tiếng Anh (+0⭐)!`);
      } else {
        const petBonus = getMemberPetBonuses(user);
        const ptsGain = chatCfg.reward + petBonus.starBonus;
        user.points += ptsGain;
        stats.count += 1;
        stats.lastRewardAt = now;
        stats.recentPhrases.unshift(normPhrase);
        if (stats.recentPhrases.length > 25) stats.recentPhrases.length = 25;
        AudioEngine.playCoin();
        logActivity({
          memberId: user.id,
          memberName: user.name,
          action: 'quiz_done',
          detail: `Nói Tiếng Anh: "${text}" (+${ptsGain}⭐, lượt ${stats.count}/${maxPerDay})`,
          pointsDelta: ptsGain
        });
        showToast(`🇬🇧 ${user.name} +${ptsGain}⭐ (${stats.count}/${maxPerDay} hôm nay)!`);
        updateHUD();
      }
    } else AudioEngine.playClick();
    triggerSpeechBubble(user, text, isEng);
    input.value = '';
    saveGame();
  };

  w.enterHouseScene = () => {
    const user = getCurrentUser();
    user.scene = 'house';
    user.x = 560;
    user.y = 700;
    user.dir = 'up';
    closeModal('house-modal');
    AudioEngine.playSuccess();
    showToast('🏢 Bạn đã vào Nhà Phố Gia Đình!');
    updateHUD();
    saveGame();
  };
  w.toggleHomeworkUpload = toggleHomeworkUpload;
  w.createTask = createTask;
  w.submitChore = submitChore;
  w.approveChore = approveChore;
  w.submitFamilyQuestPart = submitFamilyQuestPart;
  w.approveFamilyQuest = approveFamilyQuest;
  w.deleteTask = deleteTask;
  w.openSubmitHomeworkModal = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📤 Nộp bài: ${task.title}`;
    if (bEl) {
      bEl.innerHTML = `
        <div class="form-group"><label>Câu trả lời / Ghi chú:</label><textarea id="hw-child-note" rows="3"></textarea></div>
        <div class="form-group"><label>Upload ảnh hoặc file:</label><input type="file" id="hw-child-file" accept="image/*,.pdf,.doc,.docx,.txt"></div>
        <button class="btn btn-primary" onclick="submitHomework(${task.id})">Gửi bài cho Bố/Mẹ</button>
      `;
    }
    openModal('hw-action-modal');
  };
  w.submitHomework = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const note = (document.getElementById('hw-child-note') as HTMLTextAreaElement)?.value.trim() || '';
    const fileInput = document.getElementById('hw-child-file') as HTMLInputElement | null;
    const finish = (fileData: string | null, fileName: string) => {
      task.childNote = note;
      task.childFile = fileData;
      task.childFileName = fileName;
      task.status = 'submitted';
      const u = getCurrentUser();
      logActivity({ memberId: u.id, memberName: u.name, action: 'task_done', detail: `Nộp bài tập: "${task.title}"`, taskId: task.id });
      closeModal('hw-action-modal');
      AudioEngine.playSuccess();
      triggerSpeechBubble(u, 'I finished my homework!', true);
      showToast('📤 Đã nộp bài tập thành công!');
      renderTasksModal();
      const pm = document.getElementById('smartphone-modal');
      if (pm && pm.style.display === 'flex') renderSmartphoneScreen();
      saveGame();
    };
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => finish((ev.target?.result as string) || null, f.name);
      reader.readAsDataURL(f);
    } else finish(null, '');
  };
  w.openGradeHomeworkModal = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📝 Chấm bài: ${task.title}`;
    const preview = task.childFile
      ? task.childFile.startsWith('data:image')
        ? `<img src="${task.childFile}" class="preview-img">`
        : `<a href="${task.childFile}" download="${escapeHtml(task.childFileName || '')}" class="btn btn-sm">⬇️ Tải: ${escapeHtml(task.childFileName || '')}</a>`
      : '';
    if (bEl) {
      bEl.innerHTML = `
        <p><b>Bài làm của con:</b> ${escapeHtml(task.childNote || '') || '<i>(Xem file đính kèm)</i>'}</p>
        <div style="margin-bottom:10px;">${preview}</div>
        <div class="form-group"><label>Chấm điểm (Thang 10):</label><input type="number" id="hw-grade-input" min="0" max="10" step="0.5" value="9"></div>
        <button class="btn btn-accent" onclick="gradeHomework(${task.id})">✅ Xác nhận điểm</button>
      `;
    }
    openModal('hw-action-modal');
  };
  w.gradeHomework = (taskId: number) => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.status === 'completed') return;
    const grade = Math.min(10, Math.max(0, parseFloat((document.getElementById('hw-grade-input') as HTMLInputElement)?.value || '0') || 0));
    task.grade = grade;
    task.status = 'completed';
    task.completedAt = Date.now();
    const assignee = state.members.find((m) => m.id === task.assigneeId);
    const creator = state.members.find((m) => m.id === task.creatorId);
    let earned = Math.round(task.reward * (grade / 10));
    let parentBonus = 0;
    const hwHighBonusCfg = getActivityConfig('homework_high_bonus');
    if (grade >= 8 && hwHighBonusCfg.enabled) {
      earned += hwHighBonusCfg.reward;
      parentBonus = 15;
    }
    if (assignee) {
      const pb = getMemberPetBonuses(assignee);
      earned += pb.starBonus;
      assignee.points += earned;
    }
    if (creator && parentBonus > 0) creator.points = Math.min(MAX_PARENT_POINTS, creator.points + parentBonus);
    closeModal('hw-action-modal');
    AudioEngine.playCoin();
    showToast(parentBonus > 0 && assignee ? `🌟 Điểm cao ${grade}/10! ${assignee.name} +${earned}⭐ & ${creator?.name} +${parentBonus}⭐!` : `📝 Đã chấm ${grade}/10!`);
    if (assignee) checkAllDailyTasksCompleted(assignee.id);
    updateHUD();
    renderTasksModal();
    saveGame();
  };
  w.viewAttachment = (taskId: number, who: 'parent' | 'child') => {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const data = who === 'parent' ? task.parentFile : task.childFile;
    const name = who === 'parent' ? task.parentFileName : task.childFileName;
    if (!data) return;
    const tEl = document.getElementById('hw-modal-title');
    const bEl = document.getElementById('hw-modal-body');
    if (tEl) tEl.innerText = `📎 ${name || 'Tài liệu'}`;
    if (bEl) {
      bEl.innerHTML = data.startsWith('data:image')
        ? `<img src="${data}" style="max-width:100%; border-radius:8px;">`
        : `<a href="${data}" download="${escapeHtml(name || 'file')}" class="btn btn-primary">⬇️ Tải về</a>`;
    }
    openModal('hw-action-modal');
  };

  w.renderShop = renderShop;
  w.buySupermarketItem = buySupermarketItem;
  w.renderBagModal = (t: string) => {
    pendingBagDeleteKey = null;
    renderBagModal(t);
  };
  w.requestDeleteBagItem = (key: string) => {
    AudioEngine.playClick();
    pendingBagDeleteKey = key;
    renderBagModal(currentBagTab);
  };
  w.cancelDeleteBagItem = () => {
    AudioEngine.playClick();
    pendingBagDeleteKey = null;
    renderBagModal(currentBagTab);
  };
  w.confirmDeleteBagItem = confirmDeleteBagItem;
  w.useVoucher = (idx: number) => {
    const user = getCurrentUser();
    const item = findAnyCatalogItem(user.vouchers[idx]);
    user.vouchers.splice(idx, 1);
    AudioEngine.playSuccess();
    if (item) triggerSpeechBubble(user, `Dùng phiếu: ${item.name}! 🎉`, false);
    showToast(`🎉 Đã kích hoạt: ${item ? item.name : 'Phiếu'}!`);
    renderBagModal('voucher');
    saveGame();
  };
  w.useTvCardFromBag = () => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const idx = user.inventory.indexOf('tv_30min');
    if (idx === -1) return showToast('⚠️ Bạn không còn Thẻ xem YouTube nào!');
    user.inventory.splice(idx, 1);
    user.tvBonusSecondsToday = (user.tvBonusSecondsToday || 0) + 1800;
    AudioEngine.playSuccess();
    showToast('📺 Đã nạp thêm +30 phút xem YouTube hôm nay!');
    saveGame();
    const bagModal = document.getElementById('bag-modal');
    if (bagModal && bagModal.style.display === 'flex') renderBagModal('tv_card');
    const tvModal = document.getElementById('tv-modal');
    if (tvModal && tvModal.style.display === 'flex') updateTvStatusUI();
  };

  w.closeFashionModal = () => {
    tryOnFashionState = { setItem: null, shirtItem: null, pantsItem: null, accItem: null };
    closeModal('fashion-modal');
  };
  w.renderFashionStore = renderFashionStore;
  w.resetFashionTryOn = (reRender = true) => {
    tryOnFashionState = { setItem: null, shirtItem: null, pantsItem: null, accItem: null };
    drawFashionTryOnPreview();
    if (reRender) renderFashionStore(currentFashionTab);
  };
  w.tryOnFashionItem = (itemId: string) => {
    const item = FASHION_CATALOG.find((i) => i.id === itemId);
    if (!item) return;
    AudioEngine.playClick();
    if (item.sub === 'set') {
      tryOnFashionState.setItem = tryOnFashionState.setItem?.id === item.id ? null : item;
      if (tryOnFashionState.setItem) {
        tryOnFashionState.shirtItem = null;
        tryOnFashionState.pantsItem = null;
      }
    } else if (item.sub === 'shirt') {
      tryOnFashionState.shirtItem = tryOnFashionState.shirtItem?.id === item.id ? null : item;
      if (tryOnFashionState.shirtItem) tryOnFashionState.setItem = null;
    } else if (item.sub === 'pants') {
      tryOnFashionState.pantsItem = tryOnFashionState.pantsItem?.id === item.id ? null : item;
      if (tryOnFashionState.pantsItem) tryOnFashionState.setItem = null;
    } else {
      tryOnFashionState.accItem = tryOnFashionState.accItem?.id === item.id ? null : item;
    }
    drawFashionTryOnPreview();
    renderFashionStore(currentFashionTab);
  };
  w.buyFashionItem = (itemId: string) => {
    const user = getCurrentUser();
    const item = FASHION_CATALOG.find((i) => i.id === itemId);
    if (!item || user.points < item.price) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${item ? item.price : 0}⭐ để mua trang phục này!`);
    }
    if (user.inventory.includes(item.id)) return;
    user.points -= item.price;
    user.inventory.push(item.id);
    AudioEngine.playCoin();
    showToast(`👗 Đã mua ${item.name}! Mở tủ quần áo ở phòng riêng để mặc nhé!`);
    updateHUD();
    renderFashionStore(item.sub);
    saveGame();
  };

  w.selectSalonHair = (style: string) => { AudioEngine.playClick(); salonDraft.hairStyle = style; updateSalonUI(); };
  w.selectSalonColor = (color: string) => { AudioEngine.playClick(); salonDraft.hairColor = color; updateSalonUI(); };
  w.confirmSalonChange = () => {
    const user = getCurrentUser();
    const cost = getSalonCost();
    if (cost === 0) return showToast('ℹ️ Bạn chưa chọn kiểu tóc hoặc màu tóc mới nào!');
    if (user.points < cost) { AudioEngine.playError(); return showToast(`❌ Bạn cần ${cost}⭐!`); }
    user.points -= cost;
    user.hairStyle = salonDraft.hairStyle;
    user.hairColor = salonDraft.hairColor;
    AudioEngine.playSuccess();
    triggerSpeechBubble(user, 'Love my new hairstyle! 💇✨', true);
    showToast(`💇 Đã đổi kiểu tóc mới (-${cost}⭐)!`);
    updateHUD();
    updateSalonUI();
    saveGame();
  };

  w.startEnglishGrade6Quiz = startEnglishGrade6Quiz;
  w.speakCurrentEnglishQuiz = () => {
    const q = engQuizSession.questions[engQuizSession.currentIndex];
    if (q) speakEnglish(q.q, 0.85);
  };
  w.selectEnglishQuizAnswer = (chosenIdx: number) => {
    if (engQuizSession.answered) return;
    engQuizSession.answered = true;
    const qObj = engQuizSession.questions[engQuizSession.currentIndex];
    const isCorrect = chosenIdx === qObj.ans;
    if (isCorrect) { engQuizSession.score += 1; AudioEngine.playCoin(); }
    else AudioEngine.playError();

    qObj.opts.forEach((_, idx) => {
      const btn = document.getElementById(`eng-opt-${idx}`) as HTMLButtonElement | null;
      if (!btn) return;
      btn.disabled = true;
      if (idx === qObj.ans) { btn.style.background = '#D4EDDA'; btn.style.borderColor = '#27AE60'; btn.style.color = '#145A32'; }
      else if (idx === chosenIdx && !isCorrect) { btn.style.background = '#FADBD8'; btn.style.borderColor = '#E74C3C'; btn.style.color = '#922B21'; }
    });
    const fb = document.getElementById('eng-feedback-box');
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = isCorrect ? '#EAFAF1' : '#FDEDEC';
      fb.style.border = isCorrect ? '2px solid #27AE60' : '2px solid #E74C3C';
      fb.innerHTML = `
        <div style="font-weight:700; color:${isCorrect ? '#1E8449' : '#C0392B'}; margin-bottom:4px;">${isCorrect ? '✅ Chính xác!' : '❌ Chưa đúng rồi!'}</div>
        <div style="color:#2C3E50; margin-bottom:8px;">💡 <b>Giải thích:</b> ${escapeHtml(qObj.exp)}</div>
        <button type="button" class="btn btn-primary btn-sm" onclick="nextEnglishQuizQuestion()">
          ${engQuizSession.currentIndex + 1 < engQuizSession.questions.length ? 'Câu tiếp theo ➔' : 'Xem kết quả & Nhận sao 🏆'}
        </button>
      `;
    }
  };
  w.nextEnglishQuizQuestion = () => {
    AudioEngine.playClick();
    engQuizSession.currentIndex += 1;
    engQuizSession.answered = false;
    renderEnglishQuizQuestion();
  };

  w.switchInventionLabMode = (mode: 'prompt' | 'fusion') => {
    currentLabMode = mode;
    AudioEngine.playClick();
    const promptBtn = document.getElementById('lab-tab-prompt-btn');
    const fusionBtn = document.getElementById('lab-tab-fusion-btn');
    const fusionPanel = document.getElementById('lab-fusion-panel');
    const promptPanel = document.getElementById('lab-prompt-panel');
    const fusionActionBar = document.getElementById('lab-fusion-action-bar');
    if (mode === 'fusion') {
      if (promptBtn) promptBtn.style.background = '#475569';
      if (fusionBtn) fusionBtn.style.background = '#0D9488';
      if (fusionPanel) fusionPanel.style.display = 'block';
      if (promptPanel) promptPanel.style.display = 'none';
      if (fusionActionBar) fusionActionBar.style.display = 'block';
      refreshLabFusionIngredientsUI();
    } else {
      if (promptBtn) promptBtn.style.background = '#0284C7';
      if (fusionBtn) fusionBtn.style.background = '#475569';
      if (fusionPanel) fusionPanel.style.display = 'none';
      if (promptPanel) promptPanel.style.display = 'block';
      if (fusionActionBar) fusionActionBar.style.display = 'none';
    }
  };
  w.syncLabFusionDropdowns = (changedSlot: 'a' | 'b') => {
    const selA = document.getElementById('lab-item-a') as HTMLSelectElement | null;
    const selB = document.getElementById('lab-item-b') as HTMLSelectElement | null;
    if (!selA || !selB || selA.options.length < 2) return;
    if (selA.value === selB.value) {
      const target = changedSlot === 'a' ? selB : selA;
      const otherVal = changedSlot === 'a' ? selA.value : selB.value;
      for (let i = 0; i < target.options.length; i++) {
        if (target.options[i].value !== otherVal) {
          target.selectedIndex = i;
          break;
        }
      }
    }
  };
  w.pickRandomLabIdea = () => {
    AudioEngine.playClick();
    const idea = RANDOM_LAB_IDEAS[Math.floor(Math.random() * RANDOM_LAB_IDEAS.length)];
    const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
    if (inp) { inp.value = idea; inp.focus(); }
  };
  w.fillLabSamplePrompt = (sample: string) => {
    AudioEngine.playClick();
    const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
    if (inp) { inp.value = sample; inp.focus(); }
  };
  w.runInventionLabSynthesis = () => {
    const user = getCurrentUser();
    ensureMemberProps(user);
    const cost = currentLabMode === 'fusion' ? 15 : 10;
    if (user.points < cost) {
      AudioEngine.playError();
      return showToast(`❌ Bạn cần ${cost}⭐ để vận hành máy thí nghiệm!`);
    }

    let itemAId: string | null = null;
    let itemBId: string | null = null;
    let fusionLabel = '';
    let cleanTitle = '';
    let promptForSpec = '';
    let displayPromptText = '';

    if (currentLabMode === 'fusion') {
      const available = getAvailableFusionIngredients(user);
      if (available.length < 2) { AudioEngine.playError(); return showToast('🎒 Cần ít nhất 2 vật phẩm khả dụng!'); }
      const uidA = (document.getElementById('lab-item-a') as HTMLSelectElement)?.value;
      const uidB = (document.getElementById('lab-item-b') as HTMLSelectElement)?.value;
      if (!uidA || !uidB || uidA === uidB) { AudioEngine.playError(); return showToast('⚠️ Chọn 2 vật phẩm khác nhau!'); }
      const foundA = available.find((x) => x.uid === uidA);
      const foundB = available.find((x) => x.uid === uidB);
      if (!foundA || !foundB) { refreshLabFusionIngredientsUI(); return; }

      [foundA, foundB]
        .sort((x, y) => (y.invIndex ?? -1) - (x.invIndex ?? -1))
        .forEach((ing) => {
          if (ing.source === 'inventory') {
            if (user.inventory[ing.invIndex] === ing.itemId) user.inventory.splice(ing.invIndex, 1);
            else {
              const i = user.inventory.indexOf(ing.itemId);
              if (i !== -1) user.inventory.splice(i, 1);
            }
          } else {
            const idx = (user.customLabItems || []).findIndex((x) => x.id === ing.itemId);
            if (idx !== -1) user.customLabItems!.splice(idx, 1);
          }
        });

      itemAId = foundA.itemId;
      itemBId = foundB.itemId;
      fusionLabel = `Hợp nhất từ [${foundA.label}] + [${foundB.label}]`;
      const sA = String(foundA.rawName || 'A').split(/\s+/).slice(0, 2).join(' ');
      const sB = String(foundB.rawName || 'B').split(/\s+/).slice(0, 2).join(' ');
      cleanTitle = `${sA} × ${sB}`;
      promptForSpec = `magical glowing ${foundA.itemId} ${foundB.itemId} ${foundA.rawName} ${foundB.rawName}`;
      displayPromptText = `${foundA.rawName} + ${foundB.rawName}`;
    } else {
      const inp = document.getElementById('lab-english-prompt') as HTMLInputElement | null;
      const rawPrompt = inp ? inp.value.trim() : '';
      const check = isValidEnglishLabPrompt(rawPrompt);
      if (!check.ok) { AudioEngine.playError(); return showToast(check.reason || 'Prompt không hợp lệ'); }
      cleanTitle = rawPrompt
        .replace(/^(a|an|the)\s+/i, '')
        .split(/\s+/)
        .slice(0, 4)
        .map((wd) => wd.charAt(0).toUpperCase() + wd.slice(1).toLowerCase())
        .join(' ');
      promptForSpec = rawPrompt;
      displayPromptText = rawPrompt;
      if (inp) inp.value = '';
    }

    user.points -= cost;
    const sizeSelectEl = document.getElementById('lab-size-select') as HTMLSelectElement | null;
    const sizeOverride =
      currentLabMode === 'prompt' && sizeSelectEl && sizeSelectEl.value !== 'auto'
        ? (sizeSelectEl.value as LabSizeTier)
        : undefined;
    const spec = parsePromptToLabSpec(
      promptForSpec,
      itemAId,
      itemBId,
      (id) => findAnyCatalogItem(id)?.labSpec?.primaryShape || null,
      sizeOverride
    );
    if (currentLabMode === 'fusion') spec.hasStars = true;
    const svgMarkup = buildLabSVGMarkup(spec);

    const newItem = {
      id: `lab_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      category: 'decor',
      isLabItem: true,
      name: `🧪 ${cleanTitle}`,
      icon: '🧪',
      prompt: displayPromptText,
      desc: fusionLabel || `Vật phẩm sáng tạo [${spec.rarity || 'Độc bản'}]: "${displayPromptText}"`,
      labSpec: spec,
      svgMarkup,
      sizeScale: spec.sizeScale
    };
    getLabItemCanvasImage(newItem);
    user.customLabItems!.unshift(newItem);
    if (currentLabMode === 'fusion') refreshLabFusionIngredientsUI();

    AudioEngine.playSuccess();
    triggerSpeechBubble(user, `Chế tạo thành công: ${cleanTitle}! 🧪✨`, true);
    showToast(`🎉 Chế tạo thành công "${cleanTitle}" (-${cost}⭐) và đã cất vào 🎒 Túi đồ!`);
    updateHUD();
    saveGame();
    renderLabRecentList(newItem);
  };

  w.togglePrivateRoomLockFromToolbar = () => {
    const user = getCurrentUser();
    const check = document.getElementById('pr-privacy-check') as HTMLInputElement | null;
    user.roomUnlocked = Boolean(check?.checked);
    AudioEngine.playClick();
    showToast(user.roomUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
    saveGame();
  };
  w.changePrivateRoomWallFromToolbar = () => {
    const user = getCurrentUser();
    const sel = document.getElementById('pr-wall-select') as HTMLSelectElement | null;
    if (sel) user.roomWall = sel.value;
    AudioEngine.playClick();
    saveGame();
  };
  w.exitPrivateRoomToHallway = exitPrivateRoomToHallway;
  w.assignDecorToRoomSlot = (decorId: string | null) => {
    const room = getActivePrivateRoom();
    const owner = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || getCurrentUser();
    if (!owner.roomSlots) owner.roomSlots = {};
    if (!selectedRoomSlotId) selectedRoomSlotId = ROOM_DECOR_SLOTS[0].id;
    if (decorId) { owner.roomSlots[selectedRoomSlotId] = decorId; AudioEngine.playSuccess(); showToast('✨ Đã đặt vật phẩm trang trí vào phòng!'); }
    else { delete owner.roomSlots[selectedRoomSlotId]; AudioEngine.playClick(); showToast('🗑️ Đã gỡ vật phẩm trang trí.'); }
    closeModal('slot-picker-modal');
    saveGame();
  };

  w.closeTvModal = () => {
    if (tvTimerInterval) clearInterval(tvTimerInterval);
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (iframe) iframe.src = '';
    closeModal('tv-modal');
  };
  w.switchTvChannel = (videoId: string, label: string) => {
    const user = getCurrentUser();
    if (getRemainingTvSeconds(user) <= 0) { AudioEngine.playError(); return showToast('⏰ Bạn đã hết thời gian xem YouTube hôm nay!'); }
    AudioEngine.playClick();
    currentTvVideoId = videoId;
    const ext = document.getElementById('tv-external-yt-link') as HTMLAnchorElement | null;
    const iframe = document.getElementById('youtube-iframe') as HTMLIFrameElement | null;
    if (ext) ext.href = `https://www.youtube.com/watch?v=${videoId}`;
    if (iframe) iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    showToast(`📺 Đang phát: ${label}`);
  };

  w.switchCustomTab = (tab: string) => {
    ['char', 'room', 'house'].forEach((t) => {
      const el = document.getElementById(`custom-tab-${t}`);
      if (el) el.style.display = t === tab ? 'block' : 'none';
    });
  };
  w.drawCharPreview = drawCharPreview;
  w.applyFashionSet = (setId: string) => {
    const st = FASHION_CATALOG.find((f) => f.id === setId) as any;
    if (!st) return;
    AudioEngine.playClick();
    draftChar.shirtColor = st.shirtColor;
    draftChar.shirtPattern = st.shirtPattern;
    draftChar.pantsColor = st.pantsColor;
    draftChar.pantsStyle = st.pantsStyle;
    renderVisualCharacterPickers();
  };
  w.selectDraftShirt = (color: string, pattern: string) => { AudioEngine.playClick(); draftChar.shirtColor = color; draftChar.shirtPattern = pattern; renderVisualCharacterPickers(); };
  w.selectDraftPants = (color: string, style: string) => { AudioEngine.playClick(); draftChar.pantsColor = color; draftChar.pantsStyle = style; renderVisualCharacterPickers(); };
  w.selectDraftOutfit = (icon: string) => { AudioEngine.playClick(); draftChar.outfit = icon; renderVisualCharacterPickers(); };
  w.saveCharCustom = () => {
    const user = getCurrentUser();
    const myRoom = getMemberPrivateRoom(user);
    const curRoom = user.scene === 'private_room' ? getActivePrivateRoom() : getRoomAtPosition(user.x, user.y);
    if ((user.scene !== 'house' && user.scene !== 'private_room') || !myRoom || !curRoom || curRoom.id !== myRoom.id) {
      AudioEngine.playError();
      return showToast('🔒 Bạn chỉ có thể đổi trang phục khi mở tủ quần áo ở phòng riêng!');
    }
    const newName = (document.getElementById('custom-char-name') as HTMLInputElement)?.value.trim();
    if (newName) user.name = newName;
    Object.assign(user, draftChar);
    user.memberUpdatedAt = Date.now();
    AudioEngine.playSuccess();
    showToast('✨ Đã lưu ngoại hình & trang phục!');
    updateHUD();
    saveGame();
  };
  w.toggleRoomPrivacy = () => {
    const user = getCurrentUser();
    user.roomUnlocked = Boolean((document.getElementById('room-privacy-toggle') as HTMLInputElement)?.checked);
    AudioEngine.playClick();
    showToast(user.roomUnlocked ? '🔓 Đã mở cửa phòng riêng!' : '🔒 Đã khóa phòng riêng!');
    saveGame();
  };
  w.changeRoomWall = () => {
    const user = getCurrentUser();
    const sel = document.getElementById('room-wall-color') as HTMLSelectElement | null;
    if (sel) user.roomWall = sel.value;
    saveGame();
  };
  w.placeDecorInRoom = (decorId: string) => {
    const user = getCurrentUser();
    const item = SHOP_CATALOG.find((i) => i.id === decorId);
    if (!item || user.scene !== 'house') return showToast('⚠️ Hãy bước vào trong phòng riêng của bạn trước!');
    const curRoom = getRoomAtPosition(user.x, user.y);
    if (!curRoom || !curRoom.ownerIds?.includes(user.id)) return showToast('⚠️ Chỉ đặt đồ trong phòng riêng của mình!');
    user.roomDecor.push({ id: item.id, icon: item.icon, x: user.x, y: user.y - 10 });
    closeModal('custom-modal');
    AudioEngine.playSuccess();
    showToast(`🛋️ Đã đặt ${item.name} vào phòng!`);
    saveGame();
  };
  w.updateHouseDesign = () => {
    const user = getCurrentUser();
    if (!isParent(user)) return;
    state.house.plotIndex = parseInt((document.getElementById('house-plot-select') as HTMLSelectElement)?.value || '1', 10);
    state.house.style = (document.getElementById('house-style-select') as HTMLSelectElement)?.value || 'modern';
    closeModal('custom-modal');
    AudioEngine.playSuccess();
    showToast('🏢 Đã cập nhật kiến trúc Nhà Phố Gia Đình!');
    saveGame();
  };

  w.sendDonation = () => {
    const sender = getCurrentUser();
    const recId = (document.getElementById('donate-recipient') as HTMLSelectElement)?.value;
    const amount = parseInt((document.getElementById('donate-amount') as HTMLInputElement)?.value || '0', 10) || 0;
    const note = (document.getElementById('donate-note') as HTMLInputElement)?.value.trim() || '';
    if (amount <= 0 || sender.points < amount) { AudioEngine.playError(); return showToast('❌ Số điểm không hợp lệ hoặc không đủ sao!'); }
    const receiver = state.members.find((m) => m.id === recId);
    if (!receiver || receiver.id === sender.id) return;
    const now = Date.now();
    sender.points -= amount;
    sender.memberUpdatedAt = now;
    receiver.points += amount;
    receiver.adminPointsUpdatedAt = now;
    receiver.memberUpdatedAt = now;
    logActivity({
      memberId: sender.id,
      memberName: sender.name,
      action: 'gift_points',
      detail: `${sender.name} tặng ${receiver.name} +${amount}⭐${note ? ` ("${note}")` : ''}`,
      pointsDelta: -amount
    });
    closeModal('donate-modal');
    AudioEngine.playCoin();
    triggerSpeechBubble(sender, `Tặng ${receiver.name} +${amount}⭐! ${note}`, false);
    showToast(`💸 Đã tặng ${amount}⭐ cho ${receiver.name}!`);
    updateHUD();
    saveGame();
  };

  w.pressPinDigit = (d: string) => {
    if (enteredPin.length >= 4) return;
    enteredPin += String(d);
    updatePinDisplay();
    if (enteredPin.length === 4) setTimeout(verifyPin, 120);
  };
  w.clearPinDigit = () => { enteredPin = enteredPin.slice(0, -1); updatePinDisplay(); };
  w.verifyPin = verifyPin;
  w.resetPinToDefault = () => {
    const u = getCurrentUser();
    if (!isParent(u) || deviceConfig.isLockedToMember) return;
    const now = Date.now();
    state.parentPin = '1234';
    state.parentPinUpdatedAt = now;
    localStorage.setItem('b2ks_parent_pin', '1234');
    localStorage.setItem('b2ks_parent_pin_ts', String(now));
    saveGame();
    enteredPin = '';
    updatePinDisplay();
    showToast('🔑 Đã khôi phục Passcode mặc định!');
  };
  w.toggleDeviceLock = () => {
    deviceConfig.isLockedToMember = !deviceConfig.isLockedToMember;
    saveDeviceConfig();
    lastHudSignature = '';
    updateHUD();
    renderFamilySyncModal();
    showToast(deviceConfig.isLockedToMember ? `🔒 Đã khóa máy cho ${getCurrentUser().name}!` : '🔓 Đã mở khóa thiết bị!');
  };
  w.changeParentPin = () => {
    const inp = document.getElementById('new-pin-input') as HTMLInputElement | null;
    const val = (inp?.value || '').trim();
    if (!/^\d{4}$/.test(val)) { AudioEngine.playError(); return showToast('⚠️ Vui lòng nhập đúng 4 chữ số!'); }
    if (val === String(state.gamePassword || '1111')) {
      AudioEngine.playError();
      return showToast('⚠️ Passcode Phụ huynh không được trùng với Mật khẩu vào game!');
    }
    const now = Date.now();
    state.parentPin = val;
    state.parentPinUpdatedAt = now;
    localStorage.setItem('b2ks_parent_pin', val);
    localStorage.setItem('b2ks_parent_pin_ts', String(now));
    if (inp) inp.value = '';
    saveGame();
    renderFamilySyncModal();
    AudioEngine.playSuccess();
    showToast('✅ Đã lưu mã PIN Phụ huynh mới thành công!');
  };
  w.saveFirebaseUrl = () => {
    let url = (document.getElementById('firebase-url-input') as HTMLInputElement)?.value.trim() || '';
    if (url && !url.startsWith('http')) url = `https://${url}`;
    url = url.replace(/\/+$/, '');
    deviceConfig.firebaseUrl = url;
    saveDeviceConfig();
    renderFamilySyncModal();
    if (url) { syncToFirebase(); showToast('☁️ Đã lưu link Firebase! Đang đồng bộ 4 máy...'); }
    else showToast('⚪ Đã ngắt kết nối Firebase.');
  };
  w.exportFamilyCode = () => {
    const codeStr = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeStr).then(() => showToast('📋 Đã copy Mã Dữ Liệu Gia Đình!'));
    } else {
      const inp = document.getElementById('import-code-input') as HTMLInputElement | null;
      if (inp) { inp.value = codeStr; inp.select(); showToast('📋 Đã điền Mã Gia Đình vào ô bên dưới — bấm Ctrl+C để copy!'); }
    }
  };
  w.importFamilyCode = () => {
    const raw = (document.getElementById('import-code-input') as HTMLInputElement)?.value.trim() || '';
    if (!raw) return;
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (parsed && parsed.members) {
        const keepId = deviceConfig.currentMemberId;
        state = parsed;
        state.currentUserId = keepId;
        ensureStateArrays();
        saveGame(false);
        lastHudSignature = '';
        updateHUD();
        showToast('✅ Đã nạp dữ liệu gia đình thành công!');
      }
    } catch { showToast('❌ Mã dữ liệu không hợp lệ!'); }
  };

  w.openDiningFoodPuzzleModal = () => {
    AudioEngine.init();
    AudioEngine.playClick();
    const item = DINING_FOOD_PUZZLES[Math.floor(Math.random() * DINING_FOOD_PUZZLES.length)];
    const chars = item.word.split('');
    const numToHide = Math.max(2, Math.min(chars.length - 1, Math.ceil(chars.length * 0.45)));
    const indices = chars.map((_, idx) => idx).sort(() => Math.random() - 0.5).slice(0, numToHide).sort((a, b) => a - b);
    activeFoodPuzzle = { item, hiddenIndices: indices, hiddenSet: new Set(indices), eatStatus: getActivityStatus(getCurrentUser(), 'eat') };
    const modal = document.getElementById('dining-puzzle-modal');
    if (modal) modal.style.display = 'flex';
    renderDiningFoodPuzzle();
  };
  w.handleFoodPuzzleSlotInput = (idx: number, el: HTMLInputElement) => {
    el.value = el.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (el.value.length === 1 && activeFoodPuzzle) {
      const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
      if (pos !== -1 && pos + 1 < activeFoodPuzzle.hiddenIndices.length) {
        document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[pos + 1]}`)?.focus();
      }
    }
  };
  w.handleFoodPuzzleSlotKeydown = (e: KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') return w.submitDiningFoodPuzzle();
    const target = e.target as HTMLInputElement;
    if (e.key === 'Backspace' && !target.value && activeFoodPuzzle) {
      const pos = activeFoodPuzzle.hiddenIndices.indexOf(idx);
      if (pos > 0) document.getElementById(`food-slot-${activeFoodPuzzle.hiddenIndices[pos - 1]}`)?.focus();
    }
  };
  w.submitDiningFoodPuzzle = () => {
    if (!activeFoodPuzzle) return;
    const { item, hiddenSet } = activeFoodPuzzle;
    const chars = item.word.split('');
    let guessedWord = '';
    for (let i = 0; i < chars.length; i++) {
      if (!hiddenSet.has(i)) guessedWord += chars[i];
      else guessedWord += ((document.getElementById(`food-slot-${i}`) as HTMLInputElement)?.value.trim().toUpperCase() || '');
    }
    const fb = document.getElementById('dining-puzzle-feedback');
    if (guessedWord.length < chars.length) {
      AudioEngine.playError();
      if (fb) { fb.style.color = '#E67E22'; fb.textContent = '⚠️ Bạn hãy điền đầy đủ tất cả các ô chữ còn thiếu nhé!'; }
      return;
    }
    if (guessedWord === item.word) {
      closeModal('dining-puzzle-modal');
      performRoutineActivity(getCurrentUser(), 'eat', `Yummy ${item.word.toLowerCase()}! (${item.vi}) 🍽️`);
    } else {
      AudioEngine.playError();
      if (fb) { fb.style.color = '#E74C3C'; fb.textContent = `❌ "${guessedWord}" chưa chính xác, hãy thử lại nhé!`; }
    }
  };

  // Arcade & Soccer bindings onto window
  w.closeArcadeModal = arcadeEngine.closeArcadeModal;
  w.createArcadeLobby = arcadeEngine.createArcadeLobby;
  w.joinArcadeLobby = arcadeEngine.joinArcadeLobby;
  w.toggleArcadeReady = arcadeEngine.toggleArcadeReady;
  w.leaveArcadeLobby = arcadeEngine.leaveArcadeLobby;
  w.startOnlineArcadeMatch = arcadeEngine.startOnlineArcadeMatch;
  w.resetArcadeToIdle = arcadeEngine.resetArcadeToIdle;
  w.playOnlineTicTacToeCell = arcadeEngine.playOnlineTicTacToeCell;
  w.forfeitOnlineMatch = arcadeEngine.forfeitOnlineMatch;
  w.buzzOnlinePlayerIn = arcadeEngine.buzzOnlinePlayerIn;
  w.answerOnlineBuzzerQuestion = arcadeEngine.answerOnlineBuzzerQuestion;
  w.dashOnlineArcadeShip = arcadeEngine.dashOnlineArcadeShip;
  w.fireOnlineArcadeShip = arcadeEngine.fireOnlineArcadeShip;

  w.closeSoccerModal = () => closeModal('soccer-modal');
  w.restartSoccerMatch = () => {
    AudioEngine.playClick();
    soccerGame.restartSoloMatch();
  };
  w.switchSoccerToSolo = () => soccerGame.switchToSoloMode();
  w.switchSoccerTo2P = () => soccerGame.switchTo2PMode();
  w.createSoccer2PRoom = () => soccerGame.create2PRoom();
  w.joinSoccer2PRoom = () => soccerGame.join2PRoom();
  w.startSoccer2PMatch = () => soccerGame.start2PMatch();
  w.leaveSoccer2PRoom = () => soccerGame.leave2PRoom();
  w.spectateSoccerMatch = () => soccerGame.spectateMatch();
  w.soccerTouchDir = (dir: 'up' | 'down' | 'left' | 'right', down: boolean) => soccerGame.setTouchDir(dir, down);
  w.soccerKick = () => soccerGame.kickBall();
  w.soccerCanvasKick = (ev: MouseEvent) => {
    const c = document.getElementById('soccer-canvas') as HTMLCanvasElement | null;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const tx = ((ev.clientX - rect.left) / rect.width) * c.width;
    const ty = ((ev.clientY - rect.top) / rect.height) * c.height;
    soccerGame.kickBall(tx, ty);
  };

  function claimComicReadReward(comicId: string, comicTitle: string): { ok: boolean; awarded: number; msg: string } {
    const me = getCurrentUser();
    ensureMemberProps(me);
    const stats = me.comicReadStats!;
    if (!stats.completedIds.includes(comicId)) {
      stats.completedIds.push(comicId);
    }
    const cfg = getActivityConfig('read_comic');
    const now = Date.now();
    const cooldownMs = cfg.cooldownMs ?? 120 * 1000;
    const maxPerDay = cfg.maxPerDay ?? 5;

    if (!cfg.enabled || cfg.reward <= 0) {
      me.memberUpdatedAt = now;
      saveGame(true);
      updateHUD();
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Đã hoàn thành truyện "${comicTitle}"! (Bố/Mẹ đang tắt thưởng sao cho hoạt động đọc truyện)`
      };
    }

    const sinceLast = now - (stats.lastReadAt || 0);
    if (stats.lastReadAt > 0 && cooldownMs > 0 && sinceLast < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - sinceLast) / 1000);
      me.memberUpdatedAt = now;
      saveGame(true);
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Chính xác! Đã lưu tiến độ đọc "${comicTitle}". Hãy chờ ${waitSec}s để nhận sao lượt tiếp theo nhé!`
      };
    }

    if (stats.count >= maxPerDay) {
      me.memberUpdatedAt = now;
      saveGame(true);
      notifySubscribers();
      return {
        ok: true,
        awarded: 0,
        msg: `✅ Chính xác! Hôm nay bạn đã nhận đủ ${maxPerDay} lượt thưởng đọc truyện rồi nhé!`
      };
    }

    me.points += cfg.reward;
    stats.count += 1;
    stats.lastReadAt = now;
    me.memberUpdatedAt = now;
    me.adminPointsUpdatedAt = now;

    AudioEngine.playCoin();
    triggerConfetti();
    triggerSpeechBubble(me, `I finished reading "${comicTitle}"! 📚✨`, true);
    logActivity({
      memberId: me.id,
      memberName: me.name,
      action: 'read_comic',
      detail: `Đọc xong truyện tranh "${comicTitle}" (+${cfg.reward}⭐)`,
      pointsDelta: cfg.reward
    });
    showToast(`📚 Tuyệt vời! Hoàn thành truyện "${comicTitle}" nhận +${cfg.reward}⭐!`);
    updateHUD();
    saveGame(true);
    notifySubscribers();

    return {
      ok: true,
      awarded: cfg.reward,
      msg: `🎉 Chính xác! Bạn nhận được +${cfg.reward}⭐ khi hoàn thành "${comicTitle}"!`
    };
  }

  // React Bridge
  const bridge: B2KSBridge = {
    getState: () => state,
    getCurrentUser,
    isParent,
    getFirebaseUrl: () => deviceConfig.firebaseUrl || '',
    saveGame,
    updateHUD,
    showToast,
    requestParentAccess,
    playCoin: () => AudioEngine.playCoin(),
    playClick: () => AudioEngine.playClick(),
    playSuccess: () => AudioEngine.playSuccess(),
    playError: () => AudioEngine.playError(),
    triggerConfetti,
    triggerSpeechBubble,
    logActivity,
    speakEnglish,
    syncEnglishBankToFirebase,
    syncCrossWorldRequestsToFirebase,
    syncFleaMarketToFirebase,
    syncActivityLogsToFirebase,
    findCatalogItem: findAnyCatalogItem,
    renderItemSVG: (id: string, size = 54) => renderItemIllustrationSVG(id, size, findAnyCatalogItem),
    openReactModal,
    closeReactModal,
    openParentMiniWindow: () => w.openParentMiniWindow(),
    getMemberLocationLabel: getMemberLocationText,
    claimComicReadReward,
    getFamilyName: () => state.familyName || 'B2KS',
    setFamilyName: (nextName: string) => {
      const clean = String(nextName || '').trim();
      if (!clean) return { ok: false, msg: 'Tên gia đình không được để trống!' };
      const now = Date.now();
      state.familyName = clean.slice(0, 24);
      state.familyNameUpdatedAt = now;
      deviceConfig.lastFamilyName = state.familyName;
      saveDeviceConfig();
      localStorage.setItem(LAST_FAMILY_KEY, state.familyName);
      lastHudSignature = '';
      updateFamilyBrandingDOM();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `✅ Đã đổi tên gia đình thành "${state.familyName}"!` };
    },
    getResolvedLocations: () => resolveNeighborhoodLocations(state),
    setBuildingLayouts: (layouts: Record<string, BuildingLayoutOverride>) => {
      state.buildingLayouts = layouts || {};
      state.buildingLayoutsUpdatedAt = Date.now();
      saveGame(true);
    },
    resetBuildingLayouts: () => {
      state.buildingLayouts = {};
      state.buildingLayoutsUpdatedAt = Date.now();
      saveGame(true);
    },
    setGamePassword: (nextPw: string) => {
      const clean = String(nextPw || '').trim();
      if (clean.length < 4) return { ok: false, msg: 'Mật khẩu vào game phải từ 4 ký tự trở lên!' };
      if (clean === String(state.parentPin || '1234')) {
        return { ok: false, msg: 'Mật khẩu vào game không được trùng với Passcode Phụ huynh!' };
      }
      state.gamePassword = clean;
      state.gamePasswordUpdatedAt = Date.now();
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật mật khẩu vào game thành "${clean}"!` };
    },
    setParentPin: (nextPin: string) => {
      const clean = String(nextPin || '').trim();
      if (clean.length < 4) return { ok: false, msg: 'Passcode Phụ huynh phải từ 4 ký tự trở lên!' };
      if (clean === String(state.gamePassword || '1111')) {
        return { ok: false, msg: 'Passcode Phụ huynh không được trùng với Mật khẩu vào game!' };
      }
      const now = Date.now();
      state.parentPin = clean;
      state.parentPinUpdatedAt = now;
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật Passcode Phụ huynh thành "${clean}"!` };
    },
    updateMemberProfile: (memberId: string, patch: { name?: string; age?: number; role?: string }) => {
      const target = state.members.find((m) => m.id === memberId);
      if (!target) return { ok: false, msg: 'Không tìm thấy thành viên!' };
      if (typeof patch.name === 'string') {
        const cleanName = patch.name.trim();
        if (!cleanName) return { ok: false, msg: 'Tên thành viên không được để trống!' };
        target.name = cleanName.slice(0, 20);
      }
      if (typeof patch.age === 'number' && !Number.isNaN(patch.age)) {
        target.age = Math.max(1, Math.min(120, Math.round(patch.age)));
      }
      if (typeof patch.role === 'string' && ['Bố', 'Mẹ', 'Con gái', 'Con trai'].includes(patch.role)) {
        const wasParent = isParent(target);
        const willBeParent = patch.role === 'Bố' || patch.role === 'Mẹ';
        if (wasParent && !willBeParent) {
          const otherParents = state.members.filter((m) => m.id !== target.id && isParent(m));
          if (otherParents.length === 0) {
            return { ok: false, msg: 'Cần giữ lại ít nhất 1 Phụ Huynh trong gia đình!' };
          }
        }
        target.role = patch.role;
      }
      target.memberUpdatedAt = Date.now();
      lastHudSignature = '';
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `✅ Đã cập nhật hồ sơ của ${target.name}!` };
    },
    addMember: (name: string, role: string, age?: number) => {
      const cleanName = String(name || '').trim().slice(0, 20);
      if (!cleanName) return { ok: false, msg: 'Vui lòng nhập tên thành viên!' };
      const validRole = ['Bố', 'Mẹ', 'Con gái', 'Con trai'].includes(role) ? role : 'Con gái';
      const now = Date.now();
      const parentRole = validRole === 'Bố' || validRole === 'Mẹ';
      const defaultAge = typeof age === 'number' && !Number.isNaN(age) && age > 0
        ? Math.max(1, Math.min(120, Math.round(age)))
        : parentRole
          ? 36
          : 10;
      const newMember: Member = {
        id: `member_${now}_${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        role: validRole,
        age: defaultAge,
        points: parentRole ? 150 : 30,
        pointsUpdatedAt: now,
        adminPointsUpdatedAt: now,
        memberUpdatedAt: now,
        hairStyle: validRole === 'Con gái' ? 'pigtails' : validRole === 'Mẹ' ? 'long' : 'short',
        hairColor: '#2C3E50',
        shirtColor: parentRole ? '#2980B9' : '#E67E22',
        shirtPattern: 'star',
        pantsColor: '#34495E',
        pantsStyle: validRole === 'Con gái' || validRole === 'Mẹ' ? 'skirt' : 'pants',
        outfit: '',
        inventory: [],
        vouchers: [],
        petAccessories: [],
        petFoodInventory: {},
        pets: [],
        roomUnlocked: false,
        roomWall: '#FCF3CF',
        roomDecor: [],
        roomSlots: {},
        customLabItems: [],
        unlockedZooAnimals: [],
        englishQuizHistory: [],
        scene: 'house',
        x: 560,
        y: 650,
        dir: 'down',
        speech: null
      };
      ensureMemberProps(newMember);
      state.members.push(newMember);
      logActivity({
        memberId: newMember.id,
        memberName: newMember.name,
        action: 'member_add',
        detail: `Thêm thành viên mới: ${newMember.name} (${newMember.role}, ${newMember.age}t)`
      });
      lastHudSignature = '';
      AudioEngine.playSuccess();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `👨‍👩‍👧‍👦 Đã thêm thành viên "${newMember.name}" (${newMember.role})!`, member: newMember };
    },
    removeMember: (memberId: string) => {
      const idx = state.members.findIndex((m) => m.id === memberId);
      if (idx === -1) return { ok: false, msg: 'Không tìm thấy thành viên cần xóa!' };
      const target = state.members[idx];
      if (target.id === state.currentUserId) {
        return { ok: false, msg: 'Không thể xóa thành viên đang đăng nhập! Hãy đổi sang tài khoản khác trước.' };
      }
      if (isParent(target)) {
        const remainingParents = state.members.filter((m) => m.id !== target.id && isParent(m));
        if (remainingParents.length === 0) {
          return { ok: false, msg: 'Cần giữ lại ít nhất 1 Phụ Huynh trong gia đình!' };
        }
      }
      if (state.members.length <= 1) {
        return { ok: false, msg: 'Gia đình phải có ít nhất 1 thành viên!' };
      }
      state.members.splice(idx, 1);
      state.tasks = state.tasks
        .filter((t) => !(t.assigneeId === target.id && t.type !== 'family_quest'))
        .map((t) =>
          t.type === 'family_quest' && Array.isArray(t.participantIds)
            ? { ...t, participantIds: t.participantIds.filter((pid) => pid !== target.id) }
            : t
        );
      // Remove deleted member from durable archive & ledger so reload doesn't resurrect orphaned data
      try {
        const archKey = getMemberArchiveKey();
        const arch = JSON.parse(localStorage.getItem(archKey) || '{}');
        if (arch && arch[target.id]) {
          delete arch[target.id];
          localStorage.setItem(archKey, JSON.stringify(arch));
        }
      } catch {
        // ignore
      }
      if (deviceConfig.firebaseUrl) {
        const fbBase = getFirebaseBasePath();
        fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data/${target.id}.json`, { method: 'DELETE' }).catch(() => {});
        fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos/${target.id}.json`, { method: 'DELETE' }).catch(() => {});
      }
      logActivity({
        memberId: getCurrentUser().id,
        memberName: getCurrentUser().name,
        action: 'member_remove',
        detail: `Đã xóa thành viên: ${target.name} (${target.role})`
      });
      lastHudSignature = '';
      AudioEngine.playClick();
      updateHUD();
      saveGame(true);
      return { ok: true, msg: `🗑️ Đã xóa thành viên "${target.name}" khỏi gia đình.` };
    },
    fetchOtherFamiliesDirectory: async () => {
      publishFamilyDirectorySummary();
      const fbUrl = deviceConfig.firebaseUrl;
      if (!fbUrl) return [];
      const currentSlug = getActiveFamilySlug();
      const bySlug = new Map<string, OtherFamilySummary>();

      try {
        const dirRes = await fetch(`${fbUrl}/b2ks_family_directory.json`);
        const dirData = await dirRes.json();
        if (dirData && typeof dirData === 'object') {
          Object.entries(dirData).forEach(([slug, val]: [string, any]) => {
            if (!val || typeof val !== 'object' || slug === currentSlug) return;
            if (!Array.isArray(val.members)) return;
            bySlug.set(slug, {
              slug,
              familyName: String(val.familyName || slug),
              updatedAt: Number(val.updatedAt) || 0,
              members: val.members.map((m: any) => ({
                id: String(m.id || ''),
                name: String(m.name || 'Thành viên'),
                role: String(m.role || 'Con gái'),
                age: typeof m.age === 'number' ? m.age : undefined,
                outfit: String(m.outfit || ''),
                points: Number(m.points) || 0
              }))
            });
          });
        }
      } catch {
        // ignore directory error
      }

      try {
        const rootRes = await fetch(`${fbUrl}/.json?shallow=true`);
        const rootKeys = await rootRes.json();
        if (rootKeys && typeof rootKeys === 'object') {
          const namespaces = Object.keys(rootKeys).filter(
            (k) => k === 'b2ks_family_rpg_v16' || k.startsWith('b2ks_family_ns_')
          );
          const toProbe = namespaces
            .map((ns) => ({ ns, slug: ns === 'b2ks_family_rpg_v16' ? 'b2ks' : ns.replace(/^b2ks_family_ns_/, '') }))
            .filter((item) => item.slug !== currentSlug && !bySlug.has(item.slug))
            .slice(0, 12);

          await Promise.all(
            toProbe.map(async ({ ns, slug }) => {
              try {
                const [fnRes, memRes] = await Promise.all([
                  fetch(`${fbUrl}/${ns}/shared/familyName.json`),
                  fetch(`${fbUrl}/${ns}/shared/members.json`)
                ]);
                const [fnVal, memVal] = await Promise.all([fnRes.json(), memRes.json()]);
                if (Array.isArray(memVal) && memVal.length > 0) {
                  bySlug.set(slug, {
                    slug,
                    familyName: typeof fnVal === 'string' && fnVal.trim() ? fnVal.trim() : slug.toUpperCase(),
                    updatedAt: 0,
                    members: memVal.map((m: any) => ({
                      id: String(m.id || ''),
                      name: String(m.name || 'Thành viên'),
                      role: String(m.role || 'Con gái'),
                      age: typeof m.age === 'number' ? m.age : undefined,
                      outfit: String(m.outfit || ''),
                      points: Number(m.points) || 0
                    }))
                  });
                }
              } catch {
                // ignore single namespace probe error
              }
            })
          );
        }
      } catch {
        // ignore shallow probe error
      }

      return Array.from(bySlug.values()).sort((a, b) => a.familyName.localeCompare(b.familyName));
    },
    getBgmTheme: () => AudioEngine.themeId,
    setBgmTheme: (themeId: BgmThemeId) => {
      AudioEngine.init();
      AudioEngine.setTheme(themeId);
      state.bgmTheme = themeId;
      saveGame(false);
      notifySubscribers();
    },
    isAudioMuted: () => AudioEngine.isMuted,
    toggleAudioMuted: () => {
      const muted = AudioEngine.toggleMute();
      notifySubscribers();
      return muted;
    },
    setGameUnlocked: (unlocked: boolean) => {
      isGameUnlocked = unlocked;
      if (unlocked) {
        AudioEngine.init();
        if (state.bgmTheme && state.bgmTheme !== AudioEngine.themeId) {
          AudioEngine.setTheme(state.bgmTheme);
        }
      }
      notifySubscribers();
    },
    authenticateFamilyLogin: async (familyNameInput: string, passwordInput: string) => {
      const cleanFamily = String(familyNameInput || 'B2KS').trim() || 'B2KS';
      const enteredPw = String(passwordInput || '').trim();
      const targetSlug = normalizeFamilySlug(cleanFamily);
      const currentSlug = getActiveFamilySlug();

      if (targetSlug !== currentSlug || !hasLocalSaveFile) {
        loadGame(cleanFamily);
        if (targetSlug !== currentSlug && !hasLocalSaveFile) {
          state.familyName = cleanFamily;
        }
      }

      const fbUrl = deviceConfig.firebaseUrl;
      const fbPath = getFamilyFirebaseRoot(cleanFamily);
      let remoteAuthMeta: any = null;
      if (fbUrl) {
        try {
          const r = await fetch(`${fbUrl}/${fbPath}/auth_meta.json`);
          remoteAuthMeta = await r.json();
        } catch {
          // ignore network hiccup; fallback to local secrets/state
        }
      }

      if (remoteAuthMeta && typeof remoteAuthMeta === 'object') {
        if ((remoteAuthMeta.gamePasswordUpdatedAt || 0) >= (state.gamePasswordUpdatedAt || 0) && remoteAuthMeta.gamePassword) {
          state.gamePassword = String(remoteAuthMeta.gamePassword);
          state.gamePasswordUpdatedAt = remoteAuthMeta.gamePasswordUpdatedAt || 0;
        }
        if ((remoteAuthMeta.parentPinUpdatedAt || 0) >= (state.parentPinUpdatedAt || 0) && remoteAuthMeta.parentPin) {
          state.parentPin = String(remoteAuthMeta.parentPin);
          state.parentPinUpdatedAt = remoteAuthMeta.parentPinUpdatedAt || 0;
        }
        if ((remoteAuthMeta.familyNameUpdatedAt || 0) >= (state.familyNameUpdatedAt || 0) && remoteAuthMeta.familyName) {
          state.familyName = String(remoteAuthMeta.familyName);
          state.familyNameUpdatedAt = remoteAuthMeta.familyNameUpdatedAt || 0;
        }
      } else if (fbUrl && !hasLocalSaveFile) {
        try {
          const r = await fetch(`${fbUrl}/${fbPath}/shared.json`);
          const remoteShared = await r.json();
          if (remoteShared && Array.isArray(remoteShared.members)) {
            state = { ...state, ...remoteShared };
            ensureStateArrays();
            snapshotSavedPointsMap();
            hasHydratedRemote = true;
          }
        } catch {
          // ignore
        }
      }

      const expectedPw = String(state.gamePassword || '1111');
      if (enteredPw !== expectedPw) {
        AudioEngine.playError();
        return {
          ok: false,
          msg: `❌ Sai mật khẩu vào khu phố "${state.familyName || cleanFamily}"! (Mặc định lần đầu: 1111)`,
          familyName: state.familyName || cleanFamily
        };
      }

      isGameUnlocked = true;
      hudToolsExpanded = false;
      syncHudToolsVisibility();
      localStorage.setItem(LAST_FAMILY_KEY, state.familyName || cleanFamily);
      deviceConfig.lastFamilyName = state.familyName || cleanFamily;
      saveDeviceConfig();
      persistDurableSecrets();
      persistDurableMemberArchive();
      publishFamilyDirectorySummary();
      AudioEngine.init();
      AudioEngine.playSuccess();
      lastHudSignature = '';
      updateFamilyBrandingDOM();
      updateHUD();
      pullFromFirebase();
      notifySubscribers();
      return {
        ok: true,
        msg: `🏡 Chào mừng gia đình ${state.familyName || cleanFamily}!`,
        familyName: state.familyName || cleanFamily
      };
    },
    getLastLoginFamilyName: () => localStorage.getItem(LAST_FAMILY_KEY) || deviceConfig.lastFamilyName || 'B2KS',
    getWeatherInfo: () => currentWeather || getCachedWeatherInfo(),
    refreshWeather: async (useGeolocation = false) => {
      const next = await fetchLiveWeatherInfo(true, useGeolocation);
      currentWeather = next;
      lastHudSignature = '';
      updateHUD();
      notifySubscribers();
      return next;
    },
    getMemberPresenceMap: () => {
      const now = Date.now();
      const meId = getCurrentUser().id;
      const out: Record<string, { online: boolean; lastSeenAt: number }> = {};
      state.members.forEach((m) => {
        if (m.id === meId) {
          out[m.id] = { online: true, lastSeenAt: now };
        } else {
          const ts = livePosTimestamps.get(m.id) || 0;
          out[m.id] = { online: ts > 0 && now - ts < 16000, lastSeenAt: ts };
        }
      });
      return out;
    },
    subscribe: (fn: () => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
  window.B2KS = bridge;

  /* ==================== 18. CANVAS, CONTROLS & GAME LOOP ==================== */
  const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvasEl) return;
  const canvas: HTMLCanvasElement = canvasEl;
  const ctx = canvas.getContext('2d')!;
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let currentInteractTarget: { x: number; y: number; radius: number; label: string; action: () => void } | null = null;
  let lastDoorToastTime = 0;

  w.triggerInteraction = () => {
    if (!isGameUnlocked) return;
    if (currentInteractTarget?.action) {
      AudioEngine.playClick();
      currentInteractTarget.action();
    }
  };

  const keys: Record<string, boolean> = {};
  window.addEventListener('keydown', (e) => {
    if (!isGameUnlocked) return;
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const k = e.key.toLowerCase();
    const soccerModal = document.getElementById('soccer-modal');
    if (soccerModal && soccerModal.style.display === 'flex') {
      if (soccerGame.handleKey(e.key, true)) {
        e.preventDefault();
        return;
      }
    }
    keys[k] = true;
    const arcadeModal = document.getElementById('arcade-modal');
    if (arcadeModal && arcadeModal.style.display === 'flex' && arcadeEngine.getRoomState().status === 'playing') {
      arcadeEngine.handleArcadeKeyPress(k);
      return;
    }
    if ((e.key === ' ' || e.key === 'Enter') && currentInteractTarget) {
      e.preventDefault();
      w.triggerInteraction();
    }
  });
  window.addEventListener('keyup', (e) => {
    const soccerModal = document.getElementById('soccer-modal');
    if (soccerModal && soccerModal.style.display === 'flex') {
      soccerGame.handleKey(e.key, false);
    }
    keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('member-switcher-wrap');
    const menu = document.getElementById('member-dropdown-menu');
    if (wrap && menu && !wrap.contains(e.target as Node)) menu.classList.remove('open');
  });

  // Mobile Joystick
  const joyBase = document.getElementById('joystick-base');
  const joyKnob = document.getElementById('joystick-knob');
  let joyVector = { x: 0, y: 0 };
  let joyActive = false;

  const handleJoyMove = (clientX: number, clientY: number) => {
    if (!joyBase || !joyKnob || !isGameUnlocked) return;
    const rect = joyBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const maxD = 26;
    const dist = Math.hypot(dx, dy);
    if (dist > maxD) { dx = (dx / dist) * maxD; dy = (dy / dist) * maxD; }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyVector = { x: dx / maxD, y: dy / maxD };
  };
  const resetJoy = () => {
    joyActive = false;
    if (joyKnob) joyKnob.style.transform = 'translate(0,0)';
    joyVector = { x: 0, y: 0 };
  };
  if (joyBase) {
    joyBase.addEventListener('touchstart', (e) => { if (!isGameUnlocked) return; e.preventDefault(); AudioEngine.init(); joyActive = true; handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
    joyBase.addEventListener('touchmove', (e) => { if (!isGameUnlocked) return; e.preventDefault(); if (joyActive) handleJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
    joyBase.addEventListener('touchend', resetJoy);
    joyBase.addEventListener('mousedown', (e) => { if (!isGameUnlocked) return; AudioEngine.init(); joyActive = true; handleJoyMove(e.clientX, e.clientY); });
  }
  window.addEventListener('mousemove', (e) => { if (joyActive) handleJoyMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup', resetJoy);

  const streetCars: StreetCar[] = [
    { axis: 'h', x: 150, y: 505, speed: 2.1, color: '#E74C3C', dir: 1, kind: 'car' },
    { axis: 'h', x: 960, y: 515, speed: 3.1, color: '#0EA5E9', dir: 1, kind: 'moto' },
    { axis: 'h', x: 1650, y: 560, speed: -2.2, color: '#3498DB', dir: -1, kind: 'bus' },
    { axis: 'h', x: 2200, y: 545, speed: -1.6, color: '#10B981', dir: -1, kind: 'bike' },
    { axis: 'h', x: 400, y: 1055, speed: 2.0, color: '#F39C12', dir: 1, kind: 'truck' },
    { axis: 'h', x: 1320, y: 1068, speed: 3.2, color: '#EC4899', dir: 1, kind: 'moto' },
    { axis: 'h', x: 1900, y: 1115, speed: -2.5, color: '#9B59B6', dir: -1, kind: 'car' },
    { axis: 'h', x: 640, y: 1105, speed: -1.7, color: '#F97316', dir: -1, kind: 'bike' },
    { axis: 'v', x: 1215, y: 310, speed: 1.9, color: '#16A085', dir: 1, kind: 'car' },
    { axis: 'v', x: 1232, y: 820, speed: 2.8, color: '#DC2626', dir: 1, kind: 'moto' },
    { axis: 'v', x: 1275, y: 1350, speed: -2.1, color: '#E67E22', dir: -1, kind: 'bus' }
  ];

  /* ==================== CONTEXTUAL BOTTOM CHAT BAR & WORLD INTERACTABLES ==================== */
  let manualChatForcedUntil = 0;
  let manualChatOrigin: { x: number; y: number; scene: string } | null = null;
  let chatHiddenByUserUntil = 0;
  let lastChatVisibleState = false;

  function openContextualChatBar(placeholderText?: string, presetValue?: string) {
    const me = getCurrentUser();
    manualChatForcedUntil = Date.now() + 30000;
    manualChatOrigin = { x: me.x, y: me.y, scene: me.scene };
    chatHiddenByUserUntil = 0;
    const bar = document.getElementById('rpg-chat-bar');
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    if (bar) bar.style.display = 'flex';
    if (inp) {
      if (placeholderText) inp.placeholder = placeholderText;
      if (typeof presetValue === 'string') inp.value = presetValue;
      inp.focus();
    }
    lastChatVisibleState = true;
  }

  w.hideContextualChatBar = () => {
    manualChatForcedUntil = 0;
    manualChatOrigin = null;
    chatHiddenByUserUntil = Date.now() + 8000;
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    if (inp && document.activeElement === inp) inp.blur();
    const logPopup = document.getElementById('chat-log-popup');
    if (logPopup) logPopup.style.display = 'none';
    const bar = document.getElementById('rpg-chat-bar');
    if (bar) bar.style.display = 'none';
    lastChatVisibleState = false;
  };

  function updateContextualChatBar(me: Member) {
    const bar = document.getElementById('rpg-chat-bar');
    if (!bar) return;
    const inp = document.getElementById('chat-input') as HTMLInputElement | null;
    const logPopup = document.getElementById('chat-log-popup');
    const now = Date.now();

    if (manualChatOrigin && (me.scene !== manualChatOrigin.scene || Math.hypot(me.x - manualChatOrigin.x, me.y - manualChatOrigin.y) > 110)) {
      manualChatForcedUntil = 0;
      manualChatOrigin = null;
    }

    const chatCfg = getActivityConfig('english_chat');
    const chatRewardText = chatCfg.enabled && chatCfg.reward > 0 ? `+${chatCfg.reward}⭐` : '+0⭐';

    let contextPlaceholder: string | null = null;
    if (me.scene === 'neighborhood') {
      if (Math.hypot(me.x - 175, me.y - 425) < 95) {
        contextPlaceholder = `💬 Luyện Tiếng Anh tại Công viên (${chatRewardText})...`;
      } else if (Math.hypot(me.x - 1540, me.y - 1400) < 95) {
        contextPlaceholder = `📖 Đọc câu Tiếng Anh (${chatRewardText})...`;
      }
    }

    if (!contextPlaceholder) {
      const nearOther = state.members.find(
        (other) => other.id !== me.id && other.scene === me.scene && Math.hypot(me.x - other.x, me.y - other.y) < 85
      );
      if (nearOther) {
        contextPlaceholder = `💬 Nói với ${nearOther.name} (${chatRewardText} nếu dùng Tiếng Anh)...`;
      }
    }

    const isInputFocused = document.activeElement === inp;
    const isLogOpen = Boolean(logPopup && logPopup.style.display === 'block');
    const isForced = now < manualChatForcedUntil;
    const shouldShow = isInputFocused || isLogOpen || isForced || (Boolean(contextPlaceholder) && now >= chatHiddenByUserUntil);

    if (shouldShow && contextPlaceholder && inp && !isInputFocused) {
      inp.placeholder = contextPlaceholder;
    }
    if (shouldShow !== lastChatVisibleState) {
      bar.style.display = shouldShow ? 'flex' : 'none';
      const promptEl = document.getElementById('interact-prompt');
      if (promptEl) promptEl.style.bottom = shouldShow ? '118px' : '66px';
      lastChatVisibleState = shouldShow;
    }
  }

  function getWorldInteractables() {
    const me = getCurrentUser();
    const brand = (state.familyName || 'B2KS').trim() || 'B2KS';
    const items: { x: number; y: number; radius: number; label: string; action: () => void }[] = [];
    const chatCfg = getActivityConfig('english_chat');
    const chatRewardText = chatCfg.enabled && chatCfg.reward > 0 ? `+${chatCfg.reward}⭐` : '+0⭐';

    if (me.scene === 'neighborhood') {
      const resolvedLocs = resolveNeighborhoodLocations(state);
      const locById = new Map(resolvedLocs.map((l) => [l.id, l]));
      const coord = (id: string, fx: number, fy: number) => {
        const hit = locById.get(id);
        return hit ? { x: hit.x, y: hit.y } : { x: fx, y: fy };
      };

      const pHouse = coord('house', (PLOTS[state.house.plotIndex] || PLOTS[1]).x, (PLOTS[state.house.plotIndex] || PLOTS[1]).y + 85);
      const pEngPark = coord('eng_park', 175, 425);
      const pSuper = coord('supermarket', 1560, 410);
      const pCW = coord('cross_world', 1980, 410);
      const pPetShop = coord('pet_shop', PET_SHOP_POS.x, PET_SHOP_POS.interactY);
      const pEngCenter = coord('english_center', 250, 925);
      const pFashion = coord('fashion', 600, 945);
      const pArcade = coord('arcade', 950, 790);
      const pLab = coord('lab', 1540, 790);
      const pSalon = coord('salon', 1760, 975);
      const pFlea = coord('flea_market', 1980, 790);
      const pFountain = coord('fountain_plaza', 280, 1420);
      const pZoo = coord('zoo', 820, 1485);
      const pRead = coord('reading_corner', 1540, 1400);
      const pSoccer = coord('soccer', SOCCER_PITCH_POS.x, SOCCER_PITCH_POS.y);

      items.push({ x: pHouse.x, y: pHouse.y, radius: 75, label: '🏠 Vào nhà', action: () => openModal('house-modal') });
      items.push({ x: pEngPark.x, y: pEngPark.y, radius: 82, label: '💬 Luyện Tiếng Anh', action: () => { openContextualChatBar(`💬 Nhập câu tiếng Anh tại Công viên (${chatRewardText})...`); showToast(`💡 Hãy nhập một câu tiếng Anh để nhận ${chatRewardText}!`); } });
      items.push({ x: pSuper.x, y: pSuper.y, radius: 88, label: '🏪 Vào Siêu thị', action: () => openModal('shop-modal') });
      items.push({ x: pCW.x, y: pCW.y, radius: 92, label: '🌌 Trung Tâm Xuyên Thế Giới', action: () => openReactModal('cross_world') });
      items.push({ x: pEngCenter.x, y: pEngCenter.y, radius: 88, label: '🎓 Vào Trung Tâm Tiếng Anh', action: () => openModal('english-center-modal') });
      items.push({ x: pFashion.x, y: pFashion.y, radius: 88, label: '👗 Cửa Hàng Thời Trang', action: () => openModal('fashion-modal') });
      items.push({ x: pArcade.x, y: pArcade.y, radius: 92, label: '🕹️ Vào Khu Vui Chơi (1⭐/lượt)', action: () => openModal('arcade-modal') });
      items.push({ x: pLab.x, y: pLab.y, radius: 90, label: '🧪 Vào Phòng Thí Nghiệm (10⭐)', action: () => openModal('invention-lab-modal') });
      items.push({ x: pFlea.x, y: pFlea.y, radius: 92, label: `🎪 Vào Chợ Trời ${brand}`, action: () => openReactModal('flea_market') });
      items.push({ x: pSalon.x, y: pSalon.y, radius: 88, label: '💇 Salon Tóc', action: () => openModal('salon-modal') });

      const parkSt = getActivityStatus(me, 'park_rest');
      const parkLabel = parkSt.canEarn
        ? `⛲ Nghỉ chân Quảng trường (+${parkSt.reward}⭐) [${parkSt.count}/${parkSt.maxPerDay}]`
        : parkSt.onCooldown
        ? `⛲ Nghỉ chân (Chờ ${Math.ceil(parkSt.remainMs / 60000)}p)`
        : '⛲ Nghỉ chân Quảng trường';
      items.push({ x: pFountain.x, y: pFountain.y, radius: 85, label: parkLabel, action: () => performRoutineActivity(me, 'park_rest', 'What a lovely sunny park!') });
      items.push({ x: pZoo.x, y: pZoo.y, radius: 98, label: `🦁 Vào Sở Thú Ảo ${brand} Zoo`, action: () => openReactModal('virtual_zoo') });
      items.push({
        x: pRead.x, y: pRead.y, radius: 85, label: '📚 Góc Đọc Sách Tiếng Anh',
        action: () => {
          openContextualChatBar(`📖 Nhập câu Tiếng Anh (${chatRewardText})...`, 'I love reading English books in the park!');
          showToast(`📖 Nhấn Nói để đọc to câu tiếng Anh & nhận ${chatRewardText}!`);
        }
      });
      items.push({ x: pSoccer.x, y: pSoccer.y, radius: 145, label: `⚽ Sân Bóng Đá ${brand} (1P / 2P / Xem)`, action: () => openModal('soccer-modal') });
      items.push({ x: pPetShop.x, y: pPetShop.y, radius: 92, label: `🐾 Cửa Hàng Thú Cưng ${brand}`, action: () => { petModalMode = 'shop'; petShopTab = 'eggs'; openModal('pet-shop-modal'); } });
    } else if (me.scene === 'private_room') {
      const room = getActivePrivateRoom();
      const isOwner = Boolean(room && room.ownerIds && room.ownerIds.includes(me.id));
      items.push({ x: 380, y: PRIVATE_ROOM_WORLD.height - 25, radius: 62, label: '🚪 Ra hành lang', action: exitPrivateRoomToHallway });
      const sleepSt = getActivityStatus(me, 'sleep');
      const sleepLabel = sleepSt.canEarn
        ? `😴 Đi ngủ / Nghỉ ngơi (+${sleepSt.reward}⭐) [${sleepSt.count}/${sleepSt.maxPerDay}]`
        : sleepSt.onCooldown
        ? `😴 Ngủ nghỉ (Chờ ${Math.ceil(sleepSt.remainMs / 60000)}p)`
        : '😴 Ngủ nghỉ trên giường';
      items.push({ x: 115, y: 245, radius: 75, label: sleepLabel, action: () => performRoutineActivity(me, 'sleep', 'Time to rest and recharge! 😴✨') });
      items.push({
        x: 670, y: 235, radius: 80, label: isOwner ? '🧥 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
        action: () => {
          if (isOwner && room) { wardrobeOpenedRoomId = room.id; openModal('custom-modal'); w.switchCustomTab('char'); }
          else { AudioEngine.playError(); showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!'); }
        }
      });
      if (isOwner) {
        ROOM_DECOR_SLOTS.forEach((slot) => {
          items.push({
            x: slot.x, y: slot.y, radius: 54, label: `📌 Trang trí: ${slot.label}`,
            action: () => {
              selectedRoomSlotId = slot.id;
              openModal('slot-picker-modal');
              renderPrivateRoomSlotBar();
            }
          });
        });
      }
    } else {
      items.push({
        x: 560, y: 735, radius: 58, label: '🚪 Ra ngoài phố',
        action: () => {
          const houseLoc = resolveNeighborhoodLocations(state).find((l) => l.id === 'house');
          const plot = PLOTS[state.house.plotIndex] || PLOTS[1];
          me.scene = 'neighborhood';
          me.x = houseLoc ? houseLoc.x : plot.x;
          me.y = (houseLoc ? houseLoc.y : plot.y + 85) + 15;
          me.dir = 'down';
          AudioEngine.playClick();
          showToast('🏘️ Bạn đã bước ra ngoài Khu phố!');
          updateHUD();
          saveGame();
        }
      });
      items.push({ x: 210, y: 650, radius: 75, label: '📋 Nhiệm vụ', action: () => openSmartphoneModal('tasks') });
      items.push({ x: 320, y: 615, radius: 68, label: '📺 Bật Tivi YouTube', action: () => openModal('tv-modal') });
      const eatSt = getActivityStatus(me, 'eat');
      items.push({
        x: 830, y: 665, radius: 80,
        label: eatSt.canEarn ? `🍽️ Ăn cơm & Đố Tiếng Anh (+${eatSt.reward}⭐) [${eatSt.count}/${eatSt.maxPerDay}]` : '🍽️ Ăn cơm & Đố Tiếng Anh',
        action: () => w.openDiningFoodPuzzleModal()
      });
      const f2Common = getHouseRooms().find((r) => r.id === 'f2_common');
      const commonOwned = Boolean(f2Common && f2Common.ownerIds && f2Common.ownerIds.length > 0);
      const bookX = commonOwned ? 195 : 225;
      const bookY = commonOwned ? 640 : 455;
      const readCfg = getActivityConfig('read_comic');
      items.push({
        x: bookX,
        y: bookY,
        radius: 90,
        label: readCfg.enabled && readCfg.reward > 0
          ? `📚 Tủ Sách Truyện Tranh (+${readCfg.reward}⭐)`
          : '📚 Tủ Sách Truyện Tranh Tiếng Anh',
        action: () => openReactModal('comic_library')
      });
      const curRoom = getRoomAtPosition(me.x, me.y);
      if (curRoom?.wardrobe) {
        const isOwner = curRoom.ownerIds?.includes(me.id);
        items.push({
          x: curRoom.wardrobe.x, y: curRoom.wardrobe.y + 42, radius: 75,
          label: isOwner ? '🚪 Mở tủ quần áo' : '🔒 Tủ quần áo riêng',
          action: () => {
            if (isOwner) { wardrobeOpenedRoomId = curRoom.id; openModal('custom-modal'); w.switchCustomTab('char'); }
            else { AudioEngine.playError(); showToast('🔒 Đây là tủ quần áo riêng của chủ phòng!'); }
          }
        });
      }
    }

    state.members.forEach((other) => {
      if (other.id !== me.id && other.scene === me.scene) {
        items.push({
          x: other.x, y: other.y, radius: 60, label: `💬 Nói với ${other.name}`,
          action: () => {
            openContextualChatBar(`💬 Nói với ${other.name} (${chatRewardText} nếu dùng Tiếng Anh)...`, `Hi ${other.name}, how are you?`);
          }
        });
      }
    });
    return items;
  }

  /* ==================== 19. LOAD & PERIODIC CLOUD SYNC ==================== */
  function loadGame(overrideFamilyName?: string) {
    const famName = (overrideFamilyName ?? localStorage.getItem(LAST_FAMILY_KEY) ?? deviceConfig.lastFamilyName ?? 'B2KS').trim() || 'B2KS';
    state = createFreshDefaultState(famName);
    hasHydratedRemote = false;

    const storageKey = getFamilyStorageKey(famName);
    const saved = localStorage.getItem(storageKey);
    hasLocalSaveFile = Boolean(saved);

    const localPin = localStorage.getItem('b2ks_parent_pin');
    const localPinTs = parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!Array.isArray(parsed.members) || parsed.members.length === 0) delete parsed.members;
          if (!parsed.house || typeof parsed.house !== 'object') delete parsed.house;
          state = { ...state, ...parsed };
          const parsedPinTs = parsed.parentPinUpdatedAt || 0;
          if (localPin && localPin.length >= 4 && localPinTs >= parsedPinTs) {
            state.parentPin = localPin;
            state.parentPinUpdatedAt = localPinTs;
          }
          if (state.house && (state.house.plotIndex < 0 || state.house.plotIndex >= PLOTS.length)) state.house.plotIndex = 1;
          if (Array.isArray(state.members)) {
            state.members.forEach((m) => {
              if (!m.scene) m.scene = 'neighborhood';
              if (m.scene === 'neighborhood') {
                m.x = Math.max(60, Math.min(STREET_WORLD.width - 60, m.x || 860));
                m.y = Math.max(280, Math.min(STREET_WORLD.height - 60, m.y || 435));
              }
            });
          }
        }
      } catch {
        // ignore corrupt save
      }
    }

    // Restore durable secrets if saved independently (prevents password/pin resets on updates)
    try {
      const secRaw = localStorage.getItem(getDurableSecretsKey(famName));
      if (secRaw) {
        const sec = JSON.parse(secRaw);
        if (sec && typeof sec === 'object') {
          if ((sec.familyNameUpdatedAt || 0) >= (state.familyNameUpdatedAt || 0) && sec.familyName) {
            state.familyName = String(sec.familyName);
            state.familyNameUpdatedAt = sec.familyNameUpdatedAt || 0;
          }
          if ((sec.gamePasswordUpdatedAt || 0) >= (state.gamePasswordUpdatedAt || 0) && sec.gamePassword) {
            state.gamePassword = String(sec.gamePassword);
            state.gamePasswordUpdatedAt = sec.gamePasswordUpdatedAt || 0;
          }
          if ((sec.parentPinUpdatedAt || 0) >= (state.parentPinUpdatedAt || 0) && sec.parentPin) {
            state.parentPin = String(sec.parentPin);
            state.parentPinUpdatedAt = sec.parentPinUpdatedAt || 0;
          }
        }
      }
    } catch {
      // ignore
    }

    // Restore durable points ledger if any member points timestamp in ledger is strictly newer
    try {
      const ledgerRaw = localStorage.getItem(getPointsLedgerKey(famName));
      if (ledgerRaw) {
        const ledger = JSON.parse(ledgerRaw);
        if (ledger && typeof ledger === 'object') {
          state.members.forEach((m) => {
            const entry = ledger[m.id];
            if (entry && typeof entry.points === 'number') {
              const entryTs = Math.max(entry.pointsUpdatedAt || 0, entry.adminPointsUpdatedAt || 0);
              const curTs = Math.max(m.pointsUpdatedAt || 0, m.adminPointsUpdatedAt || 0);
              if (entryTs > curTs) {
                m.points = entry.points;
                m.pointsUpdatedAt = entry.pointsUpdatedAt || entryTs;
                m.adminPointsUpdatedAt = Math.max(m.adminPointsUpdatedAt || 0, entry.adminPointsUpdatedAt || 0);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    restoreDurableMemberArchive(famName);
    ensureStateArrays();
    snapshotSavedPointsMap();
    pruneExpiredFamilyMessages();
    if (deviceConfig.currentMemberId && state.members.some((m) => m.id === deviceConfig.currentMemberId)) {
      state.currentUserId = deviceConfig.currentMemberId;
    }
    checkDailyAllowance(false);
    const cur = getCurrentUser();
    if (cur && cur.scene === 'house') {
      const startRoom = getRoomAtPosition(cur.x, cur.y);
      if (startRoom && startRoom.ownerIds && startRoom.ownerIds.length > 0) {
        activePrivateRoomId = startRoom.id;
        cur.scene = 'private_room';
        cur.privateRoomId = startRoom.id;
        cur.x = 380;
        cur.y = 285;
      }
    } else if (cur && cur.scene === 'private_room') {
      activePrivateRoomId = cur.privateRoomId || getMemberPrivateRoom(cur)?.id || null;
    }
    if (state.bgmTheme) {
      AudioEngine.setTheme(state.bgmTheme);
    }
    syncPrivateRoomToolbar();
    syncHudToolsVisibility();
    updateFamilyBrandingDOM();
  }

  function mergeOwnedPets(localPets: OwnedPet[], remotePets: OwnedPet[]): OwnedPet[] {
    const byId = new Map<string, OwnedPet>();
    (remotePets || []).forEach((p) => { if (p && p.id) byId.set(p.id, p); });
    (localPets || []).forEach((lp) => {
      if (!lp || !lp.id) return;
      const rp = byId.get(lp.id);
      if (!rp) {
        byId.set(lp.id, lp);
      } else {
        const lpScore = (lp.hatched ? 100000 : 0) + (lp.stage || 0) * 10000 + (lp.xp || 0) * 10 + (lp.hatchProgress || 0);
        const rpScore = (rp.hatched ? 100000 : 0) + (rp.stage || 0) * 10000 + (rp.xp || 0) * 10 + (rp.hatchProgress || 0);
        if (lpScore > rpScore) {
          byId.set(lp.id, lp);
        } else if (rpScore > lpScore) {
          byId.set(lp.id, rp);
        } else {
          byId.set(lp.id, { ...rp, ...lp, variant: lp.variant || rp.variant, gender: lp.gender || rp.gender, accessoryId: lp.accessoryId ?? rp.accessoryId });
        }
      }
    });
    return Array.from(byId.values()).sort((a, b) => (b.obtainedAt || 0) - (a.obtainedAt || 0));
  }

  function mergeAccessoryLists(a: string[] = [], b: string[] = []): string[] {
    return Array.from(new Set([...(a || []), ...(b || [])]));
  }

  function pullFromFirebase() {
    if (!deviceConfig.firebaseUrl) return;
    const fbBase = getFirebaseBasePath();
    const curId = getCurrentUser().id || deviceConfig.currentMemberId;

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/auth_meta.json`)
      .then((r) => r.json())
      .then((meta) => {
        if (!meta || typeof meta !== 'object') return;
        let metaChanged = false;
        if ((meta.familyNameUpdatedAt || 0) > (state.familyNameUpdatedAt || 0) && meta.familyName) {
          state.familyName = String(meta.familyName);
          state.familyNameUpdatedAt = meta.familyNameUpdatedAt || 0;
          metaChanged = true;
        }
        if ((meta.gamePasswordUpdatedAt || 0) > (state.gamePasswordUpdatedAt || 0) && meta.gamePassword) {
          state.gamePassword = String(meta.gamePassword);
          state.gamePasswordUpdatedAt = meta.gamePasswordUpdatedAt || 0;
          metaChanged = true;
        }
        if ((meta.parentPinUpdatedAt || 0) > (state.parentPinUpdatedAt || 0) && meta.parentPin) {
          state.parentPin = String(meta.parentPin);
          state.parentPinUpdatedAt = meta.parentPinUpdatedAt || 0;
          metaChanged = true;
        }
        if (metaChanged) {
          persistDurableSecrets();
          updateFamilyBrandingDOM();
          notifySubscribers();
        }
      })
      .catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/shared.json`)
      .then((r) => r.json())
      .then((remote) => {
        const shouldHydrate =
          remote &&
          Array.isArray(remote.members) &&
          ((!hasLocalSaveFile && !hasHydratedRemote) || (remote.updatedAt || 0) > (state.updatedAt || 0));
        if (shouldHydrate) {
          hasHydratedRemote = true;
          const localMembersBackup = state.members.map((m) => ({ ...m }));
          const localMe = localMembersBackup.find((m) => m.id === curId);
          const localPin = state.parentPin;
          const localPinTs = state.parentPinUpdatedAt || parseInt(localStorage.getItem('b2ks_parent_pin_ts') || '0', 10);
          const localGamePw = state.gamePassword;
          const localGamePwTs = state.gamePasswordUpdatedAt || 0;
          const localFamName = state.familyName;
          const localFamNameTs = state.familyNameUpdatedAt || 0;
          const localLayouts = state.buildingLayouts;
          const localLayoutsTs = state.buildingLayoutsUpdatedAt || 0;
          const localActCfg = state.activityConfigs;
          const localActCfgTs = state.activityConfigsUpdatedAt || 0;
          const prevUnread = getUnreadMessageCount(getCurrentUser());

          state = { ...state, ...remote };
          state.currentUserId = curId;
          ensureStateArrays();

          if (localActCfg && localActCfgTs > (remote.activityConfigsUpdatedAt || 0)) {
            state.activityConfigs = localActCfg;
            state.activityConfigsUpdatedAt = localActCfgTs;
          }
          if (localFamNameTs > (remote.familyNameUpdatedAt || 0) && localFamName) {
            state.familyName = localFamName;
            state.familyNameUpdatedAt = localFamNameTs;
          }
          if (localGamePwTs > (remote.gamePasswordUpdatedAt || 0) && localGamePw) {
            state.gamePassword = localGamePw;
            state.gamePasswordUpdatedAt = localGamePwTs;
          }
          if (localLayouts && localLayoutsTs > (remote.buildingLayoutsUpdatedAt || 0)) {
            state.buildingLayouts = localLayouts;
            state.buildingLayoutsUpdatedAt = localLayoutsTs;
          }

          const remotePinTs = remote.parentPinUpdatedAt || 0;
          if (localPinTs > remotePinTs && String(localPin || '').length >= 4) {
            state.parentPin = localPin;
            state.parentPinUpdatedAt = localPinTs;
          } else if (remote.parentPin && String(remote.parentPin).length >= 4) {
            localStorage.setItem('b2ks_parent_pin', String(remote.parentPin));
            localStorage.setItem('b2ks_parent_pin_ts', String(remotePinTs));
          } else {
            state.parentPin = localStorage.getItem('b2ks_parent_pin') || '1234';
          }
          pruneExpiredFamilyMessages();
          if (getUnreadMessageCount(getCurrentUser()) > prevUnread) AudioEngine.playTone(784, 'sine', 0.12, 0.06);

          state.members.forEach((rm, idx) => {
            const lm = localMembersBackup.find((x) => x.id === rm.id);
            if (!lm) return;
            ensureMemberProps(rm);
            ensureMemberProps(lm);
            const mergedPets = mergeOwnedPets(lm.pets || [], rm.pets || []);
            const mergedAcc = mergeAccessoryLists(lm.petAccessories, rm.petAccessories);
            const mergedZoo = unionStringLists(lm.unlockedZooAnimals, rm.unlockedZooAnimals);
            const mergedQuiz = mergeQuizHistory(lm.englishQuizHistory, rm.englishQuizHistory);
            const mergedComics = unionStringLists(
              lm.comicReadStats?.completedIds || [],
              rm.comicReadStats?.completedIds || []
            );
            const mergedLab = mergeCustomLabItems(lm.customLabItems, rm.customLabItems);
            const mergedInv = unionStringLists(lm.inventory, rm.inventory);
            const localIsNewer = (lm.memberUpdatedAt || 0) >= (rm.memberUpdatedAt || 0);
            const remotePtsTs = Math.max(rm.adminPointsUpdatedAt || 0, rm.pointsUpdatedAt || 0);
            const localPtsTs = Math.max(lm.adminPointsUpdatedAt || 0, lm.pointsUpdatedAt || 0);
            const remotePointsNewer = remotePtsTs > localPtsTs;
            const localPointsNewer = localPtsTs > remotePtsTs;

            if (rm.id === curId && localMe) {
              rm.x = localMe.x;
              rm.y = localMe.y;
              rm.dir = localMe.dir;
              rm.scene = localMe.scene;
              rm.privateRoomId = localMe.privateRoomId;
              rm.pets = mergedPets;
              rm.petAccessories = mergedAcc;
              rm.unlockedZooAnimals = mergedZoo;
              rm.englishQuizHistory = mergedQuiz;
              rm.customLabItems = mergedLab;
              rm.inventory = mergedInv;
              if (rm.comicReadStats) rm.comicReadStats.completedIds = mergedComics;
              if (localIsNewer) {
                rm.name = lm.name;
                rm.age = lm.age;
                rm.role = lm.role;
                rm.activePetId = lm.activePetId;
                rm.petFoodInventory = lm.petFoodInventory;
                rm.vouchers = lm.vouchers;
                rm.roomSlots = lm.roomSlots;
                rm.roomDecor = lm.roomDecor;
                rm.roomWall = lm.roomWall;
                rm.roomUnlocked = lm.roomUnlocked;
                rm.englishChatStats = lm.englishChatStats;
                if (lm.comicReadStats) {
                  rm.comicReadStats = { ...lm.comicReadStats, completedIds: mergedComics };
                }
                rm.outfit = lm.outfit;
                rm.hairStyle = lm.hairStyle;
                rm.hairColor = lm.hairColor;
                rm.shirtColor = lm.shirtColor;
                rm.shirtPattern = lm.shirtPattern;
                rm.pantsColor = lm.pantsColor;
                rm.pantsStyle = lm.pantsStyle;
                rm.memberUpdatedAt = lm.memberUpdatedAt;
                if (!remotePointsNewer) {
                  rm.points = lm.points;
                  rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                  rm.adminPointsUpdatedAt = lm.adminPointsUpdatedAt;
                }
              } else if (localPointsNewer) {
                rm.points = lm.points;
                rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                rm.adminPointsUpdatedAt = Math.max(rm.adminPointsUpdatedAt || 0, lm.adminPointsUpdatedAt || 0);
              }
            } else if (localIsNewer) {
              state.members[idx] = {
                ...lm,
                pets: mergedPets,
                petAccessories: mergedAcc,
                unlockedZooAnimals: mergedZoo,
                englishQuizHistory: mergedQuiz,
                customLabItems: mergedLab,
                inventory: mergedInv
              };
              if (remotePointsNewer) {
                state.members[idx].points = rm.points;
                state.members[idx].pointsUpdatedAt = rm.pointsUpdatedAt;
                state.members[idx].adminPointsUpdatedAt = rm.adminPointsUpdatedAt;
              }
            } else {
              rm.pets = mergedPets;
              rm.petAccessories = mergedAcc;
              rm.unlockedZooAnimals = mergedZoo;
              rm.englishQuizHistory = mergedQuiz;
              rm.customLabItems = mergedLab;
              rm.inventory = mergedInv;
              if (rm.comicReadStats) rm.comicReadStats.completedIds = mergedComics;
              if (localPointsNewer) {
                rm.points = lm.points;
                rm.pointsUpdatedAt = lm.pointsUpdatedAt;
                rm.adminPointsUpdatedAt = lm.adminPointsUpdatedAt;
              }
            }
            ensureMemberProps(state.members[idx]);
          });

          snapshotSavedPointsMap();
          localStorage.setItem(getFamilyStorageKey(), JSON.stringify(state));
          persistPointsLedger();
          persistDurableSecrets();
          persistDurableMemberArchive();
          lastHudSignature = '';
          updateFamilyBrandingDOM();
          updateHUD();
          notifySubscribers();
        }
      })
      .catch(() => {});

    // Pull authoritative per-member snapshots for ALL members (ensures points & pets evolution never vanish across reloads/devices)
    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/member_data.json`)
      .then((r) => r.json())
      .then((memberMap) => {
        if (!memberMap || typeof memberMap !== 'object') return;
        let changed = false;
        state.members.forEach((m) => {
          const remoteM = memberMap[m.id] as Member | undefined;
          if (!remoteM) return;
          ensureMemberProps(m);
          ensureMemberProps(remoteM);

          const mergedPets = mergeOwnedPets(m.pets || [], remoteM.pets || []);
          const mergedAcc = mergeAccessoryLists(m.petAccessories, remoteM.petAccessories);
          if (
            petsProgressSignature(mergedPets) !== petsProgressSignature(m.pets || []) ||
            mergedAcc.length !== (m.petAccessories || []).length
          ) {
            m.pets = mergedPets;
            m.petAccessories = mergedAcc;
            changed = true;
          }

          const mergedZoo = unionStringLists(m.unlockedZooAnimals, remoteM.unlockedZooAnimals);
          if (mergedZoo.length !== (m.unlockedZooAnimals || []).length) {
            m.unlockedZooAnimals = mergedZoo;
            changed = true;
          }
          const mergedLab = mergeCustomLabItems(m.customLabItems, remoteM.customLabItems);
          if (mergedLab.length !== (m.customLabItems || []).length) {
            m.customLabItems = mergedLab;
            changed = true;
          }
          const mergedComics = unionStringLists(
            m.comicReadStats?.completedIds || [],
            remoteM.comicReadStats?.completedIds || []
          );
          if (m.comicReadStats && mergedComics.length !== m.comicReadStats.completedIds.length) {
            m.comicReadStats.completedIds = mergedComics;
            changed = true;
          }

          const remotePtsTs = Math.max(remoteM.adminPointsUpdatedAt || 0, remoteM.pointsUpdatedAt || 0);
          const localPtsTs = Math.max(m.adminPointsUpdatedAt || 0, m.pointsUpdatedAt || 0);
          if (remotePtsTs > localPtsTs && typeof remoteM.points === 'number') {
            m.points = remoteM.points;
            m.pointsUpdatedAt = remoteM.pointsUpdatedAt || remotePtsTs;
            m.adminPointsUpdatedAt = Math.max(m.adminPointsUpdatedAt || 0, remoteM.adminPointsUpdatedAt || 0);
            changed = true;
          }

          if (m.id !== curId && (remoteM.memberUpdatedAt || 0) > (m.memberUpdatedAt || 0)) {
            m.name = remoteM.name || m.name;
            m.age = remoteM.age || m.age;
            m.role = remoteM.role || m.role;
            m.activePetId = remoteM.activePetId ?? m.activePetId;
            m.memberUpdatedAt = remoteM.memberUpdatedAt;
            changed = true;
          }
          ensureMemberProps(m);
        });
        if (changed) {
          snapshotSavedPointsMap();
          localStorage.setItem(getFamilyStorageKey(), JSON.stringify(state));
          persistPointsLedger();
          persistDurableMemberArchive();
          updateHUD();
          notifySubscribers();
        }
      })
      .catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/english_questions.json`)
      .then((r) => r.json())
      .then((eqRemote) => {
        if (Array.isArray(eqRemote) && eqRemote.length > 0) {
          state.englishQuestions = eqRemote;
        }
      })
      .catch(() => {});

    fetch(`${deviceConfig.firebaseUrl}/${fbBase}/live_pos.json`)
      .then((r) => r.json())
      .then((posMap) => {
        if (!posMap || typeof posMap !== 'object') return;
        let presenceChanged = false;
        state.members.forEach((m) => {
          const entry = posMap[m.id];
          if (!entry) return;
          if (typeof entry.ts === 'number') {
            livePosTimestamps.set(m.id, entry.ts);
            presenceChanged = true;
          }
          if (m.id !== curId) {
            m.x = entry.x;
            m.y = entry.y;
            m.dir = entry.dir || 'down';
            m.scene = entry.scene || 'neighborhood';
            m.privateRoomId = entry.privateRoomId || null;
            if (entry.speech && Date.now() < entry.speech.expiresAt) m.speech = entry.speech;
          }
        });
        if (presenceChanged) notifySubscribers();
      })
      .catch(() => {});
  }

  window.setInterval(pullFromFirebase, 2500);
  window.setInterval(arcadeEngine.pullArcadeRoomFromFirebase, 800);
  window.setInterval(soccerGame.pullSoccerRoomFromFirebase, 900);
  window.setInterval(() => {
    if (!deviceConfig.firebaseUrl || !isGameUnlocked) return;
    const cur = getCurrentUser();
    const ts = Date.now();
    livePosTimestamps.set(cur.id, ts);
    fetch(`${deviceConfig.firebaseUrl}/${getFirebaseBasePath()}/live_pos/${cur.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: Math.round(cur.x), y: Math.round(cur.y), dir: cur.dir || 'down',
        scene: cur.scene || 'neighborhood', privateRoomId: cur.privateRoomId || null,
        speech: cur.speech || null, ts
      })
    }).catch(() => {});
  }, 1200);

  window.setInterval(() => {
    fetchLiveWeatherInfo(false)
      .then((wInfo) => {
        currentWeather = wInfo;
        updateHUD();
      })
      .catch(() => {});
  }, 15 * 60 * 1000);

  window.addEventListener('storage', (e) => {
    const slug = getActiveFamilySlug();
    if (e.key === `b2ks_arcade_online_room_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && (parsed.updatedAt || 0) > (arcadeEngine.getRoomState()?.updatedAt || 0)) {
          arcadeEngine.onRemoteArcadeRoomUpdate(parsed);
        }
      } catch {
        // ignore
      }
    } else if (e.key === `b2ks_soccer_online_room_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as SoccerOnlineRoom;
        if (parsed && (parsed.updatedAt || 0) > (soccerGame.getRoomState()?.updatedAt || 0)) {
          soccerGame.onRemoteSoccerRoomUpdate(parsed);
        }
      } catch {
        // ignore
      }
    } else if (e.key === `b2ks_soccer_p2_input_${slug}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as SoccerPlayerInput;
        if (parsed) soccerGame.onRemoteP2InputUpdate(parsed);
      } catch {
        // ignore
      }
    }
  });

  const memberMoveState = new Map<string, { x: number; y: number; scene: string; movingUntil: number }>();

  function gameLoop() {
    const me = getCurrentUser();
    const lighting = getRealTimeLighting();
    const myPetBonus = getMemberPetBonuses(me);
    const speed = 3.6 + myPetBonus.speedBonus;
    let dx = 0;
    let dy = 0;
    if (isGameUnlocked) {
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (joyActive) { dx = joyVector.x; dy = joyVector.y; }
    }

    const isMeMoving = isGameUnlocked && (dx !== 0 || dy !== 0);
    if (isMeMoving) {
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      const nextX = me.x + dx * speed;
      const nextY = me.y + dy * speed;
      if (Math.abs(dx) > Math.abs(dy)) me.dir = dx < 0 ? 'left' : 'right';
      else me.dir = dy < 0 ? 'up' : 'down';

      if (me.scene === 'neighborhood') {
        me.x = Math.max(40, Math.min(STREET_WORLD.width - 40, nextX));
        me.y = Math.max(265, Math.min(STREET_WORLD.height - 40, nextY));
      } else if (me.scene === 'private_room') {
        me.x = Math.max(35, Math.min(PRIVATE_ROOM_WORLD.width - 35, nextX));
        me.y = Math.max(175, Math.min(PRIVATE_ROOM_WORLD.height - 15, nextY));
        if (me.y >= PRIVATE_ROOM_WORLD.height - 18 && Math.abs(me.x - 380) <= 45) exitPrivateRoomToHallway();
      } else {
        const check = canMoveInsideHouse(me, nextX, nextY);
        if (check.allowed) {
          me.x = nextX;
          me.y = nextY;
          const enteredRoom = getRoomAtPosition(nextX, nextY);
          if (enteredRoom && enteredRoom.ownerIds && enteredRoom.ownerIds.length > 0) enterPrivateRoomScene(enteredRoom);
        } else if (check.blockedRoom && Date.now() - lastDoorToastTime > 2200) {
          lastDoorToastTime = Date.now();
          AudioEngine.playError();
          showToast(`🔒 ${check.blockedRoom.name} đang khóa! Chủ phòng cần mở khóa cửa trước.`);
        }
      }
    }

    // Check Navigation Arrival on Neighborhood Map
    const navTarget = getResolvedNavTarget();
    if (navTarget && me.scene === 'neighborhood') {
      const distToNav = Math.hypot(me.x - navTarget.x, me.y - navTarget.y);
      if (distToNav <= 95) {
        activeNavTargetId = null;
        AudioEngine.playSuccess();
        showToast(`📍 Bạn đã đến ${navTarget.icon} ${navTarget.name}!`);
        updateHUD();
      }
    }

    if (isGameUnlocked) {
      updateContextualChatBar(me);
    }

    const interactables = getWorldInteractables();
    let nearest: { x: number; y: number; radius: number; label: string; action: () => void } | null = null;
    let minDist = Infinity;
    interactables.forEach((item) => {
      const d = Math.hypot(me.x - item.x, me.y - item.y);
      if (d < item.radius && d < minDist) { minDist = d; nearest = item; }
    });

    const promptEl = document.getElementById('interact-prompt');
    const interactBtn = document.getElementById('interact-btn');
    if (isGameUnlocked && nearest && promptEl && interactBtn) {
      currentInteractTarget = nearest;
      promptEl.style.display = 'block';
      interactBtn.innerText = (nearest as { label: string }).label;
    } else if (promptEl) {
      currentInteractTarget = null;
      promptEl.style.display = 'none';
    }

    const worldW = me.scene === 'neighborhood' ? STREET_WORLD.width : me.scene === 'private_room' ? PRIVATE_ROOM_WORLD.width : HOUSE_WORLD.width;
    const worldH = me.scene === 'neighborhood' ? STREET_WORLD.height : me.scene === 'private_room' ? PRIVATE_ROOM_WORLD.height : HOUSE_WORLD.height;
    const effW = canvas.width / zoomLevel;
    const effH = canvas.height / zoomLevel;
    const topSafePad = 140 / zoomLevel;
    const botSafePad = 95 / zoomLevel;
    let camX = me.x - effW / 2;
    let camY = me.y - effH / 2 - 20;
    camX = worldW <= effW ? (worldW - effW) / 2 : Math.max(0, Math.min(worldW - effW, camX));
    camY = worldH + topSafePad + botSafePad <= effH ? (worldH - effH) / 2 - (topSafePad - botSafePad) / 2 : Math.max(-topSafePad, Math.min(worldH - effH + botSafePad, camY));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-camX, -camY);

    if (me.scene === 'neighborhood') {
      drawNeighborhoodWorld(ctx, lighting, state, streetCars, arcadeEngine.getRoomState(), ARCADE_GAME_CATALOG, soccerGame.getRoomState(), currentWeather);
    } else if (me.scene === 'private_room') {
      const room = getActivePrivateRoom();
      const ownerMember = (room && room.ownerIds && state.members.find((m) => m.id === room.ownerIds[0])) || null;
      drawPrivateRoomWorld(ctx, lighting, room, ownerMember, me, wardrobeOpenedRoomId, findAnyCatalogItem);
    } else {
      drawHouseInteriorWorld(ctx, lighting, getHouseRooms(), wardrobeOpenedRoomId, me, state, findAnyCatalogItem);
    }

    const nowMs = Date.now();
    const visibleMembers = state.members
      .filter((m) => {
        if (m.scene !== me.scene) return false;
        if (me.scene === 'private_room') {
          const myRoomId = me.privateRoomId || activePrivateRoomId;
          return (m.privateRoomId || null) === myRoomId;
        }
        return true;
      })
      .sort((a, b) => a.y - b.y);
    visibleMembers.forEach((m) => {
      let memberMoving = false;
      if (m.id === me.id) {
        memberMoving = isMeMoving;
      } else {
        const prev = memberMoveState.get(m.id);
        if (!prev) {
          memberMoveState.set(m.id, { x: m.x, y: m.y, scene: m.scene, movingUntil: 0 });
        } else {
          const moved = prev.scene === m.scene && Math.hypot(m.x - prev.x, m.y - prev.y) > 0.5;
          if (moved) prev.movingUntil = nowMs + 1350;
          prev.x = m.x;
          prev.y = m.y;
          prev.scene = m.scene;
          memberMoving = nowMs < prev.movingUntil;
        }
      }
      drawCompanionPetOnContext(ctx, m, memberMoving);
      drawDetailedChibiOnContext(ctx, m, m.id === me.id, 1, true, memberMoving);
    });
    ctx.restore();

    if (lighting.overlayAlpha > 0 && me.scene === 'neighborhood') {
      ctx.fillStyle = lighting.overlayColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render Neighborhood Minimap & Active Navigation Banner
    const mmContainer = document.getElementById('minimap-container');
    const mmCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement | null;
    const mmBanner = document.getElementById('minimap-nav-banner');
    const mmLabel = document.getElementById('minimap-nav-label');
    if (mmContainer) {
      const showMinimap = isGameUnlocked && me.scene === 'neighborhood' && !document.body.classList.contains('parent-mini-minimized');
      mmContainer.style.display = showMinimap ? 'flex' : 'none';
      if (showMinimap && mmCanvas) {
        const mmCtx = mmCanvas.getContext('2d');
        const activeTarget = getResolvedNavTarget();
        if (mmCtx) {
          drawNeighborhoodMinimap(mmCtx, mmCanvas.width, mmCanvas.height, state, me, activeTarget, resolveNeighborhoodLocations(state));
        }
        if (mmBanner && mmLabel) {
          if (activeTarget) {
            const distM = Math.round(Math.hypot(me.x - activeTarget.x, me.y - activeTarget.y) / 10);
            mmBanner.style.display = 'flex';
            mmLabel.textContent = `${activeTarget.icon} ${activeTarget.name} (${distM}m)`;
          } else {
            mmBanner.style.display = 'none';
          }
        }
      }
    }

    updateHUD();
    requestAnimationFrame(gameLoop);
  }

  loadGame();
  fetchLiveWeatherInfo(false)
    .then((wInfo) => {
      currentWeather = wInfo;
      updateHUD();
    })
    .catch(() => {});
  updateHUD();
  renderChatLog();
  requestAnimationFrame(gameLoop);
}
