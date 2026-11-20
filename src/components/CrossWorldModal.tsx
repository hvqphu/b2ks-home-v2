import React, { useState } from 'react';
import { Gift, Plus, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react';
import { B2KSBridge, CrossWorldItem, CrossWorldRequest } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

export const CrossWorldModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [tab, setTab] = useState<'shop' | 'history' | 'manage'>('shop');
  const [, setTick] = useState(0);

  // Parent management form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💵');
  const [newCategory, setNewCategory] = useState<'money' | 'privilege'>('privilege');
  const [newPoints, setNewPoints] = useState(100);
  const [newRealValue, setNewRealValue] = useState('');
  const [newQty, setNewQty] = useState(1);

  const state = bridge.getState();
  const user = bridge.getCurrentUser();
  const isUserParent = bridge.isParent(user);

  const forceRefresh = () => setTick((t) => t + 1);

  const handleOpenManageTab = () => {
    bridge.playClick();
    if (isUserParent) {
      setTab('manage');
    } else {
      bridge.requestParentAccess(() => {
        setTab('manage');
        forceRefresh();
      });
    }
  };

  const handleRedeem = (item: CrossWorldItem) => {
    if (item.quantity <= 0) {
      bridge.playError();
      bridge.showToast('⚠️ Vật phẩm này đã hết hàng!');
      return;
    }
    if (user.points < item.pointsCost) {
      bridge.playError();
      bridge.showToast(`❌ Bạn cần ${item.pointsCost}⭐ để đổi "${item.name}"!`);
      return;
    }

    user.points -= item.pointsCost;
    item.quantity -= 1;

    // Remove item from shelf once exchanged/depleted
    if (item.quantity <= 0) {
      state.crossWorldItems = state.crossWorldItems.filter((x) => x.id !== item.id);
    }

    const req: CrossWorldRequest = {
      id: `cw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      childId: user.id,
      childName: user.name,
      itemId: item.id,
      itemName: item.name,
      itemIcon: item.icon,
      pointsCost: item.pointsCost,
      realValue: item.realValue,
      status: 'pending',
      createdAt: Date.now(),
      approvedAt: null,
      approvedBy: null,
    };

    state.crossWorldRequests.unshift(req);
    bridge.logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'cross_world',
      detail: `Đổi quà xuyên thế giới: ${item.name} (${item.realValue}) - ${item.pointsCost}⭐`,
    });

    bridge.syncCrossWorldRequestsToFirebase(state.crossWorldRequests);
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playSuccess();
    bridge.triggerConfetti();
    bridge.triggerSpeechBubble(user, `Yay! Đổi thành công ${item.name}! 🎁`, false);
    bridge.showToast(`🎉 Đã gửi yêu cầu đổi "${item.name}"! Chờ Bố/Mẹ duyệt ngoài đời thực nhé!`);
    forceRefresh();
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRealValue.trim()) {
      bridge.playError();
      bridge.showToast('⚠️ Vui lòng nhập tên quà và giá trị thực tế!');
      return;
    }
    const created: CrossWorldItem = {
      id: `cwi_${Date.now()}`,
      name: newName.trim(),
      icon: newIcon.trim() || '🎁',
      category: newCategory,
      pointsCost: Math.max(1, Number(newPoints) || 50),
      realValue: newRealValue.trim(),
      quantity: Math.max(1, Number(newQty) || 1),
    };
    state.crossWorldItems.unshift(created);
    setNewName('');
    setNewRealValue('');
    setNewQty(1);
    bridge.saveGame(true);
    bridge.playSuccess();
    bridge.showToast(`✅ Đã thêm "${created.name}" vào Trung Tâm Giao Dịch!`);
    forceRefresh();
  };

  const handleDeleteItem = (itemId: string) => {
    state.crossWorldItems = state.crossWorldItems.filter((x) => x.id !== itemId);
    bridge.saveGame(true);
    bridge.playClick();
    bridge.showToast('🗑️ Đã xóa vật phẩm khỏi kệ.');
    forceRefresh();
  };

  const handleRestock = (item: CrossWorldItem) => {
    item.quantity += 1;
    bridge.saveGame(true);
    bridge.playClick();
    forceRefresh();
  };

  const myRequests = state.crossWorldRequests.filter((r) =>
    isUserParent ? true : r.childId === user.id
  );

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-3">
      <div className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#F59E0B] bg-gradient-to-b from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white shadow-2xl overflow-hidden">
        {/* Celestial Portal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#7C3AED] border-b-[3px] border-[#FCD34D]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌌</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Trung Tâm Giao Dịch Xuyên Thế Giới
              </h2>
              <p className="text-xs text-amber-100">
                Quy đổi điểm sao ảo thành phần thưởng & đặc quyền ngoài đời thực
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-300 text-slate-900 font-bold text-xs border-2 border-slate-900 tabular-nums">
              {user.name}: {user.points}⭐
            </span>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/90 text-slate-900 hover:bg-white font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-indigo-500/40">
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              setTab('shop');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              tab === 'shop'
                ? 'bg-amber-400 text-slate-900'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Kệ Quà Thực Tế ({state.crossWorldItems.length})
          </button>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              setTab('history');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              tab === 'history'
                ? 'bg-emerald-400 text-slate-900'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Lịch Sử Đổi Quà ({myRequests.length})
          </button>
          <button
            type="button"
            onClick={handleOpenManageTab}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              tab === 'manage'
                ? 'bg-violet-400 text-slate-900'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Cấu Hình Quà (Bố/Mẹ)
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'shop' && (
            <>
              <div className="rounded-xl border border-amber-400/50 bg-indigo-950/60 p-3 text-xs text-amber-100 flex items-center gap-3">
                <span className="text-2xl">🧙‍♂️</span>
                <div>
                  <strong className="text-amber-300">Sứ Giả Giao Dịch Orion:</strong>{' '}
                  &ldquo;Mỗi phần thưởng ở đây đều có số lượng giới hạn! Khi bé bấm Đổi quà, vật phẩm sẽ biến mất khỏi kệ và tạo phiếu chờ Bố/Mẹ trao thưởng ngoài đời thực.&rdquo;
                </div>
              </div>

              {state.crossWorldItems.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/50 rounded-xl border border-dashed border-amber-400/40">
                  <div className="text-4xl mb-2">✨</div>
                  <p className="text-sm font-bold text-amber-200">
                    Kệ quà xuyên thế giới đã được đổi hết!
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Bố/Mẹ có thể vào tab &ldquo;Cấu Hình Quà&rdquo; để bổ sung thêm phần thưởng mới.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {state.crossWorldItems.map((item) => {
                    const affordable = user.points >= item.pointsCost;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border-2 border-amber-400/70 bg-gradient-to-br from-slate-800/95 to-indigo-950/95 p-3.5 flex flex-col justify-between gap-3 shadow-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-300/15 border border-amber-300/50 flex items-center justify-center text-3xl shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-amber-300 font-semibold">
                              {item.category === 'money' ? '💵 Quy đổi tiền mặt' : '🎟️ Đặc quyền thực tế'} · Còn {item.quantity} suất
                            </div>
                            <h3 className="text-sm font-bold text-white mt-0.5 truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs text-emerald-300 font-semibold mt-0.5">
                              Giá trị: {item.realValue}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-sm font-bold text-amber-300 tabular-nums">
                            ⭐ {item.pointsCost} điểm
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRedeem(item)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border-2 border-slate-900 transition ${
                              affordable
                                ? 'bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 hover:brightness-105 cursor-pointer'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            🎁 Đổi quà ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="space-y-2.5">
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-300">
                  Chưa có yêu cầu đổi quà xuyên thế giới nào.
                </div>
              ) : (
                myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{req.itemIcon}</span>
                      <div>
                        <div className="font-bold text-sm text-white">
                          {req.itemName}{' '}
                          <span className="text-xs font-normal text-amber-300">
                            ({req.pointsCost}⭐)
                          </span>
                        </div>
                        <div className="text-xs text-slate-300">
                          Bé: <strong>{req.childName}</strong> · Giá trị: {req.realValue} ·{' '}
                          {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
                      }`}
                    >
                      {req.status === 'approved'
                        ? '✅ Đã duyệt'
                        : req.status === 'rejected'
                        ? '❌ Đã hoàn điểm'
                        : '⏳ Chờ Bố/Mẹ duyệt'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'manage' && (
            <div className="space-y-4">
              <form
                onSubmit={handleCreateItem}
                className="rounded-xl border border-violet-400/50 bg-slate-800/90 p-3.5 space-y-3"
              >
                <h3 className="text-sm font-bold text-violet-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Định nghĩa phần thưởng thực tế mới
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Tên quà (VD: Đổi 10.000 VNĐ)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Icon (VD: 💵)"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as 'money' | 'privilege')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  >
                    <option value="money">💵 Tiền thực tế</option>
                    <option value="privilege">🎟️ Đặc quyền</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Giá trị thực (VD: 10.000đ)"
                    value={newRealValue}
                    onChange={(e) => setNewRealValue(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Điểm đổi"
                    value={newPoints}
                    onChange={(e) => setNewPoints(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Số lượng"
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-violet-500 hover:bg-violet-400 text-white font-bold text-xs cursor-pointer"
                >
                  ➕ Thêm Vào Kệ Giao Dịch
                </button>
              </form>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">
                  Danh sách vật phẩm đang mở đổi:
                </h4>
                {state.crossWorldItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/70 border border-slate-700 p-2.5 text-xs"
                  >
                    <div>
                      <span className="mr-1.5 text-base">{it.icon}</span>
                      <strong>{it.name}</strong> · {it.pointsCost}⭐ · SL: <strong>{it.quantity}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRestock(it)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                      >
                        +1 SL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(it.id)}
                        className="p-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
