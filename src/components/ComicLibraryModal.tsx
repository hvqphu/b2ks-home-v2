import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Volume2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { B2KSBridge } from '../types/b2ks';
import { DEFAULT_ACTIVITY_CONFIGS } from '../game/constants';
import {
  COMIC_BOOKS_CATALOG,
  ComicBook,
  ComicCategory,
  OPEN_COMIC_SOURCES
} from '../game/comicBooks';
import { ComicPageSvg } from './ComicPageSvg';

interface ComicLibraryModalProps {
  bridge: B2KSBridge;
  onClose: () => void;
}

const ZOOM_PRESETS = [0.75, 1, 1.35, 1.75, 2.2];

export const ComicLibraryModal: React.FC<ComicLibraryModalProps> = ({ bridge, onClose }) => {
  const [state, setState] = useState(() => bridge.getState());
  const [filter, setFilter] = useState<ComicCategory | 'completed'>('all');
  const [selectedBook, setSelectedBook] = useState<ComicBook | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showVocab, setShowVocab] = useState(true);
  const [activeSpeechIdx, setActiveSpeechIdx] = useState<number | null>(null);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});
  const [quizChoice, setQuizChoice] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = bridge.subscribe(() => {
      setState({ ...bridge.getState() });
    });
    return unsub;
  }, [bridge]);

  const user = bridge.getCurrentUser();
  const readStats = user.comicReadStats;
  const completedIds = useMemo(() => readStats?.completedIds || [], [readStats]);
  const readConfig = state.activityConfigs?.read_comic || DEFAULT_ACTIVITY_CONFIGS.read_comic;

  const filteredBooks = useMemo(() => {
    if (filter === 'all') return COMIC_BOOKS_CATALOG;
    if (filter === 'completed') {
      return COMIC_BOOKS_CATALOG.filter((b) => completedIds.includes(b.id));
    }
    return COMIC_BOOKS_CATALOG.filter((b) => b.category === filter);
  }, [filter, completedIds]);

  const stopSpeech = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setActiveSpeechIdx(null);
  }, []);

  useEffect(() => {
    return () => stopSpeech();
  }, [stopSpeech]);

  const handleOpenBook = (book: ComicBook) => {
    bridge.playClick();
    stopSpeech();
    setSelectedBook(book);
    setPageIdx(0);
    setZoom(1);
    setQuizChoice(null);
    setQuizFeedback(null);
  };

  const handleBackToShelf = () => {
    bridge.playClick();
    stopSpeech();
    setSelectedBook(null);
  };

  const handleChangePage = useCallback(
    (nextIdx: number) => {
      if (!selectedBook) return;
      const clamped = Math.max(0, Math.min(selectedBook.pages.length - 1, nextIdx));
      if (clamped === pageIdx) return;
      bridge.playClick();
      stopSpeech();
      setPageIdx(clamped);
      if (stageRef.current) {
        stageRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [selectedBook, pageIdx, bridge, stopSpeech]
  );

  const handleZoomChange = (nextZoom: number) => {
    const clamped = Math.max(0.65, Math.min(2.4, Math.round(nextZoom * 100) / 100));
    setZoom(clamped);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedBook) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleChangePage(pageIdx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleChangePage(pageIdx - 1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomChange(zoom + 0.25);
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomChange(zoom - 0.25);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBook, pageIdx, zoom, handleChangePage]);

  const handleSpeakLine = (text: string, idx?: number) => {
    if (typeof idx === 'number') {
      setActiveSpeechIdx(idx);
      window.setTimeout(() => {
        setActiveSpeechIdx((cur) => (cur === idx ? null : cur));
      }, 2800);
    }
    bridge.speakEnglish(text, 0.94);
  };

  const handleReadWholePage = () => {
    if (!selectedBook) return;
    const page = selectedBook.pages[pageIdx];
    const parts: string[] = [];
    page.panels.forEach((p) => {
      if (p.caption) parts.push(p.caption);
      p.dialogues.forEach((d) => parts.push(`${d.speaker} says: ${d.text}`));
    });
    if (parts.length > 0) {
      bridge.speakEnglish(parts.join('. '), 0.92);
    }
  };

  const handleAnswerQuiz = (idx: number) => {
    if (!selectedBook) return;
    setQuizChoice(idx);
    if (idx !== selectedBook.quiz.correctIndex) {
      bridge.playError();
      setQuizFeedback({
        correct: false,
        message: 'Chưa chính xác lắm! Hãy lật lại các trang trước để xem chi tiết rồi chọn lại nhé.'
      });
      return;
    }

    const res = bridge.claimComicReadReward?.(selectedBook.id, selectedBook.title) || {
      ok: true,
      awarded: readConfig.reward,
      msg: `Hoàn thành truyện "${selectedBook.title}"!`
    };
    setQuizFeedback({
      correct: true,
      message: res.msg
    });
  };

  const currentPage = selectedBook ? selectedBook.pages[pageIdx] : null;
  const isLastPage = Boolean(selectedBook && pageIdx === selectedBook.pages.length - 1);

  return (
    <div className="fixed inset-0 z-[245] flex items-center justify-center bg-black/75 p-2 sm:p-3">
      <div
        className={`w-full flex flex-col rounded-2xl border-[3px] border-[#2C3E50] bg-[#FAF6EE] text-[#1E293B] shadow-2xl overflow-hidden ${
          selectedBook ? 'max-w-6xl h-[94dvh]' : 'max-w-5xl max-h-[91dvh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#1E293B] text-white border-b-[3px] border-[#0F172A] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedBook && (
              <button
                type="button"
                onClick={handleBackToShelf}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Tủ sách</span>
              </button>
            )}
            <BookOpen className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {selectedBook ? selectedBook.title : 'Tủ Sách Truyện Tranh Tiếng Anh Gia Đình'}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                {selectedBook
                  ? `${selectedBook.ageLevel} · Nhấn vào bong bóng thoại để nghe phát âm`
                  : 'Chọn một cuốn truyện tranh Tiếng Anh (phù hợp tuổi 11–13) để đọc & nhận sao thưởng'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="points-pill text-xs">{user.points}⭐</span>
            <button
              type="button"
              onClick={() => {
                bridge.playClick();
                stopSpeech();
                onClose();
              }}
              className="p-2 rounded-lg bg-white text-[#1E293B] hover:bg-slate-100 cursor-pointer"
              aria-label="Đóng tủ sách"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LIBRARY SHELF VIEW */}
        {!selectedBook && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Top summary & filter bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-300">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                {(
                  [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'science', label: 'Khoa học & STEM' },
                    { id: 'fantasy', label: 'Phiêu lưu' },
                    { id: 'mystery', label: 'Bí ẩn & Code' },
                    { id: 'completed', label: `Đã đọc (${completedIds.length})` }
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      bridge.playClick();
                      setFilter(item.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                      filter === item.id
                        ? 'bg-white text-[#1E293B] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-700 font-semibold tabular-nums">
                {readConfig.enabled
                  ? `Phần thưởng đọc xong: +${readConfig.reward}⭐ / truyện · Tối đa ${readConfig.maxPerDay ?? 5} truyện/ngày`
                  : 'Hoạt động thưởng sao đọc truyện đang tạm tắt bởi Phụ huynh'}
              </div>
            </div>

            {/* Book Grid */}
            {filteredBooks.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-600">
                Bạn chưa đọc xong cuốn truyện nào. Hãy chọn một cuốn truyện ở mục Tất cả để bắt đầu nhé!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBooks.map((book) => {
                  const isCompleted = completedIds.includes(book.id);
                  const coverFailed = brokenCovers[book.id];
                  return (
                    <div
                      key={book.id}
                      className="flex flex-col rounded-2xl border-2 border-[#2C3E50] bg-white overflow-hidden shadow-sm"
                    >
                      <div className="relative aspect-[3/4] max-h-64 w-full bg-slate-900 overflow-hidden">
                        {!coverFailed ? (
                          <img
                            src={book.coverImage}
                            alt={book.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setBrokenCovers((prev) => ({ ...prev, [book.id]: true }))
                            }
                            className="w-full h-full object-cover object-center"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex flex-col items-center justify-center p-4 text-white text-center"
                            style={{ backgroundColor: book.accentColor }}
                          >
                            <BookOpen className="w-12 h-12 mb-2 opacity-90" />
                            <div className="font-bold text-base">{book.title}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 p-3.5 flex flex-col justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                            <span>
                              {book.categoryLabel} · {book.pages.length} trang
                            </span>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã đọc
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-base text-[#1E293B] leading-snug">
                            {book.title}
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {book.summaryVi}
                          </p>
                          <div className="text-[11px] text-slate-500 pt-0.5">
                            {book.ageLevel} · {book.sourceCredit}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                          <span className="text-xs font-bold text-amber-700 tabular-nums">
                            {readConfig.enabled ? `Thưởng +${readConfig.reward}⭐` : 'Đọc tự do'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenBook(book)}
                            className="btn btn-sm btn-primary whitespace-nowrap"
                          >
                            {isCompleted ? '📖 Đọc lại' : '📖 Mở đọc truyện'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Open Comic Sources Info */}
            <div className="rounded-xl border border-slate-300 bg-[#F3EDE0] p-3.5 space-y-2">
              <div className="font-bold text-xs sm:text-sm text-[#1E293B]">
                📚 Nguồn truyện tranh Tiếng Anh bản quyền mở (CC-BY) tham khảo thêm cho lứa tuổi 11–13:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {OPEN_COMIC_SOURCES.map((src) => (
                  <div
                    key={src.name}
                    className="rounded-lg bg-white/90 border border-slate-200 p-2.5 text-xs space-y-1"
                  >
                    <div className="font-bold text-teal-800">{src.name}</div>
                    <div className="text-slate-600 leading-snug">{src.desc}</div>
                    <div className="text-[11px] font-mono text-slate-500">{src.urlLabel}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LARGE COMIC BOOK READER VIEW */}
        {selectedBook && currentPage && (
          <>
            {/* Reader Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#EFE8D8] border-b-2 border-[#2C3E50] shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom - 0.25)}
                  disabled={zoom <= 0.65}
                  className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  <span>Thu nhỏ</span>
                </button>

                <div className="flex items-center gap-1 bg-white border-2 border-[#2C3E50] rounded-lg px-1.5 py-0.5">
                  {ZOOM_PRESETS.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => handleZoomChange(z)}
                      className={`px-2 py-1 rounded text-[11px] font-bold tabular-nums cursor-pointer ${
                        Math.abs(zoom - z) < 0.08
                          ? 'bg-[#2C3E50] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleZoomChange(zoom + 0.25)}
                  disabled={zoom >= 2.4}
                  className="px-2.5 py-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                  title="Phóng to (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Phóng to</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleZoomChange(1)}
                  className="p-1.5 rounded-lg border-2 border-[#2C3E50] bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Đặt lại 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReadWholePage}
                  className="btn btn-sm btn-accent whitespace-nowrap"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Đọc cả trang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowVocab((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg border-2 border-[#2C3E50] text-xs font-bold whitespace-nowrap cursor-pointer ${
                    showVocab ? 'bg-amber-300 text-[#1E293B]' : 'bg-white text-[#1E293B]'
                  }`}
                >
                  Từ vựng ({currentPage.vocab.length})
                </button>
              </div>
            </div>

            {/* Main Reader Workspace: Large Comic Viewport + Optional Vocabulary Drawer */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              <div
                ref={stageRef}
                className="flex-1 overflow-auto bg-[#263238] p-3 sm:p-5"
              >
                <div
                  className="mx-auto transition-all duration-150"
                  style={{ width: `${Math.round(740 * zoom)}px`, maxWidth: 'none' }}
                >
                  <ComicPageSvg
                    page={currentPage}
                    accentColor={selectedBook.accentColor}
                    activeSpeechIdx={activeSpeechIdx}
                    onSpeakLine={handleSpeakLine}
                  />
                </div>

                {/* Final Page Comprehension Check & Star Claim */}
                {isLastPage && (
                  <div className="max-w-2xl mx-auto mt-5 rounded-2xl border-[3px] border-[#2C3E50] bg-[#FFFBEB] p-4 sm:p-5 space-y-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-base text-[#1E293B]">
                        🎉 Đọc xong trang cuối! Trả lời nhanh 1 câu hỏi để nhận{' '}
                        {readConfig.enabled ? `+${readConfig.reward}⭐` : 'huy hiệu'}
                      </h3>
                      <span className="text-xs text-slate-600 font-semibold">
                        Quick Comprehension Check
                      </span>
                    </div>

                    <p className="text-sm font-bold text-[#0F172A]">{selectedBook.quiz.question}</p>

                    <div className="space-y-2">
                      {selectedBook.quiz.options.map((opt, oi) => {
                        const isPicked = quizChoice === oi;
                        const isRight = oi === selectedBook.quiz.correctIndex;
                        let btnCls = 'bg-white border-[#2C3E50] text-[#1E293B] hover:bg-slate-50';
                        if (quizFeedback && isPicked) {
                          btnCls = isRight
                            ? 'bg-emerald-100 border-emerald-700 text-emerald-950'
                            : 'bg-rose-100 border-rose-600 text-rose-950';
                        }
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => handleAnswerQuiz(oi)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${btnCls}`}
                          >
                            {String.fromCharCode(65 + oi)}. {opt}
                          </button>
                        );
                      })}
                    </div>

                    {quizFeedback && (
                      <div
                        className={`rounded-xl p-3 text-xs sm:text-sm font-semibold border-2 ${
                          quizFeedback.correct
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                            : 'bg-rose-50 border-rose-500 text-rose-900'
                        }`}
                      >
                        <div>{quizFeedback.message}</div>
                        {quizFeedback.correct && (
                          <div className="mt-1 text-slate-700 font-normal">
                            💡 {selectedBook.quiz.explanationVi}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grade 6-7 Vocabulary Helper Sidebar */}
              {showVocab && (
                <aside className="w-full lg:w-72 border-t-2 lg:border-t-0 lg:border-l-2 border-[#2C3E50] bg-[#FAF6EE] p-3.5 overflow-y-auto shrink-0 max-h-48 lg:max-h-none space-y-2.5">
                  <div className="font-bold text-xs uppercase tracking-wide text-slate-600">
                    Từ vựng trang {currentPage.pageNumber}
                  </div>
                  {currentPage.vocab.map((v) => (
                    <div
                      key={v.word}
                      className="rounded-xl border border-slate-300 bg-white p-2.5 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-[#1E293B]">{v.word}</span>{' '}
                          <span className="text-[11px] text-slate-500">({v.pos})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => bridge.speakEnglish(v.word, 0.85)}
                          className="p-1.5 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 cursor-pointer"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-700">{v.meaningVi}</div>
                    </div>
                  ))}
                </aside>
              )}
            </div>

            {/* Bottom Page Turning Footer */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#EFE8D8] border-t-2 border-[#2C3E50] shrink-0">
              <button
                type="button"
                onClick={() => handleChangePage(pageIdx - 1)}
                disabled={pageIdx === 0}
                className="btn btn-sm bg-slate-700 text-white disabled:opacity-40 whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {selectedBook.pages.map((p, idx) => (
                  <button
                    key={p.pageNumber}
                    type="button"
                    onClick={() => handleChangePage(idx)}
                    className={`w-8 h-8 rounded-lg border-2 font-bold text-xs tabular-nums cursor-pointer ${
                      idx === pageIdx
                        ? 'bg-[#2C3E50] border-[#0F172A] text-white'
                        : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.pageNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleChangePage(pageIdx + 1)}
                disabled={isLastPage}
                className="btn btn-sm btn-primary disabled:opacity-40 whitespace-nowrap"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
