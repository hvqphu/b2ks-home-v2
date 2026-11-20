import React, { useState } from 'react';
import { ShoppingBag, Tag, Undo2, X } from 'lucide-react';
import { B2KSBridge, CustomLabItem, FleaMarketListing } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

interface SellableOption {
  uid: string;
  itemKind: 'inventory' | 'lab';
  itemId: string;
  invIndex?: number;
  name: string;
  icon: string;
  desc: string;
  labItemData?: CustomLabItem;
}

export const FleaMarketModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [tab, setTab] = useState<'browse' | 'sell'>('browse');
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);

  const state = bridge.getState();
  const user = bridge.getCurrentUser();
  const forceRefresh = () => setTick((t) => t + 1);

  const getSellableItems = (): SellableOption[] => {
    const placedCounts: Record<string, number> = {};
    if (user.roomSlots) {
      Object.values(user.roomSlots).forEach((id) => {
        if (id) placedCounts[id] = (placedCounts[id] || 0) + 1;
      });
    }
    if (Array.isArray(user.roomDecor)) {
      user.roomDecor.forEach((d) => {
        if (d.id) placedCounts[d.id] = (placedCounts[d.id] || 0) + 1;
      });
    }

    const result: SellableOption[] = [];
    user.inventory.forEach((id, invIndex) => {
      const cat = bridge.findCatalogItem(id);
      if (!cat) return;
      if (cat.icon && user.outfit === cat.icon) return;
      if (placedCounts[id] && placedCounts[id] > 0) {
        placedCounts[id] -= 1;
        return;
      }
      result.push({
        uid: `inv:${invIndex}:${id}`,
        itemKind: 'inventory',
        itemId: id,
        invIndex,
        name: cat.name,
        icon: cat.icon || '📦',
        desc: cat.desc || 'Vật phẩm trong túi đồ',
      });
    });

    (user.customLabItems || []).forEach((lab, idx) => {
      if (placedCounts[lab.id] && placedCounts[lab.id] > 0) {
        placedCounts[lab.id] -= 1;
        return;
      }
      result.push({
        uid: `lab:${idx}:${lab.id}`,
        itemKind: 'lab',
        itemId: lab.id,
        name: lab.name,
        icon: lab.icon || '🧪',
        desc: lab.desc,
        labItemData: lab,
      });
    });

    return result;
  };

  const handleListForSale = (opt: SellableOption) => {
    const askPrice = Math.max(1, Math.min(999, Number(priceMap[opt.uid] ?? 25)));
    if (opt.itemKind === 'inventory') {
      const idx =
        user.inventory[opt.invIndex ?? -1] === opt.itemId
          ? (opt.invIndex as number)
          : user.inventory.indexOf(opt.itemId);
      if (idx === -1) return;
      user.inventory.splice(idx, 1);
    } else {
      const lIdx = (user.customLabItems || []).findIndex((x) => x.id === opt.itemId);
      if (lIdx === -1) return;
      user.customLabItems!.splice(lIdx, 1);
    }

    const listing: FleaMarketListing = {
      id: `fm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sellerId: user.id,
      sellerName: user.name,
      itemId: opt.itemId,
      itemName: opt.name,
      itemIcon: opt.icon,
      itemDesc: opt.desc,
      itemKind: opt.itemKind,
      labItemData: opt.labItemData || null,
      price: askPrice,
      createdAt: Date.now(),
    };

    state.fleaMarketListings.unshift(listing);
    bridge.syncFleaMarketToFirebase(state.fleaMarketListings);
    bridge.saveGame(true);
    bridge.playSuccess();
    bridge.showToast(`📢 Đã niêm yết "${opt.name}" lên Chợ Trời với giá ${askPrice}⭐!`);
    setTab('browse');
    forceRefresh();
  };

  const handleBuyListing = (listing: FleaMarketListing) => {
    if (listing.sellerId === user.id) return;
    if (user.points < listing.price) {
      bridge.playError();
      bridge.showToast(`❌ Bạn cần ${listing.price}⭐ để mua vật phẩm này!`);
      return;
    }

    const seller = state.members.find((m) => m.id === listing.sellerId);
    user.points -= listing.price;
    if (seller) {
      seller.points = bridge.isParent(seller)
        ? Math.min(500, seller.points + listing.price)
        : seller.points + listing.price;
    }

    if (listing.itemKind === 'lab' && listing.labItemData) {
      if (!Array.isArray(user.customLabItems)) user.customLabItems = [];
      user.customLabItems.unshift(listing.labItemData);
    } else {
      user.inventory.push(listing.itemId);
    }

    // Remove item from flea market once purchased
    state.fleaMarketListings = state.fleaMarketListings.filter((x) => x.id !== listing.id);

    bridge.logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'flea_market',
      detail: `Mua "${listing.itemName}" từ ${listing.sellerName} giá ${listing.price}⭐`,
    });

    bridge.syncFleaMarketToFirebase(state.fleaMarketListings);
    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playCoin();
    bridge.triggerSpeechBubble(user, `Bought ${listing.itemName} at Flea Market! 🎪`, true);
    bridge.showToast(`🛍️ Đã mua "${listing.itemName}" với giá ${listing.price}⭐!`);
    forceRefresh();
  };

  const handleCancelListing = (listing: FleaMarketListing) => {
    if (listing.sellerId !== user.id) return;
    if (listing.itemKind === 'lab' && listing.labItemData) {
      if (!Array.isArray(user.customLabItems)) user.customLabItems = [];
      user.customLabItems.unshift(listing.labItemData);
    } else {
      user.inventory.push(listing.itemId);
    }
    state.fleaMarketListings = state.fleaMarketListings.filter((x) => x.id !== listing.id);
    bridge.syncFleaMarketToFirebase(state.fleaMarketListings);
    bridge.saveGame(true);
    bridge.playClick();
    bridge.showToast(`↩️ Đã thu hồi "${listing.itemName}" về Túi đồ!`);
    forceRefresh();
  };

  const sellables = getSellableItems();

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/65 p-3">
      <div className="w-full max-w-3xl max-h-[88dvh] flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#FFFDF7] text-[#2C3E50] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎪</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Chợ Trời Gia Đình {bridge.getFamilyName?.() || 'B2KS'}</h2>
              <p className="text-xs text-amber-100">
                Tự niêm yết giá đồ trong túi và trao đổi cùng cả nhà
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-200 text-slate-900 font-bold text-xs border-2 border-[#2C3E50] tabular-nums">
              {user.name}: {user.points}⭐
            </span>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white text-[#2C3E50] hover:bg-amber-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-2.5 bg-amber-100/70 border-b-2 border-[#2C3E50]">
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              setTab('browse');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#2C3E50] flex items-center gap-1.5 ${
              tab === 'browse' ? 'bg-[#EA580C] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Gian Hàng Đang Bán ({state.fleaMarketListings.length})
          </button>
          <button
            type="button"
            onClick={() => {
              bridge.playClick();
              setTab('sell');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#2C3E50] flex items-center gap-1.5 ${
              tab === 'sell' ? 'bg-[#0D9488] text-white' : 'bg-white text-[#2C3E50]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Đăng Bán Đồ Của Tôi ({sellables.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'browse' ? (
            state.fleaMarketListings.length === 0 ? (
              <div className="text-center py-10 bg-amber-50 rounded-xl border-2 border-dashed border-amber-400">
                <div className="text-4xl mb-2">🎪</div>
                <p className="font-bold text-sm text-amber-900">
                  Chợ Trời hiện chưa có sạp hàng nào!
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Hãy chuyển sang tab &ldquo;Đăng Bán Đồ Của Tôi&rdquo; để mở sạp hàng đầu tiên nhé!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.fleaMarketListings.map((listing) => {
                  const isMine = listing.sellerId === user.id;
                  return (
                    <div
                      key={listing.id}
                      className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 flex flex-col justify-between gap-2.5 shadow-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center shrink-0">
                          {listing.labItemData ? (
                            <svg
                              width="46"
                              height="46"
                              viewBox="0 0 64 64"
                              dangerouslySetInnerHTML={{ __html: listing.labItemData.svgMarkup }}
                            />
                          ) : (
                            <span className="text-3xl">{listing.itemIcon}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-amber-700">
                            Người bán: {listing.sellerName}
                          </div>
                          <h3 className="font-bold text-sm text-[#2C3E50] truncate">
                            {listing.itemName}
                          </h3>
                          <p className="text-xs text-slate-600 line-clamp-2">{listing.itemDesc}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-200 border border-[#2C3E50] text-xs font-bold tabular-nums">
                          Giá: {listing.price}⭐
                        </span>
                        {isMine ? (
                          <button
                            type="button"
                            onClick={() => handleCancelListing(listing)}
                            className="btn btn-sm"
                            style={{ background: '#64748B' }}
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Thu hồi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBuyListing(listing)}
                            className="btn btn-sm btn-primary"
                          >
                            💰 Mua ngay
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : sellables.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-600">
              Túi đồ của bạn chưa có vật phẩm rảnh để đăng bán. (Đồ đang mặc hoặc đang trưng bày trong phòng không thể bán).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sellables.map((opt) => (
                <div
                  key={opt.uid}
                  className="rounded-xl border-2 border-[#2C3E50] bg-white p-3 flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
                      {opt.labItemData ? (
                        <svg
                          width="42"
                          height="42"
                          viewBox="0 0 64 64"
                          dangerouslySetInnerHTML={{ __html: opt.labItemData.svgMarkup }}
                        />
                      ) : (
                        <span className="text-2xl">{opt.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">{opt.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{opt.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <label className="text-xs font-bold whitespace-nowrap">Giá (⭐):</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={priceMap[opt.uid] ?? 25}
                      onChange={(e) =>
                        setPriceMap((prev) => ({
                          ...prev,
                          [opt.uid]: Number(e.target.value),
                        }))
                      }
                      className="w-20 px-2 py-1 rounded border-2 border-[#2C3E50] text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleListForSale(opt)}
                      className="btn btn-sm btn-accent flex-1"
                    >
                      📢 Niêm yết
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
