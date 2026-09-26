import React, { useState } from 'react';
import {
  Student,
  GroupProject,
  IndividualSubmission,
  MeetingSchedule,
  StudentGrade,
  UtsQuestion,
  UtsSubmission,
  DosenProfile,
  StudentDosenMessage,
  SiakadDatabase,
} from '../types';
import {
  gradeIndividualTask,
  gradeGroupProject,
  gradeUtsSubmissionApi,
  deleteSubmissionApi,
  changeDosenPasswordApi,
  isStudentOnline,
  formatActiveTime,
  updateStudentApi,
  deleteStudentApi,
  addMeetingPresenterApi,
  removeMeetingPresenterApi,
  updateMeetingPresentationGroupApi,
  gradePresentationGroupApi,
  markStudentMessageReadApi,
  replyStudentMessageApi,
  deleteStudentMessageApi,
  clearAllMessagesApi,
  restoreBackupToServer,
  updateExamSettingsApi,
  updateGroupApi,
} from '../services/api';
import {
  exportAllTasksToExcel,
  exportAllTasksToJson,
  validateBackupJson,
  exportAllTasksToZip,
  printViaHiddenIframe,
} from '../utils/documentExport';
import { DOSEN_SIGNATURE_BASE64 } from '../assets/dosenSignature';
import { DocumentPreviewModal, DocumentPreviewData } from './DocumentPreviewModal';
import { RpsManagerView } from './RpsManagerView';
import { StudentBiodataModal } from './StudentBiodataModal';
import { StudentActivityCharts } from './dosen/StudentActivityCharts';
import JSZip from 'jszip';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Award,
  Video,
  FileText,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Download,
  Key,
  Clock,
  MessageCircle,
  Search,
  Plus,
  Lock,
  Unlock,
  FileQuestion,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  X,
  Eye,
  Play,
  Check,
  RefreshCw,
  Zap,
  Edit,
  Edit2,
  Edit3,
  Layers,
  School,
  Archive,
  UserPlus,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Database,
  UploadCloud,
  HardDriveDownload,
  Printer,
} from 'lucide-react';
import {
  autoGradeIndividualSubmission,
  autoGradeUtsSubmission,
  autoGradeUasVideoSubmission,
} from '../utils/autoGrading';

interface DosenPortalProps {
  students: Student[];
  groups: GroupProject[];
  submissions: IndividualSubmission[];
  meetings: MeetingSchedule[];
  grades: Record<string, StudentGrade>;
  utsQuestions?: UtsQuestion[];
  utsSubmissions?: UtsSubmission[];
  uasQuestions?: UtsQuestion[];
  uasSubmissions?: UtsSubmission[];
  courseProfile?: DosenProfile;
  rpsRawText?: string;
  messages?: StudentDosenMessage[];
  db?: SiakadDatabase;
  onRefreshData: () => Promise<void>;
  onOpenAddStudent: () => void;
  onLogout: () => void;
  onOpenCourseSelector?: () => void;
  onOpenProfileModal?: () => void;
  onOpenSemesterTransition?: () => void;
  onOpenRpsModal?: () => void;
}

export const DosenPortal: React.FC<DosenPortalProps> = ({
  students = [],
  groups = [],
  submissions = [],
  meetings = [],
  grades = {},
  utsQuestions = [],
  utsSubmissions = [],
  uasQuestions = [],
  uasSubmissions = [],
  courseProfile,
  rpsRawText,
  messages = [],
  db,
  onRefreshData,
  onOpenAddStudent,
  onLogout,
  onOpenCourseSelector,
  onOpenProfileModal,
  onOpenSemesterTransition,
  onOpenRpsModal,
}) => {
  const [subTab, setSubTab] = useState<'monitoring' | 'pesan-mhs' | 'rps-sync' | 'kelompok-ppt' | 'nilai-ppt' | 'nilai-uts' | 'nilai-video' | 'keamanan' | 'cadangan-data'>('monitoring');
  const [searchTerm, setSearchTerm] = useState('');

  // Full database instance for reliable exports and backups
  const currentFullDb: SiakadDatabase = db || {
    courseProfile: courseProfile || {
      campusName: 'STAI Syarif Muhammad Jarinabi',
      programName: 'Program Magister (S2) Manajemen Pendidikan Islam (MPI)',
      courseTitle: 'Filsafat Ilmu',
      courseCode: 'MPI-501',
      sks: 3,
      semester: '1 (Ganjil)',
      academicYear: '2024/2025',
      dosenName: 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
      dosenNidn: '2105099201',
    },
    students,
    groups,
    submissions,
    meetings,
    grades,
    utsQuestions: utsQuestions || [],
    utsSubmissions: utsSubmissions || [],
    uasQuestions: uasQuestions || [],
    uasSubmissions: uasSubmissions || [],
    rpsRawText,
    messages: messages || [],
  };

  // State for data export & backup restore
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [monitoringSearch, setMonitoringSearch] = useState<string>('');

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
      setExportFeedback('Sinkronisasi database real-time berhasil diperbarui!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err: any) {
      alert('Gagal menyinkronkan data: ' + (err?.message || err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportAllTasksToExcel = () => {
    try {
      exportAllTasksToExcel(currentFullDb);
      setExportFeedback('File Excel Rekap Data Tugas SIAKAD berhasil diunduh ke komputer!');
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err: any) {
      alert('Gagal membuat file Excel: ' + err.message);
    }
  };

  const handleExportAllTasksToJson = () => {
    try {
      exportAllTasksToJson(currentFullDb);
      setExportFeedback('File Cadangan JSON Tugas Permanen berhasil diunduh ke komputer!');
      setTimeout(() => setExportFeedback(null), 5000);
    } catch (err: any) {
      alert('Gagal membuat cadangan JSON: ' + err.message);
    }
  };

  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleDownloadZipBackup = async () => {
    setIsExportingZip(true);
    setExportFeedback(null);
    try {
      const fullSnapshotToZip: SiakadDatabase = {
        ...currentFullDb,
        students,
        groups,
        submissions,
        meetings,
        grades,
        utsQuestions,
        utsSubmissions,
        uasQuestions,
        uasSubmissions,
        messages,
      };

      // In-browser JSZip compression containing tasks, grades, attendance, docs, and JSON
      await exportAllTasksToZip(fullSnapshotToZip);
      setExportFeedback('Kompresi JSZip berhasil! Seluruh data (tugas, nilai, absensi, dokumen UTS/UAS, dan data JSON) telah terkompresi ke file .ZIP.');
      setTimeout(() => setExportFeedback(null), 6000);
    } catch (err: any) {
      console.warn('JSZip compression client fallback to server endpoint:', err);
      const a = document.createElement('a');
      a.href = '/api/backup/zip';
      a.download = `SIAKAD_BACKUP_SEMESTER_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setExportFeedback('Arsip ZIP backup semester komprehensif berhasil diunduh!');
      setTimeout(() => setExportFeedback(null), 5000);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadServerSnapshot = () => {
    const a = document.createElement('a');
    a.href = '/api/backup/download';
    a.download = `siakad-server-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setExportFeedback('Snapshot data server berhasil diunduh!');
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // Exam Access Control: Kunci / Buka Kunci UTS & UAS (Dosen Pengampu)
  const isUtsOpen = db?.utsExamSettings?.isOpen ?? true;
  const isUasOpen = db?.uasExamSettings?.isOpen ?? true;
  const [isTogglingUtsLock, setIsTogglingUtsLock] = useState(false);
  const [isTogglingUasLock, setIsTogglingUasLock] = useState(false);

  const handleToggleUtsLockDosen = async () => {
    setIsTogglingUtsLock(true);
    try {
      const nextStatus = !isUtsOpen;
      const res = await updateExamSettingsApi({
        examType: 'uts',
        isOpen: nextStatus,
        instructions: nextStatus
          ? 'Ujian Tengah Semester (UTS) dibuka resmi oleh Dosen Pengampu.'
          : 'Ujian Tengah Semester (UTS) telah dikunci oleh Dosen Pengampu.',
      });
      if (res.success) {
        setExportFeedback(`Status Ujian UTS berhasil diubah menjadi: ${nextStatus ? 'DIBUKA (Mahasiswa Bisa Mengirimkan Jawaban)' : 'DIKUNCI (Pengumpulan Ditutup)'}`);
        setTimeout(() => setExportFeedback(null), 5000);
        await onRefreshData().catch(() => {});
      } else {
        alert(res.error || 'Gagal mengubah status ujian UTS');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat memperbarui status ujian UTS');
    } finally {
      setIsTogglingUtsLock(false);
    }
  };

  const handleToggleUasLockDosen = async () => {
    setIsTogglingUasLock(true);
    try {
      const nextStatus = !isUasOpen;
      const res = await updateExamSettingsApi({
        examType: 'uas',
        isOpen: nextStatus,
        instructions: nextStatus
          ? 'Ujian Akhir Semester (UAS) dibuka resmi oleh Dosen Pengampu.'
          : 'Ujian Akhir Semester (UAS) telah dikunci oleh Dosen Pengampu.',
      });
      if (res.success) {
        setExportFeedback(`Status Ujian UAS berhasil diubah menjadi: ${nextStatus ? 'DIBUKA (Mahasiswa Bisa Mengirimkan Jawaban)' : 'DIKUNCI (Pengumpulan Ditutup)'}`);
        setTimeout(() => setExportFeedback(null), 5000);
        await onRefreshData().catch(() => {});
      } else {
        alert(res.error || 'Gagal mengubah status ujian UAS');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat memperbarui status ujian UAS');
    } finally {
      setIsTogglingUasLock(false);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreFeedback(null);

    try {
      let backupData: any = null;

      // Handle ZIP archive
      if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(file);

        let jsonFile = unzipped.file("database_siakad_semester.json");
        if (!jsonFile) {
          jsonFile = Object.values(unzipped.files).find(
            f => f.name.endsWith('.json') && !f.dir
          ) || null;
        }

        if (!jsonFile) {
          throw new Error('Berkas database_siakad_semester.json tidak ditemukan di dalam arsip ZIP.');
        }

        const jsonString = await jsonFile.async('string');
        const parsed = JSON.parse(jsonString);
        backupData = parsed.data || parsed;
      } else {
        // Fallback for direct text or legacy backup
        const text = await file.text();
        const parsed = JSON.parse(text);
        backupData = parsed.data || parsed;
      }

      if (!backupData || !backupData.students || !Array.isArray(backupData.students)) {
        setRestoreFeedback({
          type: 'error',
          text: 'Berkas arsip tidak valid. Struktur data SIAKAD tidak ditemukan.',
        });
        setIsRestoring(false);
        return;
      }

      const res = await restoreBackupToServer(backupData);
      if (res.success) {
        setRestoreFeedback({
          type: 'success',
          text: `Pemulihan arsip ZIP sukses! ${res.totalStudents || backupData.students.length} data mahasiswa, ${res.totalSubmissions || backupData.submissions?.length || 0} tugas presentasi, ${res.totalUts || backupData.utsSubmissions?.length || 0} naskah UTS, dan ${res.totalUas || backupData.uasSubmissions?.length || 0} naskah UAS berhasil dipulihkan secara permanen ke server SIAKAD.`,
        });
        await onRefreshData();
      } else {
        setRestoreFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setRestoreFeedback({
        type: 'error',
        text: 'Terjadi kesalahan saat memproses berkas arsip: ' + (err?.message || err),
      });
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  // Message reply & bulk clear state
  const [replyingMsgId, setReplyingMsgId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [msgCategoryFilter, setMsgCategoryFilter] = useState<string>('all');
  const [isClearingMessages, setIsClearingMessages] = useState<boolean>(false);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<'all' | 'read_only' | null>(null);
  const [clearFeedback, setClearFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleClearMessages = async (mode: 'all' | 'read_only') => {
    setIsClearingMessages(true);
    setClearFeedback(null);
    try {
      const res = await clearAllMessagesApi(mode);
      if (res.success) {
        setClearFeedback({
          type: 'success',
          text: res.message || (mode === 'all' ? 'Seluruh pesan berhasil dikosongkan.' : 'Pesan yang sudah dibaca berhasil dibersihkan.'),
        });
        setShowClearConfirmModal(null);
        await onRefreshData();
      } else {
        setClearFeedback({
          type: 'error',
          text: res.message || 'Gagal membersihkan pesan.',
        });
      }
    } catch (err: any) {
      setClearFeedback({
        type: 'error',
        text: err.message || 'Koneksi ke server bermasalah.',
      });
    } finally {
      setIsClearingMessages(false);
      setTimeout(() => setClearFeedback(null), 5000);
    }
  };

  // Student Edit / Delete state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentForm, setEditStudentForm] = useState<{
    name: string;
    nim: string;
    rpsPart: string;
    topic: string;
    meetingNumber: number;
    groupId: number;
    groupName?: string;
  }>({ name: '', nim: '', rpsPart: '', topic: '', meetingNumber: 1, groupId: 1, groupName: '' });
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [isBiodataModalOpen, setIsBiodataModalOpen] = useState(false);
  const [docPreviewData, setDocPreviewData] = useState<DocumentPreviewData | null>(null);

  const handleOpenDocPreview = (sub: IndividualSubmission, type: 'makalah' | 'ppt' = 'makalah') => {
    const student = (students || []).find(s => s.id === sub.studentId);
    setDocPreviewData({
      title: type === 'makalah' ? `Makalah Tugas: ${sub.topic || sub.rpsPart}` : `Slide Presentasi: ${sub.topic || sub.rpsPart}`,
      studentName: sub.studentName,
      studentNim: student?.nim || (sub as any).studentNim || '20260101',
      meetingNumber: Number(sub.meetingNumber) || 2,
      rpsPart: sub.rpsPart,
      topic: sub.topic,
      docType: type,
      fileUrl: type === 'makalah' ? sub.makalahUrl : sub.pptUrl,
      fileData: type === 'makalah' ? sub.makalahFileData : sub.pptFileData,
      fileName: type === 'makalah' ? sub.makalahFileName : sub.pptFileName,
      submittedAt: sub.submittedAt,
      grade: sub.grade,
      feedback: sub.feedback,
      notes: sub.notes,
    });
  };

  const handlePrintDosenReport = () => {
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rekapitulasi Tugas & Nilai Mahasiswa - Portal Dosen</title>
        <style>
          @page { size: A4 landscape; margin: 12mm 15mm; }
          body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #0f172a; margin: 0; padding: 0; }
          .kop { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px; }
          .kop h2 { margin: 0; font-size: 13pt; text-transform: uppercase; font-family: sans-serif; }
          .kop h3 { margin: 2px 0; font-size: 11pt; color: #065f46; font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 9pt; }
          th, td { border: 1px solid #94a3b8; padding: 5px 8px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; }
          .text-center { text-align: center; }
          .sign { margin-top: 25px; page-break-inside: avoid; border: none; }
        </style>
      </head>
      <body>
        <div class="kop">
          <h2>SISTEM INFORMASI AKADEMIK (SIAKAD)</h2>
          <h3>SEKOLAH TINGGI AGAMA ISLAM (STAI) JARINABI</h3>
          <div style="font-size:8.5pt; color:#475569;">Program Studi Manajemen Pendidikan Islam (MPI 1) • T.A 2026/2027 • Mata Kuliah: Filsafat Ilmu (3 SKS)</div>
        </div>
        <h4 style="text-align:center; margin: 8px 0; text-transform: uppercase; font-family: sans-serif;">
          Laporan Rekapitulasi Pengumpulan Tugas Presentasi, UTS, dan UAS Mahasiswa
        </h4>
        <table>
          <thead>
            <tr>
              <th class="text-center" width="4%">No</th>
              <th class="text-center" width="12%">NIM</th>
              <th width="24%">Nama Mahasiswa</th>
              <th class="text-center" width="10%">Kelompok</th>
              <th width="22%">Tugas Presentasi (P2-P16)</th>
              <th class="text-center" width="10%">Nilai PPT</th>
              <th class="text-center" width="10%">Nilai UTS</th>
              <th class="text-center" width="8%">Nilai UAS</th>
            </tr>
          </thead>
          <tbody>
            ${(students || []).map((std, i) => {
              const sub = (submissions || []).find(s => s.studentId === std.id);
              const uts = (utsSubmissions || []).find(u => u.studentId === std.id);
              const grp = (groups || []).find(g => g.id === std.groupId);
              return `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td class="text-center" style="font-family: monospace;">${std.nim || '-'}</td>
                  <td><strong>${std.name}</strong></td>
                  <td class="text-center">Kelompok ${std.groupId || 1}</td>
                  <td>${sub ? 'Terkirim (' + (sub.rpsPart || 'P' + sub.meetingNumber) + ')' : 'Belum Ada'}</td>
                  <td class="text-center" style="font-weight: bold; color: #065f46;">${sub?.grade !== undefined ? sub.grade : '-'}</td>
                  <td class="text-center" style="font-weight: bold; color: #1d4ed8;">${uts?.grade !== undefined ? uts.grade : '-'}</td>
                  <td class="text-center" style="font-weight: bold; color: #7e22ce;">${grp?.grade !== undefined ? grp.grade : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <table class="sign" style="width:100%; border:none; margin-top:20px;">
          <tr style="border:none;">
            <td style="border:none; width:60%; vertical-align:top;"></td>
            <td style="border:none; width:40%; text-align:right; vertical-align:top; font-size:9pt;">
              Pasuruan, 24 September 2026<br>
              Dosen Pengampu Mata Kuliah,<br>
              <img src="${DOSEN_SIGNATURE_BASE64}" width="120" height="70" alt="TTD" style="display:inline-block; margin:2px 0;" /><br>
              <strong>Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</strong><br>
              NIP. 198806282015032001
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    printViaHiddenIframe(reportHtml, 'Laporan_Rekap_Dosen_SIAKAD');
  };

  // Kelompok PPT / Makalah State & Handlers (Ditentukan Dosen)
  const [selectedMeetingForGroupAdd, setSelectedMeetingForGroupAdd] = useState<number | null>(null);
  const [groupAddStudentChoice, setGroupAddStudentChoice] = useState<string>('');
  const [groupAddCustomName, setGroupAddCustomName] = useState<string>('');
  const [groupAddCustomNim, setGroupAddCustomNim] = useState<string>('');
  const [isOperatingGroup, setIsOperatingGroup] = useState<boolean>(false);
  const [groupActionFeedback, setGroupActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Grading Meeting Presentation Group
  const [gradingMeetingGroup, setGradingMeetingGroup] = useState<number | null>(null);
  const [meetingGroupScore, setMeetingGroupScore] = useState<number>(85);
  const [meetingGroupFeedback, setMeetingGroupFeedback] = useState<string>('Presentasi dan materi makalah/PPT kelompok sangat baik dan sistematis.');
  const [isBulkGradingMeetingGroup, setIsBulkGradingMeetingGroup] = useState<boolean>(false);

  const handleStartEditStudent = (std: Student) => {
    const grp = (groups || []).find(g => g.id === std.groupId);
    setEditingStudent(std);
    setEditStudentForm({
      name: std.name,
      nim: std.nim,
      rpsPart: std.rpsPart,
      topic: std.topic,
      meetingNumber: std.meetingNumber,
      groupId: std.groupId,
      groupName: grp?.name || `KELOMPOK ${std.groupId || 1}`,
    });
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsSavingStudent(true);
    try {
      if (editStudentForm.groupName && editStudentForm.groupName.trim()) {
        await updateGroupApi(editStudentForm.groupId, { name: editStudentForm.groupName.trim().toUpperCase() });
      }
      await updateStudentApi(editingStudent.id, {
        name: editStudentForm.name,
        nim: editStudentForm.nim,
        rpsPart: editStudentForm.rpsPart,
        topic: editStudentForm.topic,
        meetingNumber: editStudentForm.meetingNumber,
        groupId: editStudentForm.groupId,
      });
      setEditingStudent(null);
      await onRefreshData();
    } finally {
      setIsSavingStudent(false);
    }
  };

  const handleExecuteDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      await deleteStudentApi(studentToDelete.id);
      setStudentToDelete(null);
      await onRefreshData();
    } finally {
      setIsDeletingStudent(false);
    }
  };

  const handleToggleMeetingFormatDosen = async (meetingNumber: number, format: 'individu' | 'kelompok') => {
    try {
      await updateMeetingPresentationGroupApi(meetingNumber, { presentationFormat: format });
      await onRefreshData();
      setGroupActionFeedback({
        type: 'success',
        text: `Format Pertemuan #${meetingNumber} berhasil diubah menjadi: ${format === 'kelompok' ? 'Kelompok PPT & Makalah' : 'Individu'}.`,
      });
    } catch (err: any) {
      setGroupActionFeedback({
        type: 'error',
        text: err.message || 'Gagal mengubah format pertemuan.',
      });
    }
  };

  const handleAddPresenterToMeetingDosen = async (meetingNumber: number) => {
    setIsOperatingGroup(true);
    setGroupActionFeedback(null);
    try {
      if (groupAddStudentChoice) {
        const studentToMove = students.find(s => s.id === groupAddStudentChoice);
        if (!studentToMove) return;
        await addMeetingPresenterApi(meetingNumber, {
          studentId: studentToMove.id,
          studentName: studentToMove.name,
          nim: studentToMove.nim,
        });
      } else if (groupAddCustomName.trim()) {
        await addMeetingPresenterApi(meetingNumber, {
          studentName: groupAddCustomName.trim(),
          nim: groupAddCustomNim.trim(),
        });
      } else {
        setGroupActionFeedback({ type: 'error', text: 'Pilih mahasiswa atau isi nama mahasiswa baru.' });
        return;
      }

      setSelectedMeetingForGroupAdd(null);
      setGroupAddStudentChoice('');
      setGroupAddCustomName('');
      setGroupAddCustomNim('');
      await onRefreshData();
      setGroupActionFeedback({
        type: 'success',
        text: `Mahasiswa berhasil ditambahkan ke Kelompok Pertemuan #${meetingNumber}!`,
      });
    } catch (err: any) {
      setGroupActionFeedback({
        type: 'error',
        text: err.message || 'Gagal menambahkan mahasiswa ke kelompok.',
      });
    } finally {
      setIsOperatingGroup(false);
    }
  };

  const handleRemovePresenterFromMeetingDosen = async (meetingNumber: number, studentName: string) => {
    setIsOperatingGroup(true);
    setGroupActionFeedback(null);
    try {
      await removeMeetingPresenterApi(meetingNumber, studentName);
      await onRefreshData();
      setGroupActionFeedback({
        type: 'success',
        text: `${studentName} berhasil dihapus dari kelompok pertemuan #${meetingNumber}.`,
      });
    } catch (err: any) {
      setGroupActionFeedback({
        type: 'error',
        text: err.message || 'Gagal menghapus mahasiswa dari kelompok.',
      });
    } finally {
      setIsOperatingGroup(false);
    }
  };

  const handleGradeMeetingGroupDosen = async (meetingNumber: number) => {
    setIsBulkGradingMeetingGroup(true);
    try {
      await gradePresentationGroupApi(meetingNumber, meetingGroupScore, meetingGroupFeedback);
      setGradingMeetingGroup(null);
      await onRefreshData();
      setGroupActionFeedback({
        type: 'success',
        text: `Nilai PPT & Makalah kelompok Pertemuan #${meetingNumber} (${meetingGroupScore}) berhasil disimpan untuk seluruh anggota!`,
      });
    } catch (err: any) {
      setGroupActionFeedback({
        type: 'error',
        text: err.message || 'Gagal menyimpan nilai kelompok.',
      });
    } finally {
      setIsBulkGradingMeetingGroup(false);
    }
  };

  // Grading state for individual PPT
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [indivScoreInput, setIndivScoreInput] = useState<number>(85);
  const [indivFeedbackInput, setIndivFeedbackInput] = useState<string>('');
  const [isGradingIndiv, setIsGradingIndiv] = useState(false);

  // Grading state for UTS 5 essay
  const [gradingUtsStudentId, setGradingUtsStudentId] = useState<string | null>(null);
  const [utsScoreInput, setUtsScoreInput] = useState<number>(85);
  const [utsFeedbackInput, setUtsFeedbackInput] = useState<string>('');
  const [utsScoresByQ, setUtsScoresByQ] = useState<Record<number, number>>({ 1: 17, 2: 17, 3: 17, 4: 17, 5: 17 });
  const [isGradingUts, setIsGradingUts] = useState(false);

  // Grading state for group video
  const [gradingGroupId, setGradingGroupId] = useState<number | null>(null);
  const [groupScoreInput, setGroupScoreInput] = useState<number>(85);
  const [groupFeedbackInput, setGroupFeedbackInput] = useState<string>('');
  const [isGradingGroup, setIsGradingGroup] = useState(false);

  // Password change state
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete submission modal state (Dosen can delete PPT, Makalah, or all)
  const [deleteModalData, setDeleteModalData] = useState<{
    sub: IndividualSubmission;
    studentName: string;
  } | null>(null);
  const [deletePartChoice, setDeletePartChoice] = useState<'all' | 'ppt' | 'makalah'>('all');
  const [deleteReasonText, setDeleteReasonText] = useState<string>('');
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);
  const [isConfirmingReviewSubDelete, setIsConfirmingReviewSubDelete] = useState(false);
  const [actionAlertMsg, setActionAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review & Auto-grading modals for Tugas Individu, UTS, and UAS
  const [reviewIndivSub, setReviewIndivSub] = useState<IndividualSubmission | null>(null);
  const [reviewUtsStudentId, setReviewUtsStudentId] = useState<string | null>(null);
  const [reviewGroupId, setReviewGroupId] = useState<number | null>(null);
  const [autoGradingInfo, setAutoGradingInfo] = useState<{ type: 'indiv' | 'uts' | 'uas'; breakdown: string[] } | null>(null);

  // YouTube embed converter helper
  const getYouTubeEmbedUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
    } catch {
      return null;
    }
  };

  // Open Review Individual Submission
  const handleOpenReviewIndiv = (sub: IndividualSubmission) => {
    setReviewIndivSub(sub);
    setIndivScoreInput(sub.grade !== undefined ? sub.grade : 85);
    setIndivFeedbackInput(sub.feedback || '');
    setAutoGradingInfo(null);
    setDeletePartChoice('all');
    setDeleteReasonText('');
  };

  // Trigger Auto-Grade for Individual Task
  const handleAutoGradeIndiv = (sub: IndividualSubmission) => {
    const targetStudent = (students || []).find(s => s.id === sub.studentId);
    const result = autoGradeIndividualSubmission(sub, targetStudent);
    setIndivScoreInput(result.score);
    setIndivFeedbackInput(result.feedback);
    setAutoGradingInfo({ type: 'indiv', breakdown: result.rubricBreakdown });
  };

  // Save Individual Grade from Review Modal
  const handleSaveIndivFromReview = async () => {
    if (!reviewIndivSub) return;
    setIsGradingIndiv(true);
    try {
      await gradeIndividualTask(reviewIndivSub.studentId, indivScoreInput, indivFeedbackInput);
      setActionAlertMsg({
        type: 'success',
        text: `Nilai tugas ${reviewIndivSub.studentName} (${indivScoreInput}) berhasil disimpan!`,
      });
      setReviewIndivSub(null);
      await onRefreshData();
    } finally {
      setIsGradingIndiv(false);
    }
  };

  // Open Review UTS 5 Essay
  const handleOpenReviewUts = (studentId: string) => {
    setReviewUtsStudentId(studentId);
    const sub = (utsSubmissions || []).find(u => u.studentId === studentId);
    const currentGrade = grades[studentId];
    const initialScore = sub?.grade ?? currentGrade?.utsScore ?? 85;
    setUtsScoreInput(initialScore);
    setUtsFeedbackInput(sub?.feedback || currentGrade?.notes || '');
    if (sub?.questionScores) {
      setUtsScoresByQ(sub.questionScores);
    } else {
      const perQ = Math.round(initialScore / 5);
      setUtsScoresByQ({ 1: perQ, 2: perQ, 3: perQ, 4: perQ, 5: initialScore - (perQ * 4) });
    }
    setAutoGradingInfo(null);
  };

  // Trigger Auto-Grade for UTS
  const handleAutoGradeUts = (studentId: string) => {
    const sub = (utsSubmissions || []).find(u => u.studentId === studentId);
    const std = (students || []).find(s => s.id === studentId);
    if (!sub) return;
    const result = autoGradeUtsSubmission(sub, utsQuestions, std);
    setUtsScoresByQ(result.questionScores);
    setUtsScoreInput(result.totalScore);
    setUtsFeedbackInput(result.feedback);
    setAutoGradingInfo({ type: 'uts', breakdown: result.rubricBreakdown });
  };

  // Save UTS Grade from Review Modal
  const handleSaveUtsFromReview = async () => {
    if (!reviewUtsStudentId) return;
    setIsGradingUts(true);
    try {
      await gradeUtsSubmissionApi({
        studentId: reviewUtsStudentId,
        grade: Number(utsScoreInput),
        questionScores: utsScoresByQ,
        feedback: utsFeedbackInput,
      });
      const std = (students || []).find(s => s.id === reviewUtsStudentId);
      setActionAlertMsg({
        type: 'success',
        text: `Nilai UTS ${std?.name || 'Mahasiswa'} (${utsScoreInput}) berhasil disimpan!`,
      });
      setReviewUtsStudentId(null);
      await onRefreshData();
    } finally {
      setIsGradingUts(false);
    }
  };

  // Open Review Group UAS Video
  const handleOpenReviewGroup = (groupId: number) => {
    setReviewGroupId(groupId);
    const grp = (groups || []).find(g => g.id === groupId);
    setGroupScoreInput(grp?.submission?.grade || 85);
    setGroupFeedbackInput(grp?.submission?.feedback || '');
    setAutoGradingInfo(null);
  };

  // Trigger Auto-Grade for Group UAS Video
  const handleAutoGradeGroup = (groupId: number) => {
    const grp = (groups || []).find(g => g.id === groupId);
    if (!grp) return;
    const result = autoGradeUasVideoSubmission(grp);
    setGroupScoreInput(result.score);
    setGroupFeedbackInput(result.feedback);
    setAutoGradingInfo({ type: 'uas', breakdown: result.rubricBreakdown });
  };

  // Save Group Grade from Review Modal
  const handleSaveGroupFromReview = async () => {
    if (!reviewGroupId) return;
    setIsGradingGroup(true);
    try {
      await gradeGroupProject(reviewGroupId, groupScoreInput, groupFeedbackInput);
      const grp = (groups || []).find(g => g.id === reviewGroupId);
      setActionAlertMsg({
        type: 'success',
        text: `Nilai UAS video kelompok ${grp?.name || ''} (${groupScoreInput}) berhasil disimpan!`,
      });
      setReviewGroupId(null);
      await onRefreshData();
    } finally {
      setIsGradingGroup(false);
    }
  };

  // Confirm delete submission handler
  const handleConfirmDeleteSubmission = async () => {
    if (!deleteModalData) return;
    setIsDeletingSubmission(true);
    setActionAlertMsg(null);

    try {
      const res = await deleteSubmissionApi(deleteModalData.sub.id, {
        part: deletePartChoice,
        reason: deleteReasonText.trim(),
      });

      if (res.success) {
        const label =
          deletePartChoice === 'all'
            ? 'Seluruh tugas (PPT & Makalah)'
            : deletePartChoice === 'ppt'
            ? 'File PPT'
            : 'File Makalah';
        setActionAlertMsg({
          type: 'success',
          text: `${label} milik mahasiswa "${deleteModalData.studentName}" berhasil dihapus. Mahasiswa dapat mengunggah ulang tugas yang benar.`,
        });
        setDeleteModalData(null);
        setDeleteReasonText('');
        setDeletePartChoice('all');
        await onRefreshData();
      } else {
        setActionAlertMsg({
          type: 'error',
          text: res.message || 'Gagal menghapus tugas mahasiswa.',
        });
      }
    } catch {
      setActionAlertMsg({
        type: 'error',
        text: 'Terjadi kesalahan saat menghapus tugas.',
      });
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  // Submit Individual Grade
  const handleSaveIndivGrade = async (studentId: string) => {
    setIsGradingIndiv(true);
    try {
      await gradeIndividualTask(studentId, indivScoreInput, indivFeedbackInput);
      setGradingStudentId(null);
      await onRefreshData();
    } finally {
      setIsGradingIndiv(false);
    }
  };

  // Submit Group Grade
  const handleSaveGroupGrade = async (groupId: number) => {
    setIsGradingGroup(true);
    try {
      await gradeGroupProject(groupId, groupScoreInput, groupFeedbackInput);
      setGradingGroupId(null);
      await onRefreshData();
    } finally {
      setIsGradingGroup(false);
    }
  };

  // Submit UTS 5 Essay Grade
  const handleSaveUtsGrade = async (studentId: string) => {
    setIsGradingUts(true);
    try {
      await gradeUtsSubmissionApi({
        studentId,
        grade: Number(utsScoreInput),
        questionScores: utsScoresByQ,
        feedback: utsFeedbackInput,
      });
      setGradingUtsStudentId(null);
      await onRefreshData();
    } finally {
      setIsGradingUts(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const res = await changeDosenPasswordApi(currPass, newPass);
    if (res.success) {
      setPassMsg({ type: 'success', text: 'Password Dosen berhasil diperbarui!' });
      setCurrPass('');
      setNewPass('');
    } else {
      setPassMsg({ type: 'error', text: res.message || 'Gagal mengganti password.' });
    }
  };

  const onlineStudentsCount = students.filter(s => isStudentOnline(s.lastActive)).length;

  return (
    <div className="space-y-6">
      
      {/* Dosen Portal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-indigo-400/30">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-serif-title">
                  Portal Khusus Dosen Pengampu
                </h2>
                <span className="text-[10px] font-bold bg-indigo-500/40 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                  Privasi & Otoritas Penuh
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Mata Kuliah {courseProfile?.courseTitle || 'Filsafat Ilmu'} • {courseProfile?.campusName || 'STAI Jarinabi'} • {courseProfile?.name || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenCourseSelector && (
              <button
                onClick={onOpenCourseSelector}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs border border-indigo-500/30"
                title="Kelola & ganti mata kuliah yang diampu dosen"
              >
                <Layers size={14} />
                <span>Ganti / Tambah MK</span>
              </button>
            )}

            {onOpenProfileModal && (
              <button
                onClick={onOpenProfileModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                title="Ubah nama kampus (STAI Jarinabi) dan gelar akademik dosen"
              >
                <School size={14} />
                <span>Kampus & Gelar</span>
              </button>
            )}

            {onOpenSemesterTransition && (
              <button
                onClick={onOpenSemesterTransition}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                title="Arsipkan semester lama (Word/Excel) dan upload RPS semester baru"
              >
                <Archive size={14} />
                <span>Pindah Semester</span>
              </button>
            )}

            {onOpenRpsModal && (
              <button
                onClick={onOpenRpsModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-semibold transition-colors"
                title="Lihat dokumen RPS lengkap dan unduh ke Word"
              >
                <FileText size={14} />
                <span>Dokumen RPS</span>
              </button>
            )}

            <button
              onClick={() => setIsBiodataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              title="Kelola Lengkap Biodata Mahasiswa (NIM, Tempat/Tgl Lahir, Alamat, Upload Dokumen)"
            >
              <UserPlus size={14} />
              <span>Data & Biodata Mahasiswa</span>
            </button>

            <button
              onClick={handleExportAllTasksToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              title="Ekspor Seluruh Data Tugas Mahasiswa ke Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={handleDownloadZipBackup}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              title="Unduh Berkas Arsip Backup Semester (.ZIP / .RAR)"
            >
              <Archive size={14} />
              <span>Backup .ZIP</span>
            </button>

            <button
              id="btn-dosen-tambah-mahasiswa"
              type="button"
              onClick={onOpenAddStudent}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
              title="Tambah data mahasiswa baru beserta NIM, Topik, dan Kelompok"
            >
              <UserPlus size={14} />
              <span>+ Tambah Data Mahasiswa</span>
            </button>

            <button
              id="btn-dosen-print"
              type="button"
              onClick={handlePrintDosenReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-colors shadow-xs cursor-pointer"
              title="Cetak dokumen resmi rekapitulasi nilai & tugas mahasiswa ke PDF/Printer"
            >
              <Printer size={14} />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-colors"
            >
              Keluar Portal
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-indigo-800/60 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSubTab('monitoring')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'monitoring'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <Users size={14} />
            <span>Monitoring Mahasiswa Online ({onlineStudentsCount})</span>
          </button>

          <button
            id="subtab-pesan-mhs"
            onClick={() => setSubTab('pesan-mhs')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'pesan-mhs'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white/10 text-amber-200 hover:bg-white/20'
            }`}
          >
            <MessageSquare size={14} />
            <span>Pesan & Lapor Tugas Mhs</span>
            {messages.filter(m => !m.read).length > 0 ? (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                {messages.filter(m => !m.read).length} Baru
              </span>
            ) : (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
                {messages.length}
              </span>
            )}
          </button>

          <button
            id="subtab-rps-sync"
            onClick={() => setSubTab('rps-sync')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'rps-sync'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }`}
          >
            <Sparkles size={14} />
            <span>Kelola RPS & MK Otomatis</span>
          </button>

          <button
            id="subtab-kelompok-ppt"
            onClick={() => setSubTab('kelompok-ppt')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'kelompok-ppt'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <Users size={14} />
            <span>Kelompok PPT & Makalah (Ditentukan Dosen)</span>
          </button>

          <button
            onClick={() => setSubTab('nilai-ppt')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'nilai-ppt'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <FileText size={14} />
            <span>Penilaian Tugas PPT & Makalah ({submissions.length})</span>
          </button>

          <button
            id="subtab-nilai-uts"
            onClick={() => setSubTab('nilai-uts')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'nilai-uts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <FileQuestion size={14} />
            <span>Penilaian UTS 5 Essay ({utsSubmissions.length}/{students.length})</span>
          </button>

          <button
            id="subtab-nilai-video"
            onClick={() => setSubTab('nilai-video')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'nilai-video'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <Video size={14} />
            <span>Penilaian UAS: Video Kelompok AI (5 Kelompok)</span>
          </button>

          <button
            onClick={() => setSubTab('keamanan')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'keamanan'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white/10 text-indigo-200 hover:bg-white/20'
            }`}
          >
            <Key size={14} />
            <span>Sandi & Keamanan Dosen</span>
          </button>

          <button
            id="subtab-cadangan-data"
            onClick={() => setSubTab('cadangan-data')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              subTab === 'cadangan-data'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white/10 text-emerald-200 hover:bg-white/20'
            }`}
          >
            <Database size={14} />
            <span>Ekspor & Cadangan Permanen</span>
          </button>
        </div>
      </div>

      {/* Export feedback toast banner */}
      {exportFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button onClick={() => setExportFeedback(null)} className="text-emerald-800 hover:text-emerald-950">
            <X size={14} />
          </button>
        </div>
      )}

      {/* SUB-TAB 1: MONITORING MAHASISWA & PENGUMPULAN TUGAS REAL-TIME */}
      {subTab === 'monitoring' && (
        <div className="space-y-4">
          {/* Top Live Sync & Vault Engine Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-indigo-900/50 shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs shadow-xs">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Database Real-Time: Terhubung Langsung</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-bold text-xs">
                    <ShieldCheck size={14} className="text-indigo-400" />
                    <span>Brankas Permanen (Vault Engine): Aktif</span>
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white mt-1">
                  Dashboard Pemantauan & Status Pengumpulan Tugas Mahasiswa Real-Time
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Memantau kehadiran online serta seluruh riwayat pengumpulan tugas presentasi (PPT/Makalah), lembar UTS, proyek UAS, dan kuis secara langsung dari database server. Setiap data yang masuk tersimpan ke brankas abadi sehingga anti-hilang lintas semester.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start lg:self-center flex-shrink-0">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/15 transition-all cursor-pointer disabled:opacity-50"
                  title="Sinkronkan ulang status database sekarang"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  <span>{isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan Database'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadZipBackup}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Unduh backup arsip semester (.ZIP / .RAR)"
                >
                  <Archive size={14} />
                  <span>Backup .ZIP</span>
                </button>
              </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-white/10">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Mahasiswa</div>
                  <div className="text-xl font-black text-white mt-0.5">{students.length}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    {onlineStudentsCount} Mahasiswa Online
                  </div>
                </div>
                {onOpenAddStudent && (
                  <button
                    type="button"
                    onClick={onOpenAddStudent}
                    className="mt-2 text-[10px] font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1 underline cursor-pointer"
                  >
                    <Plus size={10} /> + Tambah Mahasiswa
                  </button>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tugas Presentasi</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">
                  {submissions.length} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                  {Math.round((submissions.length / (students.length || 1)) * 100)}% Terkumpul
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lembar UTS</div>
                <div className="text-xl font-black text-amber-300 mt-0.5">
                  {utsSubmissions.length} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                  {Math.round((utsSubmissions.length / (students.length || 1)) * 100)}% Terkumpul
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Proyek UAS</div>
                <div className="text-xl font-black text-purple-300 mt-0.5">
                  {uasSubmissions.length} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                  {Math.round((uasSubmissions.length / (students.length || 1)) * 100)}% Terkumpul
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Kuis Interaktif</div>
                <div className="text-xl font-black text-sky-300 mt-0.5">
                  {(currentFullDb.quizSubmissions || []).length} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium mt-0.5">
                  Telah Mengerjakan
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status Brankas</div>
                <div className="text-xl font-black text-emerald-300 mt-0.5 flex items-center gap-1">
                  <ShieldCheck size={18} />
                  <span>100%</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                  Anti-Hilang Permanen
                </div>
              </div>
            </div>
          </div>

          {/* KONTROL AKSES UJIAN (KUNCI / BUKA KUNCI UTS & UAS OLEH DOSEN) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                  <Lock size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">Kontrol Akses Ujian Dosen</span>
                    <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded-full font-bold">Resmi SIAKAD</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white">
                    Kunci / Buka Kunci Pengumpulan Ujian (UTS & UAS)
                  </h4>
                </div>
              </div>
              <div className="text-[11px] text-slate-300 max-w-sm">
                Dosen dapat mengontrol akses pengiriman secara manual. Jika dikunci, mahasiswa tidak dapat mengumpulkan jawaban. Mahasiswa hanya bisa mengirimkan saat tombol dibuka oleh dosen.
              </div>
            </div>

            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* UTS Lock Controller */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                isUtsOpen ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ujian Tengah Semester (UTS)</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isUtsOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isUtsOpen ? <Unlock size={11} /> : <Lock size={11} />}
                      <span>{isUtsOpen ? 'STATUS: DIBUKA' : 'STATUS: DIKUNCI'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {isUtsOpen
                      ? 'Akses pengumpulan formulir UTS sedang aktif. Mahasiswa dapat mengisi jawaban esai atau mengunggah berkas pada jam ujian resmi.'
                      : 'Formulir UTS saat ini dikunci secara manual. Mahasiswa tidak dapat mengumpulkan jawaban hingga dibuka kembali oleh dosen.'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    {isUtsOpen ? 'Akses Terbuka untuk Mahasiswa' : 'Akses Pengumpulan Dikunci'}
                  </span>
                  <button
                    type="button"
                    id="btn-dosen-toggle-uts-lock"
                    disabled={isTogglingUtsLock}
                    onClick={handleToggleUtsLockDosen}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      isUtsOpen
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {isUtsOpen ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{isTogglingUtsLock ? 'Memproses...' : (isUtsOpen ? 'Kunci Ujian UTS Sekarang' : 'Buka Kunci Ujian UTS')}</span>
                  </button>
                </div>
              </div>

              {/* UAS Lock Controller */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                isUasOpen ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ujian Akhir Semester (UAS)</span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 ${
                      isUasOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {isUasOpen ? <Unlock size={11} /> : <Lock size={11} />}
                      <span>{isUasOpen ? 'STATUS: DIBUKA' : 'STATUS: DIKUNCI'}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {isUasOpen
                      ? 'Akses pengumpulan proyek UAS sedang aktif. Mahasiswa dapat mengirimkan link proyek video AI atau dokumen jawaban pada jam ujian resmi.'
                      : 'Formulir UAS saat ini dikunci secara manual. Mahasiswa tidak dapat mengumpulkan proyek UAS hingga dibuka kembali oleh dosen.'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    {isUasOpen ? 'Akses Terbuka untuk Mahasiswa' : 'Akses Pengumpulan Dikunci'}
                  </span>
                  <button
                    type="button"
                    id="btn-dosen-toggle-uas-lock"
                    disabled={isTogglingUasLock}
                    onClick={handleToggleUasLockDosen}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      isUasOpen
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                  >
                    {isUasOpen ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{isTogglingUasLock ? 'Memproses...' : (isUasOpen ? 'Kunci Ujian UAS Sekarang' : 'Buka Kunci Ujian UAS')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Daftar Status Pengumpulan & Keaktifan Seluruh Mahasiswa
                </h4>
                <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {students.filter(std => {
                    if (!monitoringSearch) return true;
                    const q = monitoringSearch.toLowerCase();
                    return std.name.toLowerCase().includes(q) || std.nim.toLowerCase().includes(q) || (std.rpsPart && std.rpsPart.toLowerCase().includes(q)) || (std.topic && std.topic.toLowerCase().includes(q));
                  }).length} Mahasiswa
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari Nama, NIM, atau Topik..."
                    value={monitoringSearch}
                    onChange={(e) => setMonitoringSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {onOpenAddStudent && (
                  <button
                    type="button"
                    onClick={onOpenAddStudent}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                    title="Tambah data mahasiswa baru"
                  >
                    <UserPlus size={13} />
                    <span>+ Mahasiswa</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Mahasiswa</th>
                    <th className="py-2.5 px-3">Part RPS & Topik</th>
                    <th className="py-2.5 px-3 text-center">Keaktifan</th>
                    <th className="py-2.5 px-3 text-center">Tugas PPT</th>
                    <th className="py-2.5 px-3 text-center">Lembar UTS</th>
                    <th className="py-2.5 px-3 text-center">Proyek UAS</th>
                    <th className="py-2.5 px-3 text-center">Kuis</th>
                    <th className="py-2.5 px-3 text-center">Brankas Permanen</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter(std => {
                      if (!monitoringSearch) return true;
                      const q = monitoringSearch.toLowerCase();
                      return std.name.toLowerCase().includes(q) || std.nim.toLowerCase().includes(q) || (std.rpsPart && std.rpsPart.toLowerCase().includes(q)) || (std.topic && std.topic.toLowerCase().includes(q));
                    })
                    .map((std, idx) => {
                      const online = isStudentOnline(std.lastActive);
                      const sub = (submissions || []).find(s => s.studentId === std.id);
                      const utsSub = (utsSubmissions || []).find(u => u.studentId === std.id);
                      const uasSub = (uasSubmissions || []).find(u => u.studentId === std.id);
                      const quizSub = (currentFullDb.quizSubmissions || []).find(q => q.studentId === std.id);
                      const hasAnyVaultData = !!(sub || utsSub || uasSub || quizSub);

                      return (
                        <tr key={std.id} className="hover:bg-slate-50">
                          <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{std.name}</div>
                            <div className="text-[10px] text-slate-400">NIM: {std.nim}</div>
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <span className="font-bold text-emerald-800 text-[11px] block">{std.rpsPart}</span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">{std.topic}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {online ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                ONLINE
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-500">
                                {formatActiveTime(std.lastActive)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {sub ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={11} /> {sub.grade !== undefined ? `Nilai: ${sub.grade}` : 'Terkirim'}
                                </span>
                                <button
                                  onClick={() => handleOpenReviewIndiv(sub)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                                  title="Review tugas & berikan penilaian"
                                >
                                  <Eye size={13} />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteModalData({ sub, studentName: std.name });
                                    setDeletePartChoice('all');
                                    setDeleteReasonText('');
                                  }}
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                  title="Hapus / Reset tugas mahasiswa ini jika salah"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {utsSub ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={11} /> {utsSub.grade !== undefined ? `Nilai: ${utsSub.grade}` : 'Terkumpul'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {uasSub ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={11} /> {uasSub.grade !== undefined ? `Nilai: ${uasSub.grade}` : 'Terkumpul'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {quizSub ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                                <Award size={11} /> Skor: {quizSub.score ?? '-'}
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Belum
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {hasAnyVaultData ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" title="Tersimpan abadi di Brankas Vault Server">
                                <ShieldCheck size={12} className="text-emerald-600" />
                                <span>Aman di Brankas</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                <ShieldAlert size={12} className="text-slate-300" />
                                <span>Menunggu Data</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleStartEditStudent(std)}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Edit Nama Mahasiswa, NIM, Pertemuan, atau Kelompok"
                              >
                                <Edit3 size={14} />
                              </button>
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Halo Mahasiswa ${std.name} (Part ${std.rpsPart}), mohon cek portal SIAKAD Filsafat Ilmu MPI 1 untuk tugas dan kehadiran.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                title="Kirim pesan WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                              <button
                                onClick={() => setStudentToDelete({ id: std.id, name: std.name })}
                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Hapus mahasiswa dari SIAKAD"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: PESAN & LAPORAN TUGAS MAHASISWA */}
      {subTab === 'pesan-mhs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Pesan & Laporan Pengumpulan Tugas Mahasiswa
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Ruang komunikasi resmi mahasiswa ke Dosen pengampu untuk memberi tahu pengumpulan makalah, UTS, UAS, dan pertanyaan materi kuliah.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl">
                {messages.length} Pesan Masuk
              </span>

              {/* Tombol Hapus Pesan Jika Penuh / Bersihkan Kotak Masuk */}
              {messages.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {messages.some(m => m.read) && (
                    <button
                      type="button"
                      id="btn-delete-read-messages"
                      onClick={() => setShowClearConfirmModal('read_only')}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Hapus pesan yang sudah dibaca / dibalas"
                    >
                      <CheckCircle2 size={13} className="text-amber-700" />
                      <span>Hapus Pesan Terbaca ({messages.filter(m => m.read).length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-clear-all-messages"
                    onClick={() => setShowClearConfirmModal('all')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Hapus seluruh pesan jika kuota penuh atau semester berganti"
                  >
                    <Trash2 size={13} />
                    <span>Hapus Pesan Jika Penuh</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Banner */}
          {clearFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                clearFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {clearFeedback.type === 'success' ? (
                  <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="text-rose-600 flex-shrink-0" />
                )}
                <span>{clearFeedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setClearFeedback(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Notifikasi Kapasitas Penuh */}
          {messages.length >= 8 && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span>
                  <strong>Kapasitas Kotak Pesan Mahasiswa ({messages.length} pesan):</strong> Antrean pesan mulai penuh. Gunakan tombol <em>"Hapus Pesan Jika Penuh"</em> di atas untuk mengosongkan arsip setelah semua tugas diperiksa.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowClearConfirmModal('all')}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg self-start sm:self-auto flex items-center gap-1 cursor-pointer flex-shrink-0"
              >
                <Trash2 size={12} />
                <span>Hapus Sekarang</span>
              </button>
            </div>
          )}

          {/* Modal Konfirmasi Hapus Pesan Jika Penuh */}
          {showClearConfirmModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      {showClearConfirmModal === 'all'
                        ? 'Kosongkan Seluruh Kotak Masuk?'
                        : 'Hapus Pesan yang Sudah Dibaca?'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tindakan pembersihan pesan laporan tugas mahasiswa di SIAKAD
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <p>
                    {showClearConfirmModal === 'all'
                      ? `Anda akan menghapus seluruh ${messages.length} pesan masuk dari mahasiswa. Fitur ini berguna saat kotak pesan sudah penuh atau mahasiswa telah memperoleh nilai di transkrip.`
                      : `Anda akan menghapus ${messages.filter(m => m.read).length} pesan yang statusnya telah dibaca/dibalas. Pesan baru yang belum dibaca akan tetap tersimpan.`}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    ⚠️ Nilai mahasiswa, presensi kehadiran, dan arsip semester tetap tersimpan aman di database.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isClearingMessages}
                    onClick={() => setShowClearConfirmModal(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isClearingMessages}
                    onClick={() => handleClearMessages(showClearConfirmModal)}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isClearingMessages ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={13} />
                        <span>Ya, Hapus {showClearConfirmModal === 'all' ? 'Semua Pesan' : 'Pesan Terbaca'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {[
              { id: 'all', label: 'Semua Pesan' },
              { id: 'tugas_makalah', label: 'Tugas Makalah / PPT' },
              { id: 'tugas_uts', label: 'Tugas UTS' },
              { id: 'tugas_uas', label: 'Tugas UAS Video' },
              { id: 'kuis', label: 'Kuis RPS' },
              { id: 'tanya_dosen', label: 'Pertanyaan Materi' },
            ].map(cat => {
              const count = cat.id === 'all' ? messages.length : messages.filter(m => m.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setMsgCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    msgCategoryFilter === cat.id
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="ml-1.5 text-[11px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Messages List */}
          {(() => {
            const filteredMessages = messages.filter(m => {
              if (msgCategoryFilter === 'all') return true;
              return m.category === msgCategoryFilter;
            });

            if (filteredMessages.length === 0) {
              return (
                <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">Belum Ada Pesan Masuk</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                    Mahasiswa dapat mengirimkan pesan pemberitahuan tugas langsung melalui tombol <em>"Pesan / Lapor Tugas ke Dosen"</em> di portal mahasiswa.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredMessages.map(msg => {
                  const isUnread = !msg.read;
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isUnread
                          ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{msg.studentName}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                            NIM: {msg.studentNim || '-'}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                            {msg.category === 'tugas_makalah' ? 'Makalah / PPT' :
                             msg.category === 'tugas_uts' ? 'UTS Esai' :
                             msg.category === 'tugas_uas' ? 'UAS Video' :
                             msg.category === 'kuis' ? 'Kuis RPS' : 'Pertanyaan'}
                          </span>
                          {isUnread && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-600 text-white animate-pulse">
                              BARU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(msg.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="py-2.5 space-y-2">
                        <div className="font-semibold text-slate-800 text-xs">
                          Subjek: {msg.subject}
                          {msg.taskTitle && (
                            <span className="ml-2 text-indigo-700 font-medium">
                              • Topik: {msg.taskTitle} {msg.meetingNumber ? `(Pertemuan ${msg.meetingNumber})` : ''}
                            </span>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50/90 rounded-lg text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap border border-slate-200/60">
                          {msg.content}
                        </div>

                        {/* Attachment Link */}
                        {msg.attachmentLink && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-600">Tautan Tugas Mahasiswa:</span>
                            <a
                              href={msg.attachmentLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200"
                            >
                              <ExternalLink size={12} />
                              <span>Buka File Dokumen / Video ({msg.attachmentLink.substring(0, 45)}...)</span>
                            </a>
                          </div>
                        )}

                        {/* Existing Reply from Dosen */}
                        {msg.replied && msg.replyText && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1">
                            <div className="font-bold text-emerald-900 flex items-center justify-between">
                              <span>Balasan Konfirmasi Dosen Pengampu:</span>
                              {msg.repliedAt && (
                                <span className="text-[10px] text-emerald-700 font-normal">
                                  {new Date(msg.repliedAt).toLocaleString('id-ID')}
                                </span>
                              )}
                            </div>
                            <p className="leading-relaxed italic">"{msg.replyText}"</p>
                          </div>
                        )}

                        {/* Inline Reply Form */}
                        {replyingMsgId === msg.id && (
                          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 mt-2">
                            <label className="block text-xs font-bold text-indigo-950">
                              Ketik Balasan Konfirmasi untuk {msg.studentName}:
                            </label>
                            
                            {/* Quick template buttons */}
                            <div className="flex flex-wrap gap-1.5 pb-1">
                              {[
                                'Tugas makalah/PPT telah diterima dan diverifikasi dengan baik.',
                                'Tugas UTS esai sudah dicek. Terima kasih.',
                                'Proyek UAS video telah kami tonton dan nilai. Sangat bagus.',
                                'Mohon periksa kembali kelengkapan file referensi Anda.',
                              ].map((tpl, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setReplyText(tpl)}
                                  className="text-[10px] bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-2 py-0.5 rounded font-medium"
                                >
                                  {tpl.substring(0, 35)}...
                                </button>
                              ))}
                            </div>

                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={3}
                              placeholder="Tulis balasan untuk mahasiswa..."
                              className="w-full p-2 text-xs border border-indigo-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingMsgId(null);
                                  setReplyText('');
                                }}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={isReplying || !replyText.trim()}
                                onClick={async () => {
                                  setIsReplying(true);
                                  try {
                                    await replyStudentMessageApi(msg.id, replyText.trim());
                                    setReplyingMsgId(null);
                                    setReplyText('');
                                    await onRefreshData();
                                  } finally {
                                    setIsReplying(false);
                                  }
                                }}
                                className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-2xs"
                              >
                                <Send size={12} />
                                <span>{isReplying ? 'Mengirim...' : 'Kirim Balasan'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {!msg.read ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await markStudentMessageReadApi(msg.id);
                                await onRefreshData();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md"
                            >
                              <CheckCircle2 size={12} />
                              <span>Tandai Sudah Dibaca</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Sudah Dibaca</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setReplyingMsgId(msg.id);
                              setReplyText(msg.replyText || 'Tugas telah diterima dan dikonfirmasi oleh Dosen Pengampu.');
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200"
                          >
                            <Send size={12} />
                            <span>{msg.replied ? 'Edit Balasan' : 'Balas Pesan'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Halo ${msg.studentName} (NIM: ${msg.studentNim}), konfirmasi dari Dosen terkait: "${msg.subject}". ${msg.replyText || 'Tugas Anda telah kami terima di SIAKAD.'}`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                            title="Balas cepat via WhatsApp"
                          >
                            <MessageCircle size={12} />
                            <span>Balas WA</span>
                          </a>

                          {deletingMsgId === msg.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-md">
                              <span className="text-[10px] text-rose-800 font-bold">Hapus pesan?</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteStudentMessageApi(msg.id);
                                  setDeletingMsgId(null);
                                  await onRefreshData();
                                  setClearFeedback({ type: 'success', text: `Pesan dari ${msg.studentName} berhasil dihapus.` });
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Ya
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingMsgId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingMsgId(msg.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus pesan"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Micro Credit */}
          <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Aplikasi ini dibuat oleh <span className="font-semibold text-emerald-800">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</span>
          </div>
        </div>
      )}

      {/* SUB-TAB: KELOLA RPS, MK & OTOMATISASI JADWAL */}
      {subTab === 'rps-sync' && (
        <RpsManagerView
          meetings={meetings}
          courseProfile={courseProfile}
          students={students}
          groups={groups}
          rpsRawText={rpsRawText}
          onRefreshData={onRefreshData}
        />
      )}

      {/* SUB-TAB: KELOMPOK PPT & MAKALAH (DITENTUKAN DOSEN) */}
      {subTab === 'kelompok-ppt' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Users size={20} />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Manajemen Kelompok PPT & Makalah (Ditentukan Dosen)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Dosen memiliki otoritas penuh untuk menentukan format penugasan per pertemuan (Individu vs Kelompok Kolaborasi), menambah atau memindahkan mahasiswa ke kelompok presentasi, serta memberikan nilai langsung ke seluruh anggota kelompok sekaligus.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-xs font-bold px-3 py-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl">
                16 Pertemuan Perkuliahan
              </span>
            </div>
          </div>

          {/* Alert feedback for group operations */}
          {groupActionFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                groupActionFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <span>{groupActionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setGroupActionFeedback(null)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Meeting Cards List */}
          <div className="space-y-4">
            {(meetings || []).map((meeting) => {
              const meetingStudents = (students || []).filter(s => s.meetingNumber === meeting.meetingNumber);
              const isGroup = meeting.presentationFormat === 'kelompok';
              const isAddingToThis = selectedMeetingForGroupAdd === meeting.meetingNumber;
              const isGradingThis = gradingMeetingGroup === meeting.meetingNumber;

              // Check if any student in this meeting submitted
              const meetingSubmissions = (submissions || []).filter(sub =>
                meetingStudents.some(std => std.id === sub.studentId)
              );

              return (
                <div
                  key={meeting.meetingNumber}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    isGroup
                      ? 'border-indigo-200 bg-indigo-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                          Pertemuan #{meeting.meetingNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {meeting.dateStr}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            isGroup
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isGroup ? 'Kelompok PPT & Makalah' : 'Individu'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 mt-1">
                        {meeting.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                        {meeting.description}
                      </p>
                    </div>

                    {/* Dosen Format Controls */}
                    <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleMeetingFormatDosen(meeting.meetingNumber, 'individu')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            !isGroup
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Individu
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleMeetingFormatDosen(meeting.meetingNumber, 'kelompok')}
                          className={`px-3 py-1 rounded-lg font-bold transition-all ${
                            isGroup
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Kelompok
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeetingForGroupAdd(isAddingToThis ? null : meeting.meetingNumber);
                          setGroupAddStudentChoice('');
                          setGroupAddCustomName('');
                          setGroupAddCustomNim('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        <UserPlus size={13} />
                        <span>+ Tambah Mahasiswa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setGradingMeetingGroup(isGradingThis ? null : meeting.meetingNumber);
                          const firstGrade = meetingStudents.find(s => grades[s.id]?.individualGrade);
                          if (firstGrade && grades[firstGrade.id]?.individualGrade) {
                            setMeetingGroupScore(grades[firstGrade.id].individualGrade!);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        <Award size={13} />
                        <span>Beri Nilai Kelompok</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Student Inline Form (Ditentukan Dosen) */}
                  {isAddingToThis && (
                    <div className="mt-3 p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <UserPlus size={14} className="text-indigo-600" />
                          <span>Tambahkan Mahasiswa ke Kelompok Pertemuan #{meeting.meetingNumber}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMeetingForGroupAdd(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Pilihan 1: Pilih dari Daftar Mahasiswa Kelas:
                          </label>
                          <select
                            value={groupAddStudentChoice}
                            onChange={e => {
                              setGroupAddStudentChoice(e.target.value);
                              if (e.target.value) {
                                setGroupAddCustomName('');
                                setGroupAddCustomNim('');
                              }
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                          >
                            <option value="">-- Pilih Mahasiswa Kelas --</option>
                            {students
                              .filter(s => s.meetingNumber !== meeting.meetingNumber)
                              .map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.nim || 'Tanpa NIM'}) - Jadwal Saat Ini: {s.rpsPart}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Pilihan 2: Atau Tambah Mahasiswa Baru (Nama & NIM):
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={groupAddCustomName}
                              onChange={e => {
                                setGroupAddCustomName(e.target.value);
                                if (e.target.value) setGroupAddStudentChoice('');
                              }}
                              placeholder="Nama Mahasiswa..."
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                            <input
                              type="text"
                              value={groupAddCustomNim}
                              onChange={e => setGroupAddCustomNim(e.target.value)}
                              placeholder="NIM..."
                              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedMeetingForGroupAdd(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isOperatingGroup}
                          onClick={() => handleAddPresenterToMeetingDosen(meeting.meetingNumber)}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check size={13} />
                          <span>{isOperatingGroup ? 'Menyimpan...' : 'Tambahkan Mahasiswa'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bulk Grading Box for This Meeting Group */}
                  {isGradingThis && (
                    <div className="mt-3 p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Award size={15} className="text-emerald-700" />
                          <span>Penilaian Seluruh Anggota Kelompok Pertemuan #{meeting.meetingNumber}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setGradingMeetingGroup(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nilai Angka (0 - 100):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={meetingGroupScore}
                            onChange={e => setMeetingGroupScore(Number(e.target.value))}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Catatan Evaluasi / Masukan Dosen untuk Kelompok:
                          </label>
                          <input
                            type="text"
                            value={meetingGroupFeedback}
                            onChange={e => setMeetingGroupFeedback(e.target.value)}
                            placeholder="Catatan evaluasi makalah dan presentasi..."
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-800 font-medium">
                          Nilai ini akan langsung dimasukkan ke rekap nilai <strong>{meetingStudents?.length || 0} mahasiswa</strong> di kelompok ini.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGradingMeetingGroup(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isBulkGradingMeetingGroup}
                            onClick={() => handleGradeMeetingGroupDosen(meeting.meetingNumber)}
                            className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check size={13} />
                            <span>{isBulkGradingMeetingGroup ? 'Menyimpan...' : 'Simpan Nilai Seluruh Kelompok'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Presenter Members Roster */}
                  <div className="mt-3">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-indigo-600" />
                        <span>Anggota Pemakalah ({meetingStudents?.length || 0} Mahasiswa):</span>
                      </span>
                    </div>

                    {(meetingStudents?.length || 0) > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {meetingStudents.map((std) => {
                          const stdGrade = grades[std.id]?.individualGrade;
                          const hasSub = (submissions || []).find(s => s.studentId === std.id);

                          return (
                            <div
                              key={std.id}
                              className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 text-xs hover:border-indigo-300 transition-colors shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  {std.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-slate-900 truncate">{std.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    NIM: {std.nim || '-'} • Part {std.rpsPart}
                                  </div>
                                  {stdGrade !== undefined && (
                                    <div className="text-[10px] font-extrabold text-emerald-700">
                                      Nilai: {stdGrade}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {hasSub && (
                                  <span className="p-1 rounded bg-emerald-100 text-emerald-800" title="Sudah upload tugas">
                                    <CheckCircle2 size={12} />
                                  </span>
                                )}
                                {(meetingStudents?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePresenterFromMeetingDosen(meeting.meetingNumber, std.name)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                    title={`Keluarkan ${std.name} dari kelompok pertemuan ini`}
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                        Belum ada mahasiswa yang ditugaskan di pertemuan ini. Klik tombol <strong>"+ Tambah Mahasiswa"</strong> di atas untuk menugaskan.
                      </div>
                    )}
                  </div>

                  {/* Meeting Submissions preview if any */}
                  {(meetingSubmissions?.length || 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[11px] font-bold text-slate-500">Berkas Unggahan Kelompok:</span>
                      {meetingSubmissions.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          <span className="font-medium text-slate-700">{sub.studentName}:</span>
                          {sub.pptUrl && (
                            <a
                              href={sub.pptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink size={11} /> PPT
                            </a>
                          )}
                          {sub.pptFileData && (
                            <a
                              href={sub.pptFileData}
                              download={sub.pptFileName || 'PPT.pptx'}
                              className="text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Download size={11} /> PPT File
                            </a>
                          )}
                          {sub.makalahUrl && (
                            <a
                              href={sub.makalahUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-700 hover:underline inline-flex items-center gap-0.5"
                            >
                              <ExternalLink size={11} /> Makalah
                            </a>
                          )}
                          {sub.makalahFileData && (
                            <a
                              href={sub.makalahFileData}
                              download={sub.makalahFileName || 'Makalah.pdf'}
                              className="text-indigo-700 hover:underline inline-flex items-center gap-0.5"
                            >
                              <Download size={11} /> Makalah File
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PENILAIAN TUGAS PPT & MAKALAH PRESENTASI (INDIVIDU/KELOMPOK) */}
      {subTab === 'nilai-ppt' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daftar & Penilaian Tugas Presentasi (Individu/Kelompok) (Part 01 s/d Part 15)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tugas presentasi yang sudah dikirim (individu atau kelompok sesuai pembagian dosen). Dosen dapat mengunduh PPT, membuka Canva, dan memberikan nilai serta catatan evaluasi.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full self-start sm:self-auto">
              Total Terkirim: {submissions?.length || 0} / {students?.length || 0}
            </span>
          </div>

          {/* Action notification banner */}
          {actionAlertMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                actionAlertMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionAlertMsg.type === 'success' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{actionAlertMsg.text}</span>
              </div>
              <button
                onClick={() => setActionAlertMsg(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* Modal / In-line Grading */}
          {gradingStudentId && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-indigo-950">
                  Form Penilaian Dosen: {(students || []).find(s => s.id === gradingStudentId)?.name}
                </div>
                <button
                  onClick={() => setGradingStudentId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Tutup Form
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai (0 - 100):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={indivScoreInput}
                    onChange={e => setIndivScoreInput(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Feedback Dosen:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pemaparan komprehensif, slide rapi, rujukan filosofis kuat."
                    value={indivFeedbackInput}
                    onChange={e => setIndivFeedbackInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setGradingStudentId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSaveIndivGrade(gradingStudentId)}
                  disabled={isGradingIndiv}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-bold transition-colors"
                >
                  {isGradingIndiv ? 'Menyimpan...' : 'Simpan Nilai Tugas'}
                </button>
              </div>
            </div>
          )}

          {/* List of submissions */}
          {(submissions?.length || 0) === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
              Belum ada mahasiswa yang mengirimkan tugas Makalah & PPT. Tugas yang dikirim mahasiswa akan langsung tampil di sini secara real-time.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {(submissions || []).map((sub) => {
                const std = (students || []).find(s => s.id === sub.studentId);
                const hasPpt = Boolean(
                  (sub.pptType === 'link' && sub.pptUrl) ||
                  (sub.pptType === 'file' && (sub.pptFileData || sub.pptFileName))
                );
                const hasMakalah = Boolean(
                  (sub.makalahType === 'link' && sub.makalahUrl) ||
                  (sub.makalahType === 'file' && (sub.makalahFileData || sub.makalahFileName))
                );

                return (
                  <div
                    key={sub.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-2 max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {sub.studentName}
                        </span>
                        <span className="text-[11px] font-extrabold bg-emerald-800 text-white px-2.5 py-0.5 rounded-md">
                          {sub.rpsPart}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Pertemuan {sub.meetingNumber}
                        </span>
                        {std && (
                          <span className="text-xs text-slate-400">
                            (NIM: {std.nim})
                          </span>
                        )}
                      </div>

                      <div className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                        "{sub.topic}"
                      </div>

                      {/* Uploaded Components Status / Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {/* PPT Indicator */}
                        {hasPpt ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <FileText size={13} className="text-blue-600" />
                            <span>
                              PPT: {sub.pptType === 'file' ? (sub.pptFileName || 'File PPT') : 'Link Canva/Drive'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            PPT Kosong / Dihapus
                          </span>
                        )}

                        {/* Makalah Indicator */}
                        {hasMakalah ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            <FileText size={13} className="text-purple-600" />
                            <span>
                              Makalah: {sub.makalahType === 'file' ? (sub.makalahFileName || 'File Makalah') : 'Link Dokumen'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Makalah Kosong / Dihapus
                          </span>
                        )}
                      </div>

                      {sub.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-700">Catatan Mahasiswa:</span> "{sub.notes}"
                        </div>
                      )}

                      {sub.feedback && (
                        <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <span className="font-semibold">Catatan/Alasan Dosen:</span> "{sub.feedback}"
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400">
                        Waktu kirim: {new Date(sub.submittedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>

                    {/* Action buttons: Access files, Grade, and Delete if mistaken */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      {/* PPT Link or Download */}
                      {sub.pptUrl && (sub.pptUrl.startsWith('http') || sub.pptType === 'link') && (
                        <a
                          href={sub.pptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors shadow-xs"
                          title="Buka Link Slide Canva/Drive"
                        >
                          <ExternalLink size={13} />
                          <span>Buka PPT/Canva</span>
                        </a>
                      )}

                      {(sub.pptFileData || (sub.pptUrl && !sub.pptUrl.startsWith('http'))) && (
                        <a
                          href={sub.pptFileData || sub.pptUrl}
                          download={sub.pptFileName || `PPT-${sub.rpsPart}.pptx`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors shadow-xs"
                          title="Download File PPT"
                        >
                          <Download size={13} />
                          <span>Unduh PPT</span>
                        </a>
                      )}

                      {/* Buka Dokumen Makalah (Pratinjau Lengkap) */}
                      <button
                        type="button"
                        onClick={() => handleOpenDocPreview(sub, 'makalah')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        title="Buka & Pratinjau Dokumen Makalah Mahasiswa"
                      >
                        <FileText size={13} />
                        <span>Buka Makalah</span>
                      </button>

                      {/* Unduh File Makalah */}
                      <button
                        type="button"
                        onClick={() => handleOpenDocPreview(sub, 'makalah')}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Unduh berkas dokumen makalah (.doc / .pdf)"
                      >
                        <Download size={13} />
                        <span className="hidden sm:inline">Unduh</span>
                      </button>

                      {/* Review & Nilai Button */}
                      <button
                        onClick={() => handleOpenReviewIndiv(sub)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        title="Review lengkap berkas tugas & berikan nilai"
                      >
                        <Eye size={13} />
                        <span>{sub.grade !== undefined ? `Review & Nilai (${sub.grade})` : 'Review & Beri Nilai'}</span>
                      </button>

                      {/* Quick Auto-Grade Button */}
                      <button
                        onClick={() => {
                          handleOpenReviewIndiv(sub);
                          handleAutoGradeIndiv(sub);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        title="Otomatis beri rekomendasi nilai & catatan evaluasi berbasis rubrik akademik"
                      >
                        <Zap size={13} className="text-amber-600 fill-amber-500" />
                        <span>Nilai Otomatis</span>
                      </button>

                      {/* Delete Task Button (Only Dosen) */}
                      <button
                        onClick={() => {
                          setDeleteModalData({ sub, studentName: sub.studentName });
                          setDeletePartChoice('all');
                          setDeleteReasonText('');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition-colors"
                        title="Hapus / Reset tugas mahasiswa ini jika salah upload (Bisa hapus PPT saja, Makalah saja, atau seluruh tugas)"
                      >
                        <Trash2 size={13} />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2.5: PENILAIAN UTS 5 SOAL ESSAY */}
      {subTab === 'nilai-uts' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1">
                <FileQuestion size={13} />
                <span>Evaluasi SIAKAD • Bobot 25%</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-serif-title">
                Penilaian Ujian Tengah Semester (UTS): 5 Soal Essay
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                Ujian tertulis essay Filsafat Ilmu (Ontologi, Epistemologi, Aksiologi, & Etika MPI). Setiap nomor berbobot maksimal 20 poin (Total 100). Nilai tersimpan langsung ke SIAKAD.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                Terkumpul: {utsSubmissions?.length || 0} / {students?.length || 0} Mahasiswa
              </span>
            </div>
          </div>

          {/* Quick UTS Lock Control Bar in UTS Tab */}
          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isUtsOpen ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                isUtsOpen ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}>
                {isUtsOpen ? <Unlock size={16} /> : <Lock size={16} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Akses Pengumpulan Mahasiswa:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    isUtsOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {isUtsOpen ? 'DIBUKA RESMI' : 'DIKUNCI OLEH DOSEN'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {isUtsOpen
                    ? 'Mahasiswa saat ini dapat mengakses formulir dan mengumpulkan jawaban UTS.'
                    : 'Mahasiswa tidak dapat mengumpulkan jawaban UTS hingga Anda membuka kunci ujian.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-dosen-toggle-uts-subtab"
              disabled={isTogglingUtsLock}
              onClick={handleToggleUtsLockDosen}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95 ${
                isUtsOpen ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isUtsOpen ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{isTogglingUtsLock ? 'Memproses...' : (isUtsOpen ? 'Kunci Ujian UTS' : 'Buka Kunci Ujian UTS')}</span>
            </button>
          </div>

          {/* Form Penilaian UTS Aktif */}
          {gradingUtsStudentId && (
            <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4 shadow-xs">
              {(() => {
                const targetStudent = (students || []).find(s => s.id === gradingUtsStudentId);
                const targetSub = (utsSubmissions || []).find(sub => sub.studentId === gradingUtsStudentId);

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-3">
                      <div>
                        <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          Form Penilaian Lembar Jawaban UTS (Bisa Nilai Otomatis & Manual)
                        </div>
                        <h4 className="text-base font-black text-slate-900">
                          {targetStudent?.name} ({targetStudent?.nim}) • {targetStudent?.rpsPart}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAutoGradeUts(gradingUtsStudentId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                          title="Gunakan algoritma rekomendasi penilaian otomatis berbasis rubrik & deteksi AI"
                        >
                          <Sparkles size={13} className="fill-white" />
                          <span>Gunakan Nilai Rekomendasi Otomatis</span>
                        </button>
                        <button
                          onClick={() => setGradingUtsStudentId(null)}
                          className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg self-start sm:self-auto"
                        >
                          Tutup Form
                        </button>
                      </div>
                    </div>

                    {/* AI Detection Card if available */}
                    {targetSub?.aiDetectionScore !== undefined && (
                      <div className={`p-4 rounded-xl border ${
                        targetSub.aiDetectionScore >= 60
                          ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                          : targetSub.aiDetectionScore >= 25
                          ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                          : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            {targetSub.aiDetectionScore >= 60 ? (
                              <ShieldAlert className="text-rose-600 shrink-0" size={18} />
                            ) : (
                              <ShieldCheck className="text-emerald-600 shrink-0" size={18} />
                            )}
                            <span>Sistem Deteksi Orisinalitas & Copas AI SIAKAD</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black self-start sm:self-auto ${
                            targetSub.aiDetectionScore >= 60
                              ? 'bg-rose-600 text-white'
                              : targetSub.aiDetectionScore >= 25
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-700 text-white'
                          }`}>
                            {targetSub.aiVerdict || (targetSub.aiDetectionScore >= 60 ? 'Terindikasi AI / Copas' : 'Orisinal Mahasiswa')} ({targetSub.aiDetectionScore}%)
                          </span>
                        </div>

                        <div className="pt-2 text-xs space-y-1.5">
                          {targetSub.aiAnalysisNotes && (
                            <p className="leading-relaxed font-medium">
                              {targetSub.aiAnalysisNotes}
                            </p>
                          )}
                          {targetSub.aiDetectedFlags && targetSub.aiDetectedFlags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <span className="font-bold text-[10px] uppercase opacity-75 mr-1">Frasa AI / Karakteristik Terdeteksi:</span>
                              {targetSub.aiDetectedFlags.map((flg, fi) => (
                                <span key={fi} className="text-[10px] bg-white/90 border border-black/10 px-2 py-0.5 rounded font-mono font-semibold">
                                  "{flg}"
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lembar Jawaban & Input Nilai per Soal */}
                    <div className="space-y-4">
                      {utsQuestions.map((q) => {
                        const ans = targetSub?.answers[q.id];
                        const currentQScore = utsScoresByQ[q.id] ?? Math.round(utsScoreInput / 5);

                        return (
                          <div key={q.id} className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2.5 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-indigo-900 text-white inline-block">
                                  Soal Nomor {q.id} • {q.topic}
                                </span>
                                <p className="text-xs font-bold text-slate-900 leading-snug">
                                  {q.question}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <label className="text-[11px] font-bold text-slate-700">Skor (0-20):</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={20}
                                  value={currentQScore}
                                  onChange={e => {
                                    const val = Math.min(20, Math.max(0, Number(e.target.value)));
                                    const updated = { ...utsScoresByQ, [q.id]: val };
                                    setUtsScoresByQ(updated);
                                    const sum = (Object.values(updated) as number[]).reduce((a, b) => a + b, 0);
                                    setUtsScoreInput(sum);
                                  }}
                                  className="w-14 px-2 py-1 text-xs font-extrabold text-center rounded border border-indigo-300 bg-white"
                                />
                              </div>
                            </div>

                            {/* Teks Jawaban Mahasiswa */}
                            <div className="mt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Jawaban Mahasiswa:
                              </span>
                              {ans ? (
                                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                                  {ans}
                                </p>
                              ) : (
                                <span className="text-xs text-amber-700 italic">
                                  Belum mengisi jawaban tertulis di web ini.
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lampiran Dokumen/File UTS bila ada */}
                    {(targetSub?.docLink || targetSub?.fileData || targetSub?.fileName) && (
                      <div className="p-3 bg-white rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold">
                          <FileText size={15} className="text-indigo-600" />
                          <span>Lampiran Berkas / Dokumen Jawaban UTS Mahasiswa:</span>
                          {targetSub.fileName && <span className="font-normal text-slate-500">({targetSub.fileName})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          {targetSub.docLink && (
                            <a
                              href={targetSub.docLink}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs"
                            >
                              <ExternalLink size={13} />
                              <span>Buka Link Dokumen / Drive</span>
                            </a>
                          )}
                          {targetSub.fileData && (
                            <a
                              href={targetSub.fileData}
                              download={targetSub.fileName || `UTS-${targetSub.studentName}.pdf`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-xs"
                            >
                              <Download size={13} />
                              <span>Unduh Berkas UTS</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Total Score & Feedback Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 bg-white p-4 rounded-xl border border-indigo-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Total Nilai UTS (0 - 100):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={utsScoreInput}
                          onChange={e => setUtsScoreInput(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm font-black text-indigo-950 rounded-lg border border-indigo-400 bg-indigo-50/50"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Catatan Evaluasi / Umpan Balik Dosen untuk Mahasiswa:
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Analisis ontologi sangat tajam, korelasi dengan manajemen madrasah tepat."
                          value={utsFeedbackInput}
                          onChange={e => setUtsFeedbackInput(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setGradingUtsStudentId(null)}
                        className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSaveUtsGrade(gradingUtsStudentId)}
                        disabled={isGradingUts}
                        className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>{isGradingUts ? 'Menyimpan...' : 'Simpan Nilai UTS ke SIAKAD'}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Daftar Semua Mahasiswa dan Status UTS */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Pengumpulan & Penilaian Mahasiswa ({students?.length || 0} Mahasiswa MPI 1)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(students || []).map((std) => {
                const sub = (utsSubmissions || []).find(s => s.studentId === std.id);
                const currentGrade = grades[std.id];
                const hasGrade = currentGrade?.utsScore !== undefined;

                return (
                  <div
                    key={std.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-slate-900">
                          {std.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          {std.rpsPart}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        NIM: {std.nim} • Kelompok {std.groupId}
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {sub ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            <span>Jawaban Terkirim</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <span>Belum Mengumpulkan</span>
                          </span>
                        )}

                        {hasGrade ? (
                          <span className="text-[10px] font-extrabold text-indigo-900 bg-indigo-100 border border-indigo-300 px-2 py-0.5 rounded-full">
                            Nilai UTS: {currentGrade.utsScore}/100
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Belum Dinilai
                          </span>
                        )}
                      </div>

                      {/* Catatan Feedback bila ada */}
                      {sub?.feedback && (
                        <div className="text-[11px] text-indigo-900 italic bg-white p-2 rounded border border-indigo-100 mt-2">
                          Feedback: "{sub.feedback}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => handleOpenReviewUts(std.id)}
                        className="px-3.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
                      >
                        <Eye size={13} />
                        <span>{sub ? (hasGrade ? `Review & Edit (${currentGrade.utsScore})` : 'Review & Nilai UTS') : 'Input Nilai UTS'}</span>
                      </button>

                      {sub && (
                        <button
                          onClick={() => {
                            handleOpenReviewUts(std.id);
                            handleAutoGradeUts(std.id);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
                          title="Otomatis beri rekomendasi nilai lembar UTS 5 essay berbasis rubrik"
                        >
                          <Zap size={13} className="text-amber-600 fill-amber-500" />
                          <span>Nilai Otomatis</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PENILAIAN VIDEO EDUKASI AI KELOMPOK */}
      {subTab === 'nilai-video' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Penilaian Tugas Proyek Video Edukasi AI (5 Kelompok)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Spesifikasi: Durasi 5-8 Menit, MP4 HD 1080p, Integrasi AI (ChatGPT, Canva/CapCut, D-ID/ElevenLabs), Tayang Pertemuan 16.
              </p>
            </div>
          </div>

          {/* Quick UAS Lock Control Bar in Video/UAS Tab */}
          <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isUasOpen ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                isUasOpen ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
              }`}>
                {isUasOpen ? <Unlock size={16} /> : <Lock size={16} />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Akses Pengumpulan Proyek UAS Mahasiswa:</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    isUasOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {isUasOpen ? 'DIBUKA RESMI' : 'DIKUNCI OLEH DOSEN'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {isUasOpen
                    ? 'Mahasiswa saat ini dapat mengumpulkan link video proyek dan laporan UAS.'
                    : 'Pengumpulan proyek UAS dikunci. Mahasiswa tidak dapat mengumpulkan hingga Anda membuka kunci ujian.'}
                </div>
              </div>
            </div>
            <button
              type="button"
              id="btn-dosen-toggle-uas-subtab"
              disabled={isTogglingUasLock}
              onClick={handleToggleUasLockDosen}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95 ${
                isUasOpen ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isUasOpen ? <Lock size={13} /> : <Unlock size={13} />}
              <span>{isTogglingUasLock ? 'Memproses...' : (isUasOpen ? 'Kunci Ujian UAS' : 'Buka Kunci Ujian UAS')}</span>
            </button>
          </div>

          {/* Group grading form if active */}
          {gradingGroupId && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-indigo-950">
                  Form Penilaian Video: {(groups || []).find(g => g.id === gradingGroupId)?.name}
                </div>
                <button
                  onClick={() => setGradingGroupId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Tutup Form
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai Video (0 - 100):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={groupScoreInput}
                    onChange={e => setGroupScoreInput(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Evaluasi / Feedback:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sangat kreatif, animasi visual tepat, pemanfaatan AI avatar efektif."
                    value={groupFeedbackInput}
                    onChange={e => setGroupFeedbackInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setGradingGroupId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSaveGroupGrade(gradingGroupId)}
                  disabled={isGradingGroup}
                  className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-bold"
                >
                  {isGradingGroup ? 'Menyimpan...' : 'Simpan Nilai Video'}
                </button>
              </div>
            </div>
          )}

          {/* 5 Group Cards */}
          <div className="space-y-4">
            {groups.map((grp) => {
              const sub = grp.submission;

              return (
                <div
                  key={grp.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs px-2.5 py-0.5 rounded bg-indigo-900 text-white">
                        {grp.name}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        Anggota: {grp.members.join(', ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                      "{grp.title}"
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {grp.description}
                    </p>

                    {sub ? (
                      <div className="pt-2 text-xs space-y-1">
                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 size={13} />
                          <span>Video Terkirim oleh {sub.submittedBy}</span>
                        </div>
                        {sub.aiToolsUsed && (
                          <div className="text-slate-500 text-[11px]">
                            Tool AI yang dipakai: {sub.aiToolsUsed}
                          </div>
                        )}
                        {sub.summaryNotes && (
                          <div className="text-slate-600 italic bg-white p-2 rounded border text-[11px]">
                            "{sub.summaryNotes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded font-medium mt-1">
                        Belum ada link video yang diunggah kelompok ini.
                      </div>
                    )}
                  </div>

                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenReviewGroup(grp.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                      >
                        <Eye size={13} />
                        <span>{grp.grade !== undefined ? `Review & Edit (${grp.grade})` : 'Review & Beri Nilai'}</span>
                      </button>

                      {sub && (
                        <button
                          onClick={() => {
                            handleOpenReviewGroup(grp.id);
                            handleAutoGradeGroup(grp.id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                          title="Otomatis beri rekomendasi nilai video UAS berbasis rubrik"
                        >
                          <Zap size={13} className="text-amber-600 fill-amber-500" />
                          <span>Nilai Otomatis</span>
                        </button>
                      )}

                      {sub && (sub.videoUrl || sub.driveUrl || sub.canvaUrl || sub.fileData) && (
                        <div className="flex items-center gap-1.5">
                          {sub.videoUrl && (
                            <a
                              href={sub.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-lg text-xs font-bold transition-colors"
                              title="Buka Tautan Video YouTube/Vimeo"
                            >
                              <Video size={13} />
                              <span>Video</span>
                            </a>
                          )}
                          {sub.driveUrl && (
                            <a
                              href={sub.driveUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
                              title="Buka Link Google Drive"
                            >
                              <ExternalLink size={13} />
                              <span>Drive</span>
                            </a>
                          )}
                          {sub.canvaUrl && (
                            <a
                              href={sub.canvaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold transition-colors"
                              title="Buka Link Canva / Slide"
                            >
                              <ExternalLink size={13} />
                              <span>Canva</span>
                            </a>
                          )}
                          {sub.fileData && (
                            <a
                              href={sub.fileData}
                              download={sub.fileName || `UAS-Kelompok-${grp.id}`}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                              title="Unduh Berkas Video / File"
                            >
                              <Download size={13} />
                              <span>Unduh</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: KEAMANAN & UBAH PASSWORD DOSEN */}
      {subTab === 'keamanan' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 max-w-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock size={18} className="text-indigo-700" />
              <span>Pengaturan Sandi Akses Dosen</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Password digunakan untuk melindungi portal dosen agar tidak dapat diakses oleh mahasiswa. Data tugas yang sudah dikirim terlindungi dan hanya Dosen yang dapat menghapusnya.
            </p>
          </div>

          {passMsg && (
            <div className={`p-3 rounded-xl text-xs font-semibold ${
              passMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              {passMsg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Dosen Saat Ini:</label>
              <input
                type="password"
                required
                placeholder="Masukkan password saat ini"
                value={currPass}
                onChange={e => setCurrPass(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru:</label>
              <input
                type="password"
                required
                placeholder="Minimal 4 karakter"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Perbarui Password Dosen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB: EKSPOR & CADANGAN PERMANEN DATA TUGAS */}
      {subTab === 'cadangan-data' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  Pusat Ekspor & Cadangan Data Permanen Tugas SIAKAD
                </h3>
                <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl leading-relaxed">
                  Fitur ini dirancang khusus untuk memastikan dokumen tugas mahasiswa (makalah, PPT presentasi, esai UTS, proyek UAS video AI, dan kuis game) tersimpan secara permanen di luar browser cache sehingga tidak akan hilang saat website ditutup atau browser dibersihkan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportAllTasksToExcel}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Unduh Rekap Excel</span>
              </button>
              <button
                onClick={handleDownloadZipBackup}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/20 cursor-pointer"
              >
                <Archive size={15} />
                <span>Backup .ZIP Semester</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Mahasiswa
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {students.length}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">Aktif Terdaftar</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tugas Presentasi
              </span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {submissions.length}
              </span>
              <span className="text-[11px] text-slate-500">
                {submissions.filter(s => s.grade !== undefined).length} sudah dinilai
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Lembar UTS
              </span>
              <span className="text-2xl font-black text-teal-700 mt-1 block">
                {utsSubmissions.length}
              </span>
              <span className="text-[11px] text-slate-500">
                {utsSubmissions.filter(u => u.grade !== undefined).length} sudah dinilai
              </span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Proyek UAS AI
              </span>
              <span className="text-2xl font-black text-indigo-700 mt-1 block">
                {groups.filter(g => !!g.submission?.videoUrl).length}
              </span>
              <span className="text-[11px] text-slate-500">Dari 5 Kelompok</span>
            </div>
          </div>

          {/* Feedback message for restore */}
          {restoreFeedback && (
            <div className={`p-4 rounded-2xl text-xs font-semibold border flex items-start gap-2.5 animate-fadeIn ${
              restoreFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                : 'bg-rose-50 text-rose-950 border-rose-300'
            }`}>
              {restoreFeedback.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{restoreFeedback.text}</div>
              <button onClick={() => setRestoreFeedback(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main Action Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: EXPORT EXCEL */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                    <FileSpreadsheet size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      1. Ekspor Data Tugas ke Format Excel (.xlsx)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Format spreadsheet rapi siap cetak dan arsip akademik pascasarjana
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    File Excel yang dihasilkan memuat <strong>5 Sheet Terpisah</strong> secara komprehensif:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-700">
                    <li><strong>Sheet 1 (Tugas Presentasi):</strong> Nama mahasiswa, topik RPS, tautan file PPT/makalah, waktu pengumpulan, status & nilai dosen.</li>
                    <li><strong>Sheet 2 (Tugas UTS):</strong> Status kirim esai, deteksi AI, nilai ujian, feedback dosen, dan link dokumen.</li>
                    <li><strong>Sheet 3 (Proyek Video UAS):</strong> Kelompok 1-5, judul proyek, tautan video, alat AI yang dipakai, dan nilai akhir UAS.</li>
                    <li><strong>Sheet 4 (Kuis Game):</strong> Skor nilai, akurasi jawaban benar, dan lama pengerjaan kuis.</li>
                    <li><strong>Sheet 5 (Rekap Nilai SIAKAD):</strong> Rekap nilai akhir berbobot 10-10-20-30-30, huruf mutu, dan kelulusan.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportAllTasksToExcel}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={16} />
                  <span>Unduh File Rekap Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* CARD 2: COMPREHENSIVE SEMESTER ZIP/RAR BACKUP */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <Archive size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      2. Backup Data Semester (Format .ZIP / .RAR)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Arsip komprehensif seluruh tugas presentasi, berkas UTS/UAS, kuis, dan nilai
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p>
                    Fitur backup berkas semester terpadu dalam <strong>format .ZIP / .RAR</strong> sesuai standar arsip digital pascasarjana:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-700">
                    <li>Mencakup seluruh berkas fisik PPT & Makalah presentasi mahasiswa.</li>
                    <li>Mencakup naskah soal & lembar jawaban lengkap UTS dan UAS.</li>
                    <li>Mencakup rekapitulasi nilai kuis interaktif dan spreadsheet nilai semester.</li>
                    <li>Menyimpan arsip Brankas Permanen (Vault Engine) untuk persistensi lintas semester.</li>
                    <li>Dapat langsung dibuka menggunakan aplikasi WinRAR, 7-Zip, atau file manager bawaan.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  id="btn-download-zip-backup"
                  type="button"
                  disabled={isExportingZip}
                  onClick={handleDownloadZipBackup}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  title="Kompresi seluruh data tugas, nilai, absensi, dokumen dan data JSON ke arsip .zip menggunakan JSZip"
                >
                  <Archive size={16} className={isExportingZip ? 'animate-spin' : ''} />
                  <span>{isExportingZip ? 'Mengompresi Seluruh Data ke .ZIP...' : 'Kompresi & Unduh Arsip Semester (.ZIP)'}</span>
                </button>
              </div>
            </div>

            {/* CARD 3: RESTORE FROM ZIP/RAR BACKUP */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    3. Pulihkan Data dari Berkas Arsip (.ZIP / .RAR)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pulihkan seluruh dokumen tugas mahasiswa dan riwayat nilai dari berkas arsip cadangan
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Jika Anda berpindah perangkat (laptop/komputer), sistem berganti semester, atau ingin mengembalikan kondisi data sebelumnya, pilih berkas arsip berformat <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">.zip</code> atau <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">.rar</code> yang pernah diunduh. Sistem akan otomatis memvalidasi keutuhan arsip, merekonstruksi data tugas mahasiswa ke Brankas Permanen (Vault Engine), dan menyinkronkannya kembali ke server database.
              </p>

              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="backup-file-input"
                  accept=".zip,.rar,application/zip,application/x-zip-compressed"
                  onChange={handleRestoreBackupFile}
                  disabled={isRestoring}
                  className="hidden"
                />
                <label
                  htmlFor="backup-file-input"
                  className={`cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isRestoring ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                    <UploadCloud size={24} />
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {isRestoring ? 'Memproses dan Memulihkan Data dari Arsip...' : 'Klik di sini untuk Memilih Berkas Arsip Backup (.ZIP / .RAR)'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Format berkas arsip .zip / .rar resmi SIAKAD Pascasarjana (Vault Engine Terpadu)
                  </div>
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS TUGAS OLEH DOSEN */}
      {deleteModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Hapus / Reset Tugas Mahasiswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Fitur khusus Dosen jika mahasiswa salah mengunggah file PPT atau Makalah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Info */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mahasiswa:</span>
                <span className="font-bold text-slate-900">{deleteModalData.studentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Bagian RPS:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {deleteModalData.sub.rpsPart} (Pertemuan {deleteModalData.sub.meetingNumber})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Topik:</span>
                <span className="font-semibold text-slate-800 italic">"{deleteModalData.sub.topic}"</span>
              </div>
              
              {/* Status File yang Terunggah */}
              <div className="pt-2 mt-2 border-t border-slate-200 flex flex-wrap gap-2">
                <div className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-semibold text-[11px]">
                  PPT: {deleteModalData.sub.pptType === 'file' ? (deleteModalData.sub.pptFileName || 'File PPT') : (deleteModalData.sub.pptUrl ? 'Link Canva/Drive' : 'Tidak Ada')}
                </div>
                <div className="px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-purple-900 font-semibold text-[11px]">
                  Makalah: {deleteModalData.sub.makalahType === 'file' ? (deleteModalData.sub.makalahFileName || 'File Makalah') : (deleteModalData.sub.makalahUrl ? 'Link Dokumen' : 'Tidak Ada')}
                </div>
              </div>
            </div>

            {/* Radio Selection: Delete all, PPT only, or Makalah only */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Apa yang Ingin Dihapus:
              </label>
              <div className="space-y-2">
                {/* Option 1: Hapus Seluruh Tugas */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deletePartChoice === 'all'
                    ? 'bg-rose-50/70 border-rose-400 text-rose-950 ring-1 ring-rose-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="deletePart"
                    value="all"
                    checked={deletePartChoice === 'all'}
                    onChange={() => setDeletePartChoice('all')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold block">Hapus Seluruh Tugas (Reset Total)</span>
                    <span className="text-slate-500 text-[11px]">
                      Menghapus kedua file (PPT dan Makalah). Status mahasiswa menjadi "Belum Dikirim" dan dapat mengunggah ulang dari awal.
                    </span>
                  </div>
                </label>

                {/* Option 2: Hapus PPT Saja */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deletePartChoice === 'ppt'
                    ? 'bg-blue-50/70 border-blue-400 text-blue-950 ring-1 ring-blue-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="deletePart"
                    value="ppt"
                    checked={deletePartChoice === 'ppt'}
                    onChange={() => setDeletePartChoice('ppt')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold block">Hapus File PPT Saja</span>
                    <span className="text-slate-500 text-[11px]">
                      Hanya menghapus slide presentasi jika salah upload PPT/Canva. Dokumen Makalah tetap dipertahankan.
                    </span>
                  </div>
                </label>

                {/* Option 3: Hapus Makalah Saja */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  deletePartChoice === 'makalah'
                    ? 'bg-purple-50/70 border-purple-400 text-purple-950 ring-1 ring-purple-400'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}>
                  <input
                    type="radio"
                    name="deletePart"
                    value="makalah"
                    checked={deletePartChoice === 'makalah'}
                    onChange={() => setDeletePartChoice('makalah')}
                    className="mt-0.5 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold block">Hapus File Makalah Saja</span>
                    <span className="text-slate-500 text-[11px]">
                      Hanya menghapus dokumen Makalah jika salah upload Makalah. Slide PPT tetap dipertahankan.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Optional Reason/Note for Student */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan / Catatan Revisi untuk Mahasiswa (Opsional):
              </label>
              <textarea
                rows={2}
                value={deleteReasonText}
                onChange={e => setDeleteReasonText(e.target.value)}
                placeholder="Contoh: File PPT tidak sesuai dengan topik Part yang ditentukan, mohon unggah ulang..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalData(null)}
                disabled={isDeletingSubmission}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubmission}
                disabled={isDeletingSubmission}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeletingSubmission ? 'Sedang Menghapus...' : 'Konfirmasi Hapus Tugas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. MODAL REVIEW & PENILAIAN TUGAS PRESENTASI (INDIVIDU/KELOMPOK) (PPT & MAKALAH) */}
      {reviewIndivSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Eye size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900">
                      Review & Evaluasi Tugas: {reviewIndivSub.studentName}
                    </h3>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {reviewIndivSub.rpsPart} • Pertemuan {reviewIndivSub.meetingNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Topik RPS: <span className="font-semibold text-slate-700">"{reviewIndivSub.topic}"</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReviewIndivSub(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Grid Layout: Left Content Review, Right Grading */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Kolom Kiri: Pemeriksaan Berkas & Tindakan Koreksi */}
              <div className="space-y-4">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" />
                  <span>Berkas yang Dikirimkan Mahasiswa</span>
                </div>

                {/* Status PPT */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                      <span>Slide PPT / Canva</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {reviewIndivSub.pptType === 'link' ? 'Tautan Canva/Drive' : 'File PPT Terunggah'}
                    </span>
                  </div>

                  {(reviewIndivSub.pptUrl || reviewIndivSub.pptFileData) ? (
                    <div className="space-y-1.5">
                      {reviewIndivSub.pptUrl && (reviewIndivSub.pptUrl.startsWith('http') || reviewIndivSub.pptType === 'link') && (
                        <a
                          href={reviewIndivSub.pptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          <ExternalLink size={14} />
                          <span>Buka Link Presentasi PPT / Canva</span>
                        </a>
                      )}
                      {(reviewIndivSub.pptFileData || (reviewIndivSub.pptUrl && !reviewIndivSub.pptUrl.startsWith('http'))) && (
                        <a
                          href={reviewIndivSub.pptFileData || reviewIndivSub.pptUrl}
                          download={reviewIndivSub.pptFileName || `PPT-${reviewIndivSub.rpsPart}.pptx`}
                          className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          <Download size={14} />
                          <span>Unduh File PPT ({reviewIndivSub.pptFileName || 'PPT'})</span>
                        </a>
                      )}
                      {reviewIndivSub.pptFileName && (
                        <div className="text-[11px] text-slate-500">
                          Nama Berkas: {reviewIndivSub.pptFileName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 italic bg-white p-2 rounded border border-rose-200">
                      Belum ada slide PPT yang diunggah atau telah dihapus.
                    </div>
                  )}
                </div>

                {/* Status Makalah */}
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                      <span>Dokumen Makalah</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {reviewIndivSub.makalahType === 'link' ? 'Tautan Dokumen' : 'File Dokumen Terunggah'}
                    </span>
                  </div>

                  {(reviewIndivSub.makalahUrl || reviewIndivSub.makalahFileData || reviewIndivSub.topic) ? (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenDocPreview(reviewIndivSub, 'makalah')}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Buka & Pratinjau Naskah Dokumen Makalah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDocPreview(reviewIndivSub, 'makalah')}
                        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Unduh File Dokumen ({reviewIndivSub.makalahFileName || 'Makalah.doc'})</span>
                      </button>

                      {reviewIndivSub.makalahFileName && (
                        <div className="text-[11px] text-slate-500">
                          Nama Berkas: {reviewIndivSub.makalahFileName}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 italic bg-white p-2 rounded border border-rose-200">
                      Belum ada dokumen Makalah yang diunggah atau telah dihapus.
                    </div>
                  )}
                </div>

                {/* Catatan Mahasiswa */}
                {reviewIndivSub.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 block mb-0.5">Catatan Pengantar Mahasiswa:</span>
                    <p className="text-slate-600 italic leading-relaxed">"{reviewIndivSub.notes}"</p>
                  </div>
                )}

                <div className="text-[11px] text-slate-400">
                  Waktu submit: {new Date(reviewIndivSub.submittedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                </div>

                {/* KOREKSI / HAPUS JIKA SALAH BOX */}
                <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-rose-950 flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-600" />
                      <span>Koreksi: Jika Berkas Tugas Salah</span>
                    </span>
                    <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded">
                      Akses Dosen
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-900 leading-snug">
                    Jika mahasiswa salah mengunggah materi (misal salah slide PPT atau salah topik), Dosen dapat menghapus berkas terkait agar mahasiswa dapat mengunggah kembali.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-950 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewDeletePart"
                        value="all"
                        checked={deletePartChoice === 'all'}
                        onChange={() => setDeletePartChoice('all')}
                        className="text-rose-600"
                      />
                      <span>Hapus Seluruh Tugas (Reset Total Status)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-950 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewDeletePart"
                        value="ppt"
                        checked={deletePartChoice === 'ppt'}
                        onChange={() => setDeletePartChoice('ppt')}
                        className="text-rose-600"
                      />
                      <span>Hapus File PPT Saja (Makalah dipertahankan)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-950 cursor-pointer">
                      <input
                        type="radio"
                        name="reviewDeletePart"
                        value="makalah"
                        checked={deletePartChoice === 'makalah'}
                        onChange={() => setDeletePartChoice('makalah')}
                        className="text-rose-600"
                      />
                      <span>Hapus File Makalah Saja (PPT dipertahankan)</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Alasan revisi (opsional, contoh: salah upload materi Part 05)..."
                    value={deleteReasonText}
                    onChange={e => setDeleteReasonText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-300 bg-white"
                  />

                  {!isConfirmingReviewSubDelete ? (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingReviewSubDelete(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      <Trash2 size={13} />
                      <span>Hapus Berkas Sesuai Pilihan</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl space-y-2">
                      <p className="text-[11px] font-bold text-rose-950">
                        Konfirmasi hapus {deletePartChoice === 'all' ? 'seluruh tugas' : deletePartChoice === 'ppt' ? 'file PPT' : 'file Makalah'} milik <strong>{reviewIndivSub.studentName}</strong>?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingReviewSubDelete(false)}
                          className="flex-1 py-1 px-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingSubmission}
                          onClick={async () => {
                            setIsDeletingSubmission(true);
                            try {
                              await deleteSubmissionApi(reviewIndivSub.id, {
                                part: deletePartChoice,
                                reason: deleteReasonText.trim(),
                              });
                              setActionAlertMsg({
                                type: 'success',
                                text: `Berkas tugas mahasiswa "${reviewIndivSub.studentName}" berhasil dihapus. Mahasiswa dapat upload ulang materi yang benar.`,
                              });
                              setIsConfirmingReviewSubDelete(false);
                              setReviewIndivSub(null);
                              await onRefreshData();
                            } finally {
                              setIsDeletingSubmission(false);
                            }
                          }}
                          className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          <span>{isDeletingSubmission ? 'Menghapus...' : 'Ya, Hapus'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kolom Kanan: Panel Penilaian & Nilai Otomatis */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Award size={14} className="text-indigo-600" />
                      <span>Form Penilaian Tugas</span>
                    </div>

                    {/* Tombol Nilai Otomatis */}
                    <button
                      type="button"
                      onClick={() => handleAutoGradeIndiv(reviewIndivSub)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-black transition-all shadow-xs"
                      title="Hitung skor rekomendasi & buat catatan evaluasi akademik otomatis berdasarkan rubrik"
                    >
                      <Zap size={13} className="fill-white" />
                      <span>Nilai Otomatis (Rekomendasi AI)</span>
                    </button>
                  </div>

                  {/* Rubric breakdown pills if auto-graded */}
                  {autoGradingInfo && autoGradingInfo.type === 'indiv' && (
                    <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in">
                      <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                        Rekomendasi Rubrik Penilaian Terhitung:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {autoGradingInfo.breakdown.map((item, i) => (
                          <span key={i} className="text-[11px] font-semibold bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                            ✓ {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        Nilai Tugas Akhir (0 - 100):
                      </label>
                      <span className="text-base font-black text-indigo-900">
                        {indivScoreInput} / 100
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={indivScoreInput}
                      onChange={e => setIndivScoreInput(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={indivScoreInput}
                      onChange={e => setIndivScoreInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-24 mt-1 px-2.5 py-1.5 text-sm font-extrabold text-center rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  {/* Feedback Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Catatan Evaluasi / Feedback Dosen untuk Mahasiswa:
                    </label>
                    <textarea
                      rows={5}
                      value={indivFeedbackInput}
                      onChange={e => setIndivFeedbackInput(e.target.value)}
                      placeholder="Tuliskan catatan akademik, masukan isi PPT, atau apresiasi..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewIndivSub(null)}
                    disabled={isGradingIndiv}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIndivFromReview}
                    disabled={isGradingIndiv}
                    className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check size={14} />
                    <span>{isGradingIndiv ? 'Menyimpan...' : 'Simpan Nilai & Selesai Review'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL REVIEW & PENILAIAN UTS (5 SOAL ESSAY) */}
      {reviewUtsStudentId && (() => {
        const targetStudent = (students || []).find(s => s.id === reviewUtsStudentId);
        const targetSub = (utsSubmissions || []).find(sub => sub.studentId === reviewUtsStudentId);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <FileQuestion size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        Review Lembar Jawaban UTS: {targetStudent?.name}
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        NIM: {targetStudent?.nim} • {targetStudent?.rpsPart}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Evaluasi 5 Soal Essay Filsafat Ilmu MPI • Maksimal 20 poin per nomor (Total 100)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutoGradeUts(reviewUtsStudentId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-xs"
                    title="Analisis jawaban tertulis 5 essay & tentukan skor serta feedback otomatis"
                  >
                    <Zap size={13} className="fill-white" />
                    <span>Nilai Otomatis (Rekomendasi AI)</span>
                  </button>
                  <button
                    onClick={() => setReviewUtsStudentId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Rubric Breakdown if Auto-Graded */}
              {autoGradingInfo && autoGradingInfo.type === 'uts' && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Hasil Evaluasi Analitik Rubrik UTS:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {autoGradingInfo.breakdown.map((item, i) => (
                      <span key={i} className="text-[11px] font-medium bg-white text-amber-900 border border-amber-200 px-2 py-1 rounded-md">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Daftar 5 Soal & Lembar Jawaban Mahasiswa */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {utsQuestions.map((q) => {
                  const ans = targetSub?.answers[q.id];
                  const currentQScore = utsScoresByQ[q.id] ?? Math.round(utsScoreInput / 5);

                  return (
                    <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-indigo-900 text-white inline-block">
                            Soal {q.id} • {q.topic}
                          </span>
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {q.question}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 bg-white p-2 rounded-lg border border-slate-300">
                          <label className="text-[11px] font-bold text-slate-700">Skor (0-20):</label>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={currentQScore}
                            onChange={e => {
                              const val = Math.min(20, Math.max(0, Number(e.target.value)));
                              const updated = { ...utsScoresByQ, [q.id]: val };
                              setUtsScoresByQ(updated);
                              const sum = (Object.values(updated) as number[]).reduce((a, b) => a + b, 0);
                              setUtsScoreInput(sum);
                            }}
                            className="w-14 px-2 py-1 text-xs font-black text-center rounded border border-indigo-300 bg-indigo-50/50"
                          />
                        </div>
                      </div>

                      {/* Jawaban Mahasiswa */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Jawaban Mahasiswa:
                        </span>
                        {ans ? (
                          <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {ans}
                          </p>
                        ) : (
                          <span className="text-xs text-amber-700 italic">
                            Mahasiswa belum mengisi jawaban tertulis untuk nomor ini.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lampiran Dokumen jika ada */}
              {targetSub && (targetSub.docLink || targetSub.fileUrl) && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <FileText size={14} />
                    <span>Lampiran Berkas / Dokumen Jawaban UTS Mahasiswa:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocPreviewData({
                        title: `Dokumen Jawaban UTS: ${targetStudent?.name}`,
                        studentName: targetStudent?.name || '',
                        studentNim: targetStudent?.nim,
                        meetingNumber: 8,
                        rpsPart: 'Ujian Tengah Semester',
                        topic: 'Lembar Jawaban Esai Kritis UTS Filsafat Ilmu',
                        docType: 'uts',
                        fileUrl: targetSub.docLink || targetSub.fileUrl,
                        submittedAt: targetSub.submittedAt,
                        grade: targetSub.grade,
                        notes: 'Lampiran berkas pengerjaan UTS mahasiswa.'
                      });
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Eye size={13} />
                    <span>Buka & Pratinjau Dokumen Lampiran</span>
                  </button>
                </div>
              )}

              {/* Total Skor & Feedback Dosen */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Total Nilai UTS (0 - 100):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={utsScoreInput}
                    onChange={e => setUtsScoreInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 text-base font-black text-indigo-950 rounded-lg border border-indigo-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Catatan Evaluasi / Feedback Akademik Dosen:
                  </label>
                  <input
                    type="text"
                    value={utsFeedbackInput}
                    onChange={e => setUtsFeedbackInput(e.target.value)}
                    placeholder="Contoh: Pemahaman epistemologis sangat baik, argumentasi ontologi relevan dengan MPI."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewUtsStudentId(null)}
                  disabled={isGradingUts}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUtsFromReview}
                  disabled={isGradingUts}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isGradingUts ? 'Menyimpan...' : 'Simpan Nilai UTS'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. MODAL REVIEW & PENILAIAN UAS (VIDEO KELOMPOK AI) */}
      {reviewGroupId && (() => {
        const grp = (groups || []).find(g => g.id === reviewGroupId);
        const sub = grp?.submission;
        const ytEmbed = getYouTubeEmbedUrl(sub?.videoUrl);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Video size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-900">
                        Review Video Proyek UAS: {grp?.name}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        Pertemuan 16 • UAS
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Judul: <span className="font-semibold text-slate-800">"{grp?.title}"</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAutoGradeGroup(reviewGroupId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-xs"
                    title="Hitung skor & feedback otomatis berdasarkan kelengkapan berkas video dan AI tools"
                  >
                    <Zap size={13} className="fill-white" />
                    <span>Nilai Otomatis (Rekomendasi AI)</span>
                  </button>
                  <button
                    onClick={() => setReviewGroupId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Anggota Kelompok */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-1">Anggota Tim:</span>
                <div className="flex flex-wrap gap-1.5">
                  {grp?.members.map((m, idx) => (
                    <span key={idx} className="bg-white px-2.5 py-1 rounded-md border border-slate-200 font-medium text-slate-800">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Player Video / Preview Media */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Media Video Proyek Edukasi:
                </span>
                
                {ytEmbed ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-300 shadow-sm bg-black">
                    <iframe
                      src={ytEmbed}
                      title="Video Proyek Mahasiswa"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : sub?.videoUrl ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-slate-900 block">Tautan Video Terdaftar:</span>
                      <span className="text-slate-500 text-[11px] truncate max-w-md block">{sub.videoUrl}</span>
                    </div>
                    <a
                      href={sub.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <ExternalLink size={14} />
                      <span>Buka Video di Tab Baru</span>
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                    Kelompok ini belum mengunggah tautan video proyek.
                  </div>
                )}

                {/* Additional Links: Canva & Google Drive */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {sub?.canvaUrl && (
                    <a
                      href={sub.canvaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Buka Slide Canva Tim</span>
                    </a>
                  )}
                  {sub?.driveUrl && (
                    <a
                      href={sub.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                    >
                      <ExternalLink size={13} />
                      <span>Buka Google Drive Tim</span>
                    </a>
                  )}
                </div>
              </div>

              {/* AI Tools & Catatan */}
              {sub && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Perangkat AI yang Digunakan:</span>
                    <span className="text-slate-800">{sub.aiToolsUsed || 'ChatGPT, Canva, CapCut, ElevenLabs'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Sinopsis / Catatan:</span>
                    <span className="text-slate-600 italic">{sub.summaryNotes || '-'}</span>
                  </div>
                </div>
              )}

              {/* Rubric Breakdown if Auto-Graded */}
              {autoGradingInfo && autoGradingInfo.type === 'uas' && (
                <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1.5 animate-in fade-in">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                    Kriteria Rubrik Proyek Video Terhitung:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {autoGradingInfo.breakdown.map((item, i) => (
                      <span key={i} className="text-[11px] font-semibold bg-white text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Nilai UAS & Feedback */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Nilai Video UAS (0 - 100):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={groupScoreInput}
                    onChange={e => setGroupScoreInput(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 text-base font-black text-indigo-950 rounded-lg border border-indigo-300 bg-white"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Catatan Evaluasi / Feedback Kelompok:
                  </label>
                  <input
                    type="text"
                    value={groupFeedbackInput}
                    onChange={e => setGroupFeedbackInput(e.target.value)}
                    placeholder="Contoh: Produksi video edukasi sangat kreatif, animasi visual tepat, pemanfaatan AI efektif."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReviewGroupId(null)}
                  disabled={isGradingGroup}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroupFromReview}
                  disabled={isGradingGroup}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isGradingGroup ? 'Menyimpan...' : 'Simpan Nilai Video UAS'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL EDIT DATA MAHASISWA */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Data Mahasiswa</h3>
                  <p className="text-xs text-slate-500">Perbarui nama, NIM, topik, dan kelompok mahasiswa</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap Mahasiswa
                </label>
                <input
                  type="text"
                  required
                  value={editStudentForm.name}
                  onChange={e => setEditStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: Fulan bin Fulan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIM
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.nim}
                    onChange={e => setEditStudentForm(prev => ({ ...prev, nim: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: 2420010001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelompok (1 - {groups?.length || 5})
                  </label>
                  <select
                    value={editStudentForm.groupId}
                    onChange={e => {
                      const newGid = Number(e.target.value);
                      const targetGrp = (groups || []).find(g => g.id === newGid);
                      setEditStudentForm(prev => ({
                        ...prev,
                        groupId: newGid,
                        groupName: targetGrp?.name || `KELOMPOK ${newGid}`,
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {(groups || []).map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Kelompok {g.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ubah Nama Kelompok <span className="text-[10px] text-indigo-600 font-normal">(Bisa dirubah saat ganti/pindah kelompok)</span>
                </label>
                <input
                  type="text"
                  value={editStudentForm.groupName || ''}
                  onChange={e => setEditStudentForm(prev => ({ ...prev, groupName: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase font-bold"
                  placeholder={`Contoh: KELOMPOK ${editStudentForm.groupId}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Pertemuan / RPS Part
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.rpsPart}
                    onChange={e => setEditStudentForm(prev => ({ ...prev, rpsPart: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Contoh: Part 01 / Pertemuan 1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Pertemuan (1 - 16)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    required
                    value={editStudentForm.meetingNumber}
                    onChange={e => setEditStudentForm(prev => ({ ...prev, meetingNumber: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Topik Kajian Presentasi Individu / RPS
                </label>
                <textarea
                  rows={2}
                  value={editStudentForm.topic}
                  onChange={e => setEditStudentForm(prev => ({ ...prev, topic: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Contoh: Filsafat Ilmu dan Perkembangan Paradigma Manajemen Pendidikan Islam"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={isSavingStudent}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingStudent}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={14} />
                  <span>{isSavingStudent ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS MAHASISWA DARI SIAKAD */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-100">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Mahasiswa dari SIAKAD</h3>
                <p className="text-xs text-slate-500">Aksi ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-rose-50 p-3 rounded-xl border border-rose-200">
              Apakah Anda yakin ingin menghapus data mahasiswa <strong>{studentToDelete.name}</strong> dari sistem? Seluruh riwayat nilai, tugas, dan absensi mahasiswa ini akan dihapus.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeletingStudent}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteStudent}
                disabled={isDeletingStudent}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Trash2 size={13} />
                <span>{isDeletingStudent ? 'Menghapus...' : 'Ya, Hapus Mahasiswa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BIODATA & BULK UPLOAD MAHASISWA */}
      <StudentBiodataModal
        isOpen={isBiodataModalOpen}
        onClose={() => setIsBiodataModalOpen(false)}
        students={students}
        isDosen={true}
        onRefreshData={onRefreshData}
      />

      {/* MODAL PRATINJAU DOKUMEN MAKALAH & TUGAS */}
      <DocumentPreviewModal
        isOpen={Boolean(docPreviewData)}
        onClose={() => setDocPreviewData(null)}
        data={docPreviewData}
        onOpenGrading={() => {
          if (docPreviewData) {
            const sub = (submissions || []).find(s => s.studentName === docPreviewData.studentName && (Number(s.meetingNumber) || 2) === docPreviewData.meetingNumber)
              || (submissions || []).find(s => s.studentName === docPreviewData.studentName);
            if (sub) {
              handleOpenReviewIndiv(sub);
            }
          }
        }}
      />

    </div>
  );
};
