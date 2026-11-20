import React, { useEffect, useRef, useState } from 'react';
import { Music2, Volume2, VolumeX } from 'lucide-react';
import { B2KSBridge, BgmThemeId } from '../types/b2ks';
import { BGM_THEME_OPTIONS } from '../game/constants';

interface Props {
  bridge: B2KSBridge;
}

export const SoundThemePicker: React.FC<Props> = ({ bridge }) => {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = bridge.subscribe(() => setTick((t) => t + 1));
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => {
      unsub();
      document.removeEventListener('click', onDocClick);
    };
  }, [bridge]);

  const activeThemeId: BgmThemeId = bridge.getBgmTheme?.() || 'sunny_town';
  const isMuted = bridge.isAudioMuted?.() ?? false;
  const activeTheme = BGM_THEME_OPTIONS.find((t) => t.id === activeThemeId) || BGM_THEME_OPTIONS[0];

  return (
    <div ref={wrapRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          bridge.playClick();
          setOpen((v) => !v);
        }}
        className="btn"
        style={{ background: '#0D9488' }}
        title="Chọn chủ đề nhạc nền"
      >
        <Music2 className="w-3.5 h-3.5" />
        <span>{activeTheme.icon} Nhạc nền ▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border-[2.5px] border-[#2C3E50] bg-white text-[#2C3E50] shadow-xl p-2 z-[320] space-y-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-slate-200">
            <span className="text-[11px] font-extrabold text-slate-700">🎵 Chủ đề âm thanh nền</span>
            <button
              type="button"
              onClick={() => {
                bridge.toggleAudioMuted?.();
                setTick((t) => t + 1);
              }}
              className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold inline-flex items-center gap-1 border cursor-pointer ${
                isMuted
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-emerald-50 border-emerald-400 text-emerald-700'
              }`}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              <span>{isMuted ? 'Đang tắt' : 'Đang bật'}</span>
            </button>
          </div>

          {BGM_THEME_OPTIONS.map((theme) => {
            const selected = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  bridge.setBgmTheme?.(theme.id);
                  if (isMuted) {
                    bridge.toggleAudioMuted?.();
                  }
                  bridge.playClick();
                  bridge.showToast(`🎵 Đã chuyển nhạc nền: ${theme.icon} ${theme.name}`);
                  setOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg border-2 transition cursor-pointer ${
                  selected
                    ? 'bg-teal-50 border-teal-600 text-teal-950'
                    : 'bg-slate-50 border-transparent hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-xs font-bold">
                  <span>
                    {theme.icon} {theme.name}
                  </span>
                  {selected && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-600 text-white">Đang chọn</span>
                  )}
                </div>
                <div className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">{theme.desc}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
