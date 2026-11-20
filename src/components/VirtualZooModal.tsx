import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Volume2, X, ArrowLeft, BookOpen } from 'lucide-react';
import { B2KSBridge, ZooAnimal } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onClose: () => void;
}

interface WordTranslationCacheEntry {
  vi: string;
  phonetic?: string;
}

interface TooltipState {
  word: string;
  vi: string;
  phonetic?: string;
  loading: boolean;
  x: number;
  y: number;
}

const WORD_CACHE_KEY = 'b2ks_word_cache_v1';
const WIKI_IMG_CACHE_KEY = 'b2ks_wiki_img_cache_v1';

const OFFLINE_MINI_DICT: Record<string, string> = {
  giant: 'khổng lồ',
  panda: 'gấu trúc',
  lives: 'sống',
  bamboo: 'cây tre',
  forests: 'rừng rậm',
  china: 'Trung Quốc',
  eating: 'ăn',
  fresh: 'tươi',
  green: 'xanh lá',
  tree: 'cây',
  climber: 'người/loài leo trèo',
  famous: 'nổi tiếng',
  huge: 'to lớn',
  bright: 'tươi sáng',
  orange: 'màu cam',
  beak: 'cái mỏ',
  colorful: 'đầy màu sắc',
  bird: 'con chim',
  sweet: 'ngọt ngào',
  fruit: 'trái cây',
  frog: 'con ếch',
  sleeps: 'ngủ',
  leaves: 'lá cây',
  night: 'ban đêm',
  eyes: 'đôi mắt',
  lion: 'sư tử',
  king: 'vua',
  savanna: 'thảo nguyên',
  family: 'gia đình',
  giraffe: 'hươu cao cổ',
  tallest: 'cao nhất',
  animal: 'động vật',
  earth: 'Trái Đất',
  neck: 'cái cổ',
  elephant: 'con voi',
  largest: 'lớn nhất',
  trunk: 'vòi voi',
  water: 'nước',
  cheetah: 'báo gê-pa',
  fastest: 'nhanh nhất',
  dolphin: 'cá heo',
  ocean: 'đại dương',
  playful: 'tinh nghịch',
  fish: 'con cá',
  turtle: 'con rùa',
  whale: 'cá voi',
  clownfish: 'cá hề',
  polar: 'vùng cực',
  bear: 'con gấu',
  fox: 'con cáo',
  owl: 'con cú',
  narwhal: 'kỳ lân biển',
  snow: 'tuyết',
  ice: 'băng giá',
  arctic: 'Bắc Cực',
  swim: 'bơi lội',
  swimmers: 'vận động viên bơi',
  warm: 'ấm áp',
  fur: 'lông thú',
  winter: 'mùa đông',
  summer: 'mùa hè',
};

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const VirtualZooModal: React.FC<Props> = ({ bridge, onClose }) => {
  const [animals, setAnimals] = useState<ZooAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [ecosystem, setEcosystem] = useState<string>('Tất cả');
  const [selectedAnimal, setSelectedAnimal] = useState<ZooAnimal | null>(null);
  const [wikiImages, setWikiImages] = useState<Record<string, string>>(() =>
    loadJsonStorage<Record<string, string>>(WIKI_IMG_CACHE_KEY, {})
  );
  const [wordCache, setWordCache] = useState<Record<string, WordTranslationCacheEntry>>(() =>
    loadJsonStorage<Record<string, WordTranslationCacheEntry>>(WORD_CACHE_KEY, {})
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeTokenIdx, setActiveTokenIdx] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const detailContainerRef = useRef<HTMLDivElement | null>(null);
  const user = bridge.getCurrentUser();
  const unlockedIds = user.unlockedZooAnimals || [];

  useEffect(() => {
    let active = true;
    fetch('./animals.json')
      .then((res) => res.json())
      .then((data: ZooAnimal[]) => {
        if (!active) return;
        setAnimals(data);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Fetch Wikipedia REST API summary images lazily and cache them
  useEffect(() => {
    if (animals.length === 0) return;
    let cancelled = false;

    const fetchMissingImages = async () => {
      const updated = { ...wikiImages };
      let changed = false;

      for (const a of animals) {
        if (updated[a.id]) continue;
        try {
          const resp = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(a.wikiTitle)}`
          );
          if (!resp.ok) continue;
          const json = (await resp.json()) as {
            thumbnail?: { source?: string };
            originalimage?: { source?: string };
          };
          const imgUrl = json.thumbnail?.source || json.originalimage?.source;
          if (imgUrl && !cancelled) {
            updated[a.id] = imgUrl;
            changed = true;
            setWikiImages((prev) => ({ ...prev, [a.id]: imgUrl }));
          }
        } catch {
          // Offline or blocked; fallback emoji/card handles cleanly
        }
      }

      if (changed && !cancelled) {
        try {
          localStorage.setItem(WIKI_IMG_CACHE_KEY, JSON.stringify(updated));
        } catch {
          // ignore quota error
        }
      }
    };

    fetchMissingImages();
    return () => {
      cancelled = true;
    };
  }, [animals]);

  const ecosystems = useMemo(() => {
    const set = new Set<string>(['Tất cả']);
    animals.forEach((a) => set.add(a.ecosystem));
    return Array.from(set);
  }, [animals]);

  const filteredAnimals = useMemo(() => {
    if (ecosystem === 'Tất cả') return animals;
    return animals.filter((a) => a.ecosystem === ecosystem);
  }, [animals, ecosystem]);

  const handleUnlockAnimal = (animal: ZooAnimal) => {
    if (unlockedIds.includes(animal.id)) {
      setSelectedAnimal(animal);
      setTooltip(null);
      setActiveTokenIdx(null);
      return;
    }
    if (user.points < animal.unlockCost) {
      bridge.playError();
      bridge.showToast(`❌ Cần ${animal.unlockCost}⭐ để mở khóa chuồng ${animal.nameVi}!`);
      return;
    }

    user.points -= animal.unlockCost;
    if (!Array.isArray(user.unlockedZooAnimals)) user.unlockedZooAnimals = [];
    user.unlockedZooAnimals.push(animal.id);

    bridge.logActivity({
      memberId: user.id,
      memberName: user.name,
      action: 'zoo_unlock',
      detail: `Mở khóa ${animal.nameVi} (${animal.nameEn}) tại Sở Thú Ảo (-${animal.unlockCost}⭐)`,
    });

    bridge.saveGame(true);
    bridge.updateHUD();
    bridge.playSuccess();
    bridge.triggerConfetti();
    bridge.triggerSpeechBubble(user, `Unlocked ${animal.nameEn} in ${bridge.getFamilyName?.() || 'B2KS'} Zoo! ${animal.emoji}`, true);
    bridge.showToast(`🦁 Tuyệt vời! Đã mở khóa ${animal.nameVi} (${animal.nameEn})!`);
    setSelectedAnimal(animal);
    setTooltip(null);
    setActiveTokenIdx(null);
    setTick((t) => t + 1);
  };

  const handleTokenClick = async (
    rawWord: string,
    tokenIdx: number,
    event: React.MouseEvent<HTMLSpanElement>
  ) => {
    const cleanWord = rawWord.replace(/[^A-Za-z'-]/g, '').toLowerCase();
    if (!cleanWord) return;

    // 1. Pronounce immediately at 0.85 rate
    bridge.speakEnglish(cleanWord, 0.85);
    setActiveTokenIdx(tokenIdx);

    // Calculate tooltip position right above the tapped word
    const spanRect = event.currentTarget.getBoundingClientRect();
    const containerRect = detailContainerRef.current?.getBoundingClientRect();
    const relX = containerRect
      ? spanRect.left - containerRect.left + spanRect.width / 2
      : spanRect.left;
    const relY = containerRect
      ? spanRect.top - containerRect.top
      : spanRect.top;

    // 2. Check cache
    const cached = wordCache[cleanWord];
    if (cached) {
      setTooltip({
        word: cleanWord,
        vi: cached.vi,
        phonetic: cached.phonetic,
        loading: false,
        x: relX,
        y: relY,
      });
      return;
    }

    setTooltip({
      word: cleanWord,
      vi: 'Đang dịch...',
      loading: true,
      x: relX,
      y: relY,
    });

    let translatedVi = '';
    let phoneticText = '';

    try {
      const [transRes, dictRes] = await Promise.allSettled([
        fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`
        ).then((r) => r.json()),
        fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
        ).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (transRes.status === 'fulfilled' && transRes.value?.responseData?.translatedText) {
        translatedVi = String(transRes.value.responseData.translatedText).trim();
      }
      if (dictRes.status === 'fulfilled' && Array.isArray(dictRes.value) && dictRes.value[0]) {
        const entry = dictRes.value[0] as { phonetic?: string; phonetics?: { text?: string }[] };
        phoneticText =
          entry.phonetic || entry.phonetics?.find((p) => p.text)?.text || '';
      }
    } catch {
      // ignore network failure
    }

    if (!translatedVi || translatedVi.toLowerCase() === cleanWord) {
      translatedVi = OFFLINE_MINI_DICT[cleanWord] || `(Từ tiếng Anh: ${cleanWord})`;
    }

    const entryData: WordTranslationCacheEntry = {
      vi: translatedVi,
      phonetic: phoneticText || undefined,
    };

    const nextCache = { ...wordCache, [cleanWord]: entryData };
    setWordCache(nextCache);
    try {
      localStorage.setItem(WORD_CACHE_KEY, JSON.stringify(nextCache));
    } catch {
      // ignore storage quota
    }

    setTooltip((prev) =>
      prev && prev.word === cleanWord
        ? {
            ...prev,
            vi: translatedVi,
            phonetic: phoneticText || undefined,
            loading: false,
          }
        : prev
    );
  };

  const tokenizeDescription = (text: string) => {
    const tokens = text.match(/([A-Za-z]+(?:[-'][A-Za-z]+)*|[^A-Za-z]+)/g) || [];
    return tokens.map((tok, idx) => {
      if (/^[A-Za-z]/.test(tok)) {
        return (
          <span
            key={idx}
            className={`word-token ${activeTokenIdx === idx ? 'active-token' : ''}`}
            onClick={(e) => handleTokenClick(tok, idx, e)}
            title="Chạm để nghe phát âm & dịch nghĩa tiếng Việt"
          >
            {tok}
          </span>
        );
      }
      return <span key={idx}>{tok}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-3">
      <div className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#F4FBF6] text-[#2C3E50] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#15803D] to-[#0D9488] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🦁</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Sở Thú Ảo {bridge.getFamilyName?.() || 'B2KS'} (Virtual Zoo)</h2>
              <p className="text-xs text-emerald-100">
                Mở khóa loài vật bằng xu &amp; chạm vào từng từ tiếng Anh để nghe và dịch tức thì
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-300 text-slate-900 font-bold text-xs border-2 border-[#2C3E50] tabular-nums">
              {unlockedIds.length}/{animals.length} Loài · {user.points}⭐
            </span>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white text-[#2C3E50] hover:bg-emerald-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ecosystem Filter Bar */}
        {!selectedAnimal && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100/80 border-b-2 border-[#2C3E50] overflow-x-auto">
            {ecosystems.map((eco) => (
              <button
                key={eco}
                type="button"
                onClick={() => {
                  bridge.playClick();
                  setEcosystem(eco);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold border-2 border-[#2C3E50] whitespace-nowrap shrink-0 transition ${
                  ecosystem === eco
                    ? 'bg-[#15803D] text-white'
                    : 'bg-white text-[#2C3E50] hover:bg-emerald-50'
                }`}
              >
                {eco}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-sm font-semibold text-emerald-800">
              Đang tải bản đồ Sở Thú Ảo...
            </div>
          ) : selectedAnimal ? (
            <div
              ref={detailContainerRef}
              className="relative bg-white rounded-2xl border-[2.5px] border-[#2C3E50] p-4 space-y-4 shadow-sm"
            >
              {/* Floating Quick Word Translation Tooltip */}
              {tooltip && (
                <div
                  style={{
                    left: `${Math.max(90, Math.min(tooltip.x, (detailContainerRef.current?.clientWidth || 500) - 90))}px`,
                    top: `${Math.max(12, tooltip.y - 10)}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="absolute z-30 min-w-[160px] max-w-[240px] rounded-xl border-2 border-[#2C3E50] bg-[#1E293B] text-white px-3 py-2 shadow-xl text-center pointer-events-auto"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-300 font-bold">
                    <span>{tooltip.word}</span>
                    {tooltip.phonetic && (
                      <span className="font-normal text-sky-300">{tooltip.phonetic}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setTooltip(null)}
                      className="text-slate-300 hover:text-white ml-1"
                    >
                      ✖
                    </button>
                  </div>
                  <div className="text-sm font-bold text-emerald-300 mt-0.5">
                    {tooltip.loading ? '⏳ Đang tra nghĩa...' : tooltip.vi}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    bridge.playClick();
                    setSelectedAnimal(null);
                    setTooltip(null);
                  }}
                  className="btn btn-sm"
                  style={{ background: '#334155' }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại chuồng thú</span>
                </button>
                <span className="text-xs font-bold text-emerald-700">
                  Hệ sinh thái: {selectedAnimal.ecosystem}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="rounded-xl overflow-hidden border-2 border-[#2C3E50] bg-emerald-50 aspect-[4/3] flex items-center justify-center relative">
                  {wikiImages[selectedAnimal.id] ? (
                    <img
                      src={wikiImages[selectedAnimal.id]}
                      alt={selectedAnimal.nameEn}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <span className="text-7xl mb-2">{selectedAnimal.emoji}</span>
                      <span className="text-xs text-slate-600 font-semibold">
                        {selectedAnimal.nameEn}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-teal-700">
                      {selectedAnimal.emoji} {selectedAnimal.nameVi}
                    </div>
                    <h3 className="text-2xl font-bold text-[#2C3E50]">{selectedAnimal.nameEn}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => bridge.speakEnglish(selectedAnimal.nameEn, 0.85)}
                      className="btn btn-sm btn-accent"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Đọc tên loài</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => bridge.speakEnglish(selectedAnimal.description, 0.85)}
                      className="btn btn-sm btn-primary"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Nghe cả đoạn văn</span>
                    </button>
                  </div>

                  <div className="rounded-xl border-2 border-teal-600/40 bg-teal-50/70 p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 mb-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Chạm vào bất kỳ từ tiếng Anh nào để nghe &amp; dịch nghĩa:</span>
                    </div>
                    <p className="text-base leading-relaxed text-slate-800 font-medium">
                      {tokenizeDescription(selectedAnimal.description)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAnimals.map((animal) => {
                const isUnlocked = unlockedIds.includes(animal.id);
                const imgSrc = wikiImages[animal.id];
                return (
                  <div
                    key={animal.id}
                    className={`rounded-xl border-[2.5px] border-[#2C3E50] p-3 flex flex-col justify-between gap-2.5 transition ${
                      isUnlocked ? 'bg-white shadow-sm' : 'bg-slate-200/90'
                    }`}
                  >
                    <div className="relative rounded-lg overflow-hidden border-2 border-[#2C3E50] bg-slate-800 aspect-[4/3] flex items-center justify-center">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={isUnlocked ? animal.nameEn : 'Mystery Animal'}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover transition duration-300 ${
                            isUnlocked ? '' : 'brightness-0 contrast-150 opacity-85 scale-105'
                          }`}
                        />
                      ) : (
                        <span
                          className={`text-6xl select-none ${
                            isUnlocked ? '' : 'brightness-0 contrast-200 opacity-80'
                          }`}
                        >
                          {animal.emoji}
                        </span>
                      )}

                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-slate-950/35 flex flex-col items-center justify-center text-white p-2 text-center">
                          <Lock className="w-7 h-7 mb-1 text-amber-300" />
                          <span className="text-xs font-bold">Chưa mở khóa</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-emerald-700">
                        {animal.ecosystem}
                      </div>
                      <h3 className="font-bold text-sm text-[#2C3E50]">
                        {isUnlocked ? `${animal.emoji} ${animal.nameVi} (${animal.nameEn})` : '❓ Loài Vật Bí Ẩn'}
                      </h3>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => {
                          bridge.playClick();
                          setSelectedAnimal(animal);
                          setTooltip(null);
                          setActiveTokenIdx(null);
                        }}
                        className="btn btn-sm w-full"
                        style={{ background: '#0D9488' }}
                      >
                        📖 Khám phá &amp; Học từ vựng
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnlockAnimal(animal)}
                        className="btn btn-sm btn-accent w-full"
                      >
                        🔓 Mua vé mở khóa ({animal.unlockCost}⭐)
                      </button>
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
