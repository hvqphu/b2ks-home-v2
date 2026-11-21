import React, { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import JSZip from 'jszip';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Compass,
  Download,
  Eye,
  Gift,
  GraduationCap,
  History,
  KeyRound,
  MapPin,
  Music2,
  PawPrint,
  RefreshCw,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Upload,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  ActivityConfigId,
  ActivityConfigItem,
  B2KSBridge,
  BgmThemeId,
  BuildingLayoutOverride,
  BuildingShape,
  CrossWorldRequest,
  OtherFamilySummary,
} from '../types/b2ks';
import {
  BGM_THEME_OPTIONS,
  BUILDING_SHAPE_OPTIONS,
  DEFAULT_ACTIVITY_CONFIGS,
  DEFAULT_MEMBER_AGES,
  NEIGHBORHOOD_LOCATIONS,
  PET_ACCESSORY_CATALOG,
  PET_FOOD_CATALOG,
  PET_SPECIES,
  PET_VARIANT_DEFS,
  STREET_WORLD,
  formatFamilyBrand,
} from '../game/constants';
import {
  getMemberPetBonuses,
  getPetAccessoryDef,
  getPetSpecies,
  getPetVariantDef,
  renderPetArtSVG,
} from '../game/petSystem';
import {
  exportEnglishBankToCsv,
  GLOBAL_SUCCESS_UNITS,
  parseEnglishBankCsv,
} from '../game/englishCurriculum';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

export const ParentalDashboardModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [tab, setTab] = useState<'charts' | 'rewards' | 'quests' | 'english' | 'activities' | 'family_map' | 'pets' | 'logs'>('charts');
  const [, setTick] = useState(0);
  const [pointInputs, setPointInputs] = useState<Record<string, string>>({});
  const [pointReasons, setPointReasons] = useState<Record<string, string>>({});

  // Family & Map Editor state
  const [familyNameDraft, setFamilyNameDraft] = useState(() => bridge.getFamilyName?.() || bridge.getState().familyName || 'B2KS');
  const [gamePwDraft, setGamePwDraft] = useState(() => bridge.getState().gamePassword || '1111');
  const [parentPinDraft, setParentPinDraft] = useState(() => bridge.getState().parentPin || '1234');
  const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, { name: string; age: string; role: string }>>(() => {
    const out: Record<string, { name: string; age: string; role: string }> = {};
    bridge.getState().members.forEach((m) => {
      out[m.id] = {
        name: m.name,
        age: String(m.age ?? DEFAULT_MEMBER_AGES[m.id] ?? 12),
        role: m.role || 'Con gái',
      };
    });
    return out;
  });
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Bố' | 'Mẹ' | 'Con gái' | 'Con trai'>('Con gái');
  const [newMemberAge, setNewMemberAge] = useState('10');
  const [confirmDeleteMemberId, setConfirmDeleteMemberId] = useState<string | null>(null);
  const [otherFamilies, setOtherFamilies] = useState<OtherFamilySummary[]>([]);
  const [loadingOtherFamilies, setLoadingOtherFamilies] = useState(false);
  const [otherFamiliesLoadedOnce, setOtherFamiliesLoadedOnce] = useState(false);
  const [draftLayouts, setDraftLayouts] = useState<Record<string, BuildingLayoutOverride>>(() => ({
    ...(bridge.getState().buildingLayouts || {}),
  }));
  const [selectedLocId, setSelectedLocId] = useState<string>('house');
  const [refreshingWeather, setRefreshingWeather] = useState(false);
  const draggingLocRef = useRef<string | null>(null);
  const mapBoardRef = useRef<HTMLDivElement | null>(null);

  // Family Quest form state
  const [questTitle, setQuestTitle] = useState('');
  const [questReward, setQuestReward] = useState(30);

  // Shared Global Success English Bank Summary + CSV state
  const [selectedEngGrade, setSelectedEngGrade] = useState<6 | 7 | 8 | 9>(6);
  const [csvImportMode, setCsvImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmResetBank, setConfirmResetBank] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  const completionChartRef = useRef<HTMLCanvasElement | null>(null);
  const englishChartRef = useRef<HTMLCanvasElement | null>(null);

  const state = bridge.getState();
  const user = bridge.getCurrentUser();
  const isB2KSFamily = (bridge.getActiveFamilySlug?.() || 'b2ks') === 'b2ks';
  const sharedEnglishBank = bridge.getGlobalEnglishBank?.() || state.englishQuestions || [];
  const kids = state.members.filter((m) => !bridge.isParent(m));
  const pendingRequests = state.crossWorldRequests.filter((r) => r.status === 'pending');

  useEffect(() => {
    if (!isB2KSFamily && tab === 'activities') {
      setTab('charts');
    }
  }, [isB2KSFamily, tab]);

  const mergedActivityConfigs = useMemo(() => {
    const out = { ...DEFAULT_ACTIVITY_CONFIGS };
    if (state.activityConfigs) {
      (Object.keys(DEFAULT_ACTIVITY_CONFIGS) as ActivityConfigId[]).forEach((k) => {
        if (state.activityConfigs && state.activityConfigs[k]) {
          out[k] = { ...DEFAULT_ACTIVITY_CONFIGS[k], ...state.activityConfigs[k] };
        }
      });
    }
    return out;
  }, [state.activityConfigs, tab]);

  const [draftConfigs, setDraftConfigs] = useState<Record<ActivityConfigId, ActivityConfigItem>>(mergedActivityConfigs);

  useEffect(() => {
    setDraftConfigs(mergedActivityConfigs);
  }, [mergedActivityConfigs]);

  const handleAdjustKidPoints = (kidId: string, nextPointsRaw: number, reasonText?: string) => {
    const kid = state.members.find((m) => m.id === kidId);
    if (!kid) return;
    const prev = kid.points;
    const nextPoints = Math.max(0, Math.round(nextPointsRaw));
    const delta = nextPoints - prev;
    if (delta === 0) return;
    const now = Date.now();
    kid.points = nextPoints;
    kid.adminPointsUpdatedAt = now;
    kid.memberUpdatedAt = now;
    const reason = (reasonText || '').trim();
    state.activityLogs.unshift({
      id: `log_admin_${now}_${kid.id}`,
      memberId: kid.id,
      memberName: kid.name,
      action: 'admin_points',
      detail: `${user.name} điều chỉnh điểm: ${prev}⭐ → ${nextPoints}⭐ (${delta > 0 ? '+' : ''}${delta}⭐)${reason ? ` — Lý do: ${reason}` : ''}`,
      ts: now,
      pointsDelta: delta,
    });
    if (state.activityLogs.length > 200) state.activityLogs.length = 200;
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playClick();
    bridge.showToast(
      `⚖️ Đã cập nhật điểm của ${kid.name}: ${nextPoints}⭐ (${delta > 0 ? `+${delta}` : delta}⭐)`
    );
    forceRefresh();
  };

  const handleSaveActivityConfigs = () => {
    const sanitized = { ...DEFAULT_ACTIVITY_CONFIGS };
    (Object.keys(DEFAULT_ACTIVITY_CONFIGS) as ActivityConfigId[]).forEach((k) => {
      const d = draftConfigs[k] || DEFAULT_ACTIVITY_CONFIGS[k];
      sanitized[k] = {
        ...DEFAULT_ACTIVITY_CONFIGS[k],
        ...d,
        reward: Math.max(0, Math.min(200, Math.round(Number(d.reward) || 0))),
        cooldownMs:
          d.cooldownMs !== undefined
            ? Math.max(0, Math.min(3600000, Math.round(Number(d.cooldownMs) || 0)))
            : undefined,
        maxPerDay:
          d.maxPerDay !== undefined
            ? Math.max(1, Math.min(200, Math.round(Number(d.maxPerDay) || 1)))
            : undefined,
      };
    });
    state.activityConfigs = sanitized;
    state.activityConfigsUpdatedAt = Date.now();
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playSuccess();
    bridge.showToast('💾 Đã lưu cấu hình hoạt động & điểm thưởng!');
    forceRefresh();
  };

  const forceRefresh = () => setTick((t) => t + 1);

  // Build 7-day labels (Mon..Sun or last 7 days)
  const weeklyData = useMemo(() => {
    const days: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      days.push({
        key: d.toDateString(),
        label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
      });
    }

    const taskRatesByKid = kids.map((kid, idx) => {
      const colors = ['#FF6B6B', '#4ECDC4', '#F59E0B', '#8B5CF6'];
      const values = days.map((day) => {
        const assigned = state.tasks.filter((t) => {
          const isForKid = t.assigneeId === kid.id || (t.participantIds || []).includes(kid.id);
          const createdDay = new Date(t.createdAt || t.id).toDateString();
          return isForKid && createdDay === day.key;
        });
        if (assigned.length === 0) {
          // Check activity logs on that day for fallback
          const doneLogs = state.activityLogs.filter(
            (l) =>
              l.memberId === kid.id &&
              (l.action === 'task_done' || l.action === 'quest_part') &&
              new Date(l.ts).toDateString() === day.key
          );
          return doneLogs.length > 0 ? 100 : 0;
        }
        const doneCount = assigned.filter((t) => t.status === 'completed').length;
        return Math.round((doneCount / assigned.length) * 100);
      });
      return {
        label: kid.name,
        data: values,
        backgroundColor: colors[idx % colors.length],
        borderColor: colors[idx % colors.length],
      };
    });

    const englishScoresByKid = kids.map((kid, idx) => {
      const colors = ['#E11D48', '#0284C7', '#D97706', '#7C3AED'];
      const hist = kid.englishQuizHistory || [];
      const values = days.map((day) => {
        const dayRecords = hist.filter((h) => h.date === day.key);
        if (dayRecords.length === 0) return 0;
        const avgPct =
          dayRecords.reduce((acc, cur) => acc + (cur.score / Math.max(1, cur.total)) * 10, 0) /
          dayRecords.length;
        return Number(avgPct.toFixed(1));
      });
      return {
        label: `${kid.name} (Thang 10)`,
        data: values,
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length],
        tension: 0.3,
      };
    });

    return {
      labels: days.map((d) => d.label),
      taskRatesByKid,
      englishScoresByKid,
    };
  }, [kids, state.tasks, state.activityLogs]);

  useEffect(() => {
    if (tab !== 'charts') return;
    let c1: Chart | null = null;
    let c2: Chart | null = null;

    if (completionChartRef.current) {
      c1 = new Chart(completionChartRef.current, {
        type: 'bar',
        data: {
          labels: weeklyData.labels,
          datasets: weeklyData.taskRatesByKid,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: '% Hoàn thành' } },
          },
          plugins: {
            title: { display: true, text: 'Tỷ lệ hoàn thành nhiệm vụ theo tuần (%)' },
          },
        },
      });
    }

    if (englishChartRef.current) {
      c2 = new Chart(englishChartRef.current, {
        type: 'line',
        data: {
          labels: weeklyData.labels,
          datasets: weeklyData.englishScoresByKid,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 10, title: { display: true, text: 'Điểm TB (0-10)' } },
          },
          plugins: {
            title: { display: true, text: 'Điểm Tiếng Anh trung bình theo tuần' },
          },
        },
      });
    }

    return () => {
      c1?.destroy();
      c2?.destroy();
    };
  }, [tab, weeklyData]);

  // Rapid completion detection (< 60s between consecutive task completions by same kid)
  const rapidAlertIds = useMemo(() => {
    const flagged = new Set<string>();
    const lastByMember: Record<string, number> = {};
    // Process ascending by timestamp
    const sorted = [...state.activityLogs]
      .filter((l) => l.action === 'task_done' || l.action === 'quest_part')
      .sort((a, b) => a.ts - b.ts);

    sorted.forEach((entry) => {
      const prevTs = lastByMember[entry.memberId];
      if (prevTs && entry.ts - prevTs < 60000) {
        flagged.add(entry.id);
      }
      lastByMember[entry.memberId] = entry.ts;
    });
    return flagged;
  }, [state.activityLogs]);

  const handleApproveRequest = (req: CrossWorldRequest) => {
    req.status = 'approved';
    req.approvedAt = Date.now();
    req.approvedBy = user.name;
    bridge.syncCrossWorldRequestsToFirebase(state.crossWorldRequests);
    bridge.saveGame(true);
    bridge.playSuccess();
    bridge.triggerConfetti();
    bridge.showToast(`✅ Đã duyệt trao thưởng "${req.itemName}" cho ${req.childName}!`);
    forceRefresh();
  };

  const handleRejectRequest = (req: CrossWorldRequest) => {
    req.status = 'rejected';
    req.approvedAt = Date.now();
    req.approvedBy = user.name;
    const child = state.members.find((m) => m.id === req.childId);
    if (child) {
      child.points += req.pointsCost;
    }
    bridge.syncCrossWorldRequestsToFirebase(state.crossWorldRequests);
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playClick();
    bridge.showToast(`↩️ Đã hoàn lại +${req.pointsCost}⭐ cho ${req.childName}.`);
    forceRefresh();
  };

  const handleCreateFamilyQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim()) {
      bridge.playError();
      bridge.showToast('⚠️ Nhập tên Nhiệm Vụ Đồng Đội!');
      return;
    }
    const participantIds = kids.map((k) => k.id);
    if (participantIds.length < 2) {
      bridge.playError();
      bridge.showToast('⚠️ Cần ít nhất 2 bé để giao Nhiệm Vụ Đồng Đội!');
      return;
    }
    const reward = Math.max(5, Number(questReward) || 30);
    const totalCost = reward * participantIds.length;
    if (user.points < totalCost) {
      bridge.playError();
      bridge.showToast(`❌ Cần ${totalCost}⭐ ngân sách (${reward}⭐/bé)!`);
      return;
    }

    user.points -= totalCost;
    const progressMap: Record<string, 'pending' | 'done'> = {};
    participantIds.forEach((id) => {
      progressMap[id] = 'pending';
    });

    state.tasks.push({
      id: Date.now(),
      type: 'family_quest',
      title: questTitle.trim(),
      creatorId: user.id,
      assigneeId: participantIds[0],
      participantIds,
      progressMap,
      reward,
      status: 'pending',
      createdAt: Date.now(),
      completedAt: null,
    });

    setQuestTitle('');
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playSuccess();
    bridge.triggerSpeechBubble(user, `Nhiệm vụ đồng đội mới: ${questTitle.trim()}! 🤝`, false);
    bridge.showToast(`🤝 Đã giao Nhiệm Vụ Đồng Đội (+${reward}⭐ mỗi bé khi cả hai hoàn thành)!`);
    forceRefresh();
  };

  const handleApproveFamilyQuest = (taskId: number) => {
    const t = state.tasks.find((x) => x.id === taskId);
    if (!t || t.status === 'completed') return;
    const now = Date.now();
    t.status = 'completed';
    t.completedAt = now;
    (t.participantIds || []).forEach((pid) => {
      const m = state.members.find((x) => x.id === pid);
      if (m) {
        const pb = getMemberPetBonuses(m);
        m.points += t.reward + pb.starBonus;
        m.pointsUpdatedAt = now;
        m.memberUpdatedAt = now;
      }
    });
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playCoin();
    bridge.triggerConfetti();
    bridge.showToast(`🎉 Nhiệm vụ Đồng đội hoàn tất! Mỗi bé nhận +${t.reward}⭐ (+thưởng Thú cưng nếu có)!`);
    forceRefresh();
  };

  const handleExportEnglishCsv = () => {
    const csvContent = exportEnglishBankToCsv(sharedEnglishBank);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `b2ks-english-bank-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    bridge.playSuccess();
    bridge.showToast(`📤 Đã xuất ${sharedEnglishBank.length} câu hỏi Tiếng Anh ra file CSV (UTF-8)!`);
  };

  const handleImportEnglishCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseEnglishBankCsv(text);
      if (parsed.questions.length === 0) {
        bridge.playError();
        bridge.showToast('⚠️ File CSV không có câu hỏi hợp lệ nào! Kiểm tra lại các cột id,grade,unit,cat,q,optA..D,ans,exp.');
        return;
      }
      const res = bridge.importEnglishBankQuestions?.(parsed.questions, csvImportMode);
      if (res) {
        bridge.showToast(res.msg + (parsed.errors > 0 ? ` (Bỏ qua ${parsed.errors} dòng lỗi)` : ''));
        if (res.ok) bridge.playSuccess();
        else bridge.playError();
        forceRefresh();
      }
    } catch {
      bridge.playError();
      bridge.showToast('❌ Không thể đọc file CSV đã chọn!');
    }
  };

  const [downloadingZip, setDownloadingZip] = useState(false);

  const handleDownloadGithubZip = async () => {
    if (downloadingZip) return;
    setDownloadingZip(true);
    bridge.playClick();
    bridge.showToast('⏳ Đang chuẩn bị file b2ks-daily-routines-github.zip...');
    try {
      let zipBlob: Blob | null = null;

      for (const candidate of ['./b2ks-daily-routines-github.zip', '../public/b2ks-daily-routines-github.zip']) {
        try {
          const res = await fetch(candidate, { cache: 'no-store' });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            if (bytes.length > 100 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
              zipBlob = new Blob([buf], { type: 'application/zip' });
              break;
            }
          }
        } catch {
          // try next candidate
        }
      }

      if (!zipBlob) {
        let jsonRes: Response | null = null;
        for (const candidate of ['./b2ks-source-bundle.json', '../public/b2ks-source-bundle.json']) {
          try {
            const r = await fetch(candidate, { cache: 'no-store' });
            if (r.ok) {
              jsonRes = r;
              break;
            }
          } catch {
            // try next candidate
          }
        }
        if (!jsonRes) throw new Error('Không tải được dữ liệu đóng gói ZIP');
        const bundle = (await jsonRes.json()) as {
          files: Array<{ path: string; encoding: 'utf8' | 'base64'; content: string }>;
        };
        const zip = new JSZip();
        bundle.files.forEach((f) => {
          if (f.encoding === 'base64') {
            zip.file(f.path, f.content, { base64: true });
          } else {
            zip.file(f.path, f.content);
          }
        });
        zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
          mimeType: 'application/zip',
        });
      }

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'b2ks-daily-routines-github.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      bridge.playSuccess();
      bridge.showToast('📦 Đã tải xuống file b2ks-daily-routines-github.zip!');
    } catch {
      bridge.playError();
      bridge.showToast('❌ Lỗi tải file ZIP. Hãy mở trực tiếp tab mới (không qua iframe) và thử lại!');
    } finally {
      setDownloadingZip(false);
    }
  };

  const familyBrand = bridge.getFamilyName?.() || state.familyName || 'B2KS';
  const weatherInfo = bridge.getWeatherInfo?.() || null;
  const activeBgmTheme = bridge.getBgmTheme?.() || state.bgmTheme || 'sunny_town';
  const isMuted = bridge.isAudioMuted?.() ?? false;

  const previewLocations = useMemo(() => {
    const base = bridge.getResolvedLocations?.() || NEIGHBORHOOD_LOCATIONS;
    return base.map((loc) => {
      const ov = draftLayouts[loc.id];
      return {
        ...loc,
        x: typeof ov?.x === 'number' ? ov.x : loc.x,
        y: typeof ov?.y === 'number' ? ov.y : loc.y,
        shape: (ov?.shape || loc.shape || 'classic') as BuildingShape,
      };
    });
  }, [bridge, draftLayouts, tab]);

  const selectedLocation =
    previewLocations.find((l) => l.id === selectedLocId) || previewLocations[0];

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dragId = draggingLocRef.current;
    if (!dragId || !mapBoardRef.current) return;
    const rect = mapBoardRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const relX = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0.16, Math.min(0.92, (e.clientY - rect.top) / rect.height));
    const worldX = Math.round(relX * STREET_WORLD.width);
    const worldY = Math.round(relY * STREET_WORLD.height);
    setDraftLayouts((prev) => ({
      ...prev,
      [dragId]: {
        ...(prev[dragId] || {}),
        x: worldX,
        y: worldY,
      },
    }));
  };

  const handleSaveBuildingLayouts = () => {
    bridge.setBuildingLayouts?.(draftLayouts);
    bridge.playSuccess();
    bridge.showToast('🗺️ Đã lưu vị trí & hình dáng các công trình (tự đồng bộ minimap)!');
    forceRefresh();
  };

  const handleResetBuildingLayouts = () => {
    setDraftLayouts({});
    bridge.resetBuildingLayouts?.();
    bridge.playClick();
    bridge.showToast('↺ Đã khôi phục vị trí & hình dáng mặc định của các công trình!');
    forceRefresh();
  };

  const loadOtherFamilies = async () => {
    if (!bridge.fetchOtherFamiliesDirectory) return;
    setLoadingOtherFamilies(true);
    try {
      const list = await bridge.fetchOtherFamiliesDirectory();
      setOtherFamilies(list);
      setOtherFamiliesLoadedOnce(true);
    } finally {
      setLoadingOtherFamilies(false);
    }
  };

  useEffect(() => {
    if (tab === 'family_map' && !otherFamiliesLoadedOnce) {
      loadOtherFamilies();
    }
  }, [tab, otherFamiliesLoadedOnce]);

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 p-3">
      <div className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#F8FAFC] text-[#2C3E50] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1E293B] to-[#0F766E] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {formatFamilyBrand('Bảng Điều Khiển Phụ Huynh B2KS', familyBrand)}
              </h2>
              <p className="text-xs text-teal-100">
                MK vào game: <code className="bg-black/25 px-1.5 py-0.2 rounded font-bold">{state.gamePassword || '1111'}</code>
                {' · '}PIN Phụ huynh: <code className="bg-black/25 px-1.5 py-0.2 rounded font-bold">{state.parentPin || '1234'}</code>
                {weatherInfo ? ` · ${weatherInfo.icon} ${weatherInfo.tempC}°C (${weatherInfo.label})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white text-[#2C3E50] hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 bg-slate-200 border-b-2 border-[#2C3E50]">
          <button
            type="button"
            onClick={() => setTab('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'charts' ? 'bg-[#0F766E] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Biểu Đồ &amp; Đua Top
          </button>
          <button
            type="button"
            onClick={() => setTab('rewards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'rewards' ? 'bg-[#D97706] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Duyệt Đổi Quà
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('quests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'quests' ? 'bg-[#7C3AED] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Nhiệm Vụ Đồng Đội
          </button>
          <button
            type="button"
            onClick={() => setTab('english')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'english' ? 'bg-[#0284C7] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Ngân Hàng Tiếng Anh ({sharedEnglishBank.length})
          </button>
          {isB2KSFamily && (
            <button
              type="button"
              onClick={() => setTab('activities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                tab === 'activities' ? 'bg-[#E11D48] text-white' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Hoạt Động &amp; Điểm
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('family_map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'family_map' ? 'bg-[#2563EB] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Gia Đình &amp; Bản Đồ
          </button>
          <button
            type="button"
            onClick={() => setTab('pets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'pets' ? 'bg-[#9333EA] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <PawPrint className="w-3.5 h-3.5" />
            Sổ Tay Thú Cưng
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              tab === 'logs' ? 'bg-[#334155] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Nhật Ký &amp; Xuất ZIP
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'charts' && (
            <>
              {/* Friendly Sibling Leaderboard */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50 p-3.5">
                <h3 className="text-sm font-bold text-amber-900 mb-2.5">
                  🏆 Bảng Đua Top Nhẹ Gia Đình (Khuyến khích thi đua lành mạnh)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...kids]
                    .sort((a, b) => b.points - a.points)
                    .map((kid, idx) => {
                      const doneTasks = state.tasks.filter(
                        (t) =>
                          t.status === 'completed' &&
                          (t.assigneeId === kid.id || (t.participantIds || []).includes(kid.id))
                      ).length;
                      const zooCount = (kid.unlockedZooAnimals || []).length;
                      return (
                        <div
                          key={kid.id}
                          className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl">{idx === 0 ? '🥇' : '🥈'}</span>
                              <div>
                                <div className="font-bold text-sm">{kid.name}</div>
                                <div className="text-xs text-slate-500">
                                  Việc xong: {doneTasks} · Sở thú: {zooCount} loài
                                </div>
                              </div>
                            </div>
                            <span className="text-base font-bold text-amber-600 tabular-nums">
                              {kid.points}⭐
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                            {([6, 7, 8, 9] as const).map((g) => {
                              const prog = kid.englishProgress?.[g] || { unit: 1, highScoreStreak: 0 };
                              return (
                                <span
                                  key={g}
                                  className="px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[10px] font-bold text-sky-900"
                                  title={`Lớp ${g}: Đang học Unit ${prog.unit}/12 (Chuỗi >8đ: ${prog.highScoreStreak}/3)`}
                                >
                                  📘 L{g}: U.{prog.unit} ({prog.highScoreStreak}/3)
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Chart.js Weekly Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 h-64">
                  <canvas ref={completionChartRef} />
                </div>
                <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 h-64">
                  <canvas ref={englishChartRef} />
                </div>
              </div>
            </>
          )}

          {tab === 'rewards' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                Khi bé đổi quà tại <strong>Trung Tâm Giao Dịch Xuyên Thế Giới</strong>, yêu cầu sẽ hiển thị tại đây. Sau khi Bố/Mẹ trao tiền mặt hoặc đặc quyền ngoài đời thực, hãy bấm <strong>Duyệt</strong>!
              </div>
              {state.crossWorldRequests.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500">
                  Chưa có yêu cầu đổi quà nào.
                </div>
              ) : (
                state.crossWorldRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{req.itemIcon}</span>
                      <div>
                        <div className="font-bold text-sm">
                          {req.childName} muốn đổi: {req.itemName}
                        </div>
                        <div className="text-xs text-slate-600">
                          Giá trị thực: <strong>{req.realValue}</strong> · Đã trừ:{' '}
                          <strong>{req.pointsCost}⭐</strong> ·{' '}
                          {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(req)}
                          className="btn btn-sm"
                          style={{ background: '#16A34A' }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Duyệt (Đã trao quà)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(req)}
                          className="btn btn-sm btn-danger"
                        >
                          ↩️ Hoàn điểm
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {req.status === 'approved'
                          ? `✅ Đã duyệt (${req.approvedBy || 'Phụ huynh'})`
                          : '❌ Đã hoàn điểm'}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'quests' && (
            <div className="space-y-4">
              <form
                onSubmit={handleCreateFamilyQuest}
                className="rounded-xl border-2 border-[#2C3E50] bg-violet-50 p-3.5 space-y-3"
              >
                <h3 className="font-bold text-sm text-violet-900">
                  🤝 Giao Nhiệm Vụ Đồng Đội (Yêu cầu cả hai bé cùng hoàn thành)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="VD: Hai chị em cùng dọn sạch phòng khách"
                    value={questTitle}
                    onChange={(e) => setQuestTitle(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-sm"
                  />
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={questReward}
                    onChange={(e) => setQuestReward(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-sm"
                    title="Điểm thưởng cho mỗi bé"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-violet-800">
                  <span>
                    Áp dụng cho: <strong>{kids.map((k) => k.name).join(' + ')}</strong> (Mỗi bé +{questReward}⭐)
                  </span>
                  <button type="submit" className="btn btn-sm btn-purple">
                    🤝 Phát Nhiệm Vụ Đồng Đội
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {state.tasks
                  .filter((t) => t.type === 'family_quest')
                  .slice()
                  .reverse()
                  .map((q) => {
                    const pIds = q.participantIds || [];
                    const pMap = q.progressMap || {};
                    const allDone = pIds.length > 0 && pIds.every((id) => pMap[id] === 'done');
                    return (
                      <div
                        key={q.id}
                        className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm">🤝 {q.title}</div>
                          <span className="text-xs font-bold text-amber-700">
                            +{q.reward}⭐ / bé
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {pIds.map((pid) => {
                            const km = state.members.find((m) => m.id === pid);
                            const done = pMap[pid] === 'done';
                            return (
                              <span
                                key={pid}
                                className={`px-2 py-0.5 rounded border ${
                                  done
                                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-bold'
                                    : 'bg-amber-50 border-amber-400 text-amber-800'
                                }`}
                              >
                                {km?.name || pid}: {done ? '✅ Đã xong phần mình' : '⏳ Chưa xong'}
                              </span>
                            );
                          })}
                        </div>
                        {q.status !== 'completed' && allDone && (
                          <button
                            type="button"
                            onClick={() => handleApproveFamilyQuest(q.id)}
                            className="btn btn-sm btn-primary"
                          >
                            🎉 Duyệt &amp; Trao Thưởng Cho Cả Hai Bé!
                          </button>
                        )}
                        {q.status === 'completed' && (
                          <div className="text-xs font-bold text-emerald-700">
                            ✅ Đã hoàn thành &amp; trao thưởng đồng đội!
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {tab === 'english' && (
            <div className="space-y-4">
              {/* Shared Global Bank Banner + CSV Actions */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-sky-50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-sky-950">
                      🎓 Ngân Hàng Tiếng Anh Dùng Chung (MOET Global Success Lớp 6–9)
                    </h3>
                    <p className="text-xs text-sky-800 mt-0.5">
                      Cơ sở dữ liệu Tiếng Anh này được <b>dùng chung cho tất cả khu phố trên toàn hệ thống</b> (hiện có{' '}
                      <b>{sharedEnglishBank.length}</b> câu hỏi). Mọi chỉnh sửa qua CSV sẽ tự đồng bộ lên kho chung Firebase.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white border-2 border-sky-400 text-xs font-extrabold text-sky-900 tabular-nums shrink-0">
                    📚 {sharedEnglishBank.length} câu
                  </span>
                </div>

                {/* CSV Export / Import / Reset Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-sky-200">
                  <button
                    type="button"
                    onClick={handleExportEnglishCsv}
                    className="btn btn-sm btn-primary"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Xuất CSV ({sharedEnglishBank.length} câu)</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-white border-2 border-[#2C3E50] rounded-lg px-2 py-1">
                    <select
                      value={csvImportMode}
                      onChange={(e) => setCsvImportMode(e.target.value as 'merge' | 'replace')}
                      className="text-[11px] font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="merge">Chế độ: Gộp &amp; cập nhật theo ID</option>
                      <option value="replace">Chế độ: Thay thế toàn bộ bộ đề</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => csvFileInputRef.current?.click()}
                      className="btn btn-sm btn-accent"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Nhập CSV</span>
                    </button>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleImportEnglishCsvFile}
                      className="hidden"
                    />
                  </div>

                  {confirmResetBank ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const res = bridge.resetEnglishBankToDefault?.();
                          setConfirmResetBank(false);
                          if (res) {
                            bridge.showToast(res.msg);
                            bridge.playSuccess();
                            forceRefresh();
                          }
                        }}
                        className="btn btn-sm btn-danger"
                      >
                        Xác nhận khôi phục 1.920 câu
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmResetBank(false)}
                        className="btn btn-sm"
                        style={{ background: '#64748B' }}
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmResetBank(true)}
                      className="btn btn-sm ml-auto"
                      style={{ background: '#475569' }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục bộ chuẩn 1.920 câu</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grade Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {([6, 7, 8, 9] as const).map((g) => {
                  const gradeCount = sharedEnglishBank.filter((q) => (q.grade ?? 6) === g).length;
                  const active = selectedEngGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        bridge.playClick();
                        setSelectedEngGrade(g);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border-2 text-xs font-extrabold cursor-pointer transition ${
                        active
                          ? 'bg-[#0284C7] border-[#2C3E50] text-white shadow'
                          : 'bg-white border-slate-300 text-slate-700 hover:border-sky-400'
                      }`}
                    >
                      📘 Lớp {g} ({gradeCount} câu · 12 Units)
                    </button>
                  );
                })}
              </div>

              {/* Grade Summary Table by Unit 1..12 */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-[#2C3E50] text-slate-700">
                        <th className="py-2 px-3 font-extrabold w-20">Unit</th>
                        <th className="py-2 px-3 font-extrabold">Chủ đề Global Success Lớp {selectedEngGrade}</th>
                        <th className="py-2 px-3 font-extrabold">Ngữ pháp trọng tâm</th>
                        <th className="py-2 px-3 font-extrabold text-center w-20">Từ vựng</th>
                        <th className="py-2 px-3 font-extrabold text-center w-20">Ngữ pháp</th>
                        <th className="py-2 px-3 font-extrabold text-center w-20">Tổng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {GLOBAL_SUCCESS_UNITS.filter((u) => u.grade === selectedEngGrade).map((u) => {
                        const unitQs = sharedEnglishBank.filter(
                          (q) => (q.grade ?? 6) === u.grade && (q.unit ?? 1) === u.unit
                        );
                        const vocabCount = unitQs.filter((q) => q.cat === 'vocab').length;
                        const grammarCount = unitQs.filter((q) => q.cat === 'grammar').length;
                        return (
                          <tr key={`${u.grade}_${u.unit}`} className="border-b border-slate-200 hover:bg-sky-50/50">
                            <td className="py-2 px-3 font-extrabold text-sky-800">Unit {u.unit}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{u.title}</td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">{u.grammarFocus}</td>
                            <td className="py-2 px-3 text-center font-bold text-emerald-700 tabular-nums">{vocabCount}</td>
                            <td className="py-2 px-3 text-center font-bold text-indigo-700 tabular-nums">{grammarCount}</td>
                            <td className="py-2 px-3 text-center font-extrabold text-slate-900 tabular-nums">
                              {vocabCount + grammarCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {isB2KSFamily && tab === 'activities' && (
            <div className="space-y-4">
              {/* Section A: Adjust Kid Points */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-rose-50 p-3.5 space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-rose-900">
                    ⚖️ Điều Chỉnh Điểm Hiện Tại Của Các Con (Thưởng Thêm / Phạt / Sửa Điểm)
                  </h3>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Dùng khi cần cộng/trừ điểm phạt hoặc điều chỉnh lại số điểm sao cho công bằng. Mọi thay đổi được ghi vào Nhật ký &amp; đồng bộ sang máy các con.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kids.map((kid) => {
                    const inputVal = pointInputs[kid.id] ?? String(kid.points);
                    const reasonVal = pointReasons[kid.id] ?? '';
                    return (
                      <div
                        key={kid.id}
                        className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-sm">
                            {kid.role === 'Con trai' ? '👦' : '👧'} {kid.name}
                          </div>
                          <span className="points-pill text-xs">{kid.points}⭐</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustKidPoints(kid.id, kid.points - 10, reasonVal)}
                            className="px-2 py-1 rounded bg-rose-600 text-white text-xs font-bold cursor-pointer"
                          >
                            -10⭐
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustKidPoints(kid.id, kid.points - 5, reasonVal)}
                            className="px-2 py-1 rounded bg-rose-500 text-white text-xs font-bold cursor-pointer"
                          >
                            -5⭐
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustKidPoints(kid.id, kid.points + 5, reasonVal)}
                            className="px-2 py-1 rounded bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            +5⭐
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustKidPoints(kid.id, kid.points + 10, reasonVal)}
                            className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                          >
                            +10⭐
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Lý do thưởng / phạt (tùy chọn)..."
                          value={reasonVal}
                          onChange={(e) =>
                            setPointReasons((prev) => ({ ...prev, [kid.id]: e.target.value }))
                          }
                          className="w-full px-2.5 py-1 rounded border border-slate-300 text-xs"
                        />
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={99999}
                            value={inputVal}
                            onChange={(e) =>
                              setPointInputs((prev) => ({ ...prev, [kid.id]: e.target.value }))
                            }
                            className="flex-1 px-2.5 py-1 rounded border-2 border-[#2C3E50] text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleAdjustKidPoints(kid.id, Number(inputVal) || 0, reasonVal);
                              setPointInputs((prev) => {
                                const copy = { ...prev };
                                delete copy[kid.id];
                                return copy;
                              });
                            }}
                            className="btn btn-sm btn-primary"
                          >
                            💾 Đặt điểm
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section B: Activity Reward & Toggle Configuration */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50 p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-amber-900">
                      ⚙️ Danh Sách Hoạt Động Đổi Điểm (Bật/Tắt &amp; Sửa Điểm Thưởng)
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Phụ huynh có thể thay đổi số sao thưởng hoặc tạm khóa từng hoạt động nếu cần.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveActivityConfigs}
                    className="btn btn-sm btn-primary"
                  >
                    💾 Lưu Cấu Hình
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(Object.keys(DEFAULT_ACTIVITY_CONFIGS) as ActivityConfigId[]).map((actId) => {
                    const cfg = draftConfigs[actId] || DEFAULT_ACTIVITY_CONFIGS[actId];
                    return (
                      <div
                        key={actId}
                        className={`rounded-xl border-2 p-3 flex flex-wrap items-center justify-between gap-3 ${
                          cfg.enabled
                            ? 'border-[#2C3E50] bg-white'
                            : 'border-slate-300 bg-slate-100 opacity-80'
                        }`}
                      >
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-bold text-xs sm:text-sm text-[#2C3E50]">
                            {cfg.label}
                          </div>
                          <div className="text-[11px] text-slate-600">{cfg.desc}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="flex items-center gap-1 text-xs font-bold text-amber-700">
                            <span>⭐ Thưởng:</span>
                            <input
                              type="number"
                              min={0}
                              max={200}
                              value={cfg.reward}
                              onChange={(e) =>
                                setDraftConfigs((prev) => ({
                                  ...prev,
                                  [actId]: { ...cfg, reward: Number(e.target.value) },
                                }))
                              }
                              className="w-16 px-2 py-1 rounded border-2 border-[#2C3E50] bg-white text-xs font-bold text-center"
                            />
                          </label>

                          {(actId === 'english_chat' || actId === 'read_comic') && (
                            <>
                              <label className="flex items-center gap-1 text-xs font-bold text-sky-800">
                                <span>⏳ Giãn cách(s):</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={3600}
                                  value={Math.round((cfg.cooldownMs ?? (actId === 'read_comic' ? 120000 : 30000)) / 1000)}
                                  onChange={(e) =>
                                    setDraftConfigs((prev) => ({
                                      ...prev,
                                      [actId]: { ...cfg, cooldownMs: Math.max(0, Number(e.target.value)) * 1000 },
                                    }))
                                  }
                                  className="w-16 px-2 py-1 rounded border-2 border-[#2C3E50] bg-white text-xs font-bold text-center"
                                />
                              </label>
                              <label className="flex items-center gap-1 text-xs font-bold text-indigo-800">
                                <span>📊 Tối đa/ngày:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={cfg.maxPerDay ?? (actId === 'read_comic' ? 5 : 10)}
                                  onChange={(e) =>
                                    setDraftConfigs((prev) => ({
                                      ...prev,
                                      [actId]: { ...cfg, maxPerDay: Number(e.target.value) },
                                    }))
                                  }
                                  className="w-14 px-2 py-1 rounded border-2 border-[#2C3E50] bg-white text-xs font-bold text-center"
                                />
                              </label>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              setDraftConfigs((prev) => ({
                                ...prev,
                                [actId]: { ...cfg, enabled: !cfg.enabled },
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer ${
                              cfg.enabled
                                ? 'bg-emerald-500 border-emerald-700 text-white'
                                : 'bg-slate-400 border-slate-600 text-white'
                            }`}
                          >
                            {cfg.enabled ? '✅ Đang bật' : '🚫 Đã tắt'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'family_map' && (
            <div className="space-y-4">
              {/* 1. Custom Family Name + Dual Password Display & Editor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-[#2C3E50] bg-teal-50 p-3.5 space-y-2.5">
                  <h3 className="font-bold text-sm text-teal-950 flex items-center gap-1.5">
                    <span>🏡 Tên Gia Đình &amp; Thương Hiệu Khu Phố</span>
                  </h3>
                  <p className="text-xs text-teal-800 leading-snug">
                    Đổi tên sẽ tự động áp dụng lên toàn bộ công trình, bản đồ, smartphone và các cửa hàng. Nếu share mã nguồn cho gia đình khác, gia đình đó chỉ cần đổi tên gia đình &amp; link Firebase riêng.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={24}
                      value={familyNameDraft}
                      onChange={(e) => setFamilyNameDraft(e.target.value)}
                      placeholder="VD: B2KS"
                      className="flex-1 px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-sm font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const res = bridge.setFamilyName?.(familyNameDraft);
                        if (res) {
                          bridge.showToast(res.msg);
                          forceRefresh();
                        }
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu tên</span>
                    </button>
                  </div>
                </div>

                {/* Dual Password Box */}
                <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50 p-3.5 space-y-2.5">
                  <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-700" />
                    <span>Quản Lý 2 Mật Khẩu (Hiển thị rõ để tránh quên)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-amber-400 bg-white px-2.5 py-1.5">
                      <div className="text-[10.5px] text-slate-500 font-semibold">MK vào Khu Phố (Cả nhà):</div>
                      <div className="font-mono font-extrabold text-sm text-sky-700 select-all">
                        {state.gamePassword || '1111'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-amber-400 bg-white px-2.5 py-1.5">
                      <div className="text-[10.5px] text-slate-500 font-semibold">Passcode Phụ Huynh:</div>
                      <div className="font-mono font-extrabold text-sm text-rose-700 select-all">
                        {state.parentPin || '1234'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={24}
                        value={gamePwDraft}
                        onChange={(e) => {
                          setGamePwDraft(e.target.value);
                          setPwFeedback(null);
                        }}
                        placeholder="MK vào game (>= 4 ký tự)"
                        className="flex-1 px-2.5 py-1 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const res = bridge.setGamePassword?.(gamePwDraft);
                          if (res) {
                            setPwFeedback(res);
                            bridge.showToast(res.msg);
                            forceRefresh();
                          }
                        }}
                        className="btn btn-sm btn-accent"
                      >
                        Đổi MK Game
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={12}
                        value={parentPinDraft}
                        onChange={(e) => {
                          setParentPinDraft(e.target.value);
                          setPwFeedback(null);
                        }}
                        placeholder="Passcode Phụ huynh (>= 4 ký tự)"
                        className="flex-1 px-2.5 py-1 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const res = bridge.setParentPin?.(parentPinDraft);
                          if (res) {
                            setPwFeedback(res);
                            bridge.showToast(res.msg);
                            forceRefresh();
                          }
                        }}
                        className="btn btn-sm btn-danger"
                      >
                        Đổi Passcode PH
                      </button>
                    </div>
                    {pwFeedback && (
                      <div
                        className={`text-[11px] font-bold px-2 py-1 rounded ${
                          pwFeedback.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {pwFeedback.msg}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Member Add / Remove / Profile Editor (Parent-only) */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-[#2C3E50] flex items-center gap-1.5">
                    <UserCog className="w-4 h-4 text-indigo-600" />
                    <span>Quản Lý Thành Viên Gia Đình (Thêm / Bớt / Sửa Hồ Sơ)</span>
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tổng cộng: {state.members.length} thành viên
                  </span>
                </div>

                {/* Add New Member Bar */}
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/80 p-2.5 flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10.5px] font-bold text-emerald-950 mb-0.5">
                      Tên thành viên mới
                    </label>
                    <input
                      type="text"
                      maxLength={20}
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="VD: Bé Bông, Ông Nội..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-500 bg-white text-xs font-bold"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10.5px] font-bold text-emerald-950 mb-0.5">
                      Vai trò
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => {
                        const r = e.target.value as 'Bố' | 'Mẹ' | 'Con gái' | 'Con trai';
                        setNewMemberRole(r);
                        setNewMemberAge(r === 'Bố' || r === 'Mẹ' ? '36' : '10');
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-emerald-500 bg-white text-xs font-bold"
                    >
                      <option value="Con gái">👧 Con gái</option>
                      <option value="Con trai">👦 Con trai</option>
                      <option value="Mẹ">👩 Mẹ</option>
                      <option value="Bố">👨 Bố</option>
                    </select>
                  </div>
                  <div className="w-16">
                    <label className="block text-[10.5px] font-bold text-emerald-950 mb-0.5">
                      Tuổi
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={newMemberAge}
                      onChange={(e) => setNewMemberAge(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-emerald-500 bg-white text-xs font-bold text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const res = bridge.addMember?.(newMemberName, newMemberRole, Number(newMemberAge) || undefined);
                      if (res) {
                        bridge.showToast(res.msg);
                        if (res.ok && res.member) {
                          const nm = res.member;
                          setMemberDrafts((prev) => ({
                            ...prev,
                            [nm.id]: {
                              name: nm.name,
                              age: String(nm.age ?? 10),
                              role: nm.role,
                            },
                          }));
                          setNewMemberName('');
                          forceRefresh();
                        } else {
                          bridge.playError();
                        }
                      }
                    }}
                    className="btn btn-sm btn-primary shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Thêm thành viên</span>
                  </button>
                </div>

                {/* Member Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {state.members.map((m) => {
                    const draft = memberDrafts[m.id] || {
                      name: m.name,
                      age: String(m.age ?? DEFAULT_MEMBER_AGES[m.id] ?? 12),
                      role: m.role || 'Con gái',
                    };
                    const isSelf = m.id === state.currentUserId;
                    const parentCount = state.members.filter((x) => bridge.isParent(x)).length;
                    const isLastParent = bridge.isParent(m) && parentCount <= 1;
                    const canRemove = !isSelf && !isLastParent && state.members.length > 1;
                    const isConfirmingDel = confirmDeleteMemberId === m.id;
                    return (
                      <div key={m.id} className="rounded-xl border-2 border-slate-300 bg-slate-50 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold gap-1">
                          <span className="truncate">
                            {m.outfit || '🙂'} {m.name} {isSelf ? <span className="text-[10px] text-emerald-700">(Bạn)</span> : null}
                          </span>
                          <span className="text-[10.5px] text-amber-700 shrink-0">{m.points}⭐</span>
                        </div>
                        <input
                          type="text"
                          maxLength={20}
                          value={draft.name}
                          onChange={(e) =>
                            setMemberDrafts((prev) => ({
                              ...prev,
                              [m.id]: { ...draft, name: e.target.value },
                            }))
                          }
                          placeholder="Tên hiển thị"
                          className="w-full px-2 py-1 rounded border border-[#2C3E50] bg-white text-xs font-bold"
                        />
                        <div className="flex items-center gap-1.5">
                          <select
                            value={draft.role}
                            onChange={(e) =>
                              setMemberDrafts((prev) => ({
                                ...prev,
                                [m.id]: { ...draft, role: e.target.value },
                              }))
                            }
                            className="flex-1 min-w-0 px-1.5 py-1 rounded border border-[#2C3E50] bg-white text-[11px] font-bold"
                          >
                            <option value="Bố">👨 Bố</option>
                            <option value="Mẹ">👩 Mẹ</option>
                            <option value="Con gái">👧 Con gái</option>
                            <option value="Con trai">👦 Con trai</option>
                          </select>
                          <label className="text-[10.5px] font-semibold text-slate-600 shrink-0">Tuổi:</label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={draft.age}
                            onChange={(e) =>
                              setMemberDrafts((prev) => ({
                                ...prev,
                                [m.id]: { ...draft, age: e.target.value },
                              }))
                            }
                            className="w-14 px-1.5 py-1 rounded border border-[#2C3E50] bg-white text-xs font-bold text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const res = bridge.updateMemberProfile?.(m.id, {
                                name: draft.name,
                                age: Number(draft.age) || m.age || 12,
                                role: draft.role,
                              });
                              if (res) {
                                bridge.showToast(res.msg);
                                forceRefresh();
                              }
                            }}
                            className="btn btn-sm btn-primary flex-1 justify-center text-[11px]"
                          >
                            💾 Lưu
                          </button>
                          {isConfirmingDel ? (
                            <button
                              type="button"
                              onClick={() => {
                                const res = bridge.removeMember?.(m.id);
                                setConfirmDeleteMemberId(null);
                                if (res) {
                                  bridge.showToast(res.msg);
                                  forceRefresh();
                                }
                              }}
                              className="btn btn-sm btn-danger text-[10.5px] px-2"
                              title="Bấm lần nữa để xóa thành viên"
                            >
                              Xác nhận xóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canRemove}
                              onClick={() => setConfirmDeleteMemberId(m.id)}
                              title={
                                isSelf
                                  ? 'Không thể xóa tài khoản đang đăng nhập'
                                  : isLastParent
                                    ? 'Cần giữ lại ít nhất 1 Phụ Huynh'
                                    : `Xóa ${m.name}`
                              }
                              className="btn btn-sm bg-rose-100 text-rose-700 border border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2B. Other Families Directory (Read-Only) */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50/70 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-amber-700" />
                      <span>🏘️ Các Gia Đình Khác Đang Tham Gia (Chỉ Xem)</span>
                    </h3>
                    <p className="text-[11px] text-amber-900/80">
                      Hiển thị danh sách thành viên các gia đình khác (nếu có) trên cùng máy chủ — chỉ xem, không thể chỉnh sửa hay truy cập mật khẩu.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loadingOtherFamilies}
                    onClick={loadOtherFamilies}
                    className="btn btn-sm btn-accent"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingOtherFamilies ? 'animate-spin' : ''}`} />
                    <span>{loadingOtherFamilies ? 'Đang tải...' : 'Làm mới danh sách'}</span>
                  </button>
                </div>

                {loadingOtherFamilies && otherFamilies.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">Đang tìm kiếm các gia đình khác trên hệ thống...</div>
                ) : otherFamilies.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-white/80 p-3 text-xs text-slate-600">
                    Chưa phát hiện gia đình nào khác trên cơ sở dữ liệu dùng chung (hoặc máy chưa kết nối Internet/Firebase).
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {otherFamilies.map((fam) => (
                      <div key={fam.slug} className="rounded-xl border-2 border-amber-300 bg-white p-3 space-y-2 shadow-sm">
                        <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-1.5">
                          <div className="font-extrabold text-xs text-[#2C3E50]">
                            🏡 Gia đình {fam.familyName}
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[10px] font-bold text-slate-600">
                            👁️ Chỉ xem · {fam.members.length} thành viên
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {fam.members.map((fm) => (
                            <div
                              key={fm.id || fm.name}
                              className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center gap-1.5"
                            >
                              <span>{fm.outfit || (fm.role === 'Bố' ? '👨' : fm.role === 'Mẹ' ? '👩' : fm.role === 'Con trai' ? '👦' : '👧')}</span>
                              <span className="font-bold text-slate-800">{fm.name}</span>
                              <span className="text-[10px] text-slate-500">
                                ({fm.role}{fm.age ? `, ${fm.age}t` : ''})
                              </span>
                              <span className="text-[10px] font-bold text-amber-600">{fm.points}⭐</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. BGM Sound Themes & Live Real-World Weather */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border-2 border-[#2C3E50] bg-emerald-50 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                      <Music2 className="w-4 h-4 text-emerald-700" />
                      <span>Chủ Đề Âm Thanh Nền</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        bridge.toggleAudioMuted?.();
                        forceRefresh();
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer ${
                        isMuted
                          ? 'bg-rose-100 border-rose-500 text-rose-800'
                          : 'bg-emerald-600 border-emerald-800 text-white'
                      }`}
                    >
                      {isMuted ? '🔇 Đang tắt tiếng' : '🔊 Đang phát nhạc'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {BGM_THEME_OPTIONS.map((t) => {
                      const active = t.id === activeBgmTheme;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            bridge.setBgmTheme?.(t.id as BgmThemeId);
                            bridge.playClick();
                            bridge.showToast(`🎵 Đã chuyển nhạc nền: ${t.icon} ${t.name}`);
                            forceRefresh();
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg border-2 text-xs transition cursor-pointer ${
                            active
                              ? 'bg-white border-emerald-600 font-bold text-emerald-950 shadow-sm'
                              : 'bg-white/70 border-slate-200 hover:border-emerald-400 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {t.icon} {t.name}
                            </span>
                            {active && <span className="text-[10px] text-emerald-700">✓ Đang chọn</span>}
                          </div>
                          <div className="text-[10.5px] font-normal text-slate-500">{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#2C3E50] bg-sky-50 p-3.5 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-sky-950 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-sky-700" />
                      <span>Thời Tiết Thực Tế Ngoài Đời (Live Weather)</span>
                    </h3>
                    <p className="text-xs text-sky-800 leading-snug">
                      Bầu trời, mưa, sấm chớp, tuyết hay sương mù trong Khu phố tự động đồng bộ theo thời tiết thực tế khu vực bạn đang sinh sống.
                    </p>
                    <div className="rounded-xl border-2 border-sky-300 bg-white p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-3xl">{weatherInfo?.icon || '🌤️'}</span>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900">
                            {weatherInfo ? `${weatherInfo.label} · ${weatherInfo.tempC}°C` : 'Đang tải thời tiết...'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {weatherInfo
                              ? `${weatherInfo.locationLabel} · Gió ${weatherInfo.windKmh} km/h`
                              : 'Múi giờ trình duyệt'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={refreshingWeather}
                      onClick={async () => {
                        setRefreshingWeather(true);
                        try {
                          const w = await bridge.refreshWeather?.(false);
                          if (w) bridge.showToast(`🌦️ Thời tiết: ${w.icon} ${w.label} (${w.tempC}°C)`);
                        } finally {
                          setRefreshingWeather(false);
                          forceRefresh();
                        }
                      }}
                      className="btn btn-sm btn-accent flex-1 justify-center"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingWeather ? 'animate-spin' : ''}`} />
                      <span>Cập nhật lại</span>
                    </button>
                    <button
                      type="button"
                      disabled={refreshingWeather}
                      onClick={async () => {
                        setRefreshingWeather(true);
                        try {
                          const w = await bridge.refreshWeather?.(true);
                          if (w) bridge.showToast(`📍 Đã lấy thời tiết GPS: ${w.icon} ${w.tempC}°C`);
                        } finally {
                          setRefreshingWeather(false);
                          forceRefresh();
                        }
                      }}
                      className="btn btn-sm btn-primary flex-1 justify-center"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lấy theo GPS thực</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Drag & Drop Map Building Layout + 4 Architectural Shapes */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#2C3E50]">
                      🗺️ Kéo Thả Vị Trí Các Công Trình &amp; Đổi Hình Dạng Building
                    </h3>
                    <p className="text-xs text-slate-500">
                      Kéo thả từng biểu tượng trên bản đồ thu nhỏ bên dưới để dời building (Minimap cũng tự cập nhật!). Chọn công trình để đổi 1 trong 4 kiểu kiến trúc.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleResetBuildingLayouts} className="btn btn-sm" style={{ background: '#64748B' }}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Mặc định</span>
                    </button>
                    <button type="button" onClick={handleSaveBuildingLayouts} className="btn btn-sm btn-primary">
                      <Save className="w-3.5 h-3.5" />
                      <span>Lưu bản đồ</span>
                    </button>
                  </div>
                </div>

                <div
                  ref={mapBoardRef}
                  onPointerMove={handleMapPointerMove}
                  onPointerUp={() => {
                    draggingLocRef.current = null;
                  }}
                  onPointerLeave={() => {
                    draggingLocRef.current = null;
                  }}
                  className="relative w-full aspect-[2520/1500] rounded-xl border-2 border-[#2C3E50] overflow-hidden select-none touch-none"
                  style={{
                    background:
                      'linear-gradient(180deg, #BAE6FD 0%, #BAE6FD 16%, #A7F3D0 16%, #86EFAC 100%)',
                  }}
                >
                  {/* Decorative Horizontal Streets matching World Coordinates */}
                  <div
                    className="absolute left-0 right-0 bg-slate-500/80 border-y-2 border-dashed border-amber-200"
                    style={{ top: '28%', height: '8%' }}
                  />
                  <div
                    className="absolute left-0 right-0 bg-slate-500/80 border-y-2 border-dashed border-amber-200"
                    style={{ top: '66%', height: '8%' }}
                  />

                  {previewLocations.map((loc) => {
                    const leftPct = (loc.x / STREET_WORLD.width) * 100;
                    const topPct = (loc.y / STREET_WORLD.height) * 100;
                    const isSelected = loc.id === selectedLocId;
                    return (
                      <div
                        key={loc.id}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          draggingLocRef.current = loc.id;
                          setSelectedLocId(loc.id);
                          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                        }}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded-lg border-2 text-[10px] font-bold flex items-center gap-1 shadow transition-transform ${
                          isSelected
                            ? 'bg-amber-300 border-slate-950 text-slate-950 scale-110 z-20'
                            : 'bg-white/95 border-[#2C3E50] text-[#2C3E50] z-10 hover:scale-105'
                        }`}
                        title={`${loc.name} (${loc.x}, ${loc.y})`}
                      >
                        <span>{loc.icon}</span>
                        <span className="hidden sm:inline max-w-[78px] truncate">
                          {loc.name.replace(/B2KS/gi, familyBrand)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Building Shape Selector */}
                {selectedLocation && (
                  <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/70 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs">
                        <div className="font-extrabold text-indigo-950">
                          {selectedLocation.icon} Đang chọn: {selectedLocation.name.replace(/B2KS/gi, familyBrand)}
                        </div>
                        <div className="text-[11px] text-slate-600 tabular-nums">
                          Tọa độ hiện tại: X = <b>{selectedLocation.x}</b> · Y = <b>{selectedLocation.y}</b>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        Bấm "Lưu bản đồ" để áp dụng lên Khu Phố &amp; Minimap
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {BUILDING_SHAPE_OPTIONS.map((opt) => {
                        const activeShape = (selectedLocation.shape || 'classic') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setDraftLayouts((prev) => ({
                                ...prev,
                                [selectedLocation.id]: {
                                  ...(prev[selectedLocation.id] || {}),
                                  x: selectedLocation.x,
                                  y: selectedLocation.y,
                                  shape: opt.id,
                                },
                              }));
                            }}
                            className={`text-left px-2.5 py-2 rounded-xl border-2 cursor-pointer transition ${
                              activeShape
                                ? 'bg-indigo-600 border-indigo-900 text-white shadow-sm'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <div className="text-xs font-extrabold">
                              {opt.icon} {opt.label}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${activeShape ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'pets' && (
            <div className="space-y-4">
              {/* 0. Clear Hunger & Bonus Rules Handbook */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-emerald-50 p-3.5 space-y-1.5">
                <h3 className="font-extrabold text-sm text-emerald-950">
                  📜 Cơ Chế Độ No &amp; Cộng Thưởng Sao Thú Cưng
                </h3>
                <ul className="text-xs text-emerald-900 space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    <b>Độ no giảm chậm khi đồng hành:</b> Chỉ khi thú cưng đang được chọn <b>Đồng hành ngoài map</b> thì Độ no mới giảm dần theo tốc độ riêng của từng loài (~<b>0.45% – 0.70%/phút</b>). Nếu cất thú cưng vào túi, độ no sẽ giữ nguyên.
                  </li>
                  <li>
                    <b>Điều kiện kích hoạt cộng thưởng:</b> Thú cưng mang lại <b>+Tốc độ di chuyển</b> &amp; <b>+Điểm Sao</b> (khi hoàn thành việc nhà, bài tập, nhiệm vụ đồng đội, quiz Tiếng Anh, nói Tiếng Anh, ăn cơm, đi ngủ, nghỉ chân công viên, đọc truyện) chỉ khi đang <b>Đồng hành</b> và <b>Độ no &gt; 0%</b>.
                  </li>
                  <li>
                    <b>Khi Độ no về 0% (❗ ĐÓI!):</b> Thú cưng hiện cảnh báo đói trên đầu và <b>tạm ngưng toàn bộ cộng Tốc độ &amp; Sao thưởng</b> cho đến khi được cho ăn lại.
                  </li>
                </ul>
              </div>

              {/* 1. Children's Owned Pets Overview */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-purple-50 p-3.5 space-y-2.5">
                <h3 className="font-bold text-sm text-purple-950">
                  🐾 Thú Cưng Các Bé Đang Nuôi Trong Nhà
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kids.map((kid) => {
                    const pets = kid.pets || [];
                    return (
                      <div key={kid.id} className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span>
                            {kid.outfit || '🙂'} {kid.name}
                          </span>
                          <span className="text-purple-700">{pets.length} thú cưng</span>
                        </div>
                        {pets.length === 0 ? (
                          <div className="text-[11px] text-slate-400">Chưa nhận trứng thú cưng nào.</div>
                        ) : (
                          <div className="space-y-1.5">
                            {pets.map((p) => {
                              const sp = getPetSpecies(p.speciesId);
                              const varDef = getPetVariantDef(p.variant);
                              const accDef = getPetAccessoryDef(p.accessoryId);
                              const svg = renderPetArtSVG(p.speciesId, p.hatched ? p.stage : 0, 42, {
                                variant: p.variant,
                                gender: p.gender,
                                accessoryId: p.accessoryId,
                              });
                              return (
                                <div
                                  key={p.id}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 flex items-center gap-2 text-xs"
                                >
                                  <div
                                    className="w-10 h-10 shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center"
                                    dangerouslySetInnerHTML={{ __html: svg }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold truncate">
                                      {p.nickname}{' '}
                                      <span className="text-[10px] text-slate-500">
                                        ({sp.name} · {p.gender === 'female' ? '♀️ Cái' : '♂️ Đực'})
                                      </span>
                                    </div>
                                    <div className="text-[10.5px] text-slate-600 flex flex-wrap gap-1.5">
                                      <span>{p.hatched ? `Lv.${p.level} (GĐ ${p.stage}/4)` : `🥚 Ấp ${Math.round(p.hatchProgress)}%`}</span>
                                      {p.hatched && (
                                        <span className={p.hunger <= 0 ? 'font-bold text-rose-600' : 'text-emerald-700 font-semibold'}>
                                          • No: {Math.round(p.hunger)}%
                                        </span>
                                      )}
                                      <span style={{ color: varDef.badgeColor }} className="font-bold">
                                        • {varDef.label}
                                      </span>
                                      {accDef && <span>• {accDef.icon} {accDef.name}</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Rare Variant Probabilities & Accessories & Food */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border-2 border-[#2C3E50] bg-amber-50 p-3 space-y-2">
                  <h4 className="font-bold text-xs text-amber-950">🎲 Tỉ Lệ Nở Màu Hiếm &amp; Giới Tính (50% ♂️ / 50% ♀️)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {PET_VARIANT_DEFS.map((v) => (
                      <span
                        key={v.id}
                        className="px-2 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-bold"
                        style={{ color: v.badgeColor }}
                      >
                        {v.label}: {v.chancePercent}%
                      </span>
                    ))}
                  </div>
                  <h4 className="font-bold text-xs text-amber-950 pt-1">🍖 Thức Ăn Chăm Nuôi</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PET_FOOD_CATALOG.map((fd) => (
                      <div key={fd.id} className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px]">
                        <b>{fd.icon} {fd.name}</b> ({fd.price}⭐) • +{fd.xpGain}XP · +{fd.hungerGain}% no
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border-2 border-[#2C3E50] bg-pink-50 p-3 space-y-2">
                  <h4 className="font-bold text-xs text-pink-950">🎀 Phụ Kiện Thời Trang Thú Cưng</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PET_ACCESSORY_CATALOG.map((acc) => (
                      <div key={acc.id} className="rounded-lg bg-white border border-pink-200 px-2 py-1.5 text-[11px]">
                        <div className="font-bold">{acc.icon} {acc.name} · {acc.price}⭐</div>
                        <div className="text-[10px] text-slate-500 truncate">{acc.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Full 10 Species x 5 Stages Encyclopedia */}
              <div className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3">
                <h3 className="font-bold text-sm text-[#2C3E50]">
                  📖 Từ Điển 10 Loài Thú Cưng &amp; 5 Giai Đoạn Tiến Hóa
                </h3>
                <div className="space-y-3">
                  {PET_SPECIES.map((sp) => (
                    <div
                      key={sp.id}
                      className="rounded-xl border-2 p-3 space-y-2"
                      style={{ borderColor: sp.primaryColor, background: `${sp.accentColor}40` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-sm" style={{ color: sp.primaryColor }}>
                            {sp.name} ({sp.eggName})
                          </div>
                          <div className="text-[11px] text-slate-600">
                            {sp.desc} • Chỉ số: <b>{sp.statLabel}</b> • ⏳ Đói: <b>-{sp.hungerDecayPerMin}%/phút</b>
                          </div>
                        </div>
                        <span className="points-pill text-xs">🥚 {sp.eggPrice}⭐</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sp.stages.map((stInfo) => {
                          const svg = renderPetArtSVG(sp.id, stInfo.stage, 48);
                          return (
                            <div
                              key={stInfo.stage}
                              className="rounded-lg border border-slate-300 bg-white p-1.5 text-center space-y-0.5"
                            >
                              <div
                                className="mx-auto w-12 h-12 flex items-center justify-center"
                                dangerouslySetInnerHTML={{ __html: svg }}
                              />
                              <div className="text-[10px] font-extrabold text-slate-800 truncate">
                                GĐ{stInfo.stage}: {stInfo.title}
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                {stInfo.stage === 0
                                  ? 'Ấp 100%'
                                  : `⚡+${stInfo.speedBonus} · ⭐+${stInfo.starBonus}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-[#2C3E50] bg-emerald-50 p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-emerald-900">
                    📦 Xuất Toàn Bộ Package Hoàn Chỉnh Để Up Lên GitHub
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Bao gồm toàn bộ mã nguồn, file cấu hình PWA, animals.json và bản build tĩnh sẵn sàng chạy trên GitHub Pages.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadGithubZip}
                  disabled={downloadingZip}
                  className="btn btn-sm disabled:opacity-60"
                  style={{ background: '#0F766E' }}
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingZip ? 'Đang đóng gói...' : 'Tải File ZIP GitHub'}</span>
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#2C3E50]">
                  📜 Nhật Ký Lịch Sử Hoạt Động (Tự động phát hiện bấm hoàn thành dồn dập &lt; 60s)
                </h3>
                {state.activityLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">Chưa có nhật ký hoạt động nào.</p>
                ) : (
                  state.activityLogs.slice(0, 60).map((log) => {
                    const isRapid = rapidAlertIds.has(log.id);
                    return (
                      <div
                        key={log.id}
                        className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 ${
                          isRapid
                            ? 'bg-rose-50 border-rose-400 text-rose-900'
                            : 'bg-white border-slate-300 text-slate-700'
                        }`}
                      >
                        <div>
                          <strong>{log.memberName}</strong>: {log.detail}
                          {isRapid && (
                            <span className="ml-2 inline-flex items-center gap-1 font-bold text-rose-700">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Cảnh báo: Bấm hoàn thành liên tiếp quá nhanh (&lt; 60s)!
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0 tabular-nums">
                          {new Date(log.ts).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
