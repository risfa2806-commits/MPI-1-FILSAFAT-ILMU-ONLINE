import React, { useState, useEffect } from 'react';
import { TaskDeadlineItem } from '../types';
import { formatTimeRemaining, dismissDeadlineBanner } from '../utils/deadlineNotifier';
import {
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Send,
  SlidersHorizontal,
} from 'lucide-react';

interface TopDeadlineBannerProps {
  urgentDeadlines: TaskDeadlineItem[];
  onNavigateTab: (tab: string) => void;
  onOpenDeadlineSettings?: () => void;
  isSimulated?: boolean;
  onToggleSimulation?: (enabled: boolean) => void;
  isDosen?: boolean;
}

export const TopDeadlineBanner: React.FC<TopDeadlineBannerProps> = ({
  urgentDeadlines = [],
  onNavigateTab,
  onOpenDeadlineSettings,
  isSimulated = false,
  onToggleSimulation,
  isDosen = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [countdownStr, setCountdownStr] = useState('');

  const activeItem = urgentDeadlines[currentIndex] || urgentDeadlines[0];

  // Update countdown live every 30 seconds
  useEffect(() => {
    if (!activeItem) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(activeItem.deadlineIso).getTime();
      const diffMs = target - now;

      if (diffMs <= 0) {
        setCountdownStr('Batas waktu telah berakhir');
        return;
      }

      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setCountdownStr(formatTimeRemaining(hours, mins));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 30000);
    return () => clearInterval(timer);
  }, [activeItem]);

  if (isDismissed || !activeItem) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    dismissDeadlineBanner(2); // dismiss for 2 hours
  };

  const handleGoToTask = () => {
    if (activeItem.targetTab) {
      onNavigateTab(activeItem.targetTab);
    }
  };

  const isVeryUrgent = activeItem.isVeryUrgent || activeItem.hoursRemaining < 6;

  return (
    <div
      id="top-deadline-reminder-banner"
      role="alert"
      className={`relative z-50 text-xs transition-all duration-300 border-b shadow-sm ${
        isVeryUrgent
          ? 'bg-gradient-to-r from-rose-950 via-slate-950 to-rose-950 border-rose-500/50 text-rose-100'
          : 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-amber-500/50 text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        
        {/* Left Info with pulsing icon */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <span className="flex h-7 w-7 rounded-lg items-center justify-center bg-rose-500/20 text-rose-400 border border-rose-400/30">
              <Clock size={16} className="animate-pulse text-amber-300" />
            </span>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full border ${
                  isVeryUrgent
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/40'
                    : 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                }`}
              >
                <AlertTriangle size={11} className="text-amber-300" />
                <span>Deadline &lt; 24 Jam</span>
              </span>

              {/* Countdown Live Badge */}
              <span className="font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10 text-[11px]">
                ⏳ {countdownStr || `${activeItem.hoursRemaining} jam lagi`}
              </span>

              {isDosen && isSimulated && (
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-400/30">
                  Mode Simulasi Dosen
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-white truncate mt-0.5">
              <span className="text-amber-300 font-bold">{activeItem.title}</span>
              {activeItem.studentName && (
                <span className="text-slate-300 font-normal ml-1">
                  • Mahasiswa: <strong className="text-white">{activeItem.studentName}</strong>
                </span>
              )}
              <span className="text-slate-400 font-normal ml-1.5 hidden md:inline">
                (Batas: {activeItem.deadlineFormatted})
              </span>
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {/* Multiple items switcher if > 1 */}
          {urgentDeadlines.length > 1 && (
            <div className="text-[11px] text-slate-300 font-medium mr-1 hidden sm:inline">
              {currentIndex + 1} dari {urgentDeadlines.length}
              <button
                onClick={() => setCurrentIndex((currentIndex + 1) % urgentDeadlines.length)}
                className="ml-1.5 underline hover:text-white"
              >
                Berikutnya
              </button>
            </div>
          )}

          {/* Quick Submission CTA button */}
          <button
            id="btn-banner-submit-task"
            onClick={handleGoToTask}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Buka halaman pengumpulan tugas"
          >
            <Send size={13} />
            <span>Kumpulkan Tugas</span>
            <ChevronRight size={14} />
          </button>

          {/* Settings / Simulation configure (Khusus Dosen) */}
          {isDosen && onOpenDeadlineSettings && (
            <button
              onClick={onOpenDeadlineSettings}
              className="p-1.5 text-amber-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Khusus Dosen: Atur tenggat waktu & simulasi deadline"
            >
              <SlidersHorizontal size={14} />
            </button>
          )}

          {/* Close / Dismiss Banner */}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup pengingat ini sementara (2 jam)"
          >
            <X size={15} />
          </button>
        </div>

      </div>
    </div>
  );
};
