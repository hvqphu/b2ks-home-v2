import React, { useState } from 'react';
import { Eye, EyeOff, Home, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { B2KSBridge } from '../types/b2ks';

interface Props {
  bridge: B2KSBridge;
  onUnlocked: (familyName: string) => void;
}

export const GamePasswordGate: React.FC<Props> = ({ bridge, onUnlocked }) => {
  const [familyName, setFamilyName] = useState<string>(() => bridge.getLastLoginFamilyName?.() || 'B2KS');
  const [password, setPassword] = useState<string>('');
  const [showPw, setShowPw] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const cleanFamily = familyName.trim() || 'B2KS';
    const cleanPw = password.trim();
    if (!cleanPw) {
      bridge.playError();
      setErrorMsg('⚠️ Vui lòng nhập mật khẩu gia đình (mặc định lần đầu: 1111).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (!bridge.authenticateFamilyLogin) {
        bridge.setGameUnlocked?.(true);
        onUnlocked(cleanFamily);
        return;
      }
      const res = await bridge.authenticateFamilyLogin(cleanFamily, cleanPw);
      if (res.ok) {
        bridge.showToast(res.msg);
        onUnlocked(bridge.getFamilyName?.() || res.familyName || cleanFamily);
      } else {
        setErrorMsg(res.msg);
      }
    } catch {
      setErrorMsg('❌ Không thể xác thực lúc này. Hãy thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-login-heading"
    >
      <div className="w-full max-w-md rounded-2xl border-[3px] border-[#2C3E50] bg-[#FFFDF7] text-[#2C3E50] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-[#0F766E] via-[#0284C7] to-[#2563EB] text-white border-b-[3px] border-[#2C3E50]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 border-2 border-white/40 flex items-center justify-center text-2xl shrink-0">
              🏡
            </div>
            <div>
              <h1 id="family-login-heading" className="text-base sm:text-lg font-extrabold tracking-tight">
                Đăng Nhập Khu Phố Gia Đình
              </h1>
              <p className="text-xs text-sky-100 mt-0.5">
                Nhập tên gia đình &amp; mật khẩu để vào đúng khu phố của nhà mình
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-family-name"
              className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-700"
            >
              <Home className="w-3.5 h-3.5 text-teal-600" />
              <span>Tên gia đình</span>
            </label>
            <input
              id="login-family-name"
              type="text"
              value={familyName}
              onChange={(e) => {
                setFamilyName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="VD: B2KS"
              maxLength={24}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#2C3E50] bg-white text-sm font-bold text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[11px] text-slate-500 leading-snug">
              Mặc định của gia đình hiện tại là <strong>B2KS</strong>. Chỉ Admin (Bố B2KS) mới có quyền tạo khu phố mới; nhập tên chưa tồn tại sẽ không vào được game.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-family-password"
              className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-700"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Mật khẩu vào game</span>
            </label>
            <div className="relative">
              <input
                id="login-family-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Nhập mật khẩu khu phố..."
                maxLength={24}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border-2 border-[#2C3E50] bg-white text-sm font-bold text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                title={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              Lần đầu sử dụng mật khẩu mặc định là{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-200 font-extrabold text-amber-950">1111</code>.
              Mật khẩu này dùng chung cho tất cả thành viên (khác với Passcode Phụ huynh). Phụ huynh có thể xem &amp; đổi lại trong bảng <b>Phụ Huynh</b>.
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border-2 border-rose-400 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full justify-center py-2.5 text-sm font-extrabold disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Đang kiểm tra...' : 'Vào Khu Phố Ngay ▶'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
