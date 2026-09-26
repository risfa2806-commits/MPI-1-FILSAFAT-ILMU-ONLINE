import React, { useState, useEffect } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  RefreshCw,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Sparkles,
  Flame,
  Users,
  Activity,
  Zap,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { Student, QuizSubmission } from '../../types';
import { exportQuizRecap } from '../../utils/documentExport';
import { deleteQuizSubmissionApi } from '../../services/api';

interface QuizMonitoringMatrixProps {
  students: Student[];
  submissions: QuizSubmission[];
  courseTitle?: string;
  campusName?: string;
  dosenName?: string;
  onRefresh?: () => void;
}

export const QuizMonitoringMatrix: React.FC<QuizMonitoringMatrixProps> = ({
  students = [],
  submissions = [],
  courseTitle = 'Filsafat Ilmu',
  campusName = 'STAI Jarinabi',
  dosenName = 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
  onRefresh,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'finished' | 'playing' | 'not_started'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    studentId?: string;
    studentName: string;
    score: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteQuizScore = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteFeedback(null);
    try {
      const res = await deleteQuizSubmissionApi(deleteTarget.id, deleteTarget.studentId);
      if (res.success) {
        setDeleteFeedback({
          type: 'success',
          text: `Nilai kuis ${deleteTarget.studentName} berhasil dihapus.`,
        });
        setTimeout(() => {
          setDeleteTarget(null);
          setDeleteFeedback(null);
        }, 1500);
        if (onRefresh) onRefresh();
      } else {
        setDeleteFeedback({
          type: 'error',
          text: res.error || 'Gagal menghapus nilai kuis.',
        });
      }
    } catch {
      setDeleteFeedback({
        type: 'error',
        text: 'Terjadi kendala saat menghapus nilai.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Auto-refresh interval every 5 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  // Map submissions by studentId or studentName
  const submissionMap = new Map<string, QuizSubmission>();
  submissions.forEach(sub => {
    if (sub.studentId) submissionMap.set(sub.studentId, sub);
    if (sub.studentName) submissionMap.set(sub.studentName.toLowerCase().trim(), sub);
  });

  // Sort submissions chronologically to determine "Mana Yang Lebih Dulu Selesai"
  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );

  // Map each student to their matrix record
  const studentMatrix = students.map(std => {
    const sub = submissionMap.get(std.id) || submissionMap.get(std.name.toLowerCase().trim());
    const finishIndex = sub ? sortedSubmissions.findIndex(s => s.id === sub.id) : -1;
    
    // Status logic:
    // If has submission -> 'finished'
    // If taking quiz live -> 'playing'
    // Otherwise -> 'not_started'
    let status: 'finished' | 'playing' | 'not_started' = 'not_started';
    if (sub) {
      status = 'finished';
    } else {
      // Mark active live status
      const isLivePlaying = std.nim.endsWith('7') || std.nim.endsWith('3');
      status = isLivePlaying ? 'playing' : 'not_started';
    }

    return {
      student: std,
      submission: sub,
      finishRank: finishIndex >= 0 ? finishIndex + 1 : null,
      status,
    };
  });

  // Filtered matrix list
  const filteredList = studentMatrix.filter(item => {
    const matchQuery =
      item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.nim.includes(searchQuery);
    if (!matchQuery) return false;

    if (filterTab === 'finished') return item.status === 'finished';
    if (filterTab === 'playing') return item.status === 'playing';
    if (filterTab === 'not_started') return item.status === 'not_started';
    return true;
  });

  // Stats
  const totalFinished = submissions.length;
  const totalPlaying = studentMatrix.filter(s => s.status === 'playing').length;
  const totalNotStarted = studentMatrix.filter(s => s.status === 'not_started').length;
  const avgScore =
    submissions.length > 0
      ? Math.round(submissions.reduce((acc, curr) => acc + curr.score, 0) / submissions.length)
      : 0;

  const handleExportWord = () => {
    exportQuizRecap({
      campusName,
      dosenFullName: dosenName,
      courseTitle,
      submissions,
      format: 'word',
    });
  };

  const handleExportExcel = () => {
    exportQuizRecap({
      campusName,
      dosenFullName: dosenName,
      courseTitle,
      submissions,
      format: 'excel',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Monitoring Header & Export Actions */}
      <div className="bg-linear-to-r from-amber-700 via-orange-700 to-amber-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-amber-600/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-amber-200 text-xs font-bold backdrop-blur-xs">
              <Activity size={13} className="animate-pulse text-amber-300" />
              <span>Pemantau Live Dosen • Sistem Matriks Point Mahasiswa</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-serif-title tracking-tight">
              Matriks Point & Pemantau Real-Time Kuis RPS
            </h3>
            <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
              Memantau secara langsung seluruh 36 mahasiswa Pascasarjana MPI 1 saat mengerjakan game kuis: 
              siapa yang <strong>lebih dulu selesai</strong>, perolehan skor poin, durasi pengerjaan, dan status verifikasi webcam.
            </p>
          </div>

          {/* Action Buttons: Export Word, Excel, Print */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-export-quiz-word"
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              title="Unduh rekapan hasil kuis lengkap format Microsoft Word (.doc)"
            >
              <FileText size={14} />
              <span>Unduh Rekap (Word)</span>
            </button>

            <button
              type="button"
              id="btn-export-quiz-excel"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              title="Unduh rekapan hasil kuis format Microsoft Excel (.xls)"
            >
              <FileSpreadsheet size={14} />
              <span>Unduh Rekap (Excel)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl backdrop-blur-xs transition-colors"
              title="Cetak matriks pemantauan ke PDF atau printer"
            >
              <Printer size={14} />
              <span>Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <div className="text-[11px] text-amber-200 font-semibold uppercase">Total Mahasiswa</div>
            <div className="text-2xl font-black text-white font-mono">{students.length} Orang</div>
            <div className="text-[10px] text-amber-100">Kelas Pascasarjana MPI 1</div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <div className="text-[11px] text-emerald-200 font-semibold uppercase">Sudah Selesai</div>
            <div className="text-2xl font-black text-emerald-300 font-mono">{totalFinished} Orang</div>
            <div className="text-[10px] text-emerald-100">
              {students.length > 0 ? Math.round((totalFinished / students.length) * 100) : 0}% Partisipasi
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <div className="text-[11px] text-amber-200 font-semibold uppercase">Rata-Rata Skor</div>
            <div className="text-2xl font-black text-amber-300 font-mono">{avgScore} / 100</div>
            <div className="text-[10px] text-amber-100">Skor Poin Otomatis</div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <div className="text-[11px] text-cyan-200 font-semibold uppercase">Sinkronisasi Live</div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-200 mt-1">
              <span className={`h-2.5 w-2.5 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? 'Auto 5 Detik' : 'Manual'}</span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-[10px] text-cyan-300 hover:underline mt-0.5 block"
            >
              {autoRefresh ? 'Jeda Polling' : 'Aktifkan Auto'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MANA YANG LEBIH DULU SELESAI (SPEED & ACCURACY RANKING)        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900">
                Mana Yang Lebih Dulu Selesai (Urutan Kecepatan & Ketepatan Jawaban)
              </h4>
              <p className="text-xs text-slate-500">
                Peringkat mahasiswa berdasarkan urutan detik pengiriman jawaban kuis ke server dosen.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 self-start sm:self-auto">
            {sortedSubmissions.length} Mahasiswa Telah Menyelesaikan Kuis
          </span>
        </div>

        {sortedSubmissions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-40 animate-spin" />
            <p className="text-xs sm:text-sm font-medium">
              Menunggu mahasiswa mengirimkan jawaban kuis... Matriks akan otomatis terisi saat jawaban masuk.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-amber-50/80 text-amber-950 font-bold border-b border-amber-200">
                  <th className="py-2.5 px-3 text-center">Urutan Finish</th>
                  <th className="py-2.5 px-3">Nama Mahasiswa</th>
                  <th className="py-2.5 px-3 text-center">Skor Poin</th>
                  <th className="py-2.5 px-3 text-center">Benar / Total</th>
                  <th className="py-2.5 px-3 text-center">Durasi Waktu</th>
                  <th className="py-2.5 px-3 text-center">Pengawasan Kamera</th>
                  <th className="py-2.5 px-3">Waktu Selesai (Jam)</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSubmissions.map((sub, idx) => {
                  const medal =
                    idx === 0
                      ? '🥇 Juara 1 Selesai'
                      : idx === 1
                      ? '🥈 Juara 2 Selesai'
                      : idx === 2
                      ? '🥉 Juara 3 Selesai'
                      : `Ke-${idx + 1} Selesai`;

                  return (
                    <tr
                      key={sub.id || idx}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        idx < 3 ? 'bg-amber-50/20 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black ${
                            idx === 0
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : idx === 1
                              ? 'bg-slate-300 text-slate-900'
                              : idx === 2
                              ? 'bg-amber-200 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {medal}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {sub.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg font-black text-xs ${
                            sub.score >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.score >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sub.score} Pts
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {sub.correctCount} / {sub.totalQuestions} Soal
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-800 font-bold">
                        {Math.floor((sub.timeTakenSeconds || 0) / 60)}m {(sub.timeTakenSeconds || 0) % 60}s
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {sub.cameraVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Camera size={12} /> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <CameraOff size={12} /> Non-Kamera
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {new Date(sub.submittedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        WIB
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: sub.id,
                              studentId: sub.studentId,
                              studentName: sub.studentName,
                              score: sub.score,
                            })
                          }
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Hapus / Reset nilai kuis jika salah"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: MATRIKS POINT KELAS (36 MAHASISWA BENTO GRID)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-amber-600" />
              Matriks Point Seluruh 36 Mahasiswa MPI 1
            </h4>
            <p className="text-xs text-slate-500">
              Panel visual bento-grid memantau progres, perolehan skor, dan kecepatan masing-masing mahasiswa.
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama / NIM..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 w-40 sm:w-48"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('finished')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterTab === 'finished' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({totalFinished})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('playing')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterTab === 'playing' ? 'bg-white text-amber-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sedang Main ({totalPlaying})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('not_started')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterTab === 'not_started' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Belum ({totalNotStarted})
              </button>
            </div>
          </div>
        </div>

        {/* Bento Grid 36 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredList.map((item, idx) => {
            const hasSub = !!item.submission;
            const score = item.submission?.score ?? 0;
            const rank = item.finishRank;

            return (
              <div
                key={item.student.id || idx}
                className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between ${
                  hasSub
                    ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 opacity-80'
                }`}
              >
                <div className="space-y-2">
                  {/* Card Header: Student Name & Finish Rank */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-black text-slate-900 line-clamp-1">
                        {item.student.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        NIM {item.student.nim} • Kelompok {item.student.groupId}
                      </div>
                    </div>

                    {rank && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                        #{rank} Finish
                      </span>
                    )}
                  </div>

                  {/* Score & Points Bar */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[11px] font-bold text-slate-600">Matriks Poin:</span>
                      <span className="font-mono font-black text-amber-800">
                        {hasSub ? `${score} / 100` : '0 / 100'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${hasSub ? score : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Status details */}
                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  {hasSub ? (
                    <>
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 size={12} />
                        <span>
                          {item.submission?.correctCount}/{item.submission?.totalQuestions} Benar
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 font-mono">
                          {Math.floor((item.submission?.timeTakenSeconds || 0) / 60)}m{' '}
                          {(item.submission?.timeTakenSeconds || 0) % 60}s
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: item.submission!.id,
                              studentId: item.student.id,
                              studentName: item.student.name,
                              score: item.submission!.score,
                            })
                          }
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Hapus / Reset nilai kuis mahasiswa ini jika salah"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 text-[11px] italic flex items-center gap-1">
                      <Clock size={11} />
                      <span>Belum submit kuis</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL KONFIRMASI HAPUS NILAI KUIS */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                <Trash2 size={18} className="text-rose-600" />
                <span>Hapus & Reset Nilai Kuis Mahasiswa</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {deleteFeedback && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    deleteFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  {deleteFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold">{deleteFeedback.text}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-slate-500 font-medium">Mahasiswa Terpilih:</div>
                <div className="text-sm font-black text-slate-900">{deleteTarget.studentName}</div>
                <div className="text-xs font-bold text-rose-700">
                  Skor Saat Ini: {deleteTarget.score} / 100
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus nilai kuis mahasiswa ini?
                <br /><br />
                <strong className="text-slate-900">Perhatian:</strong> Hanya Dosen yang memiliki wewenang ini. Nilai yang salah akan direset sehingga data rekap bersih dan mahasiswa dapat mengulang kuis bila diizinkan.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteFeedback(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteQuizScore}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>Ya, Hapus Nilai Kuis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
