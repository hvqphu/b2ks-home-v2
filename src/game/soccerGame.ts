import { B2KSState, Member, SoccerOnlineRoom, SoccerPlayerInput } from '../types/b2ks';
import { formatFamilyBrand, getFamilyFirebaseRoot, normalizeFamilySlug, resolveNeighborhoodLocations } from './constants';
import { drawDetailedChibiOnContext } from './worldRenderer';

export interface SoccerEngineDeps {
  getState: () => B2KSState;
  getCurrentUser: () => Member;
  getFirebaseUrl: () => string;
  playClick: () => void;
  playCoin: () => void;
  playSuccess: () => void;
  playError: () => void;
  triggerConfetti: () => void;
  triggerSpeechBubble: (member: Member, text: string, isEng: boolean) => void;
  showToast: (msg: string) => void;
}

const LOCAL_SOCCER_ROOM_KEY = 'b2ks_soccer_online_room';
const LOCAL_SOCCER_P2_KEY = 'b2ks_soccer_p2_input';

function createDefaultOnlineRoom(): SoccerOnlineRoom {
  return {
    status: 'idle',
    hostId: '',
    p1Id: '',
    p1Name: '',
    p2Id: null,
    p2Name: null,
    p1Goals: 0,
    p2Goals: 0,
    timeLeft: 60,
    p1x: 260,
    p1y: 295,
    p1Dir: 'up',
    p1Moving: false,
    p2x: 260,
    p2y: 65,
    p2Dir: 'down',
    p2Moving: false,
    bx: 260,
    by: 180,
    bvx: 0,
    bvy: 0,
    goalBannerText: '',
    goalBannerUntil: 0,
    updatedAt: 0
  };
}

export function createSoccerMiniGame(deps: SoccerEngineDeps) {
  const W = 520;
  const H = 360;
  const GOAL_X1 = 185;
  const GOAL_X2 = 335;
  const GOAL_Y = 26;

  let rafId: number | null = null;
  let timerId: number | null = null;
  let syncPollId: number | null = null;
  let active = false;
  let mode: 'menu' | 'solo' | 'online_2p' | 'spectator' = 'menu';

  const heldDir = { up: false, down: false, left: false, right: false };

  // Solo match state
  let solo = {
    playerGoals: 0,
    aiGoals: 0,
    timeLeft: 45,
    finished: false,
    goalBannerUntil: 0,
    goalBannerText: '',
    px: 260,
    py: 295,
    pDir: 'up',
    pMoving: false,
    bx: 260,
    by: 255,
    bvx: 0,
    bvy: 0,
    bAngle: 0,
    gkX: 260,
    gkVx: 2.2,
    defX: 260,
    defY: 165,
    defVx: 2.0,
    kickCooldownUntil: 0
  };

  // Online 2P & Spectator shared room state
  let roomState: SoccerOnlineRoom = createDefaultOnlineRoom();
  let remoteP2Input: SoccerPlayerInput = { playerId: '', dx: 0, dy: 0, kickSeq: 0, ts: 0 };
  let lastHandledP2KickSeq = 0;
  let localP2KickSeq = 0;
  let localKickCooldownUntil = 0;
  let lastRoomPushAt = 0;
  let lastP2InputPushAt = 0;
  let lastLobbySignature = '';
  let bAngleOnline = 0;

  function pushOnlineRoom(immediate = false) {
    const now = Date.now();
    if (!immediate && now - lastRoomPushAt < 105) return;
    lastRoomPushAt = now;
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    roomState.updatedAt = now;
    try {
      localStorage.setItem(`${LOCAL_SOCCER_ROOM_KEY}_${slug}`, JSON.stringify(roomState));
    } catch {
      // ignore
    }
    const fb = deps.getFirebaseUrl();
    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_room.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomState)
      }).catch(() => {});
    }
  }

  function pushP2Input(input: SoccerPlayerInput, immediate = false) {
    const now = Date.now();
    if (!immediate && now - lastP2InputPushAt < 85) return;
    lastP2InputPushAt = now;
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    try {
      localStorage.setItem(`${LOCAL_SOCCER_P2_KEY}_${slug}`, JSON.stringify(input));
    } catch {
      // ignore
    }
    const fb = deps.getFirebaseUrl();
    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_p2_input.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }).catch(() => {});
    }
  }

  function pullSoccerRoomFromFirebase() {
    const slug = normalizeFamilySlug(deps.getState().familyName);
    const fbRoot = getFamilyFirebaseRoot(deps.getState().familyName);
    const fb = deps.getFirebaseUrl();
    if (fb) {
      fetch(`${fb}/${fbRoot}/soccer_room.json`)
        .then((r) => r.json())
        .then((remote: SoccerOnlineRoom | null) => {
          if (remote && (remote.updatedAt || 0) > (roomState.updatedAt || 0)) {
            onRemoteSoccerRoomUpdate(remote);
          }
        })
        .catch(() => {});

      const me = deps.getCurrentUser();
      if (active && mode === 'online_2p' && roomState.status === 'playing' && roomState.hostId === me.id) {
        fetch(`${fb}/${fbRoot}/soccer_p2_input.json`)
          .then((r) => r.json())
          .then((inp: SoccerPlayerInput | null) => {
            if (inp && (inp.ts || 0) > (remoteP2Input.ts || 0)) {
              remoteP2Input = inp;
            }
          })
          .catch(() => {});
      }
    } else {
      try {
        const localStr = localStorage.getItem(`${LOCAL_SOCCER_ROOM_KEY}_${slug}`);
        if (localStr) {
          const parsed = JSON.parse(localStr) as SoccerOnlineRoom;
          if (parsed && (parsed.updatedAt || 0) > (roomState.updatedAt || 0)) {
            onRemoteSoccerRoomUpdate(parsed);
          }
        }
        const p2Str = localStorage.getItem(`${LOCAL_SOCCER_P2_KEY}_${slug}`);
        if (p2Str) {
          const inp = JSON.parse(p2Str) as SoccerPlayerInput;
          if (inp && (inp.ts || 0) > (remoteP2Input.ts || 0)) {
            remoteP2Input = inp;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  function onRemoteSoccerRoomUpdate(remote: SoccerOnlineRoom) {
    const me = deps.getCurrentUser();
    const isHostActive = active && mode === 'online_2p' && roomState.hostId === me.id && roomState.status === 'playing';
    if (isHostActive) return; // Host owns live match physics
    roomState = { ...createDefaultOnlineRoom(), ...remote };

    if (active) {
      const modalEl = document.getElementById('soccer-modal');
      if (modalEl && modalEl.style.display === 'flex') {
        if (roomState.status === 'playing') {
          if (roomState.p1Id === me.id || roomState.p2Id === me.id) {
            mode = 'online_2p';
          } else if (mode !== 'solo') {
            mode = 'spectator';
          }
        } else if (roomState.status === 'idle' && mode === 'spectator') {
          mode = 'menu';
        }
        renderUIState();
      }
    }
  }

  function onRemoteP2InputUpdate(inp: SoccerPlayerInput) {
    if ((inp.ts || 0) > (remoteP2Input.ts || 0)) {
      remoteP2Input = inp;
    }
  }

  function getNearbyMembersAtPitch(): Member[] {
    const st = deps.getState();
    const pitchLoc = resolveNeighborhoodLocations(st).find((l) => l.id === 'soccer');
    const px = pitchLoc ? pitchLoc.x : 1780;
    const py = pitchLoc ? pitchLoc.y : 1410;
    return st.members.filter(
      (m) => m.scene === 'neighborhood' && Math.hypot(m.x - px, m.y - py) <= 220
    );
  }

  function resetSoloPositions() {
    solo.px = 260;
    solo.py = 300;
    solo.pDir = 'up';
    solo.pMoving = false;
    solo.bx = 260;
    solo.by = 258;
    solo.bvx = 0;
    solo.bvy = 0;
    solo.gkX = 260;
    solo.defX = 260;
    solo.defY = 162;
  }

  function resetOnlinePositions() {
    roomState.p1x = 260;
    roomState.p1y = 298;
    roomState.p1Dir = 'up';
    roomState.p1Moving = false;
    roomState.p2x = 260;
    roomState.p2y = 62;
    roomState.p2Dir = 'down';
    roomState.p2Moving = false;
    roomState.bx = 260;
    roomState.by = 180;
    roomState.bvx = 0;
    roomState.bvy = 0;
  }

  function openSoccerArena() {
    active = true;
    lastLobbySignature = '';
    pullSoccerRoomFromFirebase();

    const me = deps.getCurrentUser();
    // Auto-route user cleanly based on ongoing 2P room!
    if (roomState.status === 'playing') {
      if (roomState.p1Id === me.id || roomState.p2Id === me.id) {
        mode = 'online_2p';
      } else {
        mode = 'spectator';
      }
    } else if (roomState.status === 'lobby') {
      mode = 'online_2p';
    } else {
      mode = 'solo';
      startSoloMatchInternal();
    }

    startLoopAndSync();
    renderUIState();
  }

  function startSoloMatchInternal() {
    mode = 'solo';
    solo.playerGoals = 0;
    solo.aiGoals = 0;
    solo.timeLeft = 45;
    solo.finished = false;
    solo.goalBannerUntil = 0;
    solo.goalBannerText = '';
    resetSoloPositions();

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      if (!active || mode !== 'solo' || solo.finished) return;
      solo.timeLeft = Math.max(0, solo.timeLeft - 1);
      updateScoreHUD();
      if (solo.timeLeft <= 0) {
        finishSoloMatch();
      }
    }, 1000);
    renderUIState();
  }

  function startLoopAndSync() {
    if (syncPollId) clearInterval(syncPollId);
    syncPollId = window.setInterval(() => {
      if (!active) return;
      pullSoccerRoomFromFirebase();
      if (mode === 'online_2p' && roomState.status === 'lobby') {
        renderLobbyPanel();
      }
    }, 140);

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function stopMatch() {
    active = false;
    heldDir.up = heldDir.down = heldDir.left = heldDir.right = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (syncPollId) {
      clearInterval(syncPollId);
      syncPollId = null;
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function finishSoloMatch() {
    solo.finished = true;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    const me = deps.getCurrentUser();
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    if (solo.playerGoals > solo.aiGoals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.triggerSpeechBubble(me, formatFamilyBrand(`We won ${solo.playerGoals}-${solo.aiGoals} at B2KS Stadium! ⚽🏆`, brand), true);
      deps.showToast(formatFamilyBrand(`🏆 Chiến thắng ${solo.playerGoals} - ${solo.aiGoals} tại Sân Bóng Đá B2KS!`, brand));
    } else if (solo.playerGoals === solo.aiGoals) {
      deps.playClick();
      deps.triggerSpeechBubble(me, `Nice draw ${solo.playerGoals}-${solo.aiGoals}! Good game! ⚽`, true);
    } else {
      deps.playClick();
      deps.triggerSpeechBubble(me, `Good match! Let's play again! ⚽`, true);
    }
    updateScoreHUD();
  }

  function finishOnlineMatch() {
    roomState.status = 'finished';
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    pushOnlineRoom(true);
    const me = deps.getCurrentUser();
    if (roomState.p1Goals > roomState.p2Goals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.showToast(`🏆 ${roomState.p1Name} thắng ${roomState.p1Goals} - ${roomState.p2Goals}!`);
      if (me.id === roomState.p1Id) {
        deps.triggerSpeechBubble(me, `Victory ${roomState.p1Goals}-${roomState.p2Goals}! ⚽🏆`, true);
      }
    } else if (roomState.p2Goals > roomState.p1Goals) {
      deps.playSuccess();
      deps.triggerConfetti();
      deps.showToast(`🏆 ${roomState.p2Name} thắng ${roomState.p2Goals} - ${roomState.p1Goals}!`);
      if (me.id === roomState.p2Id) {
        deps.triggerSpeechBubble(me, `Victory ${roomState.p2Goals}-${roomState.p1Goals}! ⚽🏆`, true);
      }
    } else {
      deps.playClick();
      deps.showToast(`🤝 Trận hòa ${roomState.p1Goals} - ${roomState.p2Goals}!`);
    }
    renderUIState();
  }

  // Lobby & Mode Controls
  function switchToSoloMode() {
    deps.playClick();
    startSoloMatchInternal();
  }

  function switchTo2PMode() {
    deps.playClick();
    mode = 'online_2p';
    pullSoccerRoomFromFirebase();
    renderUIState();
  }

  function create2PRoom() {
    const me = deps.getCurrentUser();
    deps.playClick();
    roomState = createDefaultOnlineRoom();
    roomState.status = 'lobby';
    roomState.hostId = me.id;
    roomState.p1Id = me.id;
    roomState.p1Name = me.name;
    lastHandledP2KickSeq = 0;
    remoteP2Input = { playerId: '', dx: 0, dy: 0, kickSeq: 0, ts: 0 };
    mode = 'online_2p';
    pushOnlineRoom(true);
    renderUIState();
    deps.showToast('⚽ Đã tạo phòng đấu 2 người! Đợi người thứ 2 bấm Tham Gia...');
  }

  function join2PRoom() {
    const me = deps.getCurrentUser();
    if (roomState.status !== 'lobby') return;
    if (roomState.p1Id === me.id) return deps.showToast('ℹ️ Bạn đang là Chủ phòng (Đội Xanh P1)!');
    if (roomState.p2Id && roomState.p2Id !== me.id) return deps.showToast('⚠️ Phòng đã đủ 2 người! Bạn có thể làm Khán giả xem trực tiếp.');
    deps.playSuccess();
    roomState.p2Id = me.id;
    roomState.p2Name = me.name;
    mode = 'online_2p';
    pushOnlineRoom(true);
    renderUIState();
    deps.showToast(`🔴 ${me.name} đã vào Đội Đỏ (P2)!`);
  }

  function start2PMatch() {
    const me = deps.getCurrentUser();
    if (roomState.status !== 'lobby' || roomState.hostId !== me.id) return;
    if (!roomState.p2Id) return deps.showToast('⏳ Cần có Người chơi 2 tham gia trước!');
    deps.playSuccess();
    roomState.status = 'playing';
    roomState.p1Goals = 0;
    roomState.p2Goals = 0;
    roomState.timeLeft = 60;
    roomState.goalBannerText = '';
    roomState.goalBannerUntil = 0;
    lastHandledP2KickSeq = remoteP2Input.kickSeq || 0;
    resetOnlinePositions();
    pushOnlineRoom(true);

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(() => {
      if (!active || mode !== 'online_2p' || roomState.status !== 'playing' || roomState.hostId !== deps.getCurrentUser().id) return;
      roomState.timeLeft = Math.max(0, roomState.timeLeft - 1);
      pushOnlineRoom(true);
      updateScoreHUD();
      if (roomState.timeLeft <= 0) {
        finishOnlineMatch();
      }
    }, 1000);
    renderUIState();
  }

  function leave2PRoom() {
    const me = deps.getCurrentUser();
    deps.playClick();
    if (roomState.p1Id === me.id || roomState.hostId === me.id) {
      roomState = createDefaultOnlineRoom();
    } else if (roomState.p2Id === me.id) {
      roomState.p2Id = null;
      roomState.p2Name = null;
      if (roomState.status === 'playing' || roomState.status === 'finished') {
        roomState.status = 'lobby';
      }
    }
    pushOnlineRoom(true);
    mode = 'online_2p';
    renderUIState();
  }

  function spectateMatch() {
    deps.playClick();
    mode = 'spectator';
    renderUIState();
  }

  function renderUIState() {
    const btn1p = document.getElementById('soccer-mode-1p-btn');
    const btn2p = document.getElementById('soccer-mode-2p-btn');
    const btnSpec = document.getElementById('soccer-mode-spec-btn');
    const lobbyPanel = document.getElementById('soccer-2p-lobby');
    const pitchWrap = document.getElementById('soccer-pitch-wrap');
    const controlsWrap = document.getElementById('soccer-controls-wrap');
    const restartBtn = document.getElementById('soccer-restart-btn');

    const hasLiveOnline = roomState.status === 'playing' || roomState.status === 'lobby';
    if (btn1p) btn1p.style.background = mode === 'solo' ? '#15803D' : '#64748B';
    if (btn2p) btn2p.style.background = mode === 'online_2p' ? '#0284C7' : '#64748B';
    if (btnSpec) {
      btnSpec.style.display = hasLiveOnline ? 'inline-flex' : 'none';
      btnSpec.style.background = mode === 'spectator' ? '#DC2626' : '#64748B';
    }

    const showLobby = mode === 'online_2p' && (roomState.status === 'idle' || roomState.status === 'lobby' || roomState.status === 'finished');
    if (lobbyPanel) {
      lobbyPanel.style.display = showLobby ? 'block' : 'none';
      if (showLobby) renderLobbyPanel();
    }

    const showPitch =
      mode === 'solo' ||
      (mode === 'online_2p' && roomState.status === 'playing') ||
      mode === 'spectator';
    if (pitchWrap) pitchWrap.style.display = showPitch ? 'flex' : 'none';

    const showPlayerControls =
      mode === 'solo' ||
      (mode === 'online_2p' && roomState.status === 'playing');
    if (controlsWrap) controlsWrap.style.display = showPlayerControls ? 'flex' : 'none';

    if (restartBtn) {
      restartBtn.style.display = mode === 'solo' ? 'inline-flex' : 'none';
    }

    updateScoreHUD();
  }

  function renderLobbyPanel() {
    const lobbyPanel = document.getElementById('soccer-2p-lobby');
    if (!lobbyPanel) return;
    const me = deps.getCurrentUser();
    const nearby = getNearbyMembersAtPitch();
    const sig = `${roomState.status}|${roomState.p1Id}|${roomState.p2Id}|${roomState.p1Goals}|${roomState.p2Goals}|${me.id}|${nearby.map((m) => m.id).join(',')}`;
    if (sig === lastLobbySignature) return;
    lastLobbySignature = sig;

    const nearbyHtml = nearby.length > 0
      ? nearby.map((m) => `<span class="tag" style="background:#D1FAE5; color:#065F46; border-color:#10B981;">${m.name}</span>`).join(' ')
      : '<span style="font-size:11.5px; color:#64748B;">Chưa có thêm thành viên nào đứng cạnh sân</span>';

    if (roomState.status === 'idle') {
      lobbyPanel.innerHTML = `
        <div style="text-align:center; padding:10px;">
          <div style="font-size:30px;">⚽👥</div>
          <div style="font-weight:700; font-size:15px; color:#0F172A; margin-top:4px;">Đấu Bóng Đá 2 Người Online (Miễn Phí 0⭐)</div>
          <div style="font-size:12px; color:#475569; margin:6px 0 10px;">Thành viên đang có mặt tại Sân Bóng: ${nearbyHtml}</div>
          <button type="button" class="btn btn-primary" style="padding:10px 18px; font-size:14px;" onclick="createSoccer2PRoom()">🏟️ Tạo Phòng Đấu 1v1</button>
        </div>
      `;
      return;
    }

    const isP1 = roomState.p1Id === me.id;
    const isP2 = roomState.p2Id === me.id;
    const isFinished = roomState.status === 'finished';

    lobbyPanel.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${isFinished ? `
          <div style="background:#FEF3C7; border:2px solid #F59E0B; border-radius:10px; padding:8px; text-align:center; font-weight:700; color:#92400E;">
            🏆 KẾT QUẢ TRẬN ĐẤU: 🔵 ${roomState.p1Name} (${roomState.p1Goals}) — (${roomState.p2Goals}) ${roomState.p2Name || 'P2'} 🔴
          </div>
        ` : ''}
        <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:8px; align-items:center;">
          <div style="background:#EFF6FF; border:2.5px solid #2563EB; border-radius:10px; padding:10px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#1D4ED8;">🔵 ĐỘI XANH (P1)</div>
            <div style="font-size:15px; font-weight:700; color:#0F172A; margin-top:4px;">${roomState.p1Name}</div>
            <div style="font-size:11px; color:#64748B;">Tấn công lên ▲</div>
          </div>
          <div style="font-weight:700; font-size:16px; color:#0F172A;">VS</div>
          <div style="background:#FEF2F2; border:2.5px solid #DC2626; border-radius:10px; padding:10px; text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#B91C1C;">🔴 ĐỘI ĐỎ (P2)</div>
            <div style="font-size:15px; font-weight:700; color:#0F172A; margin-top:4px;">${roomState.p2Name || '⏳ Đang chờ P2...'}</div>
            <div style="font-size:11px; color:#64748B;">Tấn công xuống ▼</div>
          </div>
        </div>
        <div style="font-size:11.5px; color:#475569; text-align:center;">Đang ở Sân Bóng: ${nearbyHtml}</div>
        <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
          ${!isP1 && !isP2 && !roomState.p2Id ? `<button type="button" class="btn btn-primary" onclick="joinSoccer2PRoom()">🙋 Tham Gia Đội Đỏ (P2)</button>` : ''}
          ${isP1 && roomState.p2Id ? `<button type="button" class="btn btn-accent" onclick="startSoccer2PMatch()">🚀 ${isFinished ? 'Đá Lại Trận Mới' : 'Bắt Đầu Trận Đấu!'}</button>` : ''}
          ${(isP1 || isP2) ? `<button type="button" class="btn btn-danger btn-sm" onclick="leaveSoccer2PRoom()">🚪 Rời Phòng</button>` : ''}
          <button type="button" class="btn btn-sm" style="background:#7C3AED;" onclick="spectateSoccerMatch()">📺 Xem Đá (Khán giả)</button>
        </div>
      </div>
    `;
  }

  function updateScoreHUD() {
    const scoreEl = document.getElementById('soccer-scoreboard');
    const timeEl = document.getElementById('soccer-timer');
    const statusEl = document.getElementById('soccer-status-text');
    const me = deps.getCurrentUser();

    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    if (mode === 'solo') {
      if (scoreEl) {
        scoreEl.innerHTML = `<span style="color:#0369A1;">⚽ ${me.name}: <b>${solo.playerGoals}</b></span> <span style="color:#64748B;">—</span> <span style="color:#B91C1C;"><b>${solo.aiGoals}</b> :Thủ môn ${brand} 🧤</span>`;
      }
      if (timeEl) timeEl.textContent = `⏱️ ${solo.timeLeft}s`;
      if (statusEl) {
        if (solo.finished) {
          statusEl.textContent =
            solo.playerGoals > solo.aiGoals
              ? `🏆 HẾT GIỜ! ${me.name} thắng ${solo.playerGoals} - ${solo.aiGoals}!`
              : solo.playerGoals === solo.aiGoals
              ? `🤝 HẾT GIỜ! Hòa ${solo.playerGoals} - ${solo.aiGoals}!`
              : `🧤 HẾT GIỜ! Đội ${brand} thắng ${solo.aiGoals} - ${solo.playerGoals}!`;
          statusEl.style.color = solo.playerGoals > solo.aiGoals ? '#15803D' : '#B45309';
        } else {
          statusEl.textContent = '🆓 Đá Solo 0⭐ • Rê bóng vượt hậu vệ & bấm ⚡ Sút vào lưới!';
          statusEl.style.color = '#1E293B';
        }
      }
      return;
    }

    if (scoreEl) {
      scoreEl.innerHTML = `<span style="color:#1D4ED8;">🔵 ${roomState.p1Name || 'P1'}: <b>${roomState.p1Goals}</b></span> <span style="color:#64748B;">—</span> <span style="color:#DC2626;"><b>${roomState.p2Goals}</b> :${roomState.p2Name || 'P2'} 🔴</span>`;
    }
    if (timeEl) timeEl.textContent = `⏱️ ${roomState.timeLeft}s`;
    if (statusEl) {
      if (mode === 'spectator') {
        statusEl.textContent =
          roomState.status === 'playing'
            ? `📺 KHÁN GIẢ TRỰC TIẾP: Đang theo dõi ${roomState.p1Name} vs ${roomState.p2Name}!`
            : roomState.status === 'finished'
            ? `🏁 Trận đấu kết thúc (${roomState.p1Goals} - ${roomState.p2Goals})!`
            : `🟡 Đang chờ ${roomState.p1Name || 'Chủ phòng'} bắt đầu trận đấu 2 người...`;
        statusEl.style.color = '#7C3AED';
      } else if (roomState.status === 'playing') {
        const mySide = roomState.p1Id === me.id ? '🔵 Đội Xanh (Sút lên ▲)' : '🔴 Đội Đỏ (Sút xuống ▼)';
        statusEl.textContent = `🔥 TRẬN ĐẤU 2 NGƯỜI ONLINE • Bạn là ${mySide}`;
        statusEl.style.color = '#0369A1';
      } else {
        statusEl.textContent = '👥 Phòng Đấu 2 Người Miễn Phí (0⭐) — Có thể rủ người khác đến sân xem trực tiếp!';
        statusEl.style.color = '#1E293B';
      }
    }
  }

  function applyKickVelocity(
    px: number,
    py: number,
    pDir: string,
    defaultDy: number,
    targetX?: number,
    targetY?: number
  ) {
    const d = Math.hypot(roomState.bx - px, roomState.by - py);
    if (d > 62) return false;
    let dx = 0;
    let dy = defaultDy;
    if (typeof targetX === 'number' && typeof targetY === 'number') {
      dx = targetX - roomState.bx;
      dy = targetY - roomState.by;
    } else if (pDir === 'left') {
      dx = -0.35;
      dy = defaultDy * 0.94;
    } else if (pDir === 'right') {
      dx = 0.35;
      dy = defaultDy * 0.94;
    } else if (pDir === 'up') {
      dx = ((GOAL_X1 + GOAL_X2) / 2 - roomState.bx) * 0.004;
      dy = -1;
    } else if (pDir === 'down') {
      dx = ((GOAL_X1 + GOAL_X2) / 2 - roomState.bx) * 0.004;
      dy = 1;
    }
    const len = Math.hypot(dx, dy) || 1;
    const power = 9.4;
    roomState.bvx = (dx / len) * power;
    roomState.bvy = (dy / len) * power;
    deps.playClick();
    return true;
  }

  function kickBall(targetX?: number, targetY?: number) {
    if (!active) return;
    const now = Date.now();

    if (mode === 'solo') {
      if (solo.finished || now < solo.kickCooldownUntil) return;
      const d = Math.hypot(solo.bx - solo.px, solo.by - solo.py);
      if (d > 58) {
        deps.showToast('🏃 Lại gần quả bóng hơn rồi mới sút nhé!');
        return;
      }
      solo.kickCooldownUntil = now + 260;
      let dx = 0;
      let dy = -1;
      if (typeof targetX === 'number' && typeof targetY === 'number') {
        dx = targetX - solo.bx;
        dy = targetY - solo.by;
      } else if (solo.pDir === 'left') {
        dx = -0.35;
        dy = -0.95;
      } else if (solo.pDir === 'right') {
        dx = 0.35;
        dy = -0.95;
      } else if (solo.pDir === 'down') {
        dx = 0;
        dy = 1;
      } else {
        const goalMid = (GOAL_X1 + GOAL_X2) / 2;
        dx = (goalMid - solo.bx) * 0.004;
        dy = -1;
      }
      const len = Math.hypot(dx, dy) || 1;
      solo.bvx = (dx / len) * 9.4;
      solo.bvy = (dy / len) * 9.4;
      deps.playClick();
      return;
    }

    if (mode !== 'online_2p' || roomState.status !== 'playing' || now < localKickCooldownUntil) return;
    localKickCooldownUntil = now + 260;
    const me = deps.getCurrentUser();

    if (roomState.p1Id === me.id) {
      if (!applyKickVelocity(roomState.p1x, roomState.p1y, roomState.p1Dir, -1, targetX, targetY)) {
        deps.showToast('🏃 Lại gần quả bóng hơn rồi mới sút nhé!');
      } else {
        pushOnlineRoom(true);
      }
    } else if (roomState.p2Id === me.id) {
      localP2KickSeq += 1;
      const { dx, dy } = getLocalDirVector();
      pushP2Input(
        {
          playerId: me.id,
          dx,
          dy,
          kickSeq: localP2KickSeq,
          kickTx: targetX,
          kickTy: targetY,
          ts: now
        },
        true
      );
      deps.playClick();
    }
  }

  function getLocalDirVector() {
    let dx = 0;
    let dy = 0;
    if (heldDir.up) dy -= 1;
    if (heldDir.down) dy += 1;
    if (heldDir.left) dx -= 1;
    if (heldDir.right) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  function setTouchDir(dir: 'up' | 'down' | 'left' | 'right', down: boolean) {
    heldDir[dir] = down;
  }

  function handleKey(key: string, down: boolean): boolean {
    if (!active) return false;
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') { heldDir.up = down; return true; }
    if (k === 'arrowdown' || k === 's') { heldDir.down = down; return true; }
    if (k === 'arrowleft' || k === 'a') { heldDir.left = down; return true; }
    if (k === 'arrowright' || k === 'd') { heldDir.right = down; return true; }
    if (down && (k === ' ' || k === 'enter')) {
      kickBall();
      return true;
    }
    return false;
  }

  function loop() {
    if (!active) return;
    const canvas = document.getElementById('soccer-canvas') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    const now = Date.now();

    if (mode === 'solo' && ctx) {
      stepSoloPhysics(now);
      drawPitchBase(ctx);
      drawSoloEntities(ctx, now);
    } else if ((mode === 'online_2p' || mode === 'spectator') && ctx) {
      const me = deps.getCurrentUser();
      if (mode === 'online_2p' && roomState.status === 'playing') {
        if (roomState.hostId === me.id) {
          stepOnlineHostPhysics(now);
        } else if (roomState.p2Id === me.id) {
          const { dx, dy } = getLocalDirVector();
          pushP2Input({
            playerId: me.id,
            dx,
            dy,
            kickSeq: localP2KickSeq,
            ts: now
          });
        }
      }
      bAngleOnline += Math.hypot(roomState.bvx || 0, roomState.bvy || 0) * 0.08;
      drawPitchBase(ctx);
      drawOnlineEntities(ctx, now);
      updateScoreHUD();
    }

    rafId = requestAnimationFrame(loop);
  }

  function stepSoloPhysics(now: number) {
    if (solo.finished || now < solo.goalBannerUntil) return;
    const { dx, dy } = getLocalDirVector();
    solo.pMoving = dx !== 0 || dy !== 0;

    if (solo.pMoving) {
      solo.px = Math.max(26, Math.min(W - 26, solo.px + dx * 3.8));
      solo.py = Math.max(46, Math.min(H - 22, solo.py + dy * 3.8));
      if (Math.abs(dx) > Math.abs(dy)) solo.pDir = dx < 0 ? 'left' : 'right';
      else solo.pDir = dy < 0 ? 'up' : 'down';
    }

    const distPB = Math.hypot(solo.bx - solo.px, solo.by - solo.py);
    if (distPB < 27 && now >= solo.kickCooldownUntil) {
      const px = solo.bx - solo.px;
      const py = solo.by - solo.py;
      const plen = Math.hypot(px, py) || 1;
      solo.bvx = (px / plen) * 3.6 + dx * 1.4;
      solo.bvy = (py / plen) * 3.6 + dy * 1.4;
    }

    const targetGkX = Math.max(GOAL_X1 + 16, Math.min(GOAL_X2 - 16, solo.bx));
    const gkDiff = targetGkX - solo.gkX;
    solo.gkX += Math.sign(gkDiff) * Math.min(Math.abs(gkDiff), 2.35);

    solo.defX += solo.defVx;
    if (solo.defX < 105 || solo.defX > W - 105) solo.defVx *= -1;
    if (solo.by > 90 && solo.by < 250) {
      solo.defX += Math.sign(solo.bx - solo.defX) * 0.9;
    }

    solo.bx += solo.bvx;
    solo.by += solo.bvy;
    solo.bvx *= 0.968;
    solo.bvy *= 0.968;
    const spd = Math.hypot(solo.bvx, solo.bvy);
    if (spd < 0.08) { solo.bvx = 0; solo.bvy = 0; }
    else solo.bAngle += spd * 0.09;

    if (solo.by <= GOAL_Y + 8 && solo.bx >= GOAL_X1 + 8 && solo.bx <= GOAL_X2 - 8) {
      solo.playerGoals += 1;
      solo.goalBannerUntil = now + 1500;
      solo.goalBannerText = '⚽ VÀOOO! GHI BÀN TUYỆT ĐẸP!';
      deps.playCoin();
      updateScoreHUD();
      setTimeout(() => { if (active && mode === 'solo' && !solo.finished) resetSoloPositions(); }, 1200);
    } else if (solo.by >= H - 22 && solo.bx >= GOAL_X1 + 8 && solo.bx <= GOAL_X2 - 8) {
      solo.aiGoals += 1;
      solo.goalBannerUntil = now + 1400;
      solo.goalBannerText = '🧤 Ôi! Đối phương phản công!';
      deps.playError();
      updateScoreHUD();
      setTimeout(() => { if (active && mode === 'solo' && !solo.finished) resetSoloPositions(); }, 1200);
    }

    if (solo.bx < 20) { solo.bx = 20; solo.bvx = Math.abs(solo.bvx) * 0.78; }
    if (solo.bx > W - 20) { solo.bx = W - 20; solo.bvx = -Math.abs(solo.bvx) * 0.78; }
    if (solo.by < 24 && (solo.bx < GOAL_X1 || solo.bx > GOAL_X2)) { solo.by = 24; solo.bvy = Math.abs(solo.bvy) * 0.78; }
    if (solo.by > H - 18 && (solo.bx < GOAL_X1 || solo.bx > GOAL_X2)) { solo.by = H - 18; solo.bvy = -Math.abs(solo.bvy) * 0.78; }

    if (Math.hypot(solo.bx - solo.gkX, solo.by - (GOAL_Y + 26)) < 24) {
      solo.bvx = (solo.bx - solo.gkX) * 0.25 + (Math.random() - 0.5) * 3.5;
      solo.bvy = 5.4;
      deps.playClick();
    }
    if (Math.hypot(solo.bx - solo.defX, solo.by - solo.defY) < 24) {
      solo.bvx = (solo.bx - solo.defX) * 0.28 + (Math.random() - 0.5) * 3;
      solo.bvy = 4.6;
      deps.playClick();
    }
  }

  function stepOnlineHostPhysics(now: number) {
    if (roomState.status !== 'playing' || now < (roomState.goalBannerUntil || 0)) return;

    // P1 local input
    const p1Vec = getLocalDirVector();
    roomState.p1Moving = p1Vec.dx !== 0 || p1Vec.dy !== 0;
    if (roomState.p1Moving) {
      roomState.p1x = Math.max(26, Math.min(W - 26, roomState.p1x + p1Vec.dx * 3.9));
      roomState.p1y = Math.max(38, Math.min(H - 22, roomState.p1y + p1Vec.dy * 3.9));
      if (Math.abs(p1Vec.dx) > Math.abs(p1Vec.dy)) roomState.p1Dir = p1Vec.dx < 0 ? 'left' : 'right';
      else roomState.p1Dir = p1Vec.dy < 0 ? 'up' : 'down';
    }

    // P2 remote input
    const isFreshP2 = now - (remoteP2Input.ts || 0) < 2500;
    const p2dx = isFreshP2 ? remoteP2Input.dx : 0;
    const p2dy = isFreshP2 ? remoteP2Input.dy : 0;
    roomState.p2Moving = Math.abs(p2dx) > 0.05 || Math.abs(p2dy) > 0.05;
    if (roomState.p2Moving) {
      roomState.p2x = Math.max(26, Math.min(W - 26, roomState.p2x + p2dx * 3.9));
      roomState.p2y = Math.max(38, Math.min(H - 22, roomState.p2y + p2dy * 3.9));
      if (Math.abs(p2dx) > Math.abs(p2dy)) roomState.p2Dir = p2dx < 0 ? 'left' : 'right';
      else roomState.p2Dir = p2dy < 0 ? 'up' : 'down';
    }

    // P2 remote kick command
    if (remoteP2Input.kickSeq > lastHandledP2KickSeq) {
      lastHandledP2KickSeq = remoteP2Input.kickSeq;
      applyKickVelocity(roomState.p2x, roomState.p2y, roomState.p2Dir, 1, remoteP2Input.kickTx, remoteP2Input.kickTy);
    }

    // Dribble push from P1 & P2
    if (Math.hypot(roomState.bx - roomState.p1x, roomState.by - roomState.p1y) < 26) {
      const px = roomState.bx - roomState.p1x;
      const py = roomState.by - roomState.p1y;
      const plen = Math.hypot(px, py) || 1;
      roomState.bvx = (px / plen) * 3.7 + p1Vec.dx * 1.4;
      roomState.bvy = (py / plen) * 3.7 + p1Vec.dy * 1.4;
    }
    if (Math.hypot(roomState.bx - roomState.p2x, roomState.by - roomState.p2y) < 26) {
      const px = roomState.bx - roomState.p2x;
      const py = roomState.by - roomState.p2y;
      const plen = Math.hypot(px, py) || 1;
      roomState.bvx = (px / plen) * 3.7 + p2dx * 1.4;
      roomState.bvy = (py / plen) * 3.7 + p2dy * 1.4;
    }

    // Ball motion
    roomState.bx += roomState.bvx;
    roomState.by += roomState.bvy;
    roomState.bvx *= 0.968;
    roomState.bvy *= 0.968;
    if (Math.hypot(roomState.bvx, roomState.bvy) < 0.08) {
      roomState.bvx = 0;
      roomState.bvy = 0;
    }

    // Check Goals: Top Goal belongs to P2 (P1 scores!), Bottom Goal belongs to P1 (P2 scores!)
    if (roomState.by <= GOAL_Y + 6 && roomState.bx >= GOAL_X1 + 8 && roomState.bx <= GOAL_X2 - 8) {
      roomState.p1Goals += 1;
      roomState.goalBannerUntil = now + 1500;
      roomState.goalBannerText = `🔵 ${roomState.p1Name} GHI BÀN!`;
      deps.playCoin();
      pushOnlineRoom(true);
      setTimeout(() => { if (roomState.status === 'playing') { resetOnlinePositions(); pushOnlineRoom(true); } }, 1200);
    } else if (roomState.by >= H - 20 && roomState.bx >= GOAL_X1 + 8 && roomState.bx <= GOAL_X2 - 8) {
      roomState.p2Goals += 1;
      roomState.goalBannerUntil = now + 1500;
      roomState.goalBannerText = `🔴 ${roomState.p2Name || 'P2'} GHI BÀN!`;
      deps.playCoin();
      pushOnlineRoom(true);
      setTimeout(() => { if (roomState.status === 'playing') { resetOnlinePositions(); pushOnlineRoom(true); } }, 1200);
    }

    if (roomState.bx < 20) { roomState.bx = 20; roomState.bvx = Math.abs(roomState.bvx) * 0.78; }
    if (roomState.bx > W - 20) { roomState.bx = W - 20; roomState.bvx = -Math.abs(roomState.bvx) * 0.78; }
    if (roomState.by < 24 && (roomState.bx < GOAL_X1 || roomState.bx > GOAL_X2)) {
      roomState.by = 24;
      roomState.bvy = Math.abs(roomState.bvy) * 0.78;
    }
    if (roomState.by > H - 18 && (roomState.bx < GOAL_X1 || roomState.bx > GOAL_X2)) {
      roomState.by = H - 18;
      roomState.bvy = -Math.abs(roomState.bvy) * 0.78;
    }

    pushOnlineRoom(false);
  }

  function drawPitchBase(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, W, H);
    const stripeCount = 9;
    const stripeH = H / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#1E8449' : '#239B56';
      ctx.fillRect(0, i * stripeH, W, stripeH + 1);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 24, W - 28, H - 38);

    ctx.beginPath();
    ctx.moveTo(14, H / 2);
    ctx.lineTo(W - 14, H / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeRect(140, 24, 240, 68);
    ctx.strokeRect(140, H - 82, 240, 68);

    // Top Goal Net
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(GOAL_X1, 4, GOAL_X2 - GOAL_X1, GOAL_Y - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    for (let gx = GOAL_X1 + 10; gx < GOAL_X2; gx += 12) {
      ctx.beginPath(); ctx.moveTo(gx, 4); ctx.lineTo(gx, GOAL_Y); ctx.stroke();
    }
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(GOAL_X1, 4, GOAL_X2 - GOAL_X1, GOAL_Y - 2);

    // Bottom Goal outline
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(GOAL_X1, H - 14, GOAL_X2 - GOAL_X1, 12);
  }

  function drawSoccerBall(ctx: CanvasRenderingContext2D, bx: number, by: number, angle: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, by + 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    [0, 120, 240].forEach((deg) => {
      const r = (deg * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(Math.cos(r) * 6.5, Math.sin(r) * 6.5, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGoalBannerOverlay(ctx: CanvasRenderingContext2D, text: string) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.roundRect(65, H / 2 - 28, W - 130, 56, 16);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 20px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H / 2 + 7);
  }

  function drawSoloEntities(ctx: CanvasRenderingContext2D, now: number) {
    const brand = (deps.getState().familyName || 'B2KS').trim() || 'B2KS';
    drawDetailedChibiOnContext(ctx, {
      x: solo.gkX, y: GOAL_Y + 26, dir: 'down', name: `Thủ môn ${brand}`,
      hairStyle: 'short', hairColor: '#1E293B', shirtColor: '#F59E0B', shirtPattern: 'collar',
      pantsColor: '#1E293B', pantsStyle: 'shorts', outfit: '🧤', speech: null
    }, false, 0.72, false, true);

    drawDetailedChibiOnContext(ctx, {
      x: solo.defX, y: solo.defY, dir: solo.defVx >= 0 ? 'right' : 'left', name: 'Hậu vệ',
      hairStyle: 'spiky', hairColor: '#DC2626', shirtColor: '#B91C1C', shirtPattern: 'stripe',
      pantsColor: '#1F2937', pantsStyle: 'shorts', outfit: '', speech: null
    }, false, 0.74, true, true);

    drawSoccerBall(ctx, solo.bx, solo.by, solo.bAngle);

    const me = deps.getCurrentUser();
    drawDetailedChibiOnContext(ctx, { ...me, x: solo.px, y: solo.py, dir: solo.pDir, speech: null }, true, 0.82, true, solo.pMoving);

    if (now < solo.goalBannerUntil) {
      drawGoalBannerOverlay(ctx, solo.goalBannerText);
    }
  }

  function drawOnlineEntities(ctx: CanvasRenderingContext2D, now: number) {
    const st = deps.getState();
    const me = deps.getCurrentUser();
    const p1Member = st.members.find((m) => m.id === roomState.p1Id);
    const p2Member = st.members.find((m) => m.id === roomState.p2Id);

    // Waiting indicator if spectating during lobby
    if (roomState.status === 'lobby') {
      drawSoccerBall(ctx, 260, 180, 0);
      drawGoalBannerOverlay(ctx, `🟡 Chờ ${roomState.p1Name} bắt đầu trận...`);
      return;
    }

    drawSoccerBall(ctx, roomState.bx, roomState.by, bAngleOnline);

    if (p2Member) {
      drawDetailedChibiOnContext(
        ctx,
        {
          ...p2Member,
          x: roomState.p2x,
          y: roomState.p2y,
          dir: roomState.p2Dir,
          shirtColor: '#DC2626',
          speech: null
        },
        p2Member.id === me.id,
        0.82,
        true,
        roomState.p2Moving
      );
    }

    if (p1Member) {
      drawDetailedChibiOnContext(
        ctx,
        {
          ...p1Member,
          x: roomState.p1x,
          y: roomState.p1y,
          dir: roomState.p1Dir,
          shirtColor: '#2563EB',
          speech: null
        },
        p1Member.id === me.id,
        0.82,
        true,
        roomState.p1Moving
      );
    }

    if (now < (roomState.goalBannerUntil || 0)) {
      drawGoalBannerOverlay(ctx, roomState.goalBannerText);
    }
  }

  return {
    openSoccerArena,
    startMatch: openSoccerArena,
    restartSoloMatch: startSoloMatchInternal,
    stopMatch,
    kickBall,
    setTouchDir,
    handleKey,
    switchToSoloMode,
    switchTo2PMode,
    create2PRoom,
    join2PRoom,
    start2PMatch,
    leave2PRoom,
    spectateMatch,
    pullSoccerRoomFromFirebase,
    onRemoteSoccerRoomUpdate,
    onRemoteP2InputUpdate,
    getRoomState: () => roomState,
    isActive: () => active
  };
}
