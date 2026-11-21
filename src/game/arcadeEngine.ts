import { B2KSState, Member } from '../types/b2ks';
import { getFamilyFirebaseRoot, normalizeFamilySlug, resolveNeighborhoodLocations } from './constants';

export const ARCADE_CENTER = { x: 950, y: 790, radius: 135 };

export const ARCADE_PLAYER_THEMES = [
  { color: '#E74C3C', keyLabel: 'Space / Phím Q', keyCode: 'q' },
  { color: '#2980B9', keyLabel: 'Space / Phím P', keyCode: 'p' },
  { color: '#27AE60', keyLabel: 'Space / Phím Z', keyCode: 'z' },
  { color: '#F39C12', keyLabel: 'Space / Phím M', keyCode: 'm' }
];

export const ARCADE_GAME_CATALOG: Record<
  string,
  {
    id: string;
    title: string;
    shortTitle: string;
    minPlayers: number;
    maxPlayers: number;
    bg: string;
    desc: string;
  }
> = {
  tictactoe: {
    id: 'tictactoe',
    title: '❌⭕ Cờ Caro / Tic-Tac-Toe',
    shortTitle: 'Cờ Caro XO',
    minPlayers: 2,
    maxPlayers: 2,
    bg: '#FDEDEC',
    desc: 'Đấu trí 1v1 (đúng 2 người). Mỗi người chơi trên thiết bị riêng theo lượt để xếp 3 ô thẳng hàng!'
  },
  quiz: {
    id: 'quiz',
    title: '⚡ Đố Vui Giành Chuông Online',
    shortTitle: 'Đố Vui Giành Chuông',
    minPlayers: 2,
    maxPlayers: 4,
    bg: '#E8F8F5',
    desc: 'Dành cho 2–4 người. Bấm nút chuông trên máy mình thật nhanh để giành quyền trả lời!'
  },
  shooter: {
    id: 'shooter',
    title: '🚀 Đấu Súng Không Gian Online',
    shortTitle: 'Đấu Trường Vũ Trụ',
    minPlayers: 2,
    maxPlayers: 4,
    bg: '#F5EEF8',
    desc: 'Dành cho 2–4 người. Mỗi người điều khiển tàu của mình trên máy riêng (1 nút xoay & bắn)!'
  }
};

export interface ArcadeHostDeps {
  getState: () => B2KSState;
  getCurrentUser: () => Member;
  isParent: (m: Member) => boolean;
  getFirebaseUrl: () => string;
  getRoleEmoji: (role: string) => string;
  playClick: () => void;
  playCoin: () => void;
  playSuccess: () => void;
  playError: () => void;
  playTone: (freq: number, type?: OscillatorType, duration?: number, vol?: number) => void;
  showToast: (msg: string) => void;
  updateHUD: () => void;
  saveGame: (pushCloud?: boolean) => void;
  triggerSpeechBubble: (m: Member, text: string, isEng: boolean) => void;
  closeModal: (id: string) => void;
  maxParentPoints: number;
  getMaxParentPoints?: () => number;
}

export interface ArcadeRoomState {
  status: 'idle' | 'lobby' | 'playing' | 'finished';
  gameType: string;
  hostId: string | null;
  playerIds: string[];
  readyMap: Record<string, boolean>;
  pot: number;
  matchData: any;
  winnerId: string | null;
  isDraw: boolean;
  updatedAt: number;
}

export function createArcadeEngine(deps: ArcadeHostDeps) {
  let arcadeRoomState: ArcadeRoomState = {
    status: 'idle',
    gameType: 'tictactoe',
    hostId: null,
    playerIds: [],
    readyMap: {},
    pot: 0,
    matchData: null,
    winnerId: null,
    isDraw: false,
    updatedAt: 0
  };
  let arcadeAnimFrameId: number | null = null;
  let arcadeLastSyncedShootAt = 0;

  function getRoomState(): ArcadeRoomState {
    return arcadeRoomState;
  }

  function getMembersInArcadeZone(): Member[] {
    const state = deps.getState();
    const arcLoc = resolveNeighborhoodLocations(state).find((l) => l.id === 'arcade');
    const ax = arcLoc ? arcLoc.x : ARCADE_CENTER.x;
    const ay = arcLoc ? arcLoc.y : ARCADE_CENTER.y;
    return state.members.filter(
      (m) =>
        m.scene === 'neighborhood' &&
        Math.hypot(m.x - ax, m.y - ay) <= ARCADE_CENTER.radius
    );
  }

  function isMemberInArcadeZone(memberId: string): boolean {
    return getMembersInArcadeZone().some((m) => m.id === memberId);
  }

  function stopArcadeLoop() {
    if (arcadeAnimFrameId !== null) {
      cancelAnimationFrame(arcadeAnimFrameId);
      arcadeAnimFrameId = null;
    }
  }

  function closeArcadeModal() {
    stopArcadeLoop();
    deps.closeModal('arcade-modal');
  }

  function pushArcadeRoomToFirebase(roomObj: ArcadeRoomState) {
    arcadeRoomState = roomObj;
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    try {
      localStorage.setItem(`b2ks_arcade_online_room_${slug}`, JSON.stringify(roomObj));
    } catch {
      // ignore
    }
    const url = deps.getFirebaseUrl();
    if (!url) return;
    fetch(`${url}/${fbRoot}/arcade_room.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomObj)
    }).catch(() => {});
  }

  function onRemoteArcadeRoomUpdate(remoteRoom: ArcadeRoomState) {
    const prevStatus = arcadeRoomState?.status;
    const prevUpdated = arcadeRoomState?.updatedAt || 0;
    const me = deps.getCurrentUser();

    if (
      prevStatus === 'playing' &&
      remoteRoom.status === 'playing' &&
      remoteRoom.gameType === 'shooter' &&
      arcadeRoomState?.matchData?.ships &&
      remoteRoom.matchData?.ships
    ) {
      const localMd = arcadeRoomState.matchData;
      const remoteMd = remoteRoom.matchData;
      remoteMd.ships.forEach((rShip: any, idx: number) => {
        const lShip = localMd.ships[idx];
        if (!lShip || rShip.memberId === me.id) return;
        if ((rShip.fireSeq || 0) > (lShip.fireSeq || 0)) {
          lShip.x = rShip.x;
          lShip.y = rShip.y;
          lShip.vx = rShip.vx;
          lShip.vy = rShip.vy;
          lShip.angle = rShip.angle;
          lShip.rotDir = rShip.rotDir;
          lShip.fireSeq = rShip.fireSeq;
          if (rShip.lastBullet) {
            localMd.bullets.push({ ...rShip.lastBullet });
          }
        }
        if (typeof rShip.hp === 'number' && rShip.hp < lShip.hp) {
          lShip.hp = rShip.hp;
        }
      });
      arcadeRoomState.updatedAt = remoteRoom.updatedAt;
      return;
    }

    arcadeRoomState = remoteRoom;

    if (
      prevStatus !== 'playing' &&
      remoteRoom.status === 'playing' &&
      Array.isArray(remoteRoom.playerIds) &&
      remoteRoom.playerIds.includes(me.id)
    ) {
      const modalEl = document.getElementById('arcade-modal');
      if (modalEl && modalEl.style.display !== 'flex') {
        modalEl.style.display = 'flex';
        deps.playSuccess();
        deps.showToast('🚀 Trận đấu Khu Vui Chơi đã bắt đầu!');
      }
    }

    const modalEl = document.getElementById('arcade-modal');
    if (modalEl && modalEl.style.display === 'flex') {
      if (remoteRoom.status === 'playing' && remoteRoom.gameType === 'shooter') {
        if (prevStatus !== 'playing' || !document.getElementById('arcade-shooter-canvas')) {
          renderArcadeLobby();
        }
      } else if (remoteRoom.updatedAt !== prevUpdated || prevStatus !== remoteRoom.status) {
        renderArcadeLobby();
      }
    }
  }

  function pullArcadeRoomFromFirebase() {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    const url = deps.getFirebaseUrl();
    if (!url) {
      try {
        const localRaw = localStorage.getItem(`b2ks_arcade_online_room_${slug}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw) as ArcadeRoomState;
          if (parsed && (parsed.updatedAt || 0) > (arcadeRoomState?.updatedAt || 0)) {
            onRemoteArcadeRoomUpdate(parsed);
          }
        }
      } catch {
        // ignore
      }
      return;
    }
    fetch(`${url}/${fbRoot}/arcade_room.json`)
      .then((r) => r.json())
      .then((remoteRoom: ArcadeRoomState | null) => {
        if (!remoteRoom) return;
        if ((remoteRoom.updatedAt || 0) > (arcadeRoomState?.updatedAt || 0)) {
          onRemoteArcadeRoomUpdate(remoteRoom);
        }
      })
      .catch(() => {});
  }

  function createArcadeLobby(gameType: string) {
    const me = deps.getCurrentUser();
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    if (!isMemberInArcadeZone(me.id)) {
      deps.playError();
      return deps.showToast(`🚶 Bạn cần di chuyển nhân vật đến Khu Vui Chơi ${brand} trước!`);
    }
    if (me.points < 1) {
      deps.playError();
      return deps.showToast('❌ Bạn cần ít nhất 1⭐ để mở bàn chơi!');
    }
    const cat = ARCADE_GAME_CATALOG[gameType];
    if (!cat) return;

    deps.playSuccess();
    const newRoom: ArcadeRoomState = {
      status: 'lobby',
      gameType,
      hostId: me.id,
      playerIds: [me.id],
      readyMap: { [me.id]: true },
      pot: 0,
      matchData: null,
      winnerId: null,
      isDraw: false,
      updatedAt: Date.now()
    };
    pushArcadeRoomToFirebase(newRoom);
    renderArcadeLobby();
  }

  function joinArcadeLobby() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'lobby') return;
    if (me.points < 1) {
      deps.playError();
      return deps.showToast('❌ Bạn không đủ 1⭐ để tham gia đặt cược!');
    }
    const cat = ARCADE_GAME_CATALOG[r.gameType];
    if (r.playerIds.includes(me.id)) return;
    if (r.playerIds.length >= cat.maxPlayers) {
      deps.playError();
      return deps.showToast(`⚠️ Bàn đã đủ tối đa ${cat.maxPlayers} người chơi!`);
    }

    deps.playCoin();
    const updated: ArcadeRoomState = {
      ...r,
      playerIds: [...r.playerIds, me.id],
      readyMap: { ...(r.readyMap || {}), [me.id]: false },
      updatedAt: Date.now()
    };
    pushArcadeRoomToFirebase(updated);
    renderArcadeLobby();
  }

  function toggleArcadeReady() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'lobby' || !r.playerIds.includes(me.id)) return;
    deps.playClick();
    const nextReady = !(r.readyMap && r.readyMap[me.id]);
    const updated: ArcadeRoomState = {
      ...r,
      readyMap: { ...(r.readyMap || {}), [me.id]: nextReady },
      updatedAt: Date.now()
    };
    pushArcadeRoomToFirebase(updated);
    renderArcadeLobby();
  }

  function leaveArcadeLobby() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'lobby') return;
    deps.playClick();
    const nextPlayers = r.playerIds.filter((id) => id !== me.id);
    const nextReady = { ...(r.readyMap || {}) };
    delete nextReady[me.id];

    if (nextPlayers.length === 0) {
      pushArcadeRoomToFirebase({
        status: 'idle',
        gameType: 'tictactoe',
        hostId: null,
        playerIds: [],
        readyMap: {},
        pot: 0,
        matchData: null,
        winnerId: null,
        isDraw: false,
        updatedAt: Date.now()
      });
    } else {
      pushArcadeRoomToFirebase({
        ...r,
        hostId: r.hostId && nextPlayers.includes(r.hostId) ? r.hostId : nextPlayers[0],
        playerIds: nextPlayers,
        readyMap: nextReady,
        updatedAt: Date.now()
      });
    }
    renderArcadeLobby();
  }

  function resetArcadeToIdle() {
    stopArcadeLoop();
    deps.playClick();
    pushArcadeRoomToFirebase({
      status: 'idle',
      gameType: 'tictactoe',
      hostId: null,
      playerIds: [],
      readyMap: {},
      pot: 0,
      matchData: null,
      winnerId: null,
      isDraw: false,
      updatedAt: Date.now()
    });
    renderArcadeLobby();
  }

  function startOnlineArcadeMatch() {
    const state = deps.getState();
    const r = arcadeRoomState;
    if (!r || r.status !== 'lobby') return;
    const cat = ARCADE_GAME_CATALOG[r.gameType];

    const validPlayers = r.playerIds
      .map((id) => state.members.find((m) => m.id === id))
      .filter((m): m is Member => Boolean(m));

    if (validPlayers.length < cat.minPlayers || validPlayers.length > cat.maxPlayers) {
      deps.playError();
      return deps.showToast(`⚠️ Cần từ ${cat.minPlayers} đến ${cat.maxPlayers} người tham gia bàn chơi!`);
    }
    const allReady = validPlayers.every((p) => r.readyMap && r.readyMap[p.id]);
    if (!allReady) {
      deps.playError();
      return deps.showToast('⚠️ Tất cả người chơi phải bấm "✅ Sẵn Sàng" trước khi bắt đầu!');
    }
    for (const p of validPlayers) {
      if (p.points < 1) {
        deps.playError();
        return deps.showToast(`❌ ${p.name} không đủ 1⭐ để đặt cược!`);
      }
    }

    validPlayers.forEach((p) => {
      p.points -= 1;
    });
    const pot = validPlayers.length;
    deps.playCoin();
    deps.updateHUD();
    deps.saveGame();

    let matchData: any = null;
    if (r.gameType === 'tictactoe') {
      matchData = { board: Array(9).fill(null), turnIdx: 0 };
    } else if (r.gameType === 'quiz') {
      const pool = [...state.englishQuestions].sort(() => Math.random() - 0.5).slice(0, 5);
      matchData = {
        scores: validPlayers.map(() => 0),
        questions: pool,
        qIdx: 0,
        buzzedPlayerIdx: null
      };
    } else if (r.gameType === 'shooter') {
      const W = 580;
      const H = 360;
      const spawns = [
        { x: 85, y: 80, angle: 0.65 },
        { x: W - 85, y: H - 80, angle: -2.45 },
        { x: W - 85, y: 80, angle: 2.45 },
        { x: 85, y: H - 80, angle: -0.65 }
      ];
      matchData = {
        W,
        H,
        ships: validPlayers.map((p, i) => ({
          memberId: p.id,
          name: p.name,
          color: ARCADE_PLAYER_THEMES[i].color,
          x: spawns[i].x,
          y: spawns[i].y,
          vx: 0,
          vy: 0,
          angle: spawns[i].angle,
          rotDir: i % 2 === 0 ? 1 : -1,
          hp: 5,
          maxHp: 5,
          shield: 0,
          rapidFire: 0,
          cooldown: 0,
          dashCooldown: 0,
          fireSeq: 0,
          lastBullet: null
        })),
        bullets: [],
        asteroids: [
          { x: W * 0.5, y: H * 0.32, r: 22, vx: 0.45, vy: 0.3, rot: 0 },
          { x: W * 0.5, y: H * 0.68, r: 20, vx: -0.4, vy: -0.35, rot: 1.2 }
        ],
        powerups: [{ x: W * 0.5, y: H * 0.5, type: 'shield', active: true, respawn: 0 }],
        particles: []
      };
    }

    const playingRoom: ArcadeRoomState = {
      ...r,
      status: 'playing',
      playerIds: validPlayers.map((p) => p.id),
      pot,
      matchData,
      winnerId: null,
      isDraw: false,
      updatedAt: Date.now()
    };
    pushArcadeRoomToFirebase(playingRoom);
    renderArcadeLobby();
  }

  function finishOnlineArcadeMatch(winnerId: string | null, isDraw = false) {
    stopArcadeLoop();
    const state = deps.getState();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing') return;

    const cat = ARCADE_GAME_CATALOG[r.gameType];
    const participants = r.playerIds
      .map((id) => state.members.find((m) => m.id === id))
      .filter((m): m is Member => Boolean(m));

    const parentCap = deps.getMaxParentPoints ? deps.getMaxParentPoints() : deps.maxParentPoints;

    if (isDraw) {
      participants.forEach((p) => {
        p.points = deps.isParent(p)
          ? Math.max(p.points, Math.min(parentCap, p.points + 1))
          : p.points + 1;
      });
      deps.playClick();
    } else if (winnerId) {
      const winnerMember = state.members.find((m) => m.id === winnerId);
      if (winnerMember) {
        winnerMember.points = deps.isParent(winnerMember)
          ? Math.max(winnerMember.points, Math.min(parentCap, winnerMember.points + r.pot))
          : winnerMember.points + r.pot;
        deps.playSuccess();
        deps.triggerSpeechBubble(winnerMember, `Won +${r.pot}⭐ in ${cat.shortTitle}! 🏆`, true);
      }
    }
    deps.updateHUD();
    deps.saveGame();

    pushArcadeRoomToFirebase({
      ...r,
      status: 'finished',
      winnerId: winnerId || null,
      isDraw,
      updatedAt: Date.now()
    });
    renderArcadeLobby();
  }

  function renderArcadeLobby() {
    const container = document.getElementById('arcade-dynamic-container');
    if (!container) return;

    const state = deps.getState();
    const me = deps.getCurrentUser();
    const inZoneMembers = getMembersInArcadeZone();
    const meInZone = inZoneMembers.some((m) => m.id === me.id);
    const r = arcadeRoomState || { status: 'idle' };

    const badge = document.getElementById('arcade-online-badge');
    if (badge) {
      const fb = deps.getFirebaseUrl();
      badge.textContent = fb ? '🟢 ONLINE 4 MÁY' : '🟡 ĐỒNG BỘ CỤC BỘ';
      badge.style.background = fb ? '#27AE60' : '#F39C12';
    }

    const presenceHtml = `
      <div style="background:#F4F6F7; border:2px solid #BDC3C7; border-radius:10px; padding:8px 12px; margin-bottom:12px;">
        <div style="font-size:12px; font-weight:700; color:#2C3E50; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
          <span>📍 Thành viên đang có mặt tại Khu Vui Chơi (${inZoneMembers.length}/${state.members.length}):</span>
          <span style="font-size:11px; color:${meInZone ? '#27AE60' : '#E74C3C'};">
            ${meInZone ? `✅ Bạn (${me.name}) đang ở sảnh` : `⚠️ Bạn (${me.name}) đang ở xa`}
          </span>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${state.members
            .map((m) => {
              const here = inZoneMembers.some((z) => z.id === m.id);
              return `
                <span style="display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px; font-size:12px; font-weight:700; border:1.5px solid ${here ? '#27AE60' : '#BDC3C7'}; background:${here ? '#EAFAF1' : '#ECF0F1'}; color:${here ? '#1E8449' : '#7F8C8D'};">
                  ${m.outfit || deps.getRoleEmoji(m.role)} ${m.name} (${m.points}⭐) ${here ? '🟢' : '⚪'}
                </span>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    if (r.status === 'idle') {
      stopArcadeLoop();
      container.innerHTML = `
        ${presenceHtml}
        <div style="background:#FEF9E7; border:2px solid #F39C12; border-radius:10px; padding:10px 12px; margin-bottom:12px; font-size:13px; display:flex; align-items:center; gap:10px;">
          <span style="font-size:26px;">👾</span>
          <div>
            <b>Quản Trò Bin:</b> "Mỗi thành viên dùng thiết bị riêng di chuyển vào Khu Vui Chơi để tạo phòng hoặc tham gia thi đấu online! Người không thi đấu có thể vào xem trực tiếp (Spectator)."
          </div>
        </div>
        ${
          !meInZone
            ? `<div style="background:#FDEDEC; border:2px solid #E74C3C; border-radius:10px; padding:10px; margin-bottom:12px; text-align:center; font-size:13px; color:#C0392B; font-weight:700;">
                🚶 Nhân vật <b>${me.name}</b> chưa đứng tại Khu Vui Chơi! Hãy đóng bảng này và di chuyển lại gần Khu Vui Chơi B2KS để tạo phòng.
              </div>`
            : ''
        }
        <div class="form-group">
          <label>🎮 Mở phòng chơi Online mới (Cược 1⭐/người):</label>
          <div class="grid-2">
            ${Object.values(ARCADE_GAME_CATALOG)
              .map(
                (cat) => `
                <div class="card-item" style="background:${cat.bg};">
                  <div>
                    <b>${cat.title}</b>
                    <div style="font-size:12px; color:#555; margin-top:3px;">${cat.desc}</div>
                  </div>
                  <button class="btn btn-primary btn-sm" ${!meInZone ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="createArcadeLobby('${cat.id}')">
                    ➕ Tạo Phòng (${cat.minPlayers === cat.maxPlayers ? cat.minPlayers : cat.minPlayers + '–' + cat.maxPlayers} Người)
                  </button>
                </div>`
              )
              .join('')}
          </div>
        </div>
      `;
      return;
    }

    if (r.status === 'lobby') {
      stopArcadeLoop();
      const cat = ARCADE_GAME_CATALOG[r.gameType] || ARCADE_GAME_CATALOG.tictactoe;
      const isJoined = r.playerIds.includes(me.id);
      const myReady = !!(r.readyMap && r.readyMap[me.id]);
      const isHost = r.hostId === me.id;
      const validPlayerObjs = r.playerIds
        .map((id) => state.members.find((m) => m.id === id))
        .filter((m): m is Member => Boolean(m));
      const allReady =
        validPlayerObjs.length >= cat.minPlayers &&
        validPlayerObjs.length <= cat.maxPlayers &&
        validPlayerObjs.every((p) => r.readyMap && r.readyMap[p.id]);

      container.innerHTML = `
        ${presenceHtml}
        <div style="background:#EBF5FB; border:2.5px solid #2980B9; border-radius:12px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
            <div>
              <span class="tag" style="background:#2980B9; color:#FFF;">PHÒNG CHỜ ONLINE</span>
              <b style="font-size:15px; margin-left:6px; color:#1B4F72;">${cat.title}</b>
            </div>
            <span class="points-pill">🏆 Quỹ cược dự kiến: ${validPlayerObjs.length}⭐</span>
          </div>
          <div style="font-size:12.5px; color:#2C3E50; margin-bottom:10px;">
            Cần <b>${cat.minPlayers === cat.maxPlayers ? `đúng ${cat.minPlayers}` : `${cat.minPlayers}–${cat.maxPlayers}`} người</b> đứng tại Khu Vui Chơi và cùng bấm <b>Xác nhận Sẵn Sàng</b> để bắt đầu!
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin-bottom:12px;">
            ${validPlayerObjs
              .map((p, idx) => {
                const ready = !!(r.readyMap && r.readyMap[p.id]);
                const stillHere = isMemberInArcadeZone(p.id);
                const roleMark = r.gameType === 'tictactoe' ? (idx === 0 ? ' (❌)' : ' (⭕)') : ` (P${idx + 1})`;
                return `
                  <div style="background:#FFF; border:2.5px solid ${ready && stillHere ? '#27AE60' : '#F39C12'}; border-radius:10px; padding:8px; display:flex; align-items:center; justify-content:space-between;">
                    <div>
                      <div style="font-weight:700; font-size:13px;">${p.outfit || deps.getRoleEmoji(p.role)} ${p.name}${roleMark}</div>
                      <div style="font-size:11px; color:${stillHere ? '#555' : '#E74C3C'};">
                        ${stillHere ? `Cược: 1⭐ (Có ${p.points}⭐)` : '⚠️ Đã rời khu vực!'}
                      </div>
                    </div>
                    <span class="tag" style="background:${ready ? '#27AE60' : '#F39C12'}; color:#FFF;">
                      ${ready ? '✅ Sẵn sàng' : '⏳ Chờ...'}
                    </span>
                  </div>
                `;
              })
              .join('')}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center;">
            ${
              !isJoined
                ? validPlayerObjs.length < cat.maxPlayers
                  ? `<button class="btn btn-accent" ${!meInZone ? 'disabled style="opacity:0.5;"' : ''} onclick="joinArcadeLobby()">🙋 Tham Gia Trận Đấu (Cược 1⭐)</button>`
                  : `<span class="tag" style="background:#8E44AD; color:#FFF; padding:8px 12px;">👀 Bàn đã đủ người — Bạn đang ở chế độ Khán Giả</span>`
                : `<button class="btn ${myReady ? 'btn-accent' : 'btn-primary'}" onclick="toggleArcadeReady()">${myReady ? '✅ Đã Sẵn Sàng (Bấm để hủy)' : '✋ Xác Nhận Sẵn Sàng'}</button>
                   <button class="btn" style="background:#7F8C8D;" onclick="leaveArcadeLobby()">🚪 Rời Bàn</button>`
            }
            ${
              isHost || isJoined
                ? `<button class="btn btn-primary" ${!allReady ? 'disabled style="opacity:0.45; cursor:not-allowed;"' : ''} onclick="startOnlineArcadeMatch()">🚀 Bắt Đầu Trận Đấu (${validPlayerObjs.length}/${cat.minPlayers})</button>`
                : ''
            }
          </div>
        </div>
      `;
      return;
    }

    if (r.status === 'playing') {
      const myPlayerIdx = r.playerIds.indexOf(me.id);
      const isSpectator = myPlayerIdx === -1;
      const spectatorBanner = isSpectator
        ? `<div style="background:#F5EEF8; border:2px solid #8E44AD; border-radius:10px; padding:8px 12px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
             <span style="font-size:13px; font-weight:700; color:#6C3483;">👀 Chế Độ Khán Giả (Spectator): Bạn đang xem trực tiếp trận đấu!</span>
             <span class="tag" style="background:#8E44AD; color:#FFF;">LIVE 🔴</span>
           </div>`
        : '';

      if (r.gameType === 'tictactoe') {
        stopArcadeLoop();
        renderOnlineTicTacToe(container, r, myPlayerIdx, isSpectator, spectatorBanner);
      } else if (r.gameType === 'quiz') {
        stopArcadeLoop();
        renderOnlineBuzzerQuiz(container, r, me, myPlayerIdx, isSpectator, spectatorBanner);
      } else if (r.gameType === 'shooter') {
        renderOnlineSpaceShooter(container, r, myPlayerIdx, isSpectator, spectatorBanner);
      }
      return;
    }

    if (r.status === 'finished') {
      stopArcadeLoop();
      const cat = ARCADE_GAME_CATALOG[r.gameType] || ARCADE_GAME_CATALOG.tictactoe;
      const winnerMember = r.winnerId ? state.members.find((m) => m.id === r.winnerId) : null;
      container.innerHTML = `
        <div style="text-align:center; background:#FEF9E7; border:3px solid #F39C12; border-radius:14px; padding:20px;">
          <div style="font-size:48px;">${r.isDraw ? '🤝' : '🏆'}</div>
          <h2 style="margin:6px 0; color:#2C3E50;">
            ${r.isDraw ? 'Hòa Nhau! Hoàn Lại 1⭐ Cược' : `Chúc Mừng ${winnerMember ? winnerMember.name : 'Người Thắng'} Chiến Thắng!`}
          </h2>
          <p style="font-size:14px; color:#7F8C8D; margin:4px 0;">Bộ môn: <b>${cat.title}</b></p>
          <p style="font-size:15px; color:#D35400; font-weight:700;">
            ${r.isDraw ? 'Mỗi người chơi được hoàn lại 1⭐!' : `${winnerMember ? winnerMember.name : 'Người thắng'} ẵm trọn quỹ thưởng +${r.pot}⭐!`}
          </p>
          <div style="display:flex; gap:10px; justify-content:center; margin-top:14px; flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="resetArcadeToIdle()">🔄 Về Sảnh Khu Vui Chơi</button>
            <button class="btn" style="background:#34495E;" onclick="closeArcadeModal()">🚪 Đóng</button>
          </div>
        </div>
      `;
    }
  }

  function renderOnlineTicTacToe(
    container: HTMLElement,
    r: ArcadeRoomState,
    myPlayerIdx: number,
    isSpectator: boolean,
    spectatorBanner: string
  ) {
    const state = deps.getState();
    const md = r.matchData;
    const p0 = state.members.find((m) => m.id === r.playerIds[0]) || { name: 'P1' };
    const p1 = state.members.find((m) => m.id === r.playerIds[1]) || { name: 'P2' };
    const curTurnMember = md.turnIdx === 0 ? p0 : p1;
    const curMark = md.turnIdx === 0 ? '❌' : '⭕';
    const isMyTurn = !isSpectator && myPlayerIdx === md.turnIdx;

    container.innerHTML = `
      ${spectatorBanner}
      <div style="text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#EBF5FB; padding:8px 12px; border-radius:10px; border:2px solid #2C3E50; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
          <span>❌ <b>${p0.name}</b> ${myPlayerIdx === 0 ? '(Bạn)' : ''} vs ⭕ <b>${p1.name}</b> ${myPlayerIdx === 1 ? '(Bạn)' : ''}</span>
          <span class="points-pill">🏆 Quỹ thưởng: ${r.pot}⭐</span>
        </div>
        <div style="font-size:15px; font-weight:700; margin-bottom:10px; padding:6px 12px; border-radius:8px; display:inline-block; background:${isMyTurn ? '#EAFAF1' : '#FEF9E7'}; border:2px solid ${ARCADE_PLAYER_THEMES[md.turnIdx].color}; color:${ARCADE_PLAYER_THEMES[md.turnIdx].color};">
          ${isMyTurn ? `👉 Tới lượt CỦA BẠN (${curMark})! Hãy bấm chọn 1 ô trống:` : `⏳ Đang chờ lượt của ${curTurnMember.name} (${curMark})...`}
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 88px); gap:8px; justify-content:center; margin:0 auto 14px auto;">
          ${md.board
            .map((cell: string | null, i: number) => {
              const canClick = isMyTurn && !cell;
              return `
                <button type="button" onclick="playOnlineTicTacToeCell(${i})" ${!canClick ? 'disabled' : ''}
                  style="width:88px; height:88px; font-size:38px; border:3px solid #2C3E50; border-radius:12px; background:${cell ? '#F8F9F9' : canClick ? '#FFF' : '#F2F4F4'}; cursor:${canClick ? 'pointer' : 'default'}; box-shadow:0 3px 0 #2C3E50;">
                  ${cell || ''}
                </button>`;
            })
            .join('')}
        </div>
        <div style="display:flex; justify-content:center; gap:8px;">
          ${!isSpectator ? `<button class="btn btn-sm" style="background:#95A5A6;" onclick="forfeitOnlineMatch()">🏳️ Nhận Thua / Hủy Trận</button>` : ''}
        </div>
      </div>
    `;
  }

  function playOnlineTicTacToeCell(idx: number) {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing' || r.gameType !== 'tictactoe') return;
    const myPlayerIdx = r.playerIds.indexOf(me.id);
    const md = r.matchData;
    if (myPlayerIdx === -1 || myPlayerIdx !== md.turnIdx || md.board[idx]) return;

    deps.playClick();
    const nextBoard = [...md.board];
    nextBoard[idx] = md.turnIdx === 0 ? '❌' : '⭕';

    const wins = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    const hasWon = wins.some(([a, b, c]) => nextBoard[a] && nextBoard[a] === nextBoard[b] && nextBoard[a] === nextBoard[c]);
    if (hasWon) {
      r.matchData = { ...md, board: nextBoard };
      return finishOnlineArcadeMatch(r.playerIds[md.turnIdx], false);
    }
    if (nextBoard.every(Boolean)) {
      r.matchData = { ...md, board: nextBoard };
      return finishOnlineArcadeMatch(null, true);
    }

    pushArcadeRoomToFirebase({
      ...r,
      matchData: { board: nextBoard, turnIdx: 1 - md.turnIdx },
      updatedAt: Date.now()
    });
    renderArcadeLobby();
  }

  function forfeitOnlineMatch() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing') return;
    const myIdx = r.playerIds.indexOf(me.id);
    if (myIdx === -1) return;
    const otherWinnerId = r.playerIds.find((id) => id !== me.id) || null;
    finishOnlineArcadeMatch(otherWinnerId, !otherWinnerId);
  }

  function renderOnlineBuzzerQuiz(
    container: HTMLElement,
    r: ArcadeRoomState,
    me: Member,
    myPlayerIdx: number,
    isSpectator: boolean,
    spectatorBanner: string
  ) {
    const state = deps.getState();
    const md = r.matchData;
    const players = r.playerIds.map((id) => state.members.find((m) => m.id === id) || { id, name: id });

    if (md.qIdx >= md.questions.length) {
      const maxScore = Math.max(...md.scores);
      const topIndices = md.scores.map((s: number, i: number) => (s === maxScore ? i : -1)).filter((i: number) => i !== -1);
      if (topIndices.length > 1) return finishOnlineArcadeMatch(null, true);
      return finishOnlineArcadeMatch(r.playerIds[topIndices[0]], false);
    }

    const qObj = md.questions[md.qIdx];
    const letters = ['A', 'B', 'C', 'D'];
    const scoreBarHtml = players
      .map(
        (p, i) =>
          `<div style="background:${ARCADE_PLAYER_THEMES[i].color}; color:#FFF; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:700;">${p.name}: ${md.scores[i]}đ</div>`
      )
      .join('');

    let actionAreaHtml = '';
    if (md.buzzedPlayerIdx === null) {
      actionAreaHtml = !isSpectator
        ? `<div style="margin-top:12px; text-align:center;">
             <button type="button" class="btn" style="background:${ARCADE_PLAYER_THEMES[myPlayerIdx].color}; padding:14px 24px; font-size:16px; width:100%;" onclick="buzzOnlinePlayerIn()">
               🔔 BẤM CHUÔNG GIÀNH QUYỀN TRẢ LỜI! (${me.name})
             </button>
           </div>`
        : `<div style="margin-top:10px; text-align:center; font-size:13px; color:#7F8C8D; font-weight:700;">⏳ Đang chờ người chơi bấm chuông...</div>`;
    } else {
      const buzzedPlayer = players[md.buzzedPlayerIdx];
      const isMyBuzz = !isSpectator && md.buzzedPlayerIdx === myPlayerIdx;
      actionAreaHtml = isMyBuzz
        ? `<div style="margin-top:10px; padding:10px; background:#FEF9E7; border:2px solid #F39C12; border-radius:10px;">
             <div style="font-weight:700; color:#D35400; margin-bottom:8px;">⚡ Bạn đã giành quyền trả lời! Hãy chọn đáp án:</div>
             <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
               ${qObj.opts
                 .map(
                   (opt: string, idx: number) => `
                   <button type="button" class="btn btn-accent" style="white-space:normal; text-align:left;" onclick="answerOnlineBuzzerQuestion(${idx})">
                     <b>${letters[idx]}.</b>&nbsp;${opt}
                   </button>`
                 )
                 .join('')}
             </div>
           </div>`
        : `<div style="margin-top:10px; padding:10px; background:#FEF9E7; border:2px solid #F39C12; border-radius:10px; text-align:center; font-weight:700; color:#D35400;">
             ⚡ <b>${buzzedPlayer.name}</b> đã bấm chuông nhanh nhất và đang chọn đáp án...
           </div>`;
    }

    container.innerHTML = `
      ${spectatorBanner}
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
          <div style="display:flex; gap:6px; flex-wrap:wrap;">${scoreBarHtml}</div>
          <span class="points-pill">🏆 Quỹ thưởng: ${r.pot}⭐</span>
        </div>
        <div style="background:#FFF; border:2.5px solid #2C3E50; border-radius:12px; padding:12px;">
          <div class="tag" style="margin-bottom:6px;">Câu ${md.qIdx + 1} / ${md.questions.length}</div>
          <div style="font-size:15px; font-weight:700; color:#2C3E50;">${qObj.q}</div>
          <div style="margin-top:8px; font-size:13px; color:#555;">${qObj.opts.map((o: string, i: number) => `<div><b>${letters[i]}.</b> ${o}</div>`).join('')}</div>
          ${actionAreaHtml}
        </div>
      </div>
    `;
  }

  function buzzOnlinePlayerIn() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing' || r.gameType !== 'quiz') return;
    const myPlayerIdx = r.playerIds.indexOf(me.id);
    if (myPlayerIdx === -1 || r.matchData.buzzedPlayerIdx !== null) return;

    deps.playTone(880, 'square', 0.12, 0.08);
    pushArcadeRoomToFirebase({
      ...r,
      matchData: { ...r.matchData, buzzedPlayerIdx: myPlayerIdx },
      updatedAt: Date.now()
    });
    renderArcadeLobby();
  }

  function answerOnlineBuzzerQuestion(optIdx: number) {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing' || r.gameType !== 'quiz') return;
    const myPlayerIdx = r.playerIds.indexOf(me.id);
    const md = r.matchData;
    if (myPlayerIdx === -1 || md.buzzedPlayerIdx !== myPlayerIdx) return;

    const qObj = md.questions[md.qIdx];
    const nextScores = [...md.scores];
    if (optIdx === qObj.ans) {
      nextScores[myPlayerIdx] += 1;
      deps.playCoin();
      deps.showToast(`✅ ${me.name} trả lời đúng (+1 điểm)!`);
    } else {
      nextScores[myPlayerIdx] = Math.max(0, nextScores[myPlayerIdx] - 1);
      deps.playError();
      deps.showToast(`❌ ${me.name} trả lời sai (-1 điểm)!`);
    }

    pushArcadeRoomToFirebase({
      ...r,
      matchData: { ...md, scores: nextScores, qIdx: md.qIdx + 1, buzzedPlayerIdx: null },
      updatedAt: Date.now()
    });
    renderArcadeLobby();
  }

  function renderOnlineSpaceShooter(
    container: HTMLElement,
    r: ArcadeRoomState,
    myPlayerIdx: number,
    isSpectator: boolean,
    spectatorBanner: string
  ) {
    const md = r.matchData;
    const hudChips = md.ships
      .map(
        (s: any) => `
      <div style="background:rgba(255,255,255,0.12); border:1.5px solid ${s.color}; color:#FFF; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">
        <span style="width:10px; height:10px; border-radius:50%; background:${s.color}; display:inline-block;"></span>
        <span>${s.name}:</span>
        <span>${s.hp > 0 ? '❤️'.repeat(s.hp) : '💥 Bị hạ'}</span>
      </div>`
      )
      .join('');

    container.innerHTML = `
      ${spectatorBanner}
      <div style="text-align:center;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
          <span style="font-size:14px; font-weight:700; color:#2C3E50;">🚀 Đấu Trường Vũ Trụ (5 ❤️ • Khiên & Đạn Đôi)</span>
          <span class="points-pill">🏆 Quỹ thưởng: ${r.pot}⭐</span>
        </div>
        <div style="background:#141E30; padding:6px 8px; border-radius:10px 10px 0 0; display:flex; justify-content:center; gap:8px; flex-wrap:wrap; border:3px solid #2C3E50; border-bottom:none;">
          ${hudChips}
        </div>
        <canvas id="arcade-shooter-canvas" width="${md.W}" height="${md.H}" style="width:100%; max-width:${md.W}px; background:#070B19; border:3px solid #2C3E50; border-radius:0 0 12px 12px; display:block; margin:0 auto;"></canvas>
        ${
          !isSpectator
            ? `<div style="display:grid; grid-template-columns:1fr 1.3fr; gap:8px; margin-top:10px;">
                 <button type="button" class="btn" style="background:#34495E; padding:13px 10px; font-size:14px;"
                   onmousedown="dashOnlineArcadeShip()" ontouchstart="event.preventDefault(); dashOnlineArcadeShip();">
                   ⚡ LƯỚT TĂNG TỐC (Phím W/↑)
                 </button>
                 <button type="button" class="btn" style="background:${ARCADE_PLAYER_THEMES[myPlayerIdx].color}; padding:13px 12px; font-size:14px;"
                   onmousedown="fireOnlineArcadeShip()" ontouchstart="event.preventDefault(); fireOnlineArcadeShip();">
                   🔥 BẮN LASER & ĐỔI HƯỚNG (Space)
                 </button>
               </div>
               <div style="margin-top:6px;">
                 <button type="button" class="btn btn-sm" style="background:#7F8C8D; font-size:11px;" onclick="forfeitOnlineMatch()">🏳️ Thoát / Nhận Thua</button>
               </div>`
            : `<div style="margin-top:8px; font-size:12.5px; color:#6C3483; font-weight:700;">👀 Bạn đang theo dõi trực tiếp trận chiến vũ trụ!</div>`
        }
      </div>
    `;
    runOnlineSpaceShooterLoop();
  }

  function dashOnlineArcadeShip() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing' || r.gameType !== 'shooter') return;
    const myPlayerIdx = r.playerIds.indexOf(me.id);
    if (myPlayerIdx === -1) return;
    const md = r.matchData;
    const s = md.ships[myPlayerIdx];
    if (!s || s.hp <= 0 || (s.dashCooldown || 0) > 0) return;

    deps.playTone(340, 'triangle', 0.1, 0.06);
    s.vx = Math.cos(s.angle) * 6.2;
    s.vy = Math.sin(s.angle) * 6.2;
    s.dashCooldown = 45;
    s.fireSeq = (s.fireSeq || 0) + 1;
    s.lastBullet = null;
    for (let i = 0; i < 8; i++) {
      md.particles.push({
        x: s.x - Math.cos(s.angle) * 14,
        y: s.y - Math.sin(s.angle) * 14,
        vx: (Math.random() - 0.5) * 2.5 - Math.cos(s.angle) * 2,
        vy: (Math.random() - 0.5) * 2.5 - Math.sin(s.angle) * 2,
        color: '#5DADE2',
        life: 18
      });
    }
    pushArcadeRoomToFirebase({ ...r, matchData: md, updatedAt: Date.now() });
  }

  function fireOnlineArcadeShip() {
    const me = deps.getCurrentUser();
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing' || r.gameType !== 'shooter') return;
    const myPlayerIdx = r.playerIds.indexOf(me.id);
    if (myPlayerIdx === -1) return;
    const md = r.matchData;
    const s = md.ships[myPlayerIdx];
    if (!s || s.hp <= 0 || s.cooldown > 0) return;

    deps.playTone(680, 'square', 0.08, 0.06);
    s.vx = Math.cos(s.angle) * 3.8;
    s.vy = Math.sin(s.angle) * 3.8;
    s.rotDir *= -1;
    s.cooldown = (s.rapidFire || 0) > 0 ? 9 : 15;
    s.fireSeq = (s.fireSeq || 0) + 1;

    const bulletObj = {
      ownerIdx: myPlayerIdx,
      color: s.color,
      x: s.x + Math.cos(s.angle) * 22,
      y: s.y + Math.sin(s.angle) * 22,
      vx: Math.cos(s.angle) * 7.2,
      vy: Math.sin(s.angle) * 7.2,
      life: 80
    };
    md.bullets.push(bulletObj);
    s.lastBullet = bulletObj;

    if ((s.rapidFire || 0) > 0) {
      const spread = 0.16;
      md.bullets.push({
        ownerIdx: myPlayerIdx,
        color: '#FFE66D',
        x: s.x + Math.cos(s.angle + spread) * 22,
        y: s.y + Math.sin(s.angle + spread) * 22,
        vx: Math.cos(s.angle + spread) * 7.2,
        vy: Math.sin(s.angle + spread) * 7.2,
        life: 75
      });
    }

    if (Date.now() - arcadeLastSyncedShootAt > 120) {
      arcadeLastSyncedShootAt = Date.now();
      pushArcadeRoomToFirebase({ ...r, matchData: md, updatedAt: Date.now() });
    }
  }

  function handleArcadeKeyPress(k: string) {
    const r = arcadeRoomState;
    if (!r || r.status !== 'playing') return;
    if (k === 'w' || k === 'arrowup') {
      if (r.gameType === 'shooter') dashOnlineArcadeShip();
      return;
    }
    if (k === ' ' || k === 'q' || k === 'p' || k === 'z' || k === 'm') {
      if (r.gameType === 'quiz') buzzOnlinePlayerIn();
      else if (r.gameType === 'shooter') fireOnlineArcadeShip();
    }
  }

  function runOnlineSpaceShooterLoop() {
    stopArcadeLoop();
    let matchFinishedTriggered = false;

    function spawnExplosion(md: any, x: number, y: number, color: string, count = 14) {
      if (!md.particles) md.particles = [];
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const spd = 1.2 + Math.random() * 3.2;
        md.particles.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          color,
          life: 22 + Math.floor(Math.random() * 12)
        });
      }
    }

    function step() {
      const r = arcadeRoomState;
      if (!r || r.status !== 'playing' || r.gameType !== 'shooter') return;
      const sc = document.getElementById('arcade-shooter-canvas') as HTMLCanvasElement | null;
      if (!sc) return;
      const sctx = sc.getContext('2d');
      if (!sctx) return;
      const md = r.matchData;
      if (!md.asteroids) md.asteroids = [];
      if (!md.powerups) md.powerups = [];
      if (!md.particles) md.particles = [];

      const bgGrad = sctx.createRadialGradient(md.W * 0.5, md.H * 0.5, 20, md.W * 0.5, md.H * 0.5, md.W * 0.7);
      bgGrad.addColorStop(0, '#1B263B');
      bgGrad.addColorStop(1, '#070B19');
      sctx.fillStyle = bgGrad;
      sctx.fillRect(0, 0, md.W, md.H);

      const nowT = Date.now() / 400;
      for (let i = 0; i < 36; i++) {
        const alpha = 0.25 + 0.55 * Math.abs(Math.sin(nowT + i));
        sctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        sctx.fillRect((i * 83) % md.W, (i * 47) % md.H, i % 3 === 0 ? 2.5 : 1.5, i % 3 === 0 ? 2.5 : 1.5);
      }

      md.powerups.forEach((pw: any) => {
        if (!pw.active) {
          pw.respawn = (pw.respawn || 0) - 1;
          if (pw.respawn <= 0) {
            pw.active = true;
            pw.type = pw.type === 'shield' ? 'rapid' : 'shield';
          }
          return;
        }
        const pulse = Math.sin(Date.now() / 180) * 3;
        sctx.save();
        sctx.translate(pw.x, pw.y);
        sctx.fillStyle = pw.type === 'shield' ? 'rgba(52, 152, 219, 0.28)' : 'rgba(241, 196, 15, 0.28)';
        sctx.beginPath();
        sctx.arc(0, 0, 18 + pulse, 0, Math.PI * 2);
        sctx.fill();
        sctx.font = '18px Arial';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText(pw.type === 'shield' ? '🛡️' : '⚡', 0, 0);
        sctx.restore();
      });

      md.asteroids.forEach((ast: any) => {
        ast.x += ast.vx;
        ast.y += ast.vy;
        ast.rot = (ast.rot || 0) + 0.015;
        if (ast.x < ast.r + 10 || ast.x > md.W - ast.r - 10) ast.vx *= -1;
        if (ast.y < ast.r + 10 || ast.y > md.H - ast.r - 10) ast.vy *= -1;

        sctx.save();
        sctx.translate(ast.x, ast.y);
        sctx.rotate(ast.rot);
        sctx.fillStyle = '#5D6D7E';
        sctx.strokeStyle = '#AEB6BF';
        sctx.lineWidth = 2;
        sctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const ang = (Math.PI * 2 * k) / 8;
          const rad = ast.r * (k % 2 === 0 ? 1 : 0.82);
          if (k === 0) sctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
          else sctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
        }
        sctx.closePath();
        sctx.fill();
        sctx.stroke();
        sctx.restore();
      });

      md.ships.forEach((s: any) => {
        if (s.hp <= 0) return;
        s.angle += 0.052 * s.rotDir;
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.962;
        s.vy *= 0.962;
        if (s.cooldown > 0) s.cooldown--;
        if ((s.dashCooldown || 0) > 0) s.dashCooldown--;
        if ((s.shield || 0) > 0) s.shield--;
        if ((s.rapidFire || 0) > 0) s.rapidFire--;

        if (s.x < 24) { s.x = 24; s.vx *= -0.8; }
        if (s.x > md.W - 24) { s.x = md.W - 24; s.vx *= -0.8; }
        if (s.y < 24) { s.y = 24; s.vy *= -0.8; }
        if (s.y > md.H - 24) { s.y = md.H - 24; s.vy *= -0.8; }

        md.asteroids.forEach((ast: any) => {
          const dist = Math.hypot(s.x - ast.x, s.y - ast.y);
          if (dist < ast.r + 16 && dist > 0) {
            const nx = (s.x - ast.x) / dist;
            const ny = (s.y - ast.y) / dist;
            s.x = ast.x + nx * (ast.r + 17);
            s.y = ast.y + ny * (ast.r + 17);
            s.vx = nx * 2.5;
            s.vy = ny * 2.5;
          }
        });

        md.powerups.forEach((pw: any) => {
          if (pw.active && Math.hypot(s.x - pw.x, s.y - pw.y) < 28) {
            pw.active = false;
            pw.respawn = 360;
            if (pw.type === 'shield') s.shield = 300;
            else s.rapidFire = 300;
            deps.playCoin();
            spawnExplosion(md, pw.x, pw.y, '#FFE66D', 10);
          }
        });

        sctx.save();
        sctx.strokeStyle = 'rgba(255,255,255,0.22)';
        sctx.setLineDash([4, 4]);
        sctx.beginPath();
        sctx.moveTo(s.x, s.y);
        sctx.lineTo(s.x + Math.cos(s.angle) * 44, s.y + Math.sin(s.angle) * 44);
        sctx.stroke();
        sctx.setLineDash([]);

        sctx.translate(s.x, s.y);
        sctx.rotate(s.angle);
        if (Math.hypot(s.vx, s.vy) > 0.8) {
          sctx.fillStyle = '#F39C12';
          sctx.beginPath();
          sctx.moveTo(-10, -5);
          sctx.lineTo(-22 - Math.random() * 6, 0);
          sctx.lineTo(-10, 5);
          sctx.closePath();
          sctx.fill();
        }
        sctx.fillStyle = s.color;
        sctx.strokeStyle = '#FFF';
        sctx.lineWidth = 2.2;
        sctx.beginPath();
        sctx.moveTo(20, 0);
        sctx.lineTo(-12, -13);
        sctx.lineTo(-7, 0);
        sctx.lineTo(-12, 13);
        sctx.closePath();
        sctx.fill();
        sctx.stroke();
        sctx.fillStyle = '#AED6F1';
        sctx.beginPath();
        sctx.arc(3, 0, 4.5, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();

        if ((s.shield || 0) > 0) {
          sctx.save();
          sctx.strokeStyle = '#5DADE2';
          sctx.lineWidth = 2.5;
          sctx.beginPath();
          sctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
          sctx.stroke();
          sctx.restore();
        }

        sctx.fillStyle = '#FFF';
        sctx.font = 'bold 11px Fredoka, sans-serif';
        sctx.textAlign = 'center';
        sctx.fillText(`${s.name} ${'❤️'.repeat(s.hp)}`, s.x, s.y - 24);
      });

      for (let i = md.bullets.length - 1; i >= 0; i--) {
        const b = md.bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        sctx.save();
        sctx.fillStyle = b.color;
        sctx.shadowColor = b.color;
        sctx.shadowBlur = 8;
        sctx.beginPath();
        sctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();

        let hit = false;
        md.asteroids.forEach((ast: any) => {
          if (!hit && Math.hypot(b.x - ast.x, b.y - ast.y) < ast.r + 4) {
            hit = true;
            spawnExplosion(md, b.x, b.y, '#BDC3C7', 6);
          }
        });

        if (!hit) {
          md.ships.forEach((target: any, tIdx: number) => {
            if (tIdx !== b.ownerIdx && target.hp > 0 && Math.hypot(b.x - target.x, b.y - target.y) < 20) {
              hit = true;
              if ((target.shield || 0) > 0) {
                target.shield = 0;
                deps.playClick();
                spawnExplosion(md, target.x, target.y, '#5DADE2', 12);
              } else {
                target.hp -= 1;
                deps.playError();
                spawnExplosion(md, target.x, target.y, target.color, target.hp <= 0 ? 24 : 10);
              }
            }
          });
        }

        if (hit || b.life <= 0 || b.x < 0 || b.x > md.W || b.y < 0 || b.y > md.H) {
          md.bullets.splice(i, 1);
        }
      }

      for (let i = md.particles.length - 1; i >= 0; i--) {
        const pt = md.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        sctx.fillStyle = pt.color;
        sctx.globalAlpha = Math.max(0, pt.life / 30);
        sctx.beginPath();
        sctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        sctx.fill();
        sctx.globalAlpha = 1;
        if (pt.life <= 0) md.particles.splice(i, 1);
      }

      const aliveShips = md.ships.filter((s: any) => s.hp > 0);
      if (aliveShips.length <= 1 && !matchFinishedTriggered) {
        matchFinishedTriggered = true;
        const me = deps.getCurrentUser();
        if (r.hostId === me.id || r.playerIds.includes(me.id)) {
          const winnerId = aliveShips[0] ? aliveShips[0].memberId : null;
          finishOnlineArcadeMatch(winnerId, !winnerId);
        }
        return;
      }

      arcadeAnimFrameId = requestAnimationFrame(step);
    }
    arcadeAnimFrameId = requestAnimationFrame(step);
  }

  return {
    getRoomState,
    stopArcadeLoop,
    closeArcadeModal,
    pullArcadeRoomFromFirebase,
    onRemoteArcadeRoomUpdate,
    renderArcadeLobby,
    createArcadeLobby,
    joinArcadeLobby,
    toggleArcadeReady,
    leaveArcadeLobby,
    resetArcadeToIdle,
    startOnlineArcadeMatch,
    playOnlineTicTacToeCell,
    forfeitOnlineMatch,
    buzzOnlinePlayerIn,
    answerOnlineBuzzerQuestion,
    dashOnlineArcadeShip,
    fireOnlineArcadeShip,
    handleArcadeKeyPress
  };
}
