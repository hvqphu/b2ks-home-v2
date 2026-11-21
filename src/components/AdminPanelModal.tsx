import React, { useEffect, useState } from 'react';
import {
  Building2,
  Coins,
  KeyRound,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import { AdminNeighborhoodRecord, B2KSBridge } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [tab, setTab] = useState<'neighborhoods' | 'parent_points'>('neighborhoods');
  const [records, setRecords] = useState<AdminNeighborhoodRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Neighborhood form
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newDadName, setNewDadName] = useState('Bố');
  const [newMomName, setNewMomName] = useState('Mẹ');
  const [creating, setCreating] = useState(false);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [confirmResetSlug, setConfirmResetSlug] = useState<string | null>(null);

  // Parent allowance & points drafts keyed by slug
  const [allowanceDrafts, setAllowanceDrafts] = useState<Record<string, string>>({});
  const [parentPointDrafts, setParentPointDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const isAuthorized = Boolean(bridge.isB2KSDad?.());

  const loadNeighborhoods = async () => {
    if (!bridge.adminListNeighborhoods) return;
    setLoading(true);
    try {
      const list = await bridge.adminListNeighborhoods();
      setRecords(list);
      const nextAllow: Record<string, string> = {};
      const nextPts: Record<string, Record<string, string>> = {};
      list.forEach((rec) => {
        nextAllow[rec.slug] = String(rec.dailyParentAllowance ?? 100);
        nextPts[rec.slug] = {};
        rec.parents.forEach((p) => {
          nextPts[rec.slug][p.id] = String(p.points ?? 0);
        });
      });
      setAllowanceDrafts(nextAllow);
      setParentPointDrafts(nextPts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      loadNeighborhoods();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-4">
        <div className="w-full max-w-md rounded-2xl border-[3px] border-[#2C3E50] bg-white p-5 text-[#2C3E50] shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
            <ShieldAlert className="w-5 h-5" />
            <span>Không có quyền truy cập Admin</span>
          </div>
          <p className="text-sm text-slate-600">
            Công cụ Admin chỉ dành riêng cho nhân vật <b>Bố</b> của khu phố gốc <b>B2KS</b>.
          </p>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="btn btn-primary w-full justify-center"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const handleCreateNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating || !bridge.adminCreateNeighborhood) return;
    const clean = newFamilyName.trim();
    if (!clean) {
      bridge.playError();
      bridge.showToast('⚠️ Vui lòng nhập tên khu phố / gia đình mới!');
      return;
    }
    setCreating(true);
    try {
      const res = await bridge.adminCreateNeighborhood(clean, newDadName.trim() || 'Bố', newMomName.trim() || 'Mẹ');
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
        setNewFamilyName('');
        setNewDadName('Bố');
        setNewMomName('Mẹ');
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleResetPasswords = async (slug: string) => {
    if (!bridge.adminResetNeighborhoodPasswords) return;
    setSavingSlug(slug);
    try {
      const res = await bridge.adminResetNeighborhoodPasswords(slug);
      setConfirmResetSlug(null);
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const handleDeleteNeighborhood = async (slug: string) => {
    if (!bridge.adminDeleteNeighborhood) return;
    setSavingSlug(slug);
    try {
      const res = await bridge.adminDeleteNeighborhood(slug);
      setConfirmDeleteSlug(null);
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playClick();
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const handleSaveParentAdjustment = async (rec: AdminNeighborhoodRecord) => {
    if (!bridge.adminAdjustParentAccount) return;
    setSavingSlug(rec.slug);
    try {
      const allowanceVal = Math.max(0, Math.min(10000, Math.round(Number(allowanceDrafts[rec.slug] ?? rec.dailyParentAllowance) || 0)));
      const ptsMap: Record<string, number> = {};
      rec.parents.forEach((p) => {
        const raw = parentPointDrafts[rec.slug]?.[p.id];
        ptsMap[p.id] = Math.max(0, Math.min(999999, Math.round(Number(raw ?? p.points) || 0)));
      });
      const res = await bridge.adminAdjustParentAccount(rec.slug, {
        dailyParentAllowance: allowanceVal,
        parentPoints: ptsMap,
      });
      bridge.showToast(res.msg);
      if (res.ok) {
        bridge.playSuccess();
        await loadNeighborhoods();
      } else {
        bridge.playError();
      }
    } finally {
      setSavingSlug(null);
    }
  };

  const bumpParentDraftPoint = (slug: string, parentId: string, currentFallback: number, delta: number) => {
    setParentPointDrafts((prev) => {
      const famMap = { ...(prev[slug] || {}) };
      const curVal = Number(famMap[parentId] ?? currentFallback) || 0;
      famMap[parentId] = String(Math.max(0, curVal + delta));
      return { ...prev, [slug]: famMap };
    });
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-3">
      <div className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#F8FAFC] text-[#2C3E50] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#4C1D95] via-[#6D28D9] to-[#7C3AED] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛠️</span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold">
                Công Cụ Admin Hệ Thống (Chỉ Bố B2KS)
              </h2>
              <p className="text-xs text-violet-100">
                Quản lý danh sách khu phố, reset mật khẩu mặc định (1111 / 1234) &amp; điều chỉnh ngân sách Phụ huynh toàn hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-white text-[#2C3E50] hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-200 border-b-2 border-[#2C3E50]">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('neighborhoods');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'neighborhoods' ? 'bg-[#6D28D9] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Quản lý các khu phố ({records.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                setTab('parent_points');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === 'parent_points' ? 'bg-[#D97706] text-white shadow' : 'bg-white text-[#2C3E50]'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Điều chỉnh điểm Phụ huynh</span>
            </button>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={loadNeighborhoods}
            className="btn btn-sm btn-accent"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'neighborhoods' && (
            <>
              {/* Create New Neighborhood Box */}
              <form
                onSubmit={handleCreateNeighborhood}
                className="rounded-xl border-2 border-[#2C3E50] bg-violet-50 p-3.5 space-y-2.5"
              >
                <div>
                  <h3 className="font-extrabold text-sm text-violet-950 flex items-center gap-1.5">
                    <PlusCircle className="w-4 h-4 text-violet-700" />
                    <span>Tạo Khu Phố Gia Đình Mới</span>
                  </h3>
                  <p className="text-[11.5px] text-violet-800 mt-0.5">
                    Gia đình mới chỉ gồm <b>Bố</b> và <b>Mẹ</b> mặc định, database tách biệt hoàn toàn (chỉ dùng chung Ngân Hàng Tiếng Anh) và có mật khẩu mặc định: vào game <code className="bg-white px-1 rounded font-bold">1111</code> · Phụ huynh <code className="bg-white px-1 rounded font-bold">1234</code>.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="Tên khu phố (VD: MINH, ANH...)"
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                  <input
                    type="text"
                    maxLength={20}
                    value={newDadName}
                    onChange={(e) => setNewDadName(e.target.value)}
                    placeholder="Tên Bố (mặc định: Bố)"
                    className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                  <input
                    type="text"
                    maxLength={20}
                    value={newMomName}
                    onChange={(e) => setNewMomName(e.target.value)}
                    placeholder="Tên Mẹ (mặc định: Mẹ)"
                    className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-sm btn-purple disabled:opacity-60"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{creating ? 'Đang khởi tạo...' : 'Tạo Khu Phố Mới (Chỉ gồm Bố & Mẹ)'}</span>
                  </button>
                </div>
              </form>

              {/* Neighborhood Directory */}
              <div className="space-y-2.5">
                {loading && records.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">Đang tải danh sách các khu phố...</div>
                ) : records.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">Chưa có dữ liệu khu phố.</div>
                ) : (
                  records.map((rec) => {
                    const isB2KS = rec.slug === 'b2ks';
                    const isBusy = savingSlug === rec.slug;
                    const confirmingReset = confirmResetSlug === rec.slug;
                    const confirmingDel = confirmDeleteSlug === rec.slug;
                    return (
                      <div
                        key={rec.slug}
                        className={`rounded-xl border-2 p-3 flex flex-wrap items-center justify-between gap-3 ${
                          isB2KS ? 'border-violet-600 bg-white shadow-sm' : 'border-[#2C3E50] bg-white'
                        }`}
                      >
                        <div className="space-y-1 min-w-[210px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#2C3E50]">
                              🏡 {rec.familyName}
                            </span>
                            <code className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600">
                              slug: {rec.slug}
                            </code>
                            {isB2KS && (
                              <span className="px-2 py-0.5 rounded-full bg-violet-100 border border-violet-400 text-[10px] font-extrabold text-violet-800">
                                ⭐ Khu phố gốc
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 flex flex-wrap gap-3">
                            <span>👥 {rec.memberCount} thành viên ({rec.kidCount} con)</span>
                            <span>📅 Nhận/ngày: <b>{rec.dailyParentAllowance}⭐</b></span>
                            <span>
                              💰 PH:{' '}
                              {rec.parents.map((p) => `${p.name} (${p.points}⭐)`).join(' · ') || 'Chưa có'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {confirmingReset ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleResetPasswords(rec.slug)}
                                className="btn btn-sm btn-accent"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Xác nhận Reset (1111 / 1234)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmResetSlug(null)}
                                className="btn btn-sm"
                                style={{ background: '#64748B' }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setConfirmDeleteSlug(null);
                                setConfirmResetSlug(rec.slug);
                              }}
                              className="btn btn-sm btn-accent"
                              title="Reset mật khẩu vào game về 1111 và Passcode phụ huynh về 1234"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset 2 Mật Khẩu</span>
                            </button>
                          )}

                          {confirmingDel ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy || isB2KS}
                                onClick={() => handleDeleteNeighborhood(rec.slug)}
                                className="btn btn-sm btn-danger"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa vĩnh viễn</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteSlug(null)}
                                className="btn btn-sm"
                                style={{ background: '#64748B' }}
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isB2KS || isBusy}
                              onClick={() => {
                                setConfirmResetSlug(null);
                                setConfirmDeleteSlug(rec.slug);
                              }}
                              title={isB2KS ? 'Không thể xóa khu phố gốc B2KS' : `Xóa khu phố ${rec.familyName}`}
                              className="btn btn-sm bg-rose-100 text-rose-700 border border-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === 'parent_points' && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                Tại đây Admin <b>Bố B2KS</b> có thể điều chỉnh <b>điểm ngân sách hàng ngày</b> và <b>số điểm hiện có</b> của tất cả Phụ huynh (Bố/Mẹ) trong từng khu phố.
              </div>

              {records.map((rec) => {
                const isBusy = savingSlug === rec.slug;
                const allowVal = allowanceDrafts[rec.slug] ?? String(rec.dailyParentAllowance ?? 100);
                return (
                  <div
                    key={rec.slug}
                    className="rounded-xl border-2 border-[#2C3E50] bg-white p-3.5 space-y-3 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-[#2C3E50]">
                          🏡 Gia đình {rec.familyName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          ({rec.parents.length} Phụ huynh · {rec.kidCount} con)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <span>📅 Nhận hàng ngày:</span>
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            value={allowVal}
                            onChange={(e) =>
                              setAllowanceDrafts((prev) => ({ ...prev, [rec.slug]: e.target.value }))
                            }
                            className="w-20 px-2 py-1 rounded-lg border-2 border-[#2C3E50] bg-amber-50 text-xs font-extrabold text-center"
                          />
                          <span>⭐/ngày</span>
                        </label>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSaveParentAdjustment(rec)}
                          className="btn btn-sm btn-primary disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Đang lưu...' : 'Lưu khu phố này'}</span>
                        </button>
                      </div>
                    </div>

                    {rec.parents.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">Khu phố này chưa có tài khoản Phụ huynh.</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {rec.parents.map((p) => {
                          const draftStr = parentPointDrafts[rec.slug]?.[p.id] ?? String(p.points ?? 0);
                          return (
                            <div
                              key={p.id}
                              className="rounded-xl border border-slate-300 bg-slate-50 p-2.5 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>
                                  {p.role === 'Bố' ? '👨' : '👩'} {p.name}{' '}
                                  <span className="text-slate-500 font-normal">({p.role})</span>
                                </span>
                                <span className="points-pill text-[11px]">Hiện tại: {p.points}⭐</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, -50)}
                                  className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  -50⭐
                                </button>
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, +50)}
                                  className="px-2 py-1 rounded bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  +50⭐
                                </button>
                                <button
                                  type="button"
                                  onClick={() => bumpParentDraftPoint(rec.slug, p.id, p.points, +100)}
                                  className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  +100⭐
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={999999}
                                  value={draftStr}
                                  onChange={(e) =>
                                    setParentPointDrafts((prev) => ({
                                      ...prev,
                                      [rec.slug]: {
                                        ...(prev[rec.slug] || {}),
                                        [p.id]: e.target.value,
                                      },
                                    }))
                                  }
                                  className="flex-1 min-w-[72px] px-2 py-1 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-extrabold text-center"
                                />
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
          )}
        </div>
      </div>
    </div>
  );
};
