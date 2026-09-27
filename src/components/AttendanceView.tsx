import React, { useState, useMemo, useEffect } from 'react';
import { Student, MeetingSchedule, AttendanceStatus, DosenProfile, ArchivedSemester, StudentGrade } from '../types';
import { updateAttendanceApi, isStudentOnline, formatActiveTime, updateMeetingApi } from '../services/api';
import {
  exportAttendanceToWord,
  exportAttendanceToExcel,
  exportAttendanceToPdf,
  downloadAttendanceAsPdfFile,
  printSingleMeetingAttendance,
  downloadSingleMeetingAttendanceAsPdfFile,
  exportSingleMeetingAttendanceToWord,
} from '../utils/documentExport';
import { AttendanceRecapModal } from './AttendanceRecapModal';
import { AttendanceExportModal } from './AttendanceExportModal';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  CheckCheck,
  Search,
  Edit2,
  Save,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Table,
  Layers,
  Loader2,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';

interface AttendanceViewProps {
  students: Student[];
  meetings: MeetingSchedule[];
  attendance: Record<number, Record<string, AttendanceStatus>>;
  attendanceNotes?: Record<number, Record<string, string>>;
  isDosen: boolean;
  currentStudent: Student | null;
  onRefreshData: () => Promise<void>;
  onOpenDosenLogin: () => void;
  onOpenAddStudent?: () => void;
  courseProfile?: DosenProfile;
  archivedSemesters?: ArchivedSemester[];
  grades?: Record<string, StudentGrade>;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students = [],
  meetings = [],
  attendance = {},
  attendanceNotes = {},
  isDosen = false,
  currentStudent,
  onRefreshData,
  onOpenDosenLogin,
  onOpenAddStudent,
  courseProfile,
  archivedSemesters = [],
  grades = {},
}) => {
  // Selected meeting for detailed viewing / attendance ticking (default to meeting 1: 12 Sept 2026)
  const [selectedMeetingNumber, setSelectedMeetingNumber] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);

  // Persistent local attendance state to guarantee immediate UI updates on click,
  // eliminate UI mismatches, and ensure 'Sudah Absen' + disabled state persist across re-renders.
  const [localAttendance, setLocalAttendance] = useState<Record<number, Record<string, AttendanceStatus>>>(() => {
    try {
      const saved = localStorage.getItem('siakad_local_attendance_v1');
      if (saved && (saved.trim().startsWith('{') || saved.trim().startsWith('['))) {
        return JSON.parse(saved);
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('siakad_local_attendance_v1', JSON.stringify(localAttendance));
    } catch (e) {
      console.error(e);
    }
  }, [localAttendance]);

  // Persistent local attendance notes (keterangan khusus per mahasiswa per pertemuan)
  const [localAttendanceNotes, setLocalAttendanceNotes] = useState<Record<number, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem('siakad_local_attendance_notes_v1');
      if (saved && (saved.trim().startsWith('{') || saved.trim().startsWith('['))) {
        return JSON.parse(saved);
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('siakad_local_attendance_notes_v1', JSON.stringify(localAttendanceNotes));
    } catch (e) {
      console.error(e);
    }
  }, [localAttendanceNotes]);

  // Merge server attendance with immediate local attendance overrides
  const effectiveAttendance = useMemo(() => {
    const merged: Record<number, Record<string, AttendanceStatus>> = {};
    // 1. Base from server attendance prop
    Object.keys(attendance || {}).forEach(mKey => {
      const mNum = Number(mKey);
      merged[mNum] = { ...(attendance[mNum] || {}) };
    });
    // 2. Overlay local optimistic attendance
    Object.keys(localAttendance || {}).forEach(mKey => {
      const mNum = Number(mKey);
      if (!merged[mNum]) merged[mNum] = {};
      Object.assign(merged[mNum], localAttendance[mNum]);
    });
    return merged;
  }, [attendance, localAttendance]);

  // Merge server attendance notes with local notes overrides
  const effectiveAttendanceNotes = useMemo(() => {
    const merged: Record<number, Record<string, string>> = {};
    Object.keys(attendanceNotes || {}).forEach(mKey => {
      const mNum = Number(mKey);
      merged[mNum] = { ...(attendanceNotes[mNum] || {}) };
    });
    Object.keys(localAttendanceNotes || {}).forEach(mKey => {
      const mNum = Number(mKey);
      if (!merged[mNum]) merged[mNum] = {};
      Object.assign(merged[mNum], localAttendanceNotes[mNum]);
    });
    return merged;
  }, [attendanceNotes, localAttendanceNotes]);

  // Catatan Khusus editing state for Dosen
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [tempNoteValue, setTempNoteValue] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  const handleStartEditNote = (studentId: string, currentNote: string = '') => {
    setEditingNoteStudentId(studentId);
    setTempNoteValue(currentNote);
  };

  const handleSaveNote = async (studentId: string, noteToSave: string) => {
    setIsSavingNote(true);
    const cleanedNote = noteToSave.trim();

    // Optimistically update local notes
    setLocalAttendanceNotes(prev => {
      const copy = { ...prev };
      if (!copy[selectedMeetingNumber]) copy[selectedMeetingNumber] = {};
      copy[selectedMeetingNumber][studentId] = cleanedNote;
      return copy;
    });

    const currentStatus = (effectiveAttendance[selectedMeetingNumber] || {})[studentId] || 'H';

    try {
      await updateAttendanceApi(selectedMeetingNumber, studentId, currentStatus, undefined, cleanedNote);
      await onRefreshData().catch(() => {});
    } catch (err) {
      console.warn('Save attendance note error:', err);
    } finally {
      setIsSavingNote(false);
      setEditingNoteStudentId(null);
    }
  };

  // Meeting date & title editing state for Dosen
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [editedDateStr, setEditedDateStr] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPresenters, setEditedPresenters] = useState('');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  // Export Modal & Loading states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalMeetingNumber, setExportModalMeetingNumber] = useState<number>(0);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingSessionPdf, setIsDownloadingSessionPdf] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const activeMeeting = (meetings || []).find(m => m.meetingNumber === selectedMeetingNumber) || meetings?.[0];

  const triggerActionFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handlePrint16Pdf = () => {
    exportAttendanceToPdf(exportOpts);
    triggerActionFeedback('Membuka jendela cetak / dialog simpan PDF Rekap 16 Pertemuan...');
  };

  const handleDirectDownload16Pdf = async () => {
    setIsDownloadingPdf(true);
    triggerActionFeedback('Sedang menyiapkan file PDF 16 Pertemuan...');
    try {
      await downloadAttendanceAsPdfFile(exportOpts);
      triggerActionFeedback('File PDF Rekap 16 Pertemuan berhasil diunduh!');
    } catch (err) {
      console.error(err);
      triggerActionFeedback('Membuka jendela cetak PDF...');
      exportAttendanceToPdf(exportOpts);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrintSessionAttendance = () => {
    if (!activeMeeting) return;
    printSingleMeetingAttendance({
      ...exportOpts,
      meeting: activeMeeting,
    });
    triggerActionFeedback(`Membuka jendela cetak Presensi Pertemuan #${activeMeeting.meetingNumber}...`);
  };

  const handleDownloadSessionPdf = async () => {
    if (!activeMeeting) return;
    setIsDownloadingSessionPdf(true);
    triggerActionFeedback(`Sedang menyiapkan PDF Pertemuan #${activeMeeting.meetingNumber}...`);
    try {
      await downloadSingleMeetingAttendanceAsPdfFile({
        ...exportOpts,
        meeting: activeMeeting,
      });
      triggerActionFeedback(`File PDF Pertemuan #${activeMeeting.meetingNumber} berhasil diunduh!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingSessionPdf(false);
    }
  };

  const handleDownloadSessionWord = () => {
    if (!activeMeeting) return;
    exportSingleMeetingAttendanceToWord({
      ...exportOpts,
      meeting: activeMeeting,
    });
    triggerActionFeedback(`File Word Pertemuan #${activeMeeting.meetingNumber} berhasil diunduh!`);
  };

  const exportOpts = {
    campusName: courseProfile?.campusName || 'STAI Jarinabi',
    dosenFullName:
      courseProfile?.name ||
      (courseProfile?.dosenName
        ? `${courseProfile.dosenName}${courseProfile.dosenTitle ? ', ' + courseProfile.dosenTitle : ''}`
        : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'),
    courseTitle: courseProfile?.courseTitle || 'Filsafat Ilmu',
    courseCode: courseProfile?.courseCode || 'MPI-501',
    sks: courseProfile?.sks || 3,
    semester: courseProfile?.semester || 'Semester Ganjil 2026/2027',
    studyProgram: courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)',
    academicYear: 'T.A 2026/2027',
    students,
    meetings,
    attendance: effectiveAttendance,
    grades,
  };


  const handleStartEditMeeting = () => {
    if (!activeMeeting) return;
    setEditedDateStr(activeMeeting.dateStr);
    setEditedTitle(activeMeeting.title);
    setEditedPresenters(activeMeeting.presenters?.join(', ') || '');
    setIsEditingMeeting(true);
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting) return;
    setIsSavingMeeting(true);
    try {
      await updateMeetingApi(activeMeeting.meetingNumber, {
        dateStr: editedDateStr,
        title: editedTitle,
        presenters: editedPresenters.split(',').map(s => s.trim()).filter(Boolean),
      });
      setIsEditingMeeting(false);
      await onRefreshData().catch(() => {});
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  // Function for student self-attendance or dosen quick mark
  // Updates local state IMMEDIATELY on click to guarantee zero delay and prevent UI mismatches,
  // then verifies database completion asynchronously.
  const handleStudentSelfAbsen = async (studentId: string) => {
    setSavingStudentId(studentId);
    
    // 1. Immediate local update: immediately flips button to 'Sudah Absen' and disabled state
    setLocalAttendance(prev => ({
      ...prev,
      [selectedMeetingNumber]: {
        ...(prev[selectedMeetingNumber] || {}),
        [studentId]: 'H',
      },
    }));

    try {
      // 2. Asynchronous database call to verify completion
      const ok = await updateAttendanceApi(selectedMeetingNumber, studentId, 'H');
      if (ok) {
        triggerActionFeedback('Presensi kehadiran Anda berhasil dicatat dan diverifikasi di database!');
        // 3. Reconcile with latest server database state
        await onRefreshData().catch(() => {});
      } else {
        // Rollback local optimistic state if server failed
        setLocalAttendance(prev => {
          const updatedMeeting = { ...(prev[selectedMeetingNumber] || {}) };
          delete updatedMeeting[studentId];
          return { ...prev, [selectedMeetingNumber]: updatedMeeting };
        });
        triggerActionFeedback('Gagal memverifikasi presensi ke database. Silakan coba lagi.');
      }
    } catch (err) {
      console.error(err);
      // Rollback local optimistic state on connection failure
      setLocalAttendance(prev => {
        const updatedMeeting = { ...(prev[selectedMeetingNumber] || {}) };
        delete updatedMeeting[studentId];
        return { ...prev, [selectedMeetingNumber]: updatedMeeting };
      });
      triggerActionFeedback('Terjadi kesalahan koneksi saat menyimpan presensi.');
    } finally {
      setSavingStudentId(null);
    }
  };

  const handleSetStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!isDosen) return;
    const previousStatus = (effectiveAttendance[selectedMeetingNumber] || {})[studentId] || 'BELUM';

    // 1. Immediate local update on click
    setLocalAttendance(prev => ({
      ...prev,
      [selectedMeetingNumber]: {
        ...(prev[selectedMeetingNumber] || {}),
        [studentId]: status,
      },
    }));

    setIsUpdating(true);
    try {
      // 2. Async database call verifying completion
      const ok = await updateAttendanceApi(selectedMeetingNumber, studentId, status);
      if (ok) {
        await onRefreshData().catch(() => {});
      } else {
        // Revert on failure
        setLocalAttendance(prev => ({
          ...prev,
          [selectedMeetingNumber]: {
            ...(prev[selectedMeetingNumber] || {}),
            [studentId]: previousStatus,
          },
        }));
        triggerActionFeedback('Gagal memperbarui status presensi di database.');
      }
    } catch (err) {
      console.error(err);
      setLocalAttendance(prev => ({
        ...prev,
        [selectedMeetingNumber]: {
          ...(prev[selectedMeetingNumber] || {}),
          [studentId]: previousStatus,
        },
      }));
      triggerActionFeedback('Kesalahan koneksi saat memperbarui status presensi.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkSetHadir = async () => {
    if (!isDosen) return;

    // 1. Immediate local update for all students
    const bulkUpdates: Record<string, AttendanceStatus> = {};
    students.forEach(s => {
      bulkUpdates[s.id] = 'H';
    });

    setLocalAttendance(prev => ({
      ...prev,
      [selectedMeetingNumber]: {
        ...(prev[selectedMeetingNumber] || {}),
        ...bulkUpdates,
      },
    }));

    setIsUpdating(true);
    try {
      // 2. Async database call
      const ok = await updateAttendanceApi(selectedMeetingNumber, undefined, undefined, 'H');
      if (ok) {
        triggerActionFeedback('Seluruh mahasiswa berhasil ditandai Hadir (H) di database!');
        await onRefreshData().catch(() => {});
      } else {
        triggerActionFeedback('Gagal memperbarui presensi massal di database.');
        await onRefreshData().catch(() => {});
      }
    } catch (err) {
      console.error(err);
      triggerActionFeedback('Kesalahan koneksi saat memperbarui presensi massal.');
      await onRefreshData().catch(() => {});
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rpsPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nim.includes(searchTerm)
  );

  // Statistics for selected meeting using effectiveAttendance
  const meetingAttendance = effectiveAttendance[selectedMeetingNumber] || {};
  let hadirCount = 0;
  let izinCount = 0;
  let sakitCount = 0;
  let alfaCount = 0;

  students.forEach(s => {
    const status = meetingAttendance[s.id] || 'BELUM';
    if (status === 'H') hadirCount++;
    else if (status === 'I') izinCount++;
    else if (status === 'S') sakitCount++;
    else if (status === 'A') alfaCount++;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              <Calendar size={13} />
              <span>Sistem Absensi Digital 16 Pertemuan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-title">
              Presensi Perkuliahan Filsafat Ilmu (Sabtu 12 Sep 2026 - 16 Pertemuan)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Mencatat kehadiran resmi 15 mahasiswa dengan 4 status: <strong>Hadir (H)</strong>, <strong>Izin (I)</strong>, <strong>Sakit (S)</strong>, dan <strong>Alfa (A)</strong>. Diverifikasi dan dicentang langsung oleh Dosen Pengampu melalui Portal Dosen.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isDosen ? (
              <button
                onClick={onOpenDosenLogin}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-800 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
              >
                <ShieldCheck size={16} className="text-indigo-600" />
                <span>Buka Portal Dosen untuk Centang Absen</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {onOpenAddStudent && (
                  <button
                    type="button"
                    id="btn-attendance-tambah-mhs"
                    onClick={onOpenAddStudent}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Tambah data mahasiswa baru ke daftar kelas"
                  >
                    <UserPlus size={15} />
                    <span>+ Tambah Mahasiswa</span>
                  </button>
                )}
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-700" />
                  <span>Mode Dosen: Klik status untuk absensi</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PUSAT UNDUH & REKAPITULASI SEMUA PERTEMUAN (P1 - P16) */}
        <div className="mt-5 p-4 bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl shadow-xs border border-emerald-700/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Download size={16} className="text-emerald-300" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Pusat Unduh Rekap Presensi 16 Pertemuan
              </h3>
              <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                PDF • Word • Excel
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/80 mt-1 max-w-xl">
              Unduh rekapitulasi kehadiran lengkap pertemuan 1 sampai 16 untuk semester ini atau semester lainnya. Lengkap dengan persentase kehadiran, bobot nilai 15%, dan tanda tangan resmi dosen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRecapModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Buka tampilan tabel matriks presensi 16 pertemuan lengkap"
            >
              <Table size={14} />
              <span>Lihat Matriks Rekap</span>
            </button>

            <button
              type="button"
              onClick={handlePrint16Pdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Buka dialog cetak printer atau simpan sebagai PDF dari browser"
            >
              <Printer size={14} />
              <span>Cetak PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDirectDownload16Pdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Unduh file .pdf rekap 16 pertemuan langsung ke perangkat"
            >
              {isDownloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isDownloadingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => exportAttendanceToWord(exportOpts)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Unduh dokumen Microsoft Word (.doc) lengkap tanda tangan dosen"
            >
              <FileText size={14} />
              <span>Unduh Word</span>
            </button>

            <button
              type="button"
              onClick={() => exportAttendanceToExcel(exportOpts)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
              title="Unduh spreadsheet Microsoft Excel (.xls) dengan format cell & formula"
            >
              <FileSpreadsheet size={14} />
              <span>Unduh Excel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setExportModalMeetingNumber(0);
                setIsExportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-colors border border-white/20 shadow-2xs cursor-pointer"
              title="Buka panel lengkap pilihan dokumen, beralih mode cetak, atau unduh berkas"
            >
              <SlidersHorizontal size={14} />
              <span>Pilihan Lengkap</span>
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="mt-3 px-4 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-2xs animate-fadeIn">
            <CheckCircle size={15} className="text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}


        {/* 16 Pertemuan Horizontal Selector Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Pilih Pertemuan Kuliah (Setiap Sabtu):</span>
            <span className="text-emerald-800 font-semibold text-[11px]">
              {activeMeeting.dateStr}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {meetings.map((m) => {
              const isSelected = m.meetingNumber === selectedMeetingNumber;
              const isToday = m.meetingNumber === 1;

              return (
                <button
                  type="button"
                  key={m.meetingNumber}
                  onClick={() => setSelectedMeetingNumber(m.meetingNumber)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center min-w-[70px] ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-md scale-[1.02]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span className="text-[10px] opacity-75">TEMU</span>
                  <span className="text-sm font-black">{m.meetingNumber}</span>
                  {isToday && (
                    <span className="text-[8px] bg-emerald-500 text-white px-1 rounded mt-0.5">
                      Hari Ini
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Meeting Summary & Ticking Roster */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        
        {/* Tombol & Status Absensi Mandiri Mahasiswa */}
        {currentStudent && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/70 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <UserCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-100/90 px-2 py-0.5 rounded-md">
                    Presensi Mahasiswa • Pertemuan #{selectedMeetingNumber}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">({activeMeeting.dateStr})</span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                  {currentStudent.name} <span className="font-normal text-xs text-slate-600">({currentStudent.nim})</span>
                </h4>
                <p className="text-[11px] text-slate-600">
                  {meetingAttendance[currentStudent.id] === 'H'
                    ? 'Status kehadiran Anda telah berhasil tercatat Hadir (H) di database.'
                    : 'Anda belum mengisi presensi untuk pertemuan ini. Silakan klik tombol di samping.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {meetingAttendance[currentStudent.id] === 'H' ? (
                <button
                  type="button"
                  disabled
                  id="btn-status-sudah-absen-banner"
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-default border border-emerald-700"
                >
                  <CheckCircle size={17} />
                  <span>Sudah Absen</span>
                </button>
              ) : (
                <button
                  type="button"
                  id="btn-klik-absen-banner"
                  onClick={() => handleStudentSelfAbsen(currentStudent.id)}
                  disabled={savingStudentId === currentStudent.id}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Klik untuk menyimpan absensi kehadiran Anda ke database"
                >
                  {savingStudentId === currentStudent.id ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={17} />
                      <span>Klik untuk Absen</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Meeting Header Detail */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          {isEditingMeeting ? (
            <form onSubmit={handleSaveMeeting} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">
                  Edit Tanggal & Informasi Pertemuan {activeMeeting.meetingNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingMeeting(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tanggal Presensi (Contoh: Sabtu, 19 September 2026)
                  </label>
                  <input
                    type="text"
                    required
                    value={editedDateStr}
                    onChange={e => setEditedDateStr(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pemateri (Pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={editedPresenters}
                    onChange={e => setEditedPresenters(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Topik Kajian Pertemuan
                </label>
                <input
                  type="text"
                  required
                  value={editedTitle}
                  onChange={e => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMeeting(false)}
                  disabled={isSavingMeeting}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingMeeting}
                  className="flex items-center gap-1 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <Save size={13} />
                  <span>{isSavingMeeting ? 'Menyimpan...' : 'Simpan Tanggal'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded bg-slate-900 text-white">
                    PERTEMUAN {activeMeeting.meetingNumber}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {activeMeeting.dateStr}
                  </span>
                  {isDosen && (
                    <button
                      onClick={handleStartEditMeeting}
                      className="p-1 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                      title="Edit Tanggal & Info Pertemuan Ini"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 mt-1.5">
                  {activeMeeting.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemateri: {activeMeeting.presenters.join(', ')}
                </p>
              </div>

              {/* Counts & Dosen Bulk Action */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md font-bold">
                    H: {hadirCount}
                  </span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-bold">
                    I: {izinCount}
                  </span>
                  <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-bold">
                    S: {sakitCount}
                  </span>
                  <span className="bg-rose-100 text-rose-800 px-2 py-1 rounded-md font-bold">
                    A: {alfaCount}
                  </span>
                </div>

                {isDosen && (
                  <>
                    <button
                      type="button"
                      onClick={handleStartEditMeeting}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-xs"
                      title="Edit tanggal presensi untuk pertemuan ini"
                    >
                      <Edit2 size={13} />
                      <span>Edit Tanggal</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkSetHadir}
                      disabled={isUpdating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      <CheckCheck size={14} />
                      <span>Set Semua Hadir</span>
                    </button>
                  </>
                )}
              </div>

              {/* Sesi Meeting-Specific Print & Download Toolbar */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
                  <FileText size={14} className="text-emerald-700" />
                  <span>Dokumen Presensi & Berita Acara Sesi #{activeMeeting.meetingNumber}:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrintSessionAttendance}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title={`Buka dialog cetak presensi pertemuan #${activeMeeting.meetingNumber}`}
                  >
                    <Printer size={13} className="text-rose-600" />
                    <span>Cetak Sesi #{activeMeeting.meetingNumber}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSessionPdf}
                    disabled={isDownloadingSessionPdf}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title={`Unduh file PDF resmi presensi pertemuan #${activeMeeting.meetingNumber}`}
                  >
                    {isDownloadingSessionPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    <span>{isDownloadingSessionPdf ? 'Menyiapkan...' : 'Unduh PDF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSessionWord}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title={`Unduh file Word presensi pertemuan #${activeMeeting.meetingNumber}`}
                  >
                    <FileText size={13} />
                    <span>Unduh Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExportModalMeetingNumber(activeMeeting.meetingNumber);
                      setIsExportModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Buka opsi cetak & unduh lengkap"
                  >
                    <SlidersHorizontal size={13} />
                    <span>Opsi</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mahasiswa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <span className="text-xs text-slate-500">
            Total: {filteredStudents.length} Mahasiswa
          </span>
        </div>

        {/* Attendance List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {filteredStudents.map((std, idx) => {
            const status = meetingAttendance[std.id] || 'BELUM';
            const studentNote = (effectiveAttendanceNotes[selectedMeetingNumber] || {})[std.id] || '';
            const online = isStudentOnline(std.lastActive);
            const isMe = currentStudent?.id === std.id;

            return (
              <div
                key={std.id}
                className={`p-3 sm:p-4 flex flex-col transition-colors ${
                  isMe ? 'bg-emerald-50/50' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <span className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      {online && (
                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {std.name}
                        </span>
                        {isMe && (
                          <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded font-bold">
                            Anda
                          </span>
                        )}
                        {online && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        NIM: {std.nim} • {std.rpsPart} • Terakhir: {formatActiveTime(std.lastActive)}
                      </div>

                      {/* Display Catatan / Keterangan Khusus */}
                      {studentNote && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                          <FileText size={12} className="text-amber-700 shrink-0" />
                          <span>Keterangan: <strong className="text-amber-950 font-bold">{studentNote}</strong></span>
                          {isDosen && (
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(std.id, studentNote)}
                              className="ml-1 text-indigo-700 hover:text-indigo-900 underline text-[10px] font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Ticking Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                    {isDosen ? (
                      // Dosen can click any status button + add note
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(std.id, 'H')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            status === 'H'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title="Hadir"
                        >
                          Hadir (H)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(std.id, 'I')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            status === 'I'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                          }`}
                          title="Izin"
                        >
                          Izin (I)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(std.id, 'S')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            status === 'S'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                          title="Sakit"
                        >
                          Sakit (S)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(std.id, 'A')}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            status === 'A'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title="Alfa"
                        >
                          Alfa (A)
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditNote(std.id, studentNote)}
                          className={`px-2 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                            studentNote
                              ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-indigo-700'
                          }`}
                          title="Beri Catatan Khusus / Keterangan (Izin, Sakit, Alpa, dll.)"
                        >
                          <Edit2 size={11} />
                          <span>{studentNote ? 'Edit Ket' : '+ Ket'}</span>
                        </button>
                      </div>
                    ) : (
                    // Student view (interactive self-attendance button)
                    <div className="flex items-center gap-2">
                      {status === 'I' && (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-xs flex items-center gap-1 border border-blue-200">
                          <Clock size={13} /> Izin
                        </span>
                      )}
                      {status === 'S' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs flex items-center gap-1 border border-amber-200">
                          <AlertCircle size={13} /> Sakit
                        </span>
                      )}
                      {status === 'A' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold text-xs flex items-center gap-1 border border-rose-200">
                          <AlertCircle size={13} /> Alfa
                        </span>
                      )}

                      {status === 'H' ? (
                        <button
                          type="button"
                          disabled
                          className="px-3.5 py-1.5 bg-emerald-600 text-white border border-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-default"
                          title="Kehadiran telah tercatat Hadir (H) di database"
                        >
                          <CheckCircle size={14} className="text-white" />
                          <span>Sudah Absen</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStudentSelfAbsen(std.id)}
                          disabled={savingStudentId === std.id}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                          title="Klik untuk konfirmasi kehadiran dan simpan ke database"
                        >
                          {savingStudentId === std.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <UserCheck size={13} />
                              <span>{isMe ? 'Klik untuk Absen' : 'Klik untuk Absen'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

                {/* Inline Note Editor for Dosen */}
                {isDosen && editingNoteStudentId === std.id && (
                  <div className="w-full mt-3 pt-3 border-t border-slate-200 bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-700" />
                        <span>Catatan Khusus / Keterangan Kehadiran: <strong>{std.name}</strong> (Pertemuan #{selectedMeetingNumber})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingNoteStudentId(null)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold mr-1">Pilih Cepat:</span>
                      {[
                        'Izin (Surat Terlampir)',
                        'Sakit (Surat Dokter)',
                        'Izin Tugas Kampus / Organisasi',
                        'Dispensasi Lomba / Acara',
                        'Izin Keperluan Keluarga',
                        'Terlambat Masuk Kelas',
                        'Alpa (Tanpa Keterangan)',
                      ].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTempNoteValue(preset)}
                          className="px-2 py-0.5 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-100 text-[10px] font-semibold text-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempNoteValue}
                        onChange={e => setTempNoteValue(e.target.value)}
                        placeholder="Ketik catatan khusus atau pilih template di atas..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        disabled={isSavingNote}
                        onClick={() => handleSaveNote(std.id, tempNoteValue)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Save size={13} />
                        <span>{isSavingNote ? 'Menyimpan...' : 'Simpan Catatan'}</span>
                      </button>
                      {studentNote && (
                        <button
                          type="button"
                          disabled={isSavingNote}
                          onClick={() => handleSaveNote(std.id, '')}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Hapus Catatan"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">Keterangan:</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> H = Hadir
            </span>
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> I = Izin
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> S = Sakit
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span> A = Alfa
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Total 16 Pertemuan dihitung ke bobot 15% Rekap Nilai SIAKAD.
          </div>
        </div>

      </div>

      {/* Attendance Recap Modal for 16 Meetings (PDF, Word, Excel, Print) */}
      <AttendanceRecapModal
        isOpen={isRecapModalOpen}
        onClose={() => setIsRecapModalOpen(false)}
        students={students}
        meetings={meetings}
        attendance={attendance}
        grades={grades}
        courseProfile={courseProfile}
        archivedSemesters={archivedSemesters}
      />

      {/* Dedicated Attendance Export & Print Modal */}
      <AttendanceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        students={students}
        meetings={meetings}
        attendance={attendance}
        grades={grades}
        courseProfile={courseProfile}
        initialMeetingNumber={exportModalMeetingNumber}
      />

    </div>
  );
};
