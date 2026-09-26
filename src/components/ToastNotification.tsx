import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ExternalLink,
  Sparkles,
  FileCheck,
} from 'lucide-react';

interface ToastNotificationProps {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onClose,
  onNavigate,
}) => {
  useEffect(() => {
    if (!notification) return;

    // Auto dismiss after 7 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 7000);

    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const isSubmission = notification.type === 'submission';
  const isDeadline = notification.type === 'deadline';

  const handleClickAction = () => {
    if (notification.targetTab && onNavigate) {
      onNavigate(notification.targetTab);
    }
    onClose();
  };

  return (
    <div
      id="app-notification-toast"
      role="status"
      aria-live="polite"
      className="fixed top-16 right-4 z-50 max-w-md w-full pointer-events-auto transition-all animate-in slide-in-from-top-3 fade-in duration-300"
    >
      <div
        className={`rounded-2xl p-4 shadow-xl border backdrop-blur-md flex items-start gap-3.5 ${
          isSubmission
            ? 'bg-slate-900/95 border-emerald-500/50 text-white'
            : isDeadline
            ? 'bg-slate-900/95 border-amber-500/50 text-white'
            : 'bg-slate-900/95 border-slate-700 text-white'
        }`}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isSubmission ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
              <FileCheck size={20} className="text-emerald-300" />
            </div>
          ) : isDeadline ? (
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <Clock size={20} className="text-amber-300 animate-pulse" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
              <Sparkles size={20} className="text-blue-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isSubmission
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
              }`}
            >
              {isSubmission ? 'Pengumpulan Tugas Baru' : 'Peringatan Deadline'}
            </span>
            <span className="text-[10px] text-slate-400">Baru saja</span>
          </div>

          <h4 className="text-sm font-bold text-white mt-1 leading-snug">
            {notification.title}
          </h4>

          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          {/* Quick Action Button */}
          {notification.targetTab && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleClickAction}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isSubmission
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950'
                }`}
              >
                <span>{isSubmission ? 'Lihat Pengumpulan Tugas' : 'Buka & Kumpulkan Tugas'}</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          title="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
