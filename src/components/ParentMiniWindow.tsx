import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Check, Maximize2, MessageCircle, Minimize2, Move } from 'lucide-react';
import { B2KSBridge, B2KSState, Member } from '../types/b2ks';
import { normalizeFamilySlug } from '../game/constants';
import { getMemberPetBonuses } from '../game/petSystem';

interface Props {
  bridge: B2KSBridge;
}

interface MiniAlertItem {
  id: string;
  ts: number;
  kind: 'chat' | 'messenger' | 'request' | 'lobby';
  icon: string;
  title: string;
  detail: string;
  actionType?: 'parental' | 'messenger' | 'soccer';
}

function getCompactLocationText(member: Member, bridge: B2KSBridge): string {
  if (bridge.getMemberLocationLabel) {
    const full = bridge.getMemberLocationLabel(member);
    return full.replace(/^([^\s]+)\s+Ngoài phố:\s*/i, '$1 ');
  }
  if (member.scene === 'house') return '🏠 Trong nhà';
  if (member.scene === 'private_room') return '🛏️ Phòng riêng';
  return '🏘️ Khu phố';
}

function isChildMember(st: B2KSState, bridge: B2KSBridge, memberId?: string, memberName?: string): boolean {
  if (memberId) {
    const found = st.members.find((m) => m.id === memberId);
    if (found) return !bridge.isParent(found);
  }
  if (memberName) {
    const foundByName = st.members.find((m) => m.name === memberName);
    if (foundByName) return !bridge.isParent(foundByName);
  }
  return false;
}

function buildMiniAlerts(st: B2KSState, currentUserId: string, bridge: B2KSBridge): MiniAlertItem[] {
  const alerts: MiniAlertItem[] = [];
  const now = Date.now();
  const cutoff = now - 30 * 60 * 1000;

  // 1. Cross-world gift requests (kids only)
  (st.crossWorldRequests || [])
    .filter((r) => r.status === 'pending' && isChildMember(st, bridge, r.childId, r.childName))
    .forEach((r) => {
      alerts.push({
        id: `cw_${r.id}`,
        ts: r.createdAt || now,
        kind: 'request',
        icon: '🎁',
        title: `${r.childName} đổi ${r.itemIcon}${r.itemName}`,
        detail: `${r.pointsCost}⭐ → ${r.realValue}`,
        actionType: 'parental',
      });
    });

  // 2. Submitted homework / chores & completed family quests waiting approval (kids only)
  (st.tasks || []).forEach((t) => {
    if (t.status === 'submitted') {
      const assignee = st.members.find((m) => m.id === t.assigneeId);
      if (assignee && !bridge.isParent(assignee)) {
        alerts.push({
          id: `task_${t.id}`,
          ts: t.createdAt || now,
          kind: 'request',
          icon: t.type === 'homework' ? '📚' : '🧹',
          title: `${assignee.name}: ${t.title}`,
          detail: `Chờ duyệt (+${t.reward}⭐)`,
          actionType: 'parental',
        });
      }
    } else if (t.type === 'family_quest' && t.status !== 'completed') {
      const pIds = t.participantIds || [];
      const pMap = t.progressMap || {};
      if (pIds.length > 0 && pIds.every((id) => pMap[id] === 'done')) {
        alerts.push({
          id: `fq_${t.id}`,
          ts: t.createdAt || now,
          kind: 'request',
          icon: '🤝',
          title: `Đồng đội xong: ${t.title}`,
          detail: `Chờ duyệt (+${t.reward}⭐/bé)`,
          actionType: 'parental',
        });
      }
    }
  });

  // 3. Messenger messages sent by KIDS only (ignore parent messages)
  const famMsgs = (st.familyMessages || []) as Array<{
    id: string;
    senderId: string;
    senderName: string;
    toId?: string;
    recipientId?: string;
    text: string;
    ts: number;
  }>;
  famMsgs
    .filter(
      (m) =>
        m &&
        m.senderId !== currentUserId &&
        m.ts >= cutoff &&
        isChildMember(st, bridge, m.senderId, m.senderName)
    )
    .slice(-5)
    .forEach((m) => {
      const targetTag = m.toId === 'family' || m.recipientId === 'family_group' ? 'Nhóm' : 'Riêng';
      alerts.push({
        id: `msg_${m.id}`,
        ts: m.ts,
        kind: 'messenger',
        icon: '📱',
        title: `${m.senderName} (${targetTag})`,
        detail: m.text,
        actionType: 'messenger',
      });
    });

  // 4. Live map speech / chatHistory from KIDS only (ignore parent chats)
  const seenChat = new Set<string>();
  (st.chatHistory || [])
    .filter((c) => (c.ts || 0) >= cutoff && isChildMember(st, bridge, undefined, c.sender))
    .slice(-5)
    .forEach((c, idx) => {
      const key = `${c.sender}_${c.text}`;
      seenChat.add(key);
      alerts.push({
        id: `chat_${c.ts || idx}_${c.sender}`,
        ts: c.ts || now - (5 - idx) * 1000,
        kind: 'chat',
        icon: c.isEng ? '🇬🇧' : '💬',
        title: `${c.sender} nói`,
        detail: c.text,
      });
    });

  st.members
    .filter((m) => !bridge.isParent(m))
    .forEach((m) => {
      if (m.speech && m.speech.expiresAt > now) {
        const key = `${m.name}_${m.speech.text}`;
        if (!seenChat.has(key)) {
          alerts.push({
            id: `speech_${m.id}_${m.speech.expiresAt}`,
            ts: now,
            kind: 'chat',
            icon: m.speech.isEng ? '🇬🇧' : '💬',
            title: `${m.name} nói`,
            detail: m.speech.text,
          });
        }
      }
    });

  // 5. Check online soccer lobbies started by kids
  try {
    const slug = normalizeFamilySlug(st.familyName || 'B2KS');
    const soccerRaw =
      localStorage.getItem(`b2ks_soccer_online_room_${slug}`) ||
      localStorage.getItem('b2ks_soccer_online_room');
    if (soccerRaw) {
      const sRoom = JSON.parse(soccerRaw);
      if (
        sRoom &&
        sRoom.status === 'waiting' &&
        sRoom.hostId !== currentUserId &&
        now - (sRoom.updatedAt || 0) < 120000 &&
        isChildMember(st, bridge, sRoom.hostId, sRoom.hostName)
      ) {
        alerts.push({
          id: `soccer_${sRoom.id || 'room'}`,
          ts: sRoom.updatedAt || now,
          kind: 'lobby',
          icon: '⚽',
          title: `${sRoom.hostName || 'Bé'} chờ đá 2P`,
          detail: 'Sân bóng Online đang mở',
          actionType: 'soccer',
        });
      }
    }
  } catch {
    // ignore storage read error
  }

  return alerts.sort((a, b) => b.ts - a.ts).slice(0, 8);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const ParentMiniWindow: React.FC<Props> = ({ bridge }) => {
  const [miniMode, setMiniMode] = useState<'off' | 'floating' | 'pip'>('off');
  const [, setTick] = useState(0);
  const [lastSeenTs, setLastSeenTs] = useState<number>(() => Date.now());
  const lastSeenRef = useRef<number>(Date.now());
  const lastSoundTsRef = useRef<number>(Date.now());
  const [pos, setPos] = useState({ x: 12, y: 72 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 12,
    origY: 72,
  });
  const pipWinRef = useRef<Window | null>(null);

  const markAllSeen = () => {
    const now = Date.now();
    lastSeenRef.current = now;
    setLastSeenTs(now);
    if (pipWinRef.current && !pipWinRef.current.closed) {
      renderPipDom(pipWinRef.current);
    }
  };

  const restoreFullInterface = () => {
    if (pipWinRef.current && !pipWinRef.current.closed) {
      try {
        pipWinRef.current.close();
      } catch {
        // ignore
      }
    }
    pipWinRef.current = null;
    setMiniMode('off');
    document.body.classList.remove('parent-mini-minimized');
    bridge.playClick();
  };

  const renderPipDom = (pipWin: Window) => {
    const doc = pipWin.document;
    const container = doc.getElementById('pip-root');
    if (!container) return;

    const st = bridge.getState();
    const curUser = bridge.getCurrentUser();
    const presence = bridge.getMemberPresenceMap?.() || {};
    const pendingCW = st.crossWorldRequests.filter((r) => r.status === 'pending').length;
    const pendingTasks = st.tasks.filter((t) => {
      if (t.status === 'submitted') return true;
      if (t.type === 'family_quest' && t.status !== 'completed') {
        const pIds = t.participantIds || [];
        const pMap = t.progressMap || {};
        return pIds.length > 0 && pIds.every((id) => pMap[id] === 'done');
      }
      return false;
    }).length;

    const alerts = buildMiniAlerts(st, curUser.id, bridge);
    const unreadAlerts = alerts.filter((a) => a.ts > lastSeenRef.current);

    const alertsHtml =
      alerts.length > 0
        ? alerts
            .slice(0, 3)
            .map((a) => {
              const isNew = a.ts > lastSeenRef.current;
              return `
            <div style="background:${isNew ? '#FEF2F2' : '#FFFFFF'};border:1px solid ${isNew ? '#EF4444' : '#CBD5E1'};border-radius:6px;padding:3px 5px;font-size:10px;line-height:1.25;">
              <div style="display:flex;justify-content:space-between;gap:3px;font-weight:700;color:${isNew ? '#991B1B' : '#1E293B'};">
                <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.icon} ${escapeHtml(a.title)}</span>
                ${isNew ? '<span style="background:#EF4444;color:#FFF;border-radius:99px;padding:0 4px;font-size:8px;flex-shrink:0;">MỚI</span>' : ''}
              </div>
              <div style="color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.detail)}</div>
            </div>
          `;
            })
            .join('')
        : '<div style="font-size:10px;color:#64748B;text-align:center;padding:2px;">Các bé chưa có hoạt động mới.</div>';

    const cardsHtml = st.members
      .map((m) => {
        const online = presence[m.id]?.online ?? m.id === curUser.id;
        const dot = online ? '🟢' : '⚫';
        const petBonus = getMemberPetBonuses(m);
        return `
          <div style="background:#FFFFFF;border:1.5px solid #2C3E50;border-radius:7px;padding:3px 6px;display:flex;justify-content:space-between;align-items:center;gap:4px;">
            <div style="min-width:0;flex:1;">
              <div style="font-weight:700;font-size:10.5px;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${dot} ${escapeHtml(m.name)} <span style="font-size:9px;color:#0369A1;font-weight:600;">${escapeHtml(getCompactLocationText(m, bridge))}</span></div>
              ${petBonus.pet ? `<div style="font-size:9px;color:#7C3AED;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">🐾 ${escapeHtml(petBonus.pet.nickname)} (Lv.${petBonus.pet.level})</div>` : ''}
            </div>
            <div style="background:#FFE66D;border:1px solid #2C3E50;border-radius:99px;padding:1px 5px;font-weight:700;font-size:10px;color:#2C3E50;flex-shrink:0;">${m.points}⭐</div>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div style="font-family:system-ui,-apple-system,sans-serif;padding:6px;background:linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%);min-height:100vh;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:5px;border-bottom:1.5px solid #2C3E50;padding-bottom:4px;">
          <div style="font-weight:800;font-size:11px;color:#1E293B;display:flex;align-items:center;gap:3px;">
            <span>🪟 Mini</span>
            ${unreadAlerts.length > 0 ? `<span style="background:#EF4444;color:#FFF;border-radius:99px;padding:0 4px;font-size:9px;">${unreadAlerts.length}</span>` : ''}
          </div>
          <div style="display:flex;gap:3px;">
            ${unreadAlerts.length > 0 ? '<button id="pip-seen-btn" style="background:#E2E8F0;color:#1E293B;border:1px solid #2C3E50;border-radius:6px;padding:2px 5px;font-weight:700;font-size:9.5px;cursor:pointer;">✓</button>' : ''}
            <button id="pip-restore-btn" style="background:#0F766E;color:#FFF;border:1.5px solid #2C3E50;border-radius:6px;padding:2px 6px;font-weight:700;font-size:10px;cursor:pointer;">⛶ Full</button>
          </div>
        </div>
        ${
          pendingCW > 0 || pendingTasks > 0
            ? `<div style="background:#FEF2F2;border:1.5px solid #EF4444;border-radius:6px;padding:3px 5px;margin-bottom:4px;font-size:10px;font-weight:700;color:#991B1B;">🔔 Duyệt: ${pendingCW} quà • ${pendingTasks} việc</div>`
            : ''
        }
        <div style="margin-bottom:5px;">
          <div style="display:flex;flex-direction:column;gap:3px;max-height:76px;overflow-y:auto;">
            ${alertsHtml}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${cardsHtml}
        </div>
      </div>
    `;

    const restoreBtn = doc.getElementById('pip-restore-btn');
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        restoreFullInterface();
      };
    }
    const seenBtn = doc.getElementById('pip-seen-btn');
    if (seenBtn) {
      seenBtn.onclick = () => {
        markAllSeen();
      };
    }
  };

  const openMiniWindow = async () => {
    const user = bridge.getCurrentUser();
    if (!bridge.isParent(user)) {
      bridge.requestParentAccess(() => {
        void activateMiniWindow();
      });
      return;
    }
    await activateMiniWindow();
  };

  const activateMiniWindow = async () => {
    bridge.playClick();
    const now = Date.now() - 8000;
    lastSeenRef.current = now;
    setLastSeenTs(now);
    lastSoundTsRef.current = Date.now();

    const docPip = (
      window as unknown as {
        documentPictureInPicture?: {
          requestWindow: (opts: { width: number; height: number }) => Promise<Window>;
        };
      }
    ).documentPictureInPicture;

    if (docPip && typeof docPip.requestWindow === 'function') {
      try {
        const pipWin = await docPip.requestWindow({ width: 230, height: 260 });
        pipWinRef.current = pipWin;
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.innerHTML = '<div id="pip-root"></div>';
        renderPipDom(pipWin);
        pipWin.addEventListener('pagehide', () => {
          pipWinRef.current = null;
          setMiniMode('off');
          document.body.classList.remove('parent-mini-minimized');
        });
        setMiniMode('pip');
        document.body.classList.add('parent-mini-minimized');
        bridge.showToast('🪟 Đã thu nhỏ thành Mini Window gọn Always-On-Top!');
        return;
      } catch {
        // Fallback smoothly to compact in-page floating mini window
      }
    }

    setMiniMode('floating');
    document.body.classList.add('parent-mini-minimized');
    bridge.showToast('🪟 Đã bật Mini Window siêu gọn nổi trên cùng!');
  };

  useEffect(() => {
    window.__OPEN_PARENT_MINI__ = () => {
      void openMiniWindow();
    };
    const checkAndSync = () => {
      setTick((t) => t + 1);
      if (miniMode !== 'off') {
        const st = bridge.getState();
        const curUser = bridge.getCurrentUser();
        const alerts = buildMiniAlerts(st, curUser.id, bridge);
        const newestTs = alerts[0]?.ts || 0;
        if (newestTs > lastSoundTsRef.current && newestTs > lastSeenRef.current) {
          lastSoundTsRef.current = newestTs;
          bridge.playCoin();
        }
      }
      if (pipWinRef.current && !pipWinRef.current.closed) {
        renderPipDom(pipWinRef.current);
      }
    };
    const unsub = bridge.subscribe(checkAndSync);
    const timer = window.setInterval(checkAndSync, 1000);

    return () => {
      unsub();
      window.clearInterval(timer);
      document.body.classList.remove('parent-mini-minimized');
    };
  }, [bridge, miniMode]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const nx = Math.max(4, Math.min(window.innerWidth - 220, dragRef.current.origX + (e.clientX - dragRef.current.startX)));
      const ny = Math.max(4, Math.min(window.innerHeight - 140, dragRef.current.origY + (e.clientY - dragRef.current.startY)));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  if (miniMode === 'off') return null;

  const st = bridge.getState();
  const curUser = bridge.getCurrentUser();
  const presenceMap = bridge.getMemberPresenceMap?.() || {};
  const pendingCW = st.crossWorldRequests.filter((r) => r.status === 'pending').length;
  const pendingTasks = st.tasks.filter((t) => {
    if (t.status === 'submitted') return true;
    if (t.type === 'family_quest' && t.status !== 'completed') {
      const pIds = t.participantIds || [];
      const pMap = t.progressMap || {};
      return pIds.length > 0 && pIds.every((id) => pMap[id] === 'done');
    }
    return false;
  }).length;
  const alerts = buildMiniAlerts(st, curUser.id, bridge);
  const unreadAlerts = alerts.filter((a) => a.ts > lastSeenTs);

  if (miniMode === 'pip') {
    return (
      <div className="fixed inset-0 z-[9990] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
        <div className="pixel-box max-w-xs w-full p-4 text-center space-y-2.5 bg-white">
          <div className="w-10 h-10 rounded-xl bg-sky-100 border-2 border-[#2C3E50] flex items-center justify-center mx-auto">
            <Minimize2 className="w-5 h-5 text-sky-700" />
          </div>
          <h3 className="font-bold text-sm text-[#2C3E50]">
            🪟 Mini Monitor Always-On-Top
          </h3>
          <p className="text-[11px] text-slate-600">
            Đang theo dõi trạng thái Online/Offline &amp; hoạt động của các bé ở cửa sổ nổi.
          </p>
          <button
            type="button"
            onClick={restoreFullInterface}
            className="btn btn-primary w-full justify-center py-2 text-xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Quay lại Full Game</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[9999] w-[215px] max-w-[90vw] pixel-box bg-gradient-to-b from-sky-50 to-white shadow-2xl border-[2.5px] border-[#2C3E50] overflow-hidden"
    >
      <div
        onPointerDown={(e) => {
          dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: pos.x,
            origY: pos.y,
          };
        }}
        className="bg-[#2C3E50] text-white px-2 py-1 flex items-center justify-between gap-1 cursor-move select-none"
      >
        <div className="flex items-center gap-1 font-bold text-[10.5px] min-w-0">
          <Move className="w-3 h-3 text-amber-300 shrink-0" />
          <span className="truncate">🪟 Mini</span>
          {unreadAlerts.length > 0 && (
            <span className="px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold animate-pulse">
              {unreadAlerts.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={restoreFullInterface}
          className="px-1.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-0.5 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-2.5 h-2.5" />
          <span>Full</span>
        </button>
      </div>

      <div className="p-1.5 space-y-1 max-h-[42dvh] overflow-y-auto">
        {(pendingCW > 0 || pendingTasks > 0) && (
          <div className="rounded bg-rose-50 border border-rose-400 px-1.5 py-0.5 flex items-center justify-between gap-1 text-[10px] font-bold text-rose-800">
            <span className="flex items-center gap-1 truncate">
              <BellRing className="w-3 h-3 text-rose-600 shrink-0" />
              {pendingCW} quà · {pendingTasks} việc
            </span>
            <button
              type="button"
              onClick={() => {
                restoreFullInterface();
                bridge.openReactModal('parental_dashboard');
              }}
              className="underline text-rose-700 cursor-pointer shrink-0"
            >
              Duyệt
            </button>
          </div>
        )}

        {/* Kids-only Notification Feed */}
        <div className="rounded-lg border border-sky-300 bg-white p-1 space-y-1">
          <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-600">
            <span className="flex items-center gap-1 truncate">
              <MessageCircle className="w-3 h-3 text-sky-600 shrink-0" />
              Tin của bé ({alerts.length})
            </span>
            {unreadAlerts.length > 0 && (
              <button
                type="button"
                onClick={markAllSeen}
                className="inline-flex items-center gap-0.5 px-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] font-bold cursor-pointer"
              >
                <Check className="w-2.5 h-2.5" />
                <span>Xem</span>
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="text-[9.5px] text-slate-400 text-center py-0.5">
              Bé chưa có tin/chat mới.
            </div>
          ) : (
            <div className="space-y-0.5 max-h-20 overflow-y-auto pr-0.5">
              {alerts.slice(0, 4).map((a) => {
                const isNew = a.ts > lastSeenTs;
                return (
                  <div
                    key={a.id}
                    onClick={() => {
                      if (a.actionType === 'parental') {
                        restoreFullInterface();
                        bridge.openReactModal('parental_dashboard');
                      } else if (a.actionType === 'messenger') {
                        restoreFullInterface();
                        window.openSmartphoneModal?.('messenger');
                      }
                    }}
                    className={`rounded border px-1.5 py-0.5 text-[9.5px] leading-tight transition-colors ${
                      isNew
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    } ${a.actionType ? 'cursor-pointer hover:bg-sky-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1 font-bold">
                      <span className="truncate">
                        {a.icon} {a.title}
                      </span>
                      {isNew && (
                        <span className="px-1 rounded-full bg-rose-600 text-white text-[8px] shrink-0">
                          MỚI
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-600 truncate">{a.detail}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Member Status List with Online/Offline */}
        <div className="space-y-1">
          {st.members.map((m) => {
            const isOnline = presenceMap[m.id]?.online ?? m.id === curUser.id;
            return (
              <div
                key={m.id}
                className="rounded-lg border border-[#2C3E50] bg-white px-1.5 py-1 flex items-center justify-between gap-1.5"
                title={`${m.name} (${m.role}) • ${isOnline ? 'Đang Online' : 'Offline'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[10.5px] text-[#2C3E50] flex items-center gap-1 truncate">
                    <span className="text-[9px] shrink-0">{isOnline ? '🟢' : '⚫'}</span>
                    <span className="truncate">{m.name}</span>
                  </div>
                  <div className="text-[9.5px] text-sky-700 font-semibold truncate leading-tight">
                    {getCompactLocationText(m, bridge)}
                  </div>
                </div>
                <div className="px-1.5 py-0.5 rounded-full bg-amber-200 border border-[#2C3E50] text-[9.5px] font-extrabold text-[#2C3E50] shrink-0 tabular-nums">
                  {m.points}⭐
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
