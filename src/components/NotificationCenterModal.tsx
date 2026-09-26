import React, { useState, useEffect } from 'react';
import { TaskDeadlineItem, AppNotification, Student } from '../types';
import {
  Bell,
  Clock,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  X,
  ExternalLink,
  Check,
  SlidersHorizontal,
  Send,
  Sparkles,
  Calendar,
  Layers,
  User,
  Trash2,
  Award,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  urgentDeadlines: TaskDeadlineItem[];
  allDeadlines: TaskDeadlineItem[];
  submissionsFeed: AppNotification[];
  currentStudent: Student | null;
  isDosen: boolean;
  onNavigateTab: (tab: string) => void;
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: string) => void;
  isSimulated: boolean;
  onToggleSimulation: (enabled: boolean) => void;
  onTriggerTestSubmissionNotif: () => void;
  onTriggerTestDeadlineNotif: () => void;
  onSetCustomDeadline: (taskId: string, isoDate: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  urgentDeadlines = [],
  allDeadlines = [],
  submissionsFeed = [],
  currentStudent,
  isDosen,
  onNavigateTab,
  onMarkAllRead,
  onMarkSingleRead,
  isSimulated,
  onToggleSimulation,
  onTriggerTestSubmissionNotif,
  onTriggerTestDeadlineNotif,
  onSetCustomDeadline,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'deadlines' | 'submissions' | 'grades' | 'settings'>('all');

  const gradesFeed = submissionsFeed.filter(s => s.type === 'grade');
  const taskSubmissionsFeed = submissionsFeed.filter(s => s.type !== 'grade');

  // Filtered submissions list based on active tab
  const displayedSubmissions = activeFilter === 'grades'
    ? gradesFeed
    : activeFilter === 'submissions'
    ? taskSubmissionsFeed
    : submissionsFeed;

  // Ensure student cannot access settings filter
  useEffect(() => {
    if (!isDosen && activeFilter === 'settings') {
      setActiveFilter('all');
    }
  }, [isDosen, activeFilter]);
  const [customTaskId, setCustomTaskId] = useState<string>('meeting-2');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    const d = new Date(Date.now() + 14 * 3600 * 1000); // 14 hours from now (< 24h)
    return d.toISOString().slice(0, 16);
  });
  const [customSetMsg, setCustomSetMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyCustomDeadline = () => {
    if (!customDateTime) return;
    const iso = new Date(customDateTime).toISOString();
    onSetCustomDeadline(customTaskId, iso);
    setCustomSetMsg('Deadline berhasil disimpan! Banner dan notifikasi telah disesuaikan.');
    setTimeout(() => setCustomSetMsg(null), 4000);
  };

  const handleNavigate = (tab: string, notifId?: string) => {
    if (notifId) onMarkSingleRead(notifId);
    onNavigateTab(tab);
    onClose();
  };

  return (
    <div
      id="notification-center-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pusat Notifikasi &amp; Deadline Tugas</span>
                {urgentDeadlines.length > 0 && (
                  <span className="bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {urgentDeadlines.length} Mendesak
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300">
                Peringatan deadline &lt; 24 jam dan riwayat pengumpulan tugas mahasiswa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 pt-3 bg-slate-50 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors border-b-2 ${
                activeFilter === 'all'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semua ({urgentDeadlines.length + submissionsFeed.length})
            </button>

            <button
              onClick={() => setActiveFilter('deadlines')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeFilter === 'deadlines'
                  ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock size={13} className="text-amber-500" />
              <span>Deadline (&lt; 24 Jam)</span>
              {urgentDeadlines.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {urgentDeadlines.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveFilter('submissions')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeFilter === 'submissions'
                  ? 'border-teal-600 text-teal-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck size={13} className="text-teal-600" />
              <span>Pengumpulan ({taskSubmissionsFeed.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('grades')}
              className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 ${
                activeFilter === 'grades'
                  ? 'border-emerald-600 text-emerald-900 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award size={13} className="text-emerald-600" />
              <span>Tugas Dinilai Dosen ({gradesFeed.length})</span>
              {gradesFeed.some(g => !g.read) && (
                <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full animate-pulse">
                  Baru
                </span>
              )}
            </button>

            {isDosen && (
              <button
                onClick={() => setActiveFilter('settings')}
                className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  activeFilter === 'settings'
                    ? 'border-emerald-700 text-emerald-950 bg-white shadow-xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal size={13} className="text-emerald-700" />
                <span>Atur Tenggat (Dosen)</span>
              </button>
            )}
          </div>

          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 py-2 flex items-center gap-1 cursor-pointer"
          >
            <Check size={13} />
            <span>Tandai Semua Dibaca</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* Banner Info untuk Siswa / Mahasiswa */}
          {!isDosen && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                  SIA
                </span>
                <div>
                  <p className="text-xs font-bold text-emerald-950">Mode Siswa / Mahasiswa: Pantau Notifikasi</p>
                  <p className="text-[11px] text-emerald-800/80">
                    Pengaturan jadwal tenggat waktu dan simulasi notifikasi dikelola penuh oleh Dosen Pengampu.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-700 whitespace-nowrap">
                Hanya Lihat
              </span>
            </div>
          )}
          
          {/* TAB 1: ALL OR DEADLINES */}
          {(activeFilter === 'all' || activeFilter === 'deadlines') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span>Pengingat Deadline Tugas (&lt; 24 Jam)</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {urgentDeadlines.length} tugas mendekati batas
                </span>
              </div>

              {urgentDeadlines.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-emerald-900">
                    Tidak Ada Deadline Mendesak (&lt; 24 Jam)
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Semua tugas Anda aman atau sudah diserahkan tepat waktu.
                  </p>
                  {isDosen && (
                    <button
                      onClick={() => onToggleSimulation(true)}
                      className="mt-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Aktifkan Simulasi Notifikasi Deadline &lt; 24 Jam</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urgentDeadlines.map(item => (
                    <div
                      key={item.id}
                      className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 hover:border-amber-400 transition-all shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-800 mt-0.5">
                            <Clock size={18} className="animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-rose-500 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                                Deadline &lt; 24 Jam
                              </span>
                              <span className="bg-amber-200 text-amber-900 font-bold text-[11px] px-2 py-0.5 rounded">
                                Sisa: {item.hoursRemaining} jam {item.minutesRemaining % 60} menit
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-slate-900 mt-1">
                              {item.title}
                            </h5>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {item.description || 'Segera selesaikan dan kumpulkan sebelum perkuliahan.'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>Batas Waktu: <strong>{item.deadlineFormatted}</strong></span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleNavigate(item.targetTab, item.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-2xs flex-shrink-0 cursor-pointer"
                        >
                          <span>Kumpulkan</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL OR SUBMISSIONS OR GRADES */}
          {(activeFilter === 'all' || activeFilter === 'submissions' || activeFilter === 'grades') && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  {activeFilter === 'grades' ? (
                    <>
                      <Award size={14} className="text-emerald-600" />
                      <span>Pemberitahuan Tugas Sudah Dinilai Dosen</span>
                    </>
                  ) : (
                    <>
                      <FileCheck size={14} className="text-teal-600" />
                      <span>Riwayat Pengumpulan & Nilai Tugas Mahasiswa</span>
                    </>
                  )}
                </h4>
                <span className="text-[11px] text-slate-500">
                  {displayedSubmissions.length} notifikasi
                </span>
              </div>

              {displayedSubmissions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    {activeFilter === 'grades'
                      ? 'Belum ada tugas yang baru saja dinilai oleh dosen.'
                      : 'Belum ada riwayat pengumpulan tugas baru.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {displayedSubmissions.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => handleNavigate(sub.targetTab || 'tugas-individu', sub.id)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 cursor-pointer ${
                        sub.type === 'grade'
                          ? 'bg-emerald-50/60 border-l-4 border-l-emerald-600'
                          : !sub.read
                          ? 'bg-teal-50/40'
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          sub.type === 'grade'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {sub.type === 'grade' ? <Award size={16} /> : <CheckCircle2 size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {sub.studentName}
                            </span>
                            {sub.type === 'grade' ? (
                              <span className="text-[10px] font-extrabold bg-emerald-700 text-white px-2 py-0.5 rounded-full shadow-xs">
                                SUDAH DINILAI DOSEN
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded">
                                {sub.taskType}
                              </span>
                            )}
                            {!sub.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Belum dibaca" />
                            )}
                          </div>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            sub.type === 'grade'
                              ? 'text-emerald-950 font-medium bg-white/90 p-2 rounded-lg border border-emerald-200 shadow-2xs'
                              : 'text-slate-600'
                          }`}>
                            {sub.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(sub.timestamp).toLocaleString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <button
                        className={`text-xs font-bold flex items-center gap-1 flex-shrink-0 self-center px-2.5 py-1.5 rounded-lg transition-colors ${
                          sub.type === 'grade'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                        title="Buka tugas"
                      >
                        <span>{sub.type === 'grade' ? 'Lihat Nilai' : 'Lihat'}</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS & SIMULATION CONTROLS (HANYA DOSEN) */}
          {isDosen && activeFilter === 'settings' && (
            <div className="space-y-4">
              
              {/* Simulation Banner Toggle */}
              <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-indigo-600" />
                      <span>Mode Simulasi Peringatan Deadline &lt; 24 Jam</span>
                    </h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Mengaktifkan banner notifikasi deadline yang tersisa kurang dari 24 jam (misal 14 jam lagi) agar dosen dan mahasiswa dapat langsung menguji tampilan pengingat secara interaktif.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isSimulated}
                      onChange={e => onToggleSimulation(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Custom Deadline Config */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-600" />
                  <span>Atur Tenggat Waktu Spesifik untuk Tugas / Pertemuan</span>
                </h5>
                <p className="text-xs text-slate-600 mt-0.5">
                  Tentukan batas tanggal &amp; jam untuk memicu notifikasi countdown otomatis:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pilih Tugas / Pertemuan:
                    </label>
                    <select
                      value={customTaskId}
                      onChange={e => setCustomTaskId(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
                    >
                      <option value="meeting-2">Pertemuan 2: Tugas Presentasi &amp; Makalah</option>
                      <option value="meeting-3">Pertemuan 3: Tugas Presentasi &amp; Makalah</option>
                      <option value="meeting-4">Pertemuan 4: Tugas Presentasi &amp; Makalah</option>
                      <option value="meeting-8">Pertemuan 8: Ujian Tengah Semester (UTS)</option>
                      <option value="meeting-16">Pertemuan 16: Ujian Akhir Semester (UAS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Batas Waktu (Tanggal &amp; Jam):
                    </label>
                    <input
                      type="datetime-local"
                      value={customDateTime}
                      onChange={e => setCustomDateTime(e.target.value)}
                      className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={handleApplyCustomDeadline}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={13} />
                    <span>Simpan Tenggat Waktu Baru</span>
                  </button>

                  {customSetMsg && (
                    <span className="text-xs font-bold text-emerald-700">
                      {customSetMsg}
                    </span>
                  )}
                </div>
              </div>

              {/* Instant Test Triggers */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
                <h5 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Send size={14} className="text-amber-700" />
                  <span>Uji Coba Notifikasi Toast Langsung</span>
                </h5>
                <p className="text-xs text-amber-800 mt-0.5">
                  Klik tombol di bawah untuk melihat simulasi toast pop-up beserta audio chime:
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={onTriggerTestSubmissionNotif}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck size={13} />
                    <span>Tes Notif Pengumpulan Tugas</span>
                  </button>

                  <button
                    onClick={onTriggerTestDeadlineNotif}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Clock size={13} />
                    <span>Tes Notif Deadline &lt; 24 Jam</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>SIAKAD Kuliah Online • Peringatan Terjadwal Otomatis</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
