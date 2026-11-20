import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="btn btn-sm"
        style={{ background: '#0284C7', color: '#FFF' }}
        title="Cài đặt ứng dụng B2KS ra màn hình chính"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Cài App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="btn btn-sm"
          style={{ background: '#0284C7', color: '#FFF' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Cài App iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl border-[3px] border-[#2C3E50] bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b-2 border-[#2C3E50] pb-2 mb-3">
                <h3 className="text-base font-bold text-[#2C3E50]">Cài B2KS lên iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                1. Bấm nút <strong>Chia sẻ (Share)</strong> ở thanh công cụ Safari.<br />
                2. Cuộn xuống và chọn <strong>Thêm vào Màn hình chính (Add to Home Screen)</strong>.<br />
                3. Bấm <strong>Thêm</strong> để chơi toàn màn hình như App riêng!
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="btn btn-primary w-full mt-4"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 right-3 z-[250] flex items-center gap-2 rounded-lg border-2 border-[#2C3E50] bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-md">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Đang Offline — Dùng dữ liệu đã lưu</span>
    </div>
  );
};
