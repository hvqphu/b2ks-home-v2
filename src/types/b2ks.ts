export interface LabItemSpec {
  primaryShape: string;
  secondaryTrait?: string | null;
  color: string;
  accent: string;
  isRainbow?: boolean;
  hasWings?: boolean;
  hasWheels?: boolean;
  hasLegs?: boolean;
  hasFishTail?: boolean;
  hasCrown?: boolean;
  hasHalo?: boolean;
  hasFire?: boolean;
  hasBubbles?: boolean;
  hasGlasses?: boolean;
  hasAntenna?: boolean;
  hasStars?: boolean;
  pattern?: string;
  material?: string;
  seed?: number;
  rarity?: string;
  sizeTier?: 'small' | 'medium' | 'large' | 'giant';
  sizeScale?: number;
  wingCount?: 2 | 4;
  wingStyle?: 'feather' | 'angel' | 'dragon' | 'butterfly' | 'cyber';
  hasExhaust?: boolean;
  hasHeadlights?: boolean;
  hasPropeller?: boolean;
  hasCape?: boolean;
}

export interface CustomLabItem {
  id: string;
  category: string;
  isLabItem: boolean;
  name: string;
  icon: string;
  prompt: string;
  desc: string;
  labSpec: LabItemSpec;
  svgMarkup: string;
}

export interface EnglishQuizRecord {
  date: string;
  score: number;
  total: number;
  stars: number;
  ts: number;
  grade?: 6 | 7 | 8 | 9;
  unit?: number;
}

export interface EnglishGradeProgress {
  unit: number;
  highScoreStreak: number;
}

export type PetStage = 0 | 1 | 2 | 3 | 4;
export type PetGender = 'male' | 'female';
export type PetVariantId = 'classic' | 'pastel' | 'royal' | 'cosmic' | 'golden';

export interface PetVariantDef {
  id: PetVariantId;
  label: string;
  rarityLabel: string;
  chancePercent: number;
  badgeColor: string;
}

export interface PetAccessoryDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  desc: string;
}

export interface PetStageDef {
  stage: PetStage;
  title: string;
  minXp: number;
  scale: number;
  speedBonus: number;
  starBonus: number;
}

export interface PetSpeciesDef {
  id: string;
  name: string;
  eggName: string;
  eggIcon: string;
  eggPrice: number;
  primaryColor: string;
  accentColor: string;
  statLabel: string;
  desc: string;
  hungerDecayPerMin: number;
  stages: PetStageDef[];
}

export interface PetFoodDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  xpGain: number;
  hungerGain: number;
  desc: string;
}

export interface OwnedPet {
  id: string;
  speciesId: string;
  nickname: string;
  hatched: boolean;
  hatchProgress: number; // 0..100 (100 = ready to hatch / hatched)
  xp: number;
  level: number;
  stage: PetStage;
  hunger: number; // 0..100
  lastFedAt: number;
  obtainedAt: number;
  gender?: PetGender;
  variant?: PetVariantId;
  accessoryId?: string | null;
}

export type BuildingShape = 'classic' | 'modern' | 'pavilion' | 'castle';

export interface BuildingLayoutOverride {
  x: number;
  y: number;
  shape?: BuildingShape;
}

export interface NavDestination {
  id: string;
  name: string;
  icon: string;
  category: 'home' | 'shop' | 'learn' | 'play';
  x: number;
  y: number;
  color: string;
  shape?: BuildingShape;
}

export type BgmThemeId =
  | 'sunny_town'
  | 'adventure_rpg'
  | 'cozy_lullaby'
  | 'retro_chiptune'
  | 'calm_forest';

export interface BgmThemeDef {
  id: BgmThemeId;
  name: string;
  icon: string;
  desc: string;
  stepMs: number;
  oscType: OscillatorType;
  bassType: OscillatorType;
  melody: number[];
  bass: number[];
}

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'thunder' | 'fog' | 'snow';

export interface WeatherInfo {
  condition: WeatherCondition;
  label: string;
  icon: string;
  tempC: number;
  windKmh: number;
  locationLabel: string;
  isDay: boolean;
  updatedAt: number;
}

export interface SoccerPlayerInput {
  playerId: string;
  dx: number;
  dy: number;
  kickSeq: number;
  kickTx?: number;
  kickTy?: number;
  ts: number;
}

export interface SoccerOnlineRoom {
  status: 'idle' | 'lobby' | 'playing' | 'finished';
  hostId: string;
  p1Id: string;
  p1Name: string;
  p2Id: string | null;
  p2Name: string | null;
  p1Goals: number;
  p2Goals: number;
  timeLeft: number;
  p1x: number;
  p1y: number;
  p1Dir: string;
  p1Moving: boolean;
  p2x: number;
  p2y: number;
  p2Dir: string;
  p2Moving: boolean;
  bx: number;
  by: number;
  bvx: number;
  bvy: number;
  goalBannerText: string;
  goalBannerUntil: number;
  updatedAt: number;
}

export interface Member {
  id: string;
  name: string;
  age?: number;
  role: string;
  points: number;
  hairStyle: string;
  hairColor: string;
  shirtColor: string;
  shirtPattern: string;
  pantsColor: string;
  pantsStyle: string;
  outfit: string;
  inventory: string[];
  vouchers: string[];
  roomUnlocked: boolean;
  roomWall: string;
  roomDecor: { id: string; icon: string; x: number; y: number }[];
  roomSlots?: Record<string, string>;
  customLabItems?: CustomLabItem[];
  unlockedZooAnimals?: string[];
  englishQuizHistory?: EnglishQuizRecord[];
  englishProgress?: Record<number, EnglishGradeProgress>;
  pets?: OwnedPet[];
  activePetId?: string | null;
  petFoodInventory?: Record<string, number>;
  petAccessories?: string[];
  memberUpdatedAt?: number;
  pointsUpdatedAt?: number;
  adminPointsUpdatedAt?: number;
  englishChatStats?: {
    date: string;
    count: number;
    lastRewardAt: number;
    recentPhrases: string[];
  };
  comicReadStats?: {
    date: string;
    count: number;
    lastReadAt: number;
    completedIds: string[];
  };
  scene: 'neighborhood' | 'house' | 'private_room';
  privateRoomId?: string | null;
  x: number;
  y: number;
  dir: string;
  speech: { text: string; isEng: boolean; expiresAt: number } | null;
  tvSecondsUsedToday?: number;
  tvBonusSecondsToday?: number;
  tvLastDate?: string;
}

export interface TaskItem {
  id: number;
  type: 'chore' | 'homework' | 'family_quest';
  title: string;
  creatorId: string;
  assigneeId: string;
  participantIds?: string[];
  progressMap?: Record<string, 'pending' | 'done'>;
  reward: number;
  status: 'pending' | 'submitted' | 'completed';
  createdAt: number;
  completedAt: number | null;
  parentFile?: string | null;
  parentFileName?: string;
  childFile?: string | null;
  childFileName?: string;
  childNote?: string;
  grade?: number | null;
}

export interface CrossWorldItem {
  id: string;
  name: string;
  icon: string;
  category: 'money' | 'privilege';
  pointsCost: number;
  realValue: string;
  quantity: number;
}

export interface CrossWorldRequest {
  id: string;
  childId: string;
  childName: string;
  itemId: string;
  itemName: string;
  itemIcon: string;
  pointsCost: number;
  realValue: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  approvedAt?: number | null;
  approvedBy?: string | null;
}

export interface FleaMarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemIcon: string;
  itemDesc: string;
  itemKind: 'inventory' | 'lab';
  labItemData?: CustomLabItem | null;
  price: number;
  createdAt: number;
}

export interface ActivityLogEntry {
  id: string;
  memberId: string;
  memberName: string;
  action:
    | 'task_done'
    | 'quest_part'
    | 'quiz_done'
    | 'cross_world'
    | 'flea_market'
    | 'zoo_unlock'
    | 'pet_adopt'
    | 'pet_evolve'
    | 'gift_points'
    | 'admin_points'
    | 'read_comic'
    | 'member_add'
    | 'member_remove';
  detail: string;
  taskId?: number;
  pointsDelta?: number;
  ts: number;
}

export type ActivityConfigId =
  | 'english_chat'
  | 'eat'
  | 'sleep'
  | 'park_rest'
  | 'english_quiz_per_correct'
  | 'english_quiz_high_bonus'
  | 'homework_high_bonus'
  | 'read_comic';

export interface ActivityConfigItem {
  id: ActivityConfigId;
  label: string;
  desc: string;
  reward: number;
  enabled: boolean;
  cooldownMs?: number;
  maxPerDay?: number;
  unitLabel?: string;
}

export interface EnglishQuestion {
  id: string;
  cat: 'grammar' | 'vocab';
  grade?: 6 | 7 | 8 | 9;
  unit?: number;
  unitTitle?: string;
  q: string;
  opts: [string, string, string, string];
  ans: number;
  exp: string;
  custom?: boolean;
}

export interface ZooAnimal {
  id: string;
  nameEn: string;
  nameVi: string;
  wikiTitle: string;
  ecosystem: string;
  emoji: string;
  unlockCost: number;
  description: string;
}

export interface B2KSState {
  currentUserId: string;
  familyName?: string;
  familyNameUpdatedAt?: number;
  gamePassword?: string;
  gamePasswordUpdatedAt?: number;
  parentPin: string;
  parentPinUpdatedAt: number;
  updatedAt: number;
  familyMessages: unknown[];
  house: { plotIndex: number; style: string };
  buildingLayouts?: Record<string, BuildingLayoutOverride>;
  buildingLayoutsUpdatedAt?: number;
  bgmTheme?: BgmThemeId;
  members: Member[];
  tasks: TaskItem[];
  crossWorldItems: CrossWorldItem[];
  crossWorldRequests: CrossWorldRequest[];
  fleaMarketListings: FleaMarketListing[];
  activityLogs: ActivityLogEntry[];
  activityConfigs?: Record<ActivityConfigId, ActivityConfigItem>;
  activityConfigsUpdatedAt?: number;
  dailyParentAllowance?: number;
  englishQuestions: EnglishQuestion[];
  chatHistory: { sender: string; text: string; isEng: boolean; ts?: number }[];
  lastDailyReset: string;
}

export interface OtherFamilySummary {
  slug: string;
  familyName: string;
  updatedAt: number;
  dailyParentAllowance?: number;
  deleted?: boolean;
  members: Array<{
    id: string;
    name: string;
    role: string;
    age?: number;
    outfit?: string;
    points: number;
  }>;
}

export interface AdminNeighborhoodRecord {
  slug: string;
  familyName: string;
  updatedAt: number;
  dailyParentAllowance: number;
  memberCount: number;
  kidCount: number;
  parents: Array<{
    id: string;
    name: string;
    role: string;
    points: number;
  }>;
}

export type ActiveReactModal =
  | null
  | 'cross_world'
  | 'flea_market'
  | 'virtual_zoo'
  | 'parental_dashboard'
  | 'comic_library'
  | 'admin_panel';

export interface B2KSBridge {
  getState: () => B2KSState;
  getCurrentUser: () => Member;
  isParent: (member: Member) => boolean;
  getFirebaseUrl: () => string;
  saveGame: (pushCloud?: boolean) => void;
  updateHUD: () => void;
  showToast: (msg: string) => void;
  requestParentAccess: (cb: () => void) => void;
  playCoin: () => void;
  playClick: () => void;
  playSuccess: () => void;
  playError: () => void;
  triggerConfetti: () => void;
  triggerSpeechBubble: (member: Member, text: string, isEng: boolean) => void;
  logActivity: (entry: Omit<ActivityLogEntry, 'id' | 'ts'>) => void;
  speakEnglish: (text: string, rate?: number) => void;
  syncEnglishBankToFirebase: (questions: EnglishQuestion[]) => void;
  syncCrossWorldRequestsToFirebase: (reqs: CrossWorldRequest[]) => void;
  syncFleaMarketToFirebase: (listings: FleaMarketListing[]) => void;
  syncActivityLogsToFirebase: (logs: ActivityLogEntry[]) => void;
  findCatalogItem: (id: string) => { id: string; name: string; icon?: string; desc?: string; category?: string; sub?: string } | null;
  renderItemSVG: (id: string, size?: number) => string;
  openReactModal: (modal: ActiveReactModal) => void;
  closeReactModal: () => void;
  openParentMiniWindow?: () => void;
  getMemberLocationLabel?: (m: Member) => string;
  claimComicReadReward?: (comicId: string, comicTitle: string) => { ok: boolean; awarded: number; msg: string };
  getFamilyName?: () => string;
  setFamilyName?: (name: string) => { ok: boolean; msg: string };
  getResolvedLocations?: () => NavDestination[];
  setBuildingLayouts?: (layouts: Record<string, BuildingLayoutOverride>) => void;
  resetBuildingLayouts?: () => void;
  setGamePassword?: (nextPw: string) => { ok: boolean; msg: string };
  setParentPin?: (nextPin: string) => { ok: boolean; msg: string };
  updateMemberProfile?: (memberId: string, updates: { name?: string; age?: number; role?: string }) => { ok: boolean; msg: string };
  addMember?: (name: string, role: string, age?: number) => { ok: boolean; msg: string; member?: Member };
  removeMember?: (memberId: string) => { ok: boolean; msg: string };
  fetchOtherFamiliesDirectory?: () => Promise<OtherFamilySummary[]>;
  getBgmTheme?: () => BgmThemeId;
  setBgmTheme?: (themeId: BgmThemeId) => void;
  isAudioMuted?: () => boolean;
  toggleAudioMuted?: () => boolean;
  setGameUnlocked?: (unlocked: boolean) => void;
  authenticateFamilyLogin?: (familyName: string, enteredPassword: string) => Promise<{ ok: boolean; msg: string; familyName: string }>;
  getLastLoginFamilyName?: () => string;
  getWeatherInfo?: () => WeatherInfo;
  refreshWeather?: (useGeolocation?: boolean) => Promise<WeatherInfo>;
  getMemberPresenceMap?: () => Record<string, { online: boolean; lastSeenAt: number }>;
  getActiveFamilySlug?: () => string;
  isB2KSDad?: () => boolean;
  getGlobalEnglishBank?: () => EnglishQuestion[];
  importEnglishBankQuestions?: (incoming: EnglishQuestion[], mode?: 'merge' | 'replace') => { ok: boolean; added: number; updated: number; total: number; msg: string };
  resetEnglishBankToDefault?: () => { ok: boolean; total: number; msg: string };
  adminListNeighborhoods?: () => Promise<AdminNeighborhoodRecord[]>;
  adminCreateNeighborhood?: (familyName: string, dadName?: string, momName?: string) => Promise<{ ok: boolean; msg: string; slug?: string }>;
  adminDeleteNeighborhood?: (slug: string) => Promise<{ ok: boolean; msg: string }>;
  adminResetNeighborhoodPasswords?: (slug: string) => Promise<{ ok: boolean; msg: string }>;
  adminAdjustParentAccount?: (
    slug: string,
    payload: { dailyParentAllowance?: number; parentPoints?: Record<string, number> }
  ) => Promise<{ ok: boolean; msg: string }>;
  subscribe: (fn: () => void) => () => void;
}

declare global {
  interface Window {
    B2KS?: B2KSBridge;
    __OPEN_B2KS_MODAL__?: (modal: ActiveReactModal) => void;
    __OPEN_PARENT_MINI__?: () => void;
    __ON_FAMILY_LOGIN_SUCCESS__?: () => void;
    openSmartphoneModal?: (view?: 'home' | 'messenger' | 'tasks' | 'maps', targetId?: string) => void;
  }
}
