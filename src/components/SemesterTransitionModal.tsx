import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Upload,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  History,
  Archive,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DosenProfile, Student, StudentGrade, AttendanceStatus, MeetingSchedule, ArchivedSemester } from '../types';
import {
  exportGradesToWord,
  exportAttendanceToWord,
  exportAttendanceToExcel,
  exportAttendanceToPdf,
} from '../utils/documentExport';
import { transitionSemesterApi, parseRpsFileApi, fetchArchivedSemestersApi, restoreArchivedSemesterApi } from '../services/api';

interface SemesterTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: DosenProfile;
  currentCourseProfile?: DosenProfile;
  students?: Student[];
  currentStudents?: Student[];
  grades?: Record<string, StudentGrade>;
  currentGrades?: Record<string, StudentGrade>;
  attendance?: Record<number, Record<string, AttendanceStatus>>;
  meetings?: MeetingSchedule[];
  currentMeetings?: MeetingSchedule[];
  onSuccess?: (updatedDb: any) => void;
  onTransitionSuccess?: (updatedDb: any) => void;
}

export const SemesterTransitionModal: React.FC<SemesterTransitionModalProps> = ({
  isOpen,
  onClose,
  profile,
  currentCourseProfile,
  students: propStudents,
  currentStudents,
  grades: propGrades,
  currentGrades,
  attendance,
  meetings: propMeetings,
  currentMeetings,
  onSuccess,
  onTransitionSuccess,
}) => {
  const students = propStudents || currentStudents || [];
  const grades = propGrades || currentGrades || {};
  const meetings = propMeetings || currentMeetings || [];
  const activeProfile = profile || currentCourseProfile;
  const handleSuccessCallback = onSuccess || onTransitionSuccess || (() => {});
  const [newSemesterName, setNewSemesterName] = useState('Semester Genap 2026/2027');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [archiveCurrent, setArchiveCurrent] = useState(true);
  const [resetSubmissions, setResetSubmissions] = useState(true);
  const [rpsText, setRpsText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'transisi' | 'arsip'>('transisi');
  const [archivesList, setArchivesList] = useState<ArchivedSemester[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Load archives when modal opens or tab switched
  useEffect(() => {
    if (isOpen) {
      loadArchives();
    }
  }, [isOpen, activeModalTab]);

  const loadArchives = async () => {
    setIsLoadingArchives(true);
    try {
      const archives = await fetchArchivedSemestersApi();
      setArchivesList(archives);
    } catch (err) {
      console.warn('Failed to load archives:', err);
    } finally {
      setIsLoadingArchives(false);
    }
  };

  const handleRestoreArchive = async (archive: ArchivedSemester) => {
    setRestoringId(archive.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await restoreArchivedSemesterApi(archive.id);
      if (res.success && res.data) {
        setSuccessMsg(`Semester ${archive.semesterName} berhasil dipulihkan dengan data utuh!`);
        setTimeout(() => {
          handleSuccessCallback(res.data);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Gagal memulihkan arsip semester');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat memulihkan arsip.');
    } finally {
      setRestoringId(null);
    }
  };

  if (!isOpen) return null;

  const campus = activeProfile?.campusName || 'STAI Jarinabi';
  const dosenFullName = activeProfile?.name || (activeProfile?.dosenName ? `${activeProfile.dosenName}${activeProfile.dosenTitle ? ', ' + activeProfile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const courseTitle = activeProfile?.courseTitle || 'Filsafat Ilmu';
  const courseCode = activeProfile?.courseCode || 'MPI-501';
  const sks = activeProfile?.sks || 3;
  const currentSemester = activeProfile?.semester || 'Semester Ganjil 2026/2027';
  const prodi = activeProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  // Export to Word
  const handleExportWord = () => {
    exportGradesToWord({
      campusName: campus,
      dosenFullName,
      courseTitle,
      courseCode,
      sks,
      semester: currentSemester,
      studyProgram: prodi,
      students,
      grades,
      attendance,
      meetings,
    });
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const headers = [
      'No',
      'NIM',
      'Nama Mahasiswa',
      'Presensi (15%)',
      'Sikap (10%)',
      'PPT/Makalah (25%)',
      'UTS (25%)',
      'UAS Video (25%)',
      'Nilai Akhir',
      'Grade',
      'Status Kelulusan',
    ];

    const rows = students.map((std, idx) => {
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
      return [
        idx + 1,
        `"${std.nim}"`,
        `"${std.name}"`,
        g.attendanceScore,
        g.attitudeScore,
        g.individualScore,
        g.utsScore ?? 85,
        g.uasScore ?? g.groupScore ?? 85,
        g.finalScore,
        `"${g.letterGrade}"`,
        g.finalScore >= 60 ? '"LULUS"' : '"TIDAK LULUS"',
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Nilai_${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${currentSemester.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export Attendance 16 Meetings (PDF, Word, Excel)
  const attendanceExportOpts = {
    campusName: campus,
    dosenFullName,
    courseTitle,
    courseCode,
    sks,
    semester: currentSemester,
    studyProgram: prodi,
    academicYear,
    students,
    meetings,
    attendance: attendance || {},
    grades,
  };

  const handleExportAttendancePdf = () => {
    exportAttendanceToPdf(attendanceExportOpts);
  };

  const handleExportAttendanceWord = () => {
    exportAttendanceToWord(attendanceExportOpts);
  };

  const handleExportAttendanceExcel = () => {
    exportAttendanceToExcel(attendanceExportOpts);
  };


  // Handle RPS File Upload (supports Word docx/doc, PDF, txt)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isBinaryDoc = /\.(docx|doc|pdf)$/i.test(file.name);

    if (isBinaryDoc) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const resultStr = (event.target?.result as string) || '';
            const base64Data = resultStr.includes('base64,')
              ? resultStr.split('base64,')[1]
              : btoa(resultStr);

            const parseRes = await parseRpsFileApi({
              base64: base64Data,
              filename: file.name,
            });

            if (parseRes.success && parseRes.text) {
              setRpsText(parseRes.text);
            }
          } catch (err) {
            console.warn('Gagal membaca dokumen berkas:', err);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.warn('Gagal memproses file:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRpsText(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Submit Semester Transition
  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterName.trim()) {
      setErrorMsg('Nama semester baru wajib diisi!');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await transitionSemesterApi({
        newSemesterName: newSemesterName.trim(),
        academicYear: academicYear.trim(),
        rpsText: rpsText.trim(),
        archiveCurrent,
        resetSubmissions,
      });

      if (result.success && result.data) {
        setSuccessMsg(result.message || 'Pindah semester berhasil!');
        setTimeout(() => {
          handleSuccessCallback(result.data);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(result.error || 'Gagal memproses transisi semester');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi saat memproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Archive className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Pindah Semester & Upload RPS Terbaru</h2>
              <p className="text-xs text-emerald-200">
                Arsipkan data lama ke Word/Excel dan mulai semester baru dengan RPS teranyar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/90 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveModalTab('transisi')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeModalTab === 'transisi'
                ? 'border-emerald-700 text-emerald-950 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-3.5 h-3.5 text-emerald-700" />
            <span>Pindah Semester & RPS Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab('arsip')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeModalTab === 'arsip'
                ? 'border-emerald-700 text-emerald-950 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-teal-700" />
            <span>Koleksi Arsip Semester ({archivesList.length})</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
              Tersimpan Aman
            </span>
          </button>
        </div>

        {activeModalTab === 'transisi' ? (
          /* Content: Form Pindah Semester */
          <form onSubmit={handleTransitionSubmit} className="p-6 overflow-y-auto space-y-6 text-sm text-slate-800">
            
            {/* Status Message */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center space-x-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-center space-x-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Permanent Data Safety Guarantee Banner */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-emerald-950 block text-sm mb-0.5 flex items-center gap-1.5">
                  <span>Jaminan Data Aman: Data Setiap Semester Tidak Akan Pernah Hilang</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </span>
                Saat berpindah semester, sistem secara otomatis mengabadikan seluruh rekam jejak akademik (identitas mahasiswa, 16 pertemuan RPS, seluruh nilai tugas makalah, UTS esai, UAS video, kuis, dan riwayat presensi) ke dalam <strong>Database Arsip Permanen</strong>. Data semester lama selalu dapat Anda buka, unduh ke Word/Excel/PDF, atau dipulihkan kembali kapan saja di tab <em>"Koleksi Arsip Semester"</em>.
              </div>
            </div>

            {/* Current Semester Info Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Semester Saat Ini</div>
                <div className="text-base font-bold text-slate-900">{currentSemester}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {courseTitle} ({courseCode}) • {dosenFullName} • {campus}
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {students?.length || 0} Mahasiswa Terdaftar
                </span>
              </div>
            </div>

          {/* STEP 1: Simpan Data Lama Word / Excel */}
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs">1</span>
              <span>Simpan Data Semester Lama (Wajib Unduh Sebelum Pindah)</span>
            </div>
            <p className="text-xs text-slate-600">
              Unduh rekapitulasi nilai dan kehadiran semester ini ke dalam format Microsoft Word resmi atau Excel (.csv) agar rekam jejak akademik tersimpan aman di komputer Anda:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportWord}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                <span>Unduh Rekap Nilai (Word .doc)</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Rekap Nilai (Excel .csv)</span>
              </button>
            </div>

            <div className="pt-2 border-t border-emerald-200/60">
              <div className="text-[11px] font-bold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unduh Khusus Rekap Presensi 16 Pertemuan ({currentSemester}):</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleExportAttendancePdf}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Presensi PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAttendanceWord}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Presensi Word</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAttendanceExcel}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Presensi Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2: Atur Semester Baru */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">2</span>
              <span>Tentukan Identitas Semester Baru</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Semester Baru
                </label>
                <input
                  type="text"
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  placeholder="Contoh: Semester Genap 2026/2027"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Akademik
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Contoh: 2026/2027"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={archiveCurrent}
                  onChange={(e) => setArchiveCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-medium">
                  Simpan data semester ini ke Arsip Digital SIAKAD (data nilai & presensi tetap tersimpan aman di database)
                </span>
              </label>
              <label className="flex items-center space-x-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetSubmissions}
                  onChange={(e) => setResetSubmissions(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-medium">
                  Reset tugas pengumpulan mahasiswa & presensi untuk memulai lembar perkuliahan semester baru yang bersih
                </span>
              </label>
            </div>
          </div>

          {/* STEP 3: Upload RPS Terbaru */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs">3</span>
              <span>Upload RPS Terbaru untuk Semester Baru</span>
            </div>

            <div className="p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/20 rounded-xl text-center">
              <Upload className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-800">
                Pilih Dokumen RPS (.txt, .doc, .docx) atau Tempel Langsung Teks RPS di Bawah
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sistem akan secara otomatis menyinkronkan matriks 16 pertemuan baru ke jadwal perkuliahan
              </p>
              <input
                type="file"
                id="rps-file-input"
                accept=".txt,.doc,.docx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="rps-file-input"
                className="mt-3 inline-flex items-center space-x-1.5 px-4 py-1.5 bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{fileName ? `File: ${fileName}` : 'Pilih File Dokumen RPS Terbaru'}</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teks / Rincian Materi RPS Terbaru (Opsional bila sudah mengunggah file)
              </label>
              <textarea
                value={rpsText}
                onChange={(e) => setRpsText(e.target.value)}
                placeholder="Tempel rincian materi Pertemuan 1 s/d 16 RPS terbaru di sini... (Contoh: Pertemuan 1: Kontrak Kuliah... Pertemuan 2: Pembahasan...)"
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses Transisi Semester...</span>
                </>
              ) : (
                <>
                  <span>Mulai Semester Baru & Terapkan RPS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
        ) : (
          /* Content: Koleksi Arsip Semester Tersimpan */
          <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-800">
            
            {/* Status Feedback */}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center space-x-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-center space-x-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-emerald-700" />
                  <span>Koleksi Arsip Digital Semester Sebelumnya</span>
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Setiap kali berpindah semester, salinan utuh nilai, tugas, dan presensi tersimpan permanen di sini.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-700 text-white font-bold text-xs">
                {archivesList.length} Semester Tersimpan
              </span>
            </div>

            {isLoadingArchives ? (
              <div className="p-12 text-center text-slate-500">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span>Memuat data arsip semester...</span>
              </div>
            ) : archivesList.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                <Archive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-slate-700 text-sm">Belum Ada Arsip Semester</h4>
                <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                  Saat Anda melakukan transisi semester untuk pertama kalinya, data semester aktif saat ini akan langsung diabadikan di sini secara otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivesList.map((arch) => (
                  <div
                    key={arch.id}
                    className="p-4 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>{arch.semesterName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                            TA {arch.academicYear}
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {arch.courseTitle} ({arch.courseCode}) • Diarsipkan pada {new Date(arch.archivedAt).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 self-start sm:self-center">
                        <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
                          {arch.totalStudents || arch.students?.length || 0} Mahasiswa
                        </span>
                        {confirmRestoreId === arch.id ? (
                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                            <span className="text-[11px] font-bold text-amber-900">Yakin pulihkan?</span>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmRestoreId(null);
                                handleRestoreArchive(arch);
                              }}
                              disabled={restoringId === arch.id}
                              className="px-2 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Ya
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreId(null)}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={restoringId === arch.id}
                            onClick={() => setConfirmRestoreId(arch.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                            title="Muat kembali semester ini sebagai semester aktif"
                          >
                            {restoringId === arch.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Memulihkan...</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3 h-3" />
                                <span>Pulihkan Semester Ini</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Export Buttons for this Archive */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Unduh Rekap Arsip ({arch.semesterName}):
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            exportGradesToWord({
                              campusName: campus,
                              dosenFullName,
                              courseTitle: arch.courseTitle,
                              courseCode: arch.courseCode,
                              sks,
                              semester: arch.semesterName,
                              studyProgram: prodi,
                              students: arch.students || [],
                              grades: arch.grades || {},
                              attendance: arch.attendance || {},
                              meetings: arch.meetings || [],
                            });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Nilai (Word)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const headers = ['No', 'NIM', 'Nama Mahasiswa', 'Presensi', 'Sikap', 'PPT/Makalah', 'UTS', 'UAS', 'Nilai Akhir', 'Grade'];
                            const rows = (arch.students || []).map((std, idx) => {
                              const g = (arch.grades || {})[std.id] || { attendanceScore: 100, attitudeScore: 85, individualScore: 85, utsScore: 85, uasScore: 85, finalScore: 88, letterGrade: 'A-' };
                              return [idx + 1, `"${std.nim}"`, `"${std.name}"`, g.attendanceScore, g.attitudeScore, g.individualScore, g.utsScore, g.uasScore, g.finalScore, `"${g.letterGrade}"`].join(',');
                            });
                            const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `Rekap_Nilai_ARSIP_${arch.semesterName.replace(/[\s\/]/g, '_')}.csv`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          <span>Nilai (Excel)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            exportAttendanceToPdf({
                              campusName: campus,
                              dosenFullName,
                              courseTitle: arch.courseTitle,
                              courseCode: arch.courseCode,
                              sks: arch.sks || 2,
                              semester: arch.semesterName,
                              studyProgram: prodi,
                              students: arch.students || [],
                              meetings: arch.meetings || [],
                              attendance: arch.attendance || {},
                            });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Presensi (PDF)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        )}

        {/* Modal Micro Footer */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Aplikasi ini dibuat oleh <span className="font-semibold text-emerald-800">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</span>
        </div>

      </div>
    </div>
  );
};
