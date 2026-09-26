import React, { useState, useEffect } from 'react';
import { Student, StudentGrade, GroupProject, IndividualSubmission, DosenProfile, MeetingSchedule, QuizSubmission, UtsSubmission } from '../types';
import { updateStudentGradeApi, recalculateAllGradesApi, fetchQuizApi } from '../services/api';
import {
  exportGradesToWord,
  exportGradesToExcel,
  exportIndividualTranscriptWord,
  exportQuizRecap,
  exportGradesToPdf,
  exportRekapNilaiDanTugasPdf,
} from '../utils/documentExport';
import { getStudentPersonalizedFeedback } from '../utils/personalizedFeedback';
import { DOSEN_SIGNATURE_BASE64 } from '../assets/dosenSignature';
import {
  Award,
  Download,
  Printer,
  Search,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Edit2,
  Save,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
  FileText,
  Video,
  FileQuestion,
  Calendar,
  Users,
  User,
  Quote,
  BookOpen,
  Gamepad2,
} from 'lucide-react';

interface GradeRecapViewProps {
  students: Student[];
  grades: Record<string, StudentGrade>;
  groups: GroupProject[];
  submissions: IndividualSubmission[];
  utsSubmissions?: UtsSubmission[];
  uasSubmissions?: UtsSubmission[];
  isDosen: boolean;
  onRefreshData: () => Promise<void>;
  courseProfile?: DosenProfile;
  meetings?: MeetingSchedule[];
}

export const GradeRecapView: React.FC<GradeRecapViewProps> = ({
  students = [],
  grades = {},
  groups = [],
  submissions = [],
  utsSubmissions = [],
  uasSubmissions = [],
  isDosen,
  onRefreshData,
  courseProfile,
  meetings = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeStudent, setSelectedGradeStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Scope selection for export & print (Kolektif vs Individu)
  const [exportScope, setExportScope] = useState<'kolektif' | 'individu'>('kolektif');
  const [selectedExportStudentId, setSelectedExportStudentId] = useState<string>(students[0]?.id || '');
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);

  useEffect(() => {
    if (students.length > 0 && !selectedExportStudentId) {
      setSelectedExportStudentId(students[0].id);
    }
  }, [students, selectedExportStudentId]);

  useEffect(() => {
    fetchQuizApi()
      .then(res => {
        if (res.success && res.submissions) {
          setQuizSubmissions(res.submissions);
        }
      })
      .catch(err => console.warn('Fetch quiz submissions error:', err));
  }, []);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAlert, setSyncAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit form state
  const [attScore, setAttScore] = useState<number>(100);
  const [attitScore, setAttitScore] = useState<number>(85);
  const [indivScore, setIndivScore] = useState<number>(85);
  const [utsScore, setUtsScore] = useState<number>(85);
  const [uasScore, setUasScore] = useState<number>(85);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Live computed preview score
  const computedFinalScore = Math.round(
    attScore * 0.15 + attitScore * 0.10 + indivScore * 0.25 + utsScore * 0.25 + uasScore * 0.25
  );
  const getLetterGrade = (score: number) => {
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    return 'D';
  };

  const startEdit = (std: Student) => {
    const currentGrade = grades[std.id] || {
      attendanceScore: 100,
      attitudeScore: 85,
      individualScore: 85,
      utsScore: 85,
      uasScore: 85,
      groupScore: 85,
      finalScore: 88,
      letterGrade: 'A-',
    };
    setEditingStudentId(std.id);
    setAttScore(currentGrade.attendanceScore);
    setAttitScore(currentGrade.attitudeScore);
    setIndivScore(currentGrade.individualScore);
    setUtsScore(currentGrade.utsScore ?? 85);
    setUasScore(currentGrade.uasScore ?? currentGrade.groupScore ?? 85);
    setNotes(currentGrade.notes || '');
  };

  const handleSaveGrade = async (studentId: string) => {
    setIsSaving(true);
    try {
      await updateStudentGradeApi(studentId, {
        attendanceScore: Number(attScore),
        attitudeScore: Number(attitScore),
        individualScore: Number(indivScore),
        utsScore: Number(utsScore),
        uasScore: Number(uasScore),
        groupScore: Number(uasScore),
        notes,
      });
      setEditingStudentId(null);
      setSyncAlert({
        type: 'success',
        message: 'Nilai mahasiswa berhasil diperbarui dan tersimpan di sistem!',
      });
      await onRefreshData();
    } catch {
      setSyncAlert({
        type: 'error',
        message: 'Gagal menyimpan nilai mahasiswa.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Sync all grades from attendance, UTS, PPT, and UAS
  const handleSyncAllGrades = async () => {
    setIsSyncing(true);
    setSyncAlert(null);
    try {
      const res = await recalculateAllGradesApi();
      if (res) {
        setSyncAlert({
          type: 'success',
          message: 'Berhasil menyinkronkan & menghitung ulang seluruh nilai mahasiswa dari Kehadiran, PPT, UTS, dan UAS Video!',
        });
        await onRefreshData();
      } else {
        setSyncAlert({
          type: 'error',
          message: 'Gagal menyinkronkan nilai mahasiswa.',
        });
      }
    } catch {
      setSyncAlert({
        type: 'error',
        message: 'Terjadi kesalahan saat sinkronisasi nilai.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredStudents = (students || []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rpsPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nim.includes(searchTerm)
  );

  // Export to CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleExportCSV = () => {
    const headers = [
      'No',
      'NIM',
      'Nama Mahasiswa',
      'Pertemuan RPS',
      'Kelompok',
      'Kehadiran 16 Pertemuan (15%)',
      'Sikap & Keaktifan (10%)',
      'Tugas Presentasi PPT/Makalah (25%)',
      'Tugas UTS 5 Essay (25%)',
      'Tugas UAS Video AI (25%)',
      'Nilai Akhir',
      'Nilai Huruf',
      'Status Kelulusan',
      'Catatan Evaluasi',
    ];

    const rows = (students || []).map((s, idx) => {
      const g = grades[s.id] || {
        attendanceScore: 100,
        attitudeScore: 85,
        individualScore: 85,
        utsScore: 85,
        uasScore: 85,
        groupScore: 85,
        finalScore: 88,
        letterGrade: 'A-',
      };
      return [
        idx + 1,
        `"${s.nim}"`,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.rpsPart}"`,
        `"Kelompok ${s.groupId}"`,
        g.attendanceScore,
        g.attitudeScore,
        g.individualScore,
        g.utsScore ?? 85,
        g.uasScore ?? g.groupScore ?? 85,
        g.finalScore,
        `"${g.letterGrade}"`,
        g.finalScore >= 60 ? '"LULUS"' : '"TIDAK LULUS"',
        `"${(g.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    // Prepend UTF-8 BOM (\uFEFF)
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Nilai_SIAKAD_MPI1_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Active student for individual export
  const getSelectedExportStudent = () => {
    return students.find(s => s.id === selectedExportStudentId) || students[0] || null;
  };

  const campus = courseProfile?.campusName || 'STAI Jarinabi';
  const dosenName = courseProfile?.name || (courseProfile?.dosenName ? `${courseProfile.dosenName}${courseProfile.dosenTitle ? ', ' + courseProfile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const title = courseProfile?.courseTitle || 'Filsafat Ilmu';
  const code = courseProfile?.courseCode || 'MPI-501';
  const sks = courseProfile?.sks || 3;
  const sem = courseProfile?.semester || 'Semester Ganjil 2026/2027';
  const prodi = courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  // Export to Word (.doc) with Dosen Signature & Personalized Quotes
  const handleExportWord = (targetStd?: Student) => {
    const studentToExport = targetStd || (exportScope === 'individu' ? getSelectedExportStudent() : null);

    if (studentToExport) {
      const g = grades[studentToExport.id] || {
        attendanceScore: 100,
        attitudeScore: 85,
        individualScore: 85,
        utsScore: 85,
        uasScore: 85,
        groupScore: 85,
        finalScore: 88,
        letterGrade: 'A-',
      };
      exportIndividualTranscriptWord({
        campusName: campus,
        dosenFullName: dosenName,
        courseTitle: title,
        courseCode: code,
        sks,
        semester: sem,
        studyProgram: prodi,
        student: studentToExport,
        grade: g,
      });
    } else {
      exportGradesToWord({
        campusName: campus,
        dosenFullName: dosenName,
        courseTitle: title,
        courseCode: code,
        sks,
        semester: sem,
        studyProgram: prodi,
        students,
        grades,
        meetings,
      });
    }
  };

  // Export to Excel (.xls)
  const handleExportExcel = (targetStd?: Student) => {
    const studentToExport = targetStd || (exportScope === 'individu' ? getSelectedExportStudent() : null);

    exportGradesToExcel({
      campusName: campus,
      dosenFullName: dosenName,
      courseTitle: title,
      courseCode: code,
      sks,
      semester: sem,
      studyProgram: prodi,
      students,
      grades,
      scope: studentToExport ? 'individu' : 'kolektif',
      selectedStudent: studentToExport || undefined,
    });
  };

  // Print or save as PDF
  const handlePrint = (targetStd?: Student) => {
    const studentToExport = targetStd || (exportScope === 'individu' ? getSelectedExportStudent() : null);
    if (studentToExport) {
      setSelectedGradeStudent(studentToExport);
    }
    exportGradesToPdf({
      campusName: campus,
      dosenFullName: dosenName,
      courseTitle: title,
      courseCode: code,
      sks,
      semester: sem,
      studyProgram: prodi,
      students,
      grades,
      scope: studentToExport ? 'individu' : 'kolektif',
      selectedStudent: studentToExport || undefined,
    });
  };

  // Unduh Rekap PDF: Dedicated print dialog with custom CSS formatting Nilai & Daftar Tugas
  const handleUnduhRekapPdf = () => {
    exportRekapNilaiDanTugasPdf({
      campusName: campus,
      dosenFullName: dosenName,
      courseTitle: title,
      courseCode: code,
      sks,
      semester: sem,
      studyProgram: prodi,
      students,
      grades,
      submissions,
      utsSubmissions,
      uasSubmissions,
      groups,
      quizSubmissions,
    });
  };

  // Export Quiz Game Recap
  const handleExportQuiz = (format: 'word' | 'excel') => {
    exportQuizRecap({
      campusName: campus,
      dosenFullName: dosenName,
      courseTitle: title,
      submissions: quizSubmissions,
      format,
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Banner / Summary Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              <Award size={13} />
              <span>Transkrip Resmi SIAKAD</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-title">
              Rekapitulasi Nilai Mahasiswa MPI 1
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Mata Kuliah: <strong>Filsafat Ilmu</strong> • Bobot Penilaian: <strong>Kehadiran 16 Pertemuan (15%)</strong>, <strong>Sikap & Keaktifan (10%)</strong>, <strong>Tugas Presentasi (Individu/Kelompok) PPT & Makalah (25%)</strong>, <strong>UTS 5 Essay (25%)</strong>, dan <strong>UAS Video Kelompok / Essay (25%)</strong>.
            </p>
            <div className="mt-2 text-[11px] text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-blue-600 shrink-0" />
              <span>Unduhan rekapan nilai Word (.doc) dilengkapi <strong>Tanda Tangan Asli Dosen Pengampu ({dosenName})</strong> dan <strong>Kata Mutiara Otomatis Deskripsi Berbeda Tiap Mahasiswa</strong>.</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDosen && (
              <button
                id="btn-sync-grades"
                onClick={handleSyncAllGrades}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                title="Hitung ulang nilai secara otomatis dari presensi kehadiran, tugas PPT, UTS Essay, dan UAS Video"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Semua Nilai'}</span>
              </button>
            )}
          </div>
        </div>

        {/* PUSAT UNDUH & CETAK REKAP NILAI (PILIH INDIVIDU / KOLEKTIF, PDF / EXCEL / WORD) */}
        <div className="mt-5 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-800/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Download size={16} className="text-amber-400" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Pusat Cetak & Unduh Rekap Nilai Akademik
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pilih format unduhan (Word / Excel / Cetak PDF) dengan mode Rekap Kolektif atau Transkrip Individu.
              </p>
            </div>

            {/* Selector: Kolektif vs Individu */}
            <div className="inline-flex p-1 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => setExportScope('kolektif')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  exportScope === 'kolektif'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>Kolektif ({students.length} Mhs)</span>
              </button>
              <button
                type="button"
                onClick={() => setExportScope('individu')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  exportScope === 'individu'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <User size={14} />
                <span>Individu (Per Mahasiswa)</span>
              </button>
            </div>
          </div>

          {/* If Individu: Student selector and preview */}
          {exportScope === 'individu' && (
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <User size={12} />
                  <span>Pilih Mahasiswa untuk Transkrip Individu:</span>
                </label>
                <select
                  value={selectedExportStudentId}
                  onChange={e => setSelectedExportStudentId(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-amber-400"
                >
                  {students.map(s => {
                    const g = grades[s.id];
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nim} - {s.name} ({s.rpsPart}) • Nilai: {g ? g.finalScore : 88} ({g ? g.letterGrade : 'A-'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Live Student Quote Preview */}
              {(() => {
                const std = getSelectedExportStudent();
                if (!std) return null;
                const g = grades[std.id] || { finalScore: 88, letterGrade: 'A-' };
                const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic);
                return (
                  <div className="md:w-1/2 p-2.5 bg-black/20 rounded-lg border border-white/10 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-amber-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Quote size={11} /> {feedback.scholar}
                      </span>
                      <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                        {feedback.characterTrait}
                      </span>
                    </div>
                    <p className="text-slate-300 italic line-clamp-2">"{feedback.quote}"</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Action Download Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* Word Button */}
              <button
                type="button"
                id="btn-export-word"
                onClick={() => handleExportWord()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                title="Unduh format Microsoft Word (.doc) lengkap tanda tangan dosen"
              >
                <FileText size={15} />
                <span>Unduh Word {exportScope === 'individu' ? 'Individu' : 'Kolektif'} (.doc + TTD)</span>
              </button>

              {/* Excel Button */}
              <button
                type="button"
                id="btn-export-excel"
                onClick={() => handleExportExcel()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                title="Unduh format Microsoft Excel (.xls) dengan rumus dan deskripsi mutiara"
              >
                <FileSpreadsheet size={15} />
                <span>Unduh Excel {exportScope === 'individu' ? 'Individu' : 'Kolektif'} (.xls)</span>
              </button>

              {/* Unduh Rekap PDF Button (Dedicated print CSS formatting Nilai & Daftar Tugas) */}
              <button
                type="button"
                id="btn-unduh-rekap-pdf"
                onClick={() => handleUnduhRekapPdf()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ring-2 ring-rose-400/30 cursor-pointer"
                title="Unduh Rekap PDF: Format rapi siap cetak Nilai dan Daftar Tugas menggunakan window.print() dengan CSS khusus"
              >
                <Printer size={15} />
                <span>Unduh Rekap PDF</span>
              </button>

              {/* Print / PDF Button */}
              <button
                type="button"
                id="btn-print-recap"
                onClick={() => handlePrint()}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                title="Cetak transkrip nilai langsung ke PDF atau printer kertas"
              >
                <Printer size={15} />
                <span>Cetak Transkrip</span>
              </button>
            </div>

            {/* UNDUH REKAPAN KUIS GAME BUTTON */}
            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 rounded-xl p-1 text-xs">
              <div className="px-2 font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                <Gamepad2 size={13} />
                <span>Rekapan Kuis ({quizSubmissions.length}):</span>
              </div>
              <button
                type="button"
                onClick={() => handleExportQuiz('word')}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-[11px] transition-all flex items-center gap-1"
                title="Unduh hasil pengerjaan kuis cerdas cermat format Word (.doc)"
              >
                <FileText size={12} />
                <span>Kuis Word</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportQuiz('excel')}
                className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black rounded-lg text-[11px] transition-all flex items-center gap-1"
                title="Unduh hasil pengerjaan kuis cerdas cermat format Excel (.xls)"
              >
                <FileSpreadsheet size={12} />
                <span>Kuis Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sync Alert Banner */}
        {syncAlert && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              syncAlert.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncAlert.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{syncAlert.message}</span>
            </div>
            <button
              onClick={() => setSyncAlert(null)}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Formula details */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Kehadiran 16 Sesi</span>
            <strong className="text-slate-900">Bobot: 15%</strong>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Sikap & Keaktifan</span>
            <strong className="text-slate-900">Bobot: 10%</strong>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Tugas PPT & Makalah</span>
            <strong className="text-slate-900">Bobot: 25%</strong>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Tugas UTS (5 Essay)</span>
            <strong className="text-slate-900">Bobot: 25%</strong>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-slate-500 block text-[10px]">Tugas UAS (Video Klp)</span>
            <strong className="text-slate-900">Bobot: 25%</strong>
          </div>
        </div>
      </div>

      {/* Grade Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mahasiswa, NIM, Pertemuan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Total: <strong>{filteredStudents.length} Mahasiswa</strong></span>
            {isDosen && (
              <span className="text-indigo-600 font-semibold">• Mode Dosen Aktif (Bisa Edit Nilai)</span>
            )}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">No</th>
                <th className="py-3 px-3">Mahasiswa & NIM</th>
                <th className="py-3 px-3">Pertemuan RPS</th>
                <th className="py-3 px-2 text-center">Kehadiran (15%)</th>
                <th className="py-3 px-2 text-center">Sikap (10%)</th>
                <th className="py-3 px-2 text-center">Tugas PPT (25%)</th>
                <th className="py-3 px-2 text-center">Tugas UTS (25%)</th>
                <th className="py-3 px-2 text-center">Tugas UAS (25%)</th>
                <th className="py-3 px-3 text-center">Nilai Akhir</th>
                <th className="py-3 px-2 text-center">Grade</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 min-w-[180px]">Kata Mutiara & Karakteristik</th>
                <th className="py-3 px-3 text-center">Aksi & Unduh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((std, idx) => {
                const g = grades[std.id] || {
                  attendanceScore: 100,
                  attitudeScore: 85,
                  individualScore: 85,
                  utsScore: 85,
                  uasScore: 85,
                  groupScore: 85,
                  finalScore: 88,
                  letterGrade: 'A-',
                };

                const feedback = getStudentPersonalizedFeedback(std.name, std.nim, g.finalScore, std.topic, idx);
                const isEditing = editingStudentId === std.id;
                const isPassed = g.finalScore >= 60;

                return (
                  <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{std.name}</div>
                      <div className="text-[10px] text-slate-400">NIM: {std.nim} • Kelompok {std.groupId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {std.rpsPart}
                      </span>
                    </td>

                    {/* Attendance Score */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={attScore}
                          onChange={e => setAttScore(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{g.attendanceScore}</span>
                      )}
                    </td>

                    {/* Attitude Score */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={attitScore}
                          onChange={e => setAttitScore(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{g.attitudeScore}</span>
                      )}
                    </td>

                    {/* Individual Task Score */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={indivScore}
                          onChange={e => setIndivScore(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{g.individualScore}</span>
                      )}
                    </td>

                    {/* UTS 5 Essay Score */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={utsScore}
                          onChange={e => setUtsScore(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {g.utsScore ?? 85}
                        </span>
                      )}
                    </td>

                    {/* UAS Video Kelompok Score */}
                    <td className="py-3 px-2 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={uasScore}
                          onChange={e => setUasScore(Number(e.target.value))}
                          className="w-12 px-1 py-0.5 text-center text-xs border rounded bg-white font-bold"
                        />
                      ) : (
                        <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {g.uasScore ?? g.groupScore ?? 85}
                        </span>
                      )}
                    </td>

                    {/* Final Score */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-sm font-extrabold bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-md border border-emerald-200">
                        {isEditing ? computedFinalScore : g.finalScore}
                      </span>
                    </td>

                    {/* Letter Grade */}
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        (isEditing ? getLetterGrade(computedFinalScore) : g.letterGrade).startsWith('A')
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : (isEditing ? getLetterGrade(computedFinalScore) : g.letterGrade).startsWith('B')
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {isEditing ? getLetterGrade(computedFinalScore) : g.letterGrade}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isPassed ? 'LULUS' : 'TIDAK LULUS'}
                      </span>
                    </td>

                    {/* Kata Mutiara & Nilai Karakteristik (Otomatis & Unik) */}
                    <td className="py-3 px-3 max-w-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                            {feedback.scholar}
                          </span>
                          <span className="text-[9px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {feedback.characterTrait}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 italic line-clamp-2 leading-tight">
                          "{feedback.quote}"
                        </p>
                      </div>
                    </td>

                    {/* Actions & Direct Individual Downloads */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedGradeStudent(std)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Lihat Rincian Lengkap & Transkrip Mahasiswa"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => handleExportWord(std)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title={`Unduh Transkrip Individu Word (.doc + TTD Dosen) untuk ${std.name}`}
                        >
                          <FileText size={14} />
                        </button>

                        <button
                          onClick={() => handleExportExcel(std)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title={`Unduh Transkrip Individu Excel (.xls) untuk ${std.name}`}
                        >
                          <FileSpreadsheet size={14} />
                        </button>

                        {isDosen && (
                          isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveGrade(std.id)}
                                disabled={isSaving}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                                title="Simpan Nilai"
                              >
                                <Save size={15} />
                              </button>
                              <button
                                onClick={() => setEditingStudentId(null)}
                                className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg"
                                title="Batal"
                              >
                                <X size={15} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(std)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Komponen Nilai Mahasiswa"
                            >
                              <Edit2 size={14} />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Skala Penilaian: A (≥85), A- (≥80), B+ (≥75), B (≥70), B- (≥65), C+ (≥60), C (≥55)</span>
          <span className="font-semibold text-emerald-800">SIAKAD Online MPI 1 • Terverifikasi Otomatis</span>
        </div>

        {/* Lembar Tanda Tangan Pengesahan Dosen */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 print:block">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="font-bold text-slate-800 text-sm">PENGESAHAN REKAPITULASI NILAI AKHIR MAHASISWA</div>
            <div>Program Studi: <strong>{courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)'}</strong></div>
            <div>Mata Kuliah: <strong>{courseProfile?.courseTitle || 'Filsafat Ilmu'}</strong> ({courseProfile?.courseCode || 'MPI-101'})</div>
            <div className="text-emerald-800 font-semibold flex items-center gap-1 mt-1 text-[11px]">
              <CheckCircle2 size={13} className="text-emerald-700" />
              <span>Transkrip Resmi SIAKAD Terverifikasi • Dilengkapi Tanda Tangan Resmi Dosen saat Unduh Word</span>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-xs text-slate-500">
              Ditetapkan di: {courseProfile?.campusName || 'STAI Jarinabi'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5">Dosen Pengampu Mata Kuliah,</div>
            <div className="my-1.5 flex justify-center sm:justify-end">
              <img
                src={DOSEN_SIGNATURE_BASE64}
                alt="Tanda Tangan Dosen Risfa Tri Ulfa"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="text-xs font-bold text-slate-900 underline">
              {courseProfile?.name || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}
            </div>
            <div className="text-[11px] text-slate-500">NIDN. 2115089301</div>
          </div>
        </div>

      </div>

      {/* DETAIL TRANSKRIP MODAL */}
      {selectedGradeStudent && (() => {
        const g = grades[selectedGradeStudent.id] || {
          attendanceScore: 100,
          attitudeScore: 85,
          individualScore: 85,
          utsScore: 85,
          uasScore: 85,
          groupScore: 85,
          finalScore: 88,
          letterGrade: 'A-',
        };
        const sub = (submissions || []).find(s => s.studentId === selectedGradeStudent.id);
        const grp = (groups || []).find(gr => gr.id === selectedGradeStudent.groupId);
        const feedback = getStudentPersonalizedFeedback(
          selectedGradeStudent.name,
          selectedGradeStudent.nim,
          g.finalScore,
          selectedGradeStudent.topic
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Transkrip Nilai Akademik Resmi</h3>
                    <p className="text-xs text-slate-500">Mata Kuliah Filsafat Ilmu MPI 1 • Kampus STAI Jarinabi</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGradeStudent(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student info */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Mahasiswa:</span>
                  <strong className="text-slate-900">{selectedGradeStudent.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIM:</span>
                  <strong className="text-slate-900">{selectedGradeStudent.nim}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pertemuan RPS:</span>
                  <strong className="text-emerald-700">{selectedGradeStudent.rpsPart}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Topik RPS:</span>
                  <strong className="text-slate-800 line-clamp-1">{selectedGradeStudent.topic || 'Filsafat Ilmu'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kelompok:</span>
                  <strong className="text-slate-900">{grp ? grp.name : `Kelompok ${selectedGradeStudent.groupId}`}</strong>
                </div>
              </div>

              {/* Score Breakdown Table */}
              <div className="space-y-2 mb-4">
                <div className="text-xs font-bold text-slate-700">Rincian Komponen Nilai:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-600">Presensi Kehadiran (15%):</span>
                    <strong className="text-slate-900 text-sm">{g.attendanceScore}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-600">Sikap & Keaktifan (10%):</span>
                    <strong className="text-slate-900 text-sm">{g.attitudeScore}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-600">Tugas PPT & Makalah (25%):</span>
                    <strong className="text-slate-900 text-sm">{g.individualScore}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-600">UTS 5 Soal Essay (25%):</span>
                    <strong className="text-slate-900 text-sm">{g.utsScore ?? 85}</strong>
                  </div>
                  <div className="col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-600">UAS Video Kelompok AI (25%):</span>
                    <strong className="text-slate-900 text-sm">{g.uasScore ?? g.groupScore ?? 85}</strong>
                  </div>
                </div>
              </div>

              {/* Total & Grade */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-emerald-800 block font-semibold">NILAI AKHIR KUMULATIF</span>
                  <div className="text-2xl font-black text-emerald-950">{g.finalScore} / 100</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-800 block font-semibold">PREDIKAT AKADEMIK</span>
                  <div className="text-2xl font-black text-emerald-700">{g.letterGrade} ({g.finalScore >= 60 ? 'LULUS' : 'TIDAK LULUS'})</div>
                </div>
              </div>

              {/* Kata Mutiara & Evaluasi Karakteristik Otomatis */}
              <div className="space-y-3 mb-4 text-xs">
                {/* Quote Box */}
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1">
                  <div className="flex items-center justify-between text-indigo-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Quote size={13} className="text-indigo-600" />
                      <span>Kata Mutiara Kebijaksanaan & Filsafat:</span>
                    </span>
                    <span className="bg-indigo-200/80 text-indigo-950 px-2 py-0.5 rounded text-[10px] font-bold">
                      {feedback.characterTrait}
                    </span>
                  </div>
                  <p className="text-slate-700 italic pt-1">
                    "{feedback.quote}"
                  </p>
                  <div className="text-[11px] font-semibold text-indigo-800 pt-0.5">
                    — {feedback.scholar} <span className="text-slate-500 font-normal">({feedback.titleOrSource})</span>
                  </div>
                </div>

                {/* Personalized Description */}
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-600" />
                    <span>Catatan Evaluasi Karakteristik Akademik Dosen:</span>
                  </span>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    {feedback.personalizedDescription}
                  </p>
                </div>
              </div>

              {/* Custom notes if any */}
              {g.notes && (
                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Catatan Tambahan Dosen:</span>
                  <p className="text-slate-600 italic">"{g.notes}"</p>
                </div>
              )}

              {/* Tanda Tangan Pengesahan Dosen */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Ditetapkan di: {campus}</span><br />
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Terverifikasi & Ditandatangani</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Dosen Pengampu:</span>
                  <img src={DOSEN_SIGNATURE_BASE64} alt="Tanda Tangan Dosen" className="h-10 w-auto inline-block -my-1" />
                  <div className="text-xs font-bold text-slate-800">{dosenName}</div>
                </div>
              </div>

              {/* Action Buttons inside modal */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportWord(selectedGradeStudent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    title="Unduh transkrip mahasiswa ini ke format Word (.doc)"
                  >
                    <FileText size={13} />
                    <span>Word (.doc + TTD)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportExcel(selectedGradeStudent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    title="Unduh transkrip mahasiswa ini ke format Excel (.xls)"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Excel (.xls)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint(selectedGradeStudent)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    title="Cetak transkrip ini ke PDF / printer"
                  >
                    <Printer size={13} />
                    <span>Cetak / PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedGradeStudent(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
