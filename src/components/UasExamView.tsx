import React, { useState, useEffect } from 'react';
import { Student, UtsQuestion, UtsSubmission, GroupProject, ExamScheduleSettings } from '../types';
import {
  submitUasSubmissionApi,
  deleteUasSubmissionApi,
  saveUasQuestionsApi,
  syncUasQuestionsFromRpsApi,
  updateExamFormatApi,
  gradeUasSubmissionApi,
  submitGroupProject,
  resetGroupSubmissionApi,
  gradeGroupProject,
  addGroupMemberApi,
  removeGroupMemberApi,
  updateExamSettingsApi,
} from '../services/api';
import {
  FileQuestion,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Send,
  Printer,
  Edit3,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Plus,
  Trash2,
  X,
  Save,
  Video,
  Users,
  Youtube,
  Film,
  UserPlus,
  Lock,
  Unlock,
  Download,
  FileText,
} from 'lucide-react';
import { printExamSheetPdf, exportExamSheetToWord } from '../utils/documentExport';

interface UasExamViewProps {
  students?: Student[];
  currentStudent: Student | null;
  uasQuestions?: UtsQuestion[];
  uasSubmissions?: UtsSubmission[];
  uasFormat?: 'proyek_video' | 'esai';
  groups?: GroupProject[];
  isDosen?: boolean;
  examSettings?: ExamScheduleSettings;
  onRefreshData: () => Promise<void>;
  onSelectStudent?: (student: Student) => void;
  onOpenDosenLogin?: () => void;
}

export const UasExamView: React.FC<UasExamViewProps> = ({
  students = [],
  currentStudent,
  uasQuestions = [],
  uasSubmissions = [],
  uasFormat = 'proyek_video',
  groups = [],
  isDosen = false,
  examSettings,
  onRefreshData,
  onSelectStudent,
  onOpenDosenLogin,
}) => {
  const isExamOpen = examSettings?.isOpen ?? true;
  const [isTogglingLock, setIsTogglingLock] = useState(false);

  const handleToggleExamLock = async () => {
    setIsTogglingLock(true);
    try {
      const newStatus = !isExamOpen;
      const res = await updateExamSettingsApi({
        examType: 'uas',
        isOpen: newStatus,
        instructions: newStatus
          ? 'Ujian Akhir Semester (UAS) dibuka resmi oleh Dosen Pengampu.'
          : 'Ujian Akhir Semester (UAS) telah dikunci oleh Dosen Pengampu.',
      });
      if (res.success) {
        setSuccessMsg(`Status akses Ujian UAS berhasil diubah menjadi: ${newStatus ? 'DIBUKA' : 'DIKUNCI'}`);
        await onRefreshData().catch(() => {});
      } else {
        setErrorMsg(res.error || 'Gagal mengubah status akses ujian UAS');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi server.');
    } finally {
      setIsTogglingLock(false);
    }
  };
  const activeQuestions = uasQuestions || [];
  const activeSubmissions = uasSubmissions || [];

  const [activeTab, setActiveTab] = useState<'video' | 'soal' | 'kerjakan' | 'status' | 'kelola-dosen'>('video');
  const [selectedQuestionNumber, setSelectedQuestionNumber] = useState<number>(1);

  // Student UAS submission if in essay mode
  const studentSubmission = currentStudent
    ? (activeSubmissions || []).find(s => s.studentId === currentStudent.id)
    : null;

  // Answer states for essay questions
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (studentSubmission?.answers) {
      if (typeof studentSubmission.answers === 'string') {
        const str = (studentSubmission.answers as string).trim();
        if (str.startsWith('{') || str.startsWith('[')) {
          try { return JSON.parse(str); } catch { return {}; }
        }
        return {};
      }
      return studentSubmission.answers;
    }
    try {
      const draft = localStorage.getItem(`uas_draft_${currentStudent?.id}`);
      if (draft && (draft.trim().startsWith('{') || draft.trim().startsWith('['))) {
        return JSON.parse(draft);
      }
    } catch (e) {
      console.warn('Failed to parse UAS draft', e);
    }
    return {};
  });

  const [docLink, setDocLink] = useState<string>(studentSubmission?.docLink || '');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedTimestamp, setDraftSavedTimestamp] = useState<string | null>(null);

  // Question Management states (Dosen)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [qTitle, setQTitle] = useState('');
  const [qTopic, setQTopic] = useState('');
  const [qQuestion, setQQuestion] = useState('');
  const [qRubric, setQRubric] = useState('');
  const [qMaxScore, setQMaxScore] = useState(20);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);

  // Dosen Grading for individual essay
  const [selectedStudentForGrading, setSelectedStudentForGrading] = useState<string>(students?.[0]?.id || '');
  const [gradingScore, setGradingScore] = useState<number>(85);
  const [gradingFeedback, setGradingFeedback] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Group Video Project states
  const defaultGroupId = currentStudent?.groupId || 1;
  const [activeGroupId, setActiveGroupId] = useState<number>(defaultGroupId);
  const activeGroup = (groups || []).find(g => g.id === activeGroupId) || groups?.[0];

  const [videoUrl, setVideoUrl] = useState<string>(activeGroup?.submission?.videoUrl || '');
  const [aiToolsUsed, setAiToolsUsed] = useState<string>(activeGroup?.submission?.aiToolsUsed || '');
  const [summaryNotes, setSummaryNotes] = useState<string>(activeGroup?.submission?.summaryNotes || '');
  const [submittedBy, setSubmittedBy] = useState<string>(activeGroup?.submission?.submittedBy || currentStudent?.name || '');
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [groupGradeInput, setGroupGradeInput] = useState<number>(activeGroup?.grade || 85);
  const [groupFeedbackInput, setGroupFeedbackInput] = useState<string>(activeGroup?.feedback || '');
  const [isGradingGroup, setIsGradingGroup] = useState(false);

  // Reset state for group & individual UAS
  const [resettingGroupId, setResettingGroupId] = useState<number | null>(null);
  const [confirmResetGroupId, setConfirmResetGroupId] = useState<number | null>(null);
  const [resettingUasId, setResettingUasId] = useState<string | null>(null);
  const [confirmResetUasId, setConfirmResetUasId] = useState<string | null>(null);

  const handleResetGroupSubmission = async (groupId: number, groupName: string) => {
    setResettingGroupId(groupId);
    setErrorMsg(null);
    try {
      const res = await resetGroupSubmissionApi(groupId);
      if (res.success) {
        setSuccessMsg(`Status pengumpulan video proyek UAS kelompok "${groupName}" berhasil direset. Akses pengumpulan kini terbuka kembali untuk perbaikan.`);
        setConfirmResetGroupId(null);
        await onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal mereset pengumpulan kelompok.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setResettingGroupId(null);
    }
  };

  const handleResetUasSubmission = async (targetStudentId: string, studentName: string) => {
    setResettingUasId(targetStudentId);
    setErrorMsg(null);
    try {
      const res = await deleteUasSubmissionApi(targetStudentId);
      if (res.success) {
        setSuccessMsg(`Status tugas essay UAS mahasiswa ${studentName} berhasil direset. Akses pengumpulan terbuka kembali untuk perbaikan.`);
        setConfirmResetUasId(null);
        await onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal mereset tugas UAS mahasiswa.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setResettingUasId(null);
    }
  };

  // Group member add state
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Sync group form when activeGroup changes
  useEffect(() => {
    if (activeGroup) {
      setVideoUrl(activeGroup.submission?.videoUrl || '');
      setAiToolsUsed(activeGroup.submission?.aiToolsUsed || activeGroup.toolsSuggested || '');
      setSummaryNotes(activeGroup.submission?.summaryNotes || '');
      setSubmittedBy(activeGroup.submission?.submittedBy || currentStudent?.name || '');
      setGroupGradeInput(activeGroup.grade || 85);
      setGroupFeedbackInput(activeGroup.feedback || '');
    }
  }, [activeGroupId, activeGroup]);

  // Sync answers when student changes
  useEffect(() => {
    if (studentSubmission?.answers) {
      if (typeof studentSubmission.answers === 'string') {
        const str = (studentSubmission.answers as string).trim();
        if (str.startsWith('{') || str.startsWith('[')) {
          try { setAnswers(JSON.parse(str)); } catch { setAnswers({}); }
        } else {
          setAnswers({});
        }
      } else {
        setAnswers(studentSubmission.answers);
      }
      setDocLink(studentSubmission.docLink || '');
    } else if (currentStudent) {
      try {
        const draft = localStorage.getItem(`uas_draft_${currentStudent.id}`);
        if (draft && (draft.trim().startsWith('{') || draft.trim().startsWith('['))) {
          setAnswers(JSON.parse(draft));
        } else {
          setAnswers({});
        }
      } catch {
        setAnswers({});
      }
    }
  }, [currentStudent?.id, studentSubmission]);

  // Format state (support both video and essay for students and dosen)
  const [selectedFormat, setSelectedFormat] = useState<'proyek_video' | 'esai'>(uasFormat || 'proyek_video');

  useEffect(() => {
    if (uasFormat) {
      setSelectedFormat(uasFormat);
    }
  }, [uasFormat]);

  // Toggle Exam Format (accessible to both Mahasiswa for viewing/working and Dosen for setting default)
  const handleToggleFormat = async (newFormat: 'proyek_video' | 'esai') => {
    setSelectedFormat(newFormat);
    if (newFormat === 'esai' && activeTab === 'video') {
      setActiveTab('soal');
    } else if (newFormat === 'proyek_video') {
      setActiveTab('video');
    }

    if (isDosen) {
      try {
        const res = await updateExamFormatApi({ uasFormat: newFormat });
        if (res?.success) {
          setSuccessMsg(`Format resmi UAS berhasil disimpan: ${newFormat === 'esai' ? 'Soal Essay (Individu)' : 'Proyek Video (Kelompok)'}`);
          await onRefreshData().catch(() => { });
        } else {
          setErrorMsg('Gagal mengubah format UAS di server.');
        }
      } catch (err) {
        console.warn('handleToggleFormat UAS error:', err);
        setErrorMsg('Gagal terhubung ke server untuk mengubah format.');
      }
    } else {
      setSuccessMsg(`Format pengerjaan UAS beralih ke: ${newFormat === 'esai' ? 'Soal Essay Komprehensif (Individu)' : 'Proyek Video Pembelajaran AI (Kelompok)'}`);
    }
  };

  // Question Add/Edit (Dosen)
  const handleOpenAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQTitle('');
    setQTopic('');
    setQQuestion('');
    setQRubric('');
    setQMaxScore(20);
  };

  const handleOpenEditQuestion = (q: UtsQuestion) => {
    setEditingQuestionId(q.id);
    setIsAddingQuestion(true);
    setQTitle(q.title);
    setQTopic(q.topic);
    setQQuestion(q.question);
    setQRubric(q.rubric || '');
    setQMaxScore(q.maxScore || 20);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qQuestion.trim()) {
      setErrorMsg('Judul dan Teks Soal UAS wajib diisi.');
      return;
    }

    setIsSavingQuestions(true);
    setErrorMsg(null);
    try {
      let updatedList: UtsQuestion[] = [...activeQuestions];
      if (editingQuestionId !== null) {
        updatedList = updatedList.map(item =>
          item.id === editingQuestionId
            ? {
              ...item,
              title: qTitle.trim(),
              topic: qTopic.trim(),
              question: qQuestion.trim(),
              rubric: qRubric.trim(),
              maxScore: Number(qMaxScore),
            }
            : item
        );
      } else {
        const nextNum = updatedList.length > 0 ? Math.max(...updatedList.map(q => q.number)) + 1 : 1;
        const newQ: UtsQuestion = {
          id: Date.now(),
          number: nextNum,
          title: qTitle.trim(),
          topic: qTopic.trim(),
          question: qQuestion.trim(),
          rubric: qRubric.trim(),
          maxScore: Number(qMaxScore),
        };
        updatedList.push(newQ);
      }

      const res = await saveUasQuestionsApi(updatedList);
      if (res.success) {
        setSuccessMsg(editingQuestionId !== null ? 'Soal UAS berhasil diperbarui!' : 'Soal UAS baru berhasil ditambahkan!');
        setIsAddingQuestion(false);
        setEditingQuestionId(null);
        await onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan soal UAS.');
      }
    } catch {
      setErrorMsg('Terjadi kendala saat menyimpan soal UAS.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (activeQuestions.length <= 1) {
      setErrorMsg('Minimal harus ada 1 soal essay dalam UAS.');
      return;
    }

    setIsSavingQuestions(true);
    try {
      const updatedList = activeQuestions
        .filter(q => q.id !== id)
        .map((q, idx) => ({ ...q, number: idx + 1 }));

      const res = await saveUasQuestionsApi(updatedList);
      if (res.success) {
        setSuccessMsg('Soal UAS berhasil dihapus.');
        setQuestionToDelete(null);
        await onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menghapus soal.');
      }
    } catch {
      setErrorMsg('Terjadi kendala saat menghapus soal UAS.');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const [isSyncingRps, setIsSyncingRps] = useState(false);

  // Sync & Auto-generate 5 Essay questions from RPS Meetings 9-15
  const handleSyncFromRps = async () => {
    setIsSyncingRps(true);
    setErrorMsg(null);
    try {
      const res = await syncUasQuestionsFromRpsApi();
      if (res.success && res.questions) {
        setSuccessMsg(res.message || 'Berhasil menyinkronkan 5 Soal Essay UAS sesuai materi RPS Pertemuan 9-15!');
        await onRefreshData();
      } else {
        setErrorMsg(res.error || 'Gagal menyinkronkan soal UAS dari RPS.');
      }
    } catch {
      setErrorMsg('Koneksi terputus saat menyinkronkan soal dari RPS.');
    } finally {
      setIsSyncingRps(false);
    }
  };

  // Print official exam sheet as PDF
  const handlePrintExamPdf = () => {
    printExamSheetPdf({
      examType: 'UAS',
      questions: activeQuestions,
      student: currentStudent || undefined,
      submission: studentSubmission || undefined,
      courseTitle: 'Filsafat Ilmu',
    });
  };

  // Export official exam sheet to Microsoft Word (.doc)
  const handleExportExamWord = () => {
    exportExamSheetToWord({
      examType: 'UAS',
      questions: activeQuestions,
      student: currentStudent || undefined,
      submission: studentSubmission || undefined,
      courseTitle: 'Filsafat Ilmu',
    });
  };

  // Answer change handler
  const handleAnswerChange = (qNum: number, text: string) => {
    const updated = { ...answers, [qNum]: text };
    setAnswers(updated);
    if (currentStudent) {
      try {
        localStorage.setItem(`uas_draft_${currentStudent.id}`, JSON.stringify(updated));
        setDraftSavedTimestamp(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {
        console.warn('Draft save error', e);
      }
    }
  };

  // Submit Individual UAS essay
  const handleSubmitUasEssay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExamOpen && !isDosen) {
      setErrorMsg('Ujian Akhir Semester (UAS) sedang dikunci oleh Dosen Pengampu. Mahasiswa hanya dapat mengumpulkan jawaban saat jam ujian resmi dibuka oleh dosen.');
      return;
    }
    if (!currentStudent) {
      setErrorMsg('Pilih nama mahasiswa Anda terlebih dahulu sebelum mengumpulkan tugas UAS.');
      return;
    }

    const answeredCount = Object.values(answers || {}).filter(a => typeof a === 'string' && a.trim().length > 10).length;
    if (answeredCount === 0 && !docLink.trim() && !uploadedFile) {
      setErrorMsg('Harap isi jawaban minimal pada salah satu soal essay atau cantumkan Link Dokumen jawaban UAS Anda.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await submitUasSubmissionApi({
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        answers,
        docLink: docLink.trim(),
        fileName: uploadedFile?.name,
        fileData: uploadedFile?.data,
      });

      if (res.success) {
        setSuccessMsg('Lembar Jawaban UAS (Individu) berhasil dikirim dan tersimpan otomatis ke SIAKAD!');
        await onRefreshData();
        setActiveTab('status');
      } else {
        setErrorMsg('Gagal mengirimkan lembar jawaban UAS.');
      }
    } catch {
      setErrorMsg('Terjadi gangguan jaringan saat pengiriman UAS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Group Video Project
  const handleSubmitGroupVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExamOpen && !isDosen) {
      setErrorMsg('Ujian Akhir Semester (UAS) sedang dikunci oleh Dosen Pengampu. Mahasiswa hanya dapat mengumpulkan jawaban saat jam ujian resmi dibuka oleh dosen.');
      return;
    }
    if (!videoUrl.trim()) {
      setErrorMsg('Harap cantumkan tautan Video YouTube atau Google Drive proyek UAS.');
      return;
    }

    setIsSubmittingGroup(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const ok = await submitGroupProject({
        groupId: activeGroupId,
        videoUrl: videoUrl.trim(),
        aiToolsUsed: aiToolsUsed.trim(),
        summaryNotes: summaryNotes.trim(),
        submittedBy: submittedBy.trim() || currentStudent?.name || 'Mahasiswa',
      });

      if (ok) {
        setSuccessMsg(`Proyek Video UAS ${activeGroup?.name || 'Kelompok'} berhasil dikirim!`);
        await onRefreshData();
      } else {
        setErrorMsg('Gagal mengirimkan proyek video UAS.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  // Grade Group Video UAS
  const handleGradeGroupVideo = async () => {
    if (!activeGroup) return;
    setIsGradingGroup(true);
    try {
      const ok = await gradeGroupProject(activeGroup.id, groupGradeInput, groupFeedbackInput, 'uas');
      if (ok) {
        setSuccessMsg(`Nilai UAS Video ${activeGroup.name} berhasil disimpan dan disinkronkan ke seluruh anggota kelompok!`);
        await onRefreshData();
      } else {
        setErrorMsg('Gagal menyimpan nilai video UAS.');
      }
    } catch {
      setErrorMsg('Terjadi kendala saat menyimpan nilai.');
    } finally {
      setIsGradingGroup(false);
    }
  };

  // Grade Individual UAS Essay
  const handleGradeStudentEssay = async () => {
    if (!selectedStudentForGrading) return;
    setIsSavingGrade(true);
    try {
      const ok = await gradeUasSubmissionApi({
        studentId: selectedStudentForGrading,
        grade: Number(gradingScore),
        feedback: gradingFeedback,
      });
      if (ok) {
        setSuccessMsg('Nilai UAS essay mahasiswa berhasil disimpan!');
        await onRefreshData();
      } else {
        setErrorMsg('Gagal menyimpan nilai UAS mahasiswa.');
      }
    } catch {
      setErrorMsg('Terjadi gangguan jaringan.');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Add Member to Group
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !activeGroup) return;
    setIsAddingMember(true);
    try {
      const ok = await addGroupMemberApi(activeGroup.id, newMemberName.trim());
      if (ok) {
        setSuccessMsg(`Anggota ${newMemberName.trim()} berhasil ditambahkan ke ${activeGroup.name}.`);
        setNewMemberName('');
        await onRefreshData();
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  // Remove Member from Group
  const handleRemoveMember = async (memberName: string) => {
    if (!activeGroup) return;
    const ok = await removeGroupMemberApi(activeGroup.id, memberName);
    if (ok) {
      setSuccessMsg(`Anggota ${memberName} berhasil dihapus dari ${activeGroup.name}.`);
      await onRefreshData();
    }
  };

  // Helper YouTube Embed
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes('youtube.com/watch?v=')) {
        const id = url.split('v=')[1]?.split('&')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.includes('youtube.com/embed/')) {
        return url;
      }
    } catch {
      return null;
    }
    return null;
  };

  const isVideoFormat = selectedFormat === 'proyek_video';

  return (
    <div className="space-y-6">
      {/* UAS Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-400/30 mb-2">
              <Award size={13} />
              <span>Evaluasi Akhir Semester (Pertemuan ke-16)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-title tracking-tight text-white flex items-center gap-2 flex-wrap">
              <span>Tugas Evaluasi UAS:</span>
              <span className="text-indigo-300">
                {isVideoFormat ? 'Proyek Video Pembelajaran AI (Kelompok)' : `${activeQuestions.length} Soal Essay Komprehensif (Individu)`}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-2xl leading-relaxed">
              Program Studi: <strong>Manajemen Pendidikan Islam (MPI 1)</strong> • Bobot Nilai: <strong>30% dari Nilai Akhir SIAKAD</strong>.
              Ketentuan: {isVideoFormat ? 'Tugas Proyek Video dikerjakan secara berkelompok (Kelompok).' : 'Soal Essay dikerjakan secara mandiri oleh setiap mahasiswa (Individu).'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDosen && (
              <button
                type="button"
                id="btn-uas-auto-generate-header"
                disabled={isSyncingRps}
                onClick={handleSyncFromRps}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-xs font-bold text-slate-950 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Buat & sinkronkan otomatis 5 soal essay UAS dari materi RPS Pertemuan 9-15"
              >
                <Sparkles size={14} className={isSyncingRps ? 'animate-spin' : ''} />
                <span>{isSyncingRps ? 'Menyinkronkan...' : '✨ Buat Soal Otomatis UAS'}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-uas-print-pdf"
              onClick={handlePrintExamPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-colors shadow-xs cursor-pointer"
              title="Cetak lembar soal & jawaban UAS ke PDF atau printer resmi"
            >
              <Printer size={14} />
              <span>Cetak PDF</span>
            </button>

            <button
              type="button"
              id="btn-uas-export-word"
              onClick={handleExportExamWord}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white border border-white/20 transition-colors shadow-xs cursor-pointer"
              title="Unduh naskah soal & jawaban UAS ke Microsoft Word (.doc)"
            >
              <Download size={14} />
              <span>Unduh Word</span>
            </button>

            {currentStudent && (
              <div className="bg-indigo-900/60 border border-indigo-500/40 px-3 py-1.5 rounded-xl text-xs text-right">
                <div className="text-[10px] text-indigo-300 uppercase font-semibold">
                  Mahasiswa ({isVideoFormat ? `Kelompok ${currentStudent.groupId || 1}` : 'Individu'}):
                </div>
                <div className="font-bold text-white truncate max-w-[150px]">{currentStudent.name}</div>
              </div>
            )}
          </div>
        </div>

        {/* Format Selector: Available for both Mahasiswa & Dosen */}
        <div className="mt-4 pt-3.5 border-t border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-indigo-300 font-semibold">Pilih Format Tugas UAS:</span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/20">
              <button
                type="button"
                id="btn-uas-video-format"
                onClick={() => handleToggleFormat('proyek_video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isVideoFormat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
              >
                <Video size={13} />
                <span>Format Proyek Video (Kelompok)</span>
              </button>
              <button
                type="button"
                id="btn-uas-essay-format"
                onClick={() => handleToggleFormat('esai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${!isVideoFormat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
              >
                <FileQuestion size={13} />
                <span>Format Soal Essay ({activeQuestions.length} Soal, Individu)</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-indigo-200/80 flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-300 shrink-0" />
            <span>
              {isDosen
                ? 'Mode Dosen: Klik format untuk menyimpan format default mata kuliah'
                : 'Tersedia 2 format: Video Kelompok & Soal Essay Individu'}
            </span>
          </div>
        </div>
      </div>

      {/* KONTROL AKSES UJIAN UAS (KUNCI / BUKA KUNCI DOSEN) */}
      <div className={`p-4 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${isExamOpen
        ? 'bg-gradient-to-r from-indigo-900/90 via-blue-900/90 to-slate-900 border-indigo-500/40 text-white'
        : 'bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border-rose-500/50 text-white'
        }`}>
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isExamOpen ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
            }`}>
            {isExamOpen ? <Unlock size={20} /> : <Lock size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isExamOpen ? 'bg-indigo-500 text-white' : 'bg-rose-600 text-white'
                }`}>
                {isExamOpen ? 'UJIAN UAS SEDANG DIBUKA' : 'UJIAN UAS DIKUNCI'}
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                {isExamOpen ? 'Mahasiswa Dapat Mengumpulkan Jawaban' : 'Formulir Pengumpulan Ditutup'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
              {isExamOpen
                ? 'Akses formulir ujian aktif. Mahasiswa dapat mengirimkan proyek video atau essay pada jam ujian resmi.'
                : 'Ujian UAS saat ini dikunci secara manual oleh Dosen Pengampu. Mahasiswa hanya bisa mengirimkan jawaban saat jam ujian resmi dibuka oleh dosen.'}
            </p>
          </div>
        </div>
        {isDosen && (
          <button
            type="button"
            disabled={isTogglingLock}
            onClick={handleToggleExamLock}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex-shrink-0 cursor-pointer ${isExamOpen
              ? 'bg-rose-500 hover:bg-rose-400 text-white'
              : 'bg-indigo-500 hover:bg-indigo-400 text-white'
              }`}
          >
            {isExamOpen ? <Lock size={15} /> : <Unlock size={15} />}
            <span>{isTogglingLock ? 'Memperbarui...' : (isExamOpen ? 'Kunci Ujian UAS Sekarang' : 'Buka Kunci Ujian UAS Sekarang')}</span>
          </button>
        )}
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CASE 1: UAS FORMAT IS PROYEK VIDEO (KELOMPOK)                             */}
      {/* ========================================================================= */}
      {isVideoFormat ? (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-950 font-bold">
              <Users size={16} className="text-indigo-700" />
              <span>Format UAS Aktif: Proyek Video Pembelajaran AI (Tugas Kelompok)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleFormat('esai')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileQuestion size={13} />
                <span>Beralih ke Soal Essay &rarr;</span>
              </button>
              <span className="text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full font-semibold">
                Tugas Kelompok
              </span>
            </div>
          </div>

          {/* Group Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(groups || []).map((grp) => {
              const isSelected = grp.id === activeGroupId;
              const hasSubmitted = !!grp.submission?.videoUrl;
              return (
                <button
                  key={grp.id}
                  onClick={() => setActiveGroupId(grp.id)}
                  className={`p-3 rounded-xl text-left border transition-all ${isSelected
                    ? 'bg-indigo-900 text-white border-indigo-950 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{grp.name}</span>
                    {hasSubmitted && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-300' : 'bg-emerald-500'}`} />
                    )}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {grp.title}
                  </div>
                  <div className={`text-[10px] mt-1 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {grp.members?.length || 0} Anggota
                  </div>
                </button>
              );
            })}
          </div>

          {/* Group Details & Submission Form */}
          {activeGroup && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Group Details & Members */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-sm text-slate-900">{activeGroup.name}</h3>
                    <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      UAS Video
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Tema Proyek Video:</span>
                    <p className="text-xs font-bold text-slate-800">{activeGroup.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{activeGroup.description}</p>
                  </div>

                  {activeGroup.toolsSuggested && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Rekomendasi Tools AI:</span>
                      <span className="inline-block text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold border border-indigo-200 mt-0.5">
                        {activeGroup.toolsSuggested}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Anggota Kelompok ({activeGroup.members?.length || 0}):
                      </span>
                    </div>

                    <div className="space-y-1">
                      {(activeGroup.members || []).map((m, idx) => (
                        <div key={idx} className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-slate-400" />
                            <span>{m}</span>
                          </div>
                          {isDosen && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m)}
                              className="text-slate-400 hover:text-rose-600 p-0.5"
                              title="Hapus anggota"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {isDosen && (
                      <form onSubmit={handleAddMember} className="pt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={e => setNewMemberName(e.target.value)}
                          placeholder="Tambah nama anggota..."
                          className="flex-1 px-2 py-1 text-xs rounded border border-slate-300"
                        />
                        <button
                          type="submit"
                          disabled={isAddingMember || !newMemberName.trim()}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-bold"
                        >
                          <UserPlus size={13} />
                        </button>
                      </form>
                    )}
                  </div>

                  {activeGroup.grade !== undefined && (
                    <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-300">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                          <Award size={14} className="text-indigo-700" />
                          Nilai UAS Video Kelompok:
                        </span>
                        <span className="text-base font-extrabold text-indigo-800">
                          {activeGroup.grade} / 100
                        </span>
                      </div>
                      {activeGroup.feedback && (
                        <p className="text-xs text-indigo-900 mt-1 italic bg-white/70 p-2 rounded border border-indigo-200">
                          "{activeGroup.feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Video Preview & Submission Form */}
              <div className="lg:col-span-2 space-y-4">
                {activeGroup.submission?.videoUrl && (
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Youtube size={18} className="text-rose-600" />
                        <h4 className="font-bold text-sm text-slate-900">
                          Preview Proyek Video UAS: {activeGroup.name}
                        </h4>
                      </div>
                      <a
                        href={activeGroup.submission.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        <span>Buka Link Video</span>
                      </a>
                    </div>

                    {getEmbedUrl(activeGroup.submission.videoUrl) ? (
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
                        <iframe
                          src={getEmbedUrl(activeGroup.submission.videoUrl)!}
                          title={`UAS Video ${activeGroup.name}`}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                        <span>Tautan Video Terunggah: <strong>{activeGroup.submission.videoUrl}</strong></span>
                        <a
                          href={activeGroup.submission.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-indigo-700 text-white rounded font-bold"
                        >
                          Tonton Video
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Submission Form */}
                {activeGroup.submission && !isDosen ? (
                  <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-xs space-y-4 animate-fadeIn">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Lock size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-700 text-white px-2.5 py-0.5 rounded-full">
                            FORMULIR TERKUNCI (SATU KALI KIRIM)
                          </span>
                          <span className="text-xs font-bold text-indigo-950">
                            {activeGroup.name}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-900 mt-1 leading-relaxed">
                          Tautan proyek video UAS kelompok Anda telah berhasil dikirimkan oleh{' '}
                          <strong>{activeGroup.submission.submittedBy || 'Perwakilan Kelompok'}</strong> pada{' '}
                          <strong>{new Date(activeGroup.submission.submittedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</strong>.
                        </p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Sesuai pedoman integritas akademik SIAKAD, formulir dikunci setelah berhasil dikirimkan demi menjaga keabsahan data evaluasi.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start gap-3">
                      <AlertCircle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-900 leading-relaxed">
                        <strong>Fitur Perbaikan (Revisi Proyek Video):</strong> Mahasiswa hanya dapat mengirimkan ulang video jika Dosen Pengampu telah <em>mereset</em> status pengumpulan kelompok ini di sistem. Silakan hubungi dosen pengampu Anda jika perbaikan diperlukan.
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Tautan Video:</span>
                        <a href={activeGroup.submission.videoUrl} target="_blank" rel="noreferrer" className="text-indigo-700 font-bold underline truncate max-w-md">
                          {activeGroup.submission.videoUrl}
                        </a>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Tools AI yang Digunakan:</span> {activeGroup.submission.aiToolsUsed || '-'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Sinopsis / Catatan Tim:</span> {activeGroup.submission.summaryNotes || '-'}
                      </div>
                    </div>
                  </div>
                ) : !isExamOpen && !isDosen ? (
                  <div className="bg-white rounded-2xl p-8 border border-rose-200 shadow-xs text-center space-y-3 animate-fadeIn">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                      <Lock size={28} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-3 py-1 rounded-full">
                        AKSES UJIAN UAS DIKUNCI
                      </span>
                      <h4 className="font-extrabold text-base text-slate-900 mt-2">Ujian Akhir Semester (UAS) Sedang Ditutup</h4>
                      <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
                        Dosen Pengampu telah mengunci akses pengumpulan ujian. Mahasiswa hanya dapat mengumpulkan proyek UAS pada jam ujian resmi saat tombol dibuka oleh dosen.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitGroupVideo} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Film size={18} className="text-indigo-700" />
                        <h4 className="font-bold text-base text-slate-900">
                          Form Pengumpulan Video UAS: {activeGroup.name}
                        </h4>
                      </div>
                      <span className="text-xs text-slate-500">
                        Pengunggah: {submittedBy || currentStudent?.name || 'Mahasiswa'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Link Video YouTube / Google Drive UAS *
                      </label>
                      <div className="relative">
                        <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          required
                          value={videoUrl}
                          onChange={e => setVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=... atau link Google Drive"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tools AI yang Digunakan
                        </label>
                        <input
                          type="text"
                          value={aiToolsUsed}
                          onChange={e => setAiToolsUsed(e.target.value)}
                          placeholder="Contoh: Canva AI, HeyGen, ChatGPT, ElevenLabs"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nama Perwakilan Pengirim
                        </label>
                        <input
                          type="text"
                          value={submittedBy}
                          onChange={e => setSubmittedBy(e.target.value)}
                          placeholder="Nama mahasiswa..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sinopsis Materi Video & Refleksi Integrasi AI
                      </label>
                      <textarea
                        rows={3}
                        value={summaryNotes}
                        onChange={e => setSummaryNotes(e.target.value)}
                        placeholder="Jelaskan secara ringkas isi materi video dan kontribusi tim..."
                        className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={isSubmittingGroup || (!isExamOpen && !isDosen)}
                        className="px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Send size={14} />
                        <span>
                          {isSubmittingGroup
                            ? 'Menyimpan...'
                            : !isExamOpen && !isDosen
                              ? 'Ujian UAS Sedang Dikunci'
                              : 'Kirim Video Proyek UAS (Satu Kali Kirim)'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Dosen Grading Box for Group Video */}
                {isDosen && (
                  <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                      <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                        <ShieldCheck size={16} className="text-indigo-700" />
                        <span>Penilaian Dosen: Proyek Video UAS {activeGroup.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeGroup.submission && (
                          <button
                            type="button"
                            disabled={resettingGroupId === activeGroup.id}
                            onClick={() => {
                              if (confirmResetGroupId === activeGroup.id) {
                                handleResetGroupSubmission(activeGroup.id, activeGroup.name);
                              } else {
                                setConfirmResetGroupId(activeGroup.id);
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${confirmResetGroupId === activeGroup.id
                              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                              : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              }`}
                            title="Reset pengumpulan video kelompok ini untuk membuka izin revisi"
                          >
                            {resettingGroupId === activeGroup.id
                              ? 'Mereset...'
                              : confirmResetGroupId === activeGroup.id
                                ? 'Yakin Reset Kelompok?'
                                : 'Reset / Buka Revisi'}
                          </button>
                        )}
                        <span className="text-xs text-indigo-700 font-semibold">Akses Dosen</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-indigo-950 mb-1">Nilai Video UAS (0-100)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={groupGradeInput}
                          onChange={e => setGroupGradeInput(Number(e.target.value))}
                          className="w-full p-2 bg-white rounded-lg border border-indigo-300 text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-indigo-950 mb-1">Catatan Evaluasi Dosen</label>
                        <input
                          type="text"
                          value={groupFeedbackInput}
                          onChange={e => setGroupFeedbackInput(e.target.value)}
                          placeholder="Catatan apresiasi atau masukan teknis video..."
                          className="w-full p-2 bg-white rounded-lg border border-indigo-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-[11px] text-indigo-800">
                        * Nilai ini akan otomatis disinkronkan ke nilai UAS seluruh anggota di dalam kelompok ini.
                      </p>
                      <button
                        type="button"
                        onClick={handleGradeGroupVideo}
                        disabled={isGradingGroup}
                        className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {isGradingGroup ? 'Menyimpan...' : 'Simpan Nilai Video UAS Kelompok'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* CASE 2: UAS FORMAT IS SOAL ESSAY (INDIVIDU)                               */
        /* ========================================================================= */
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-950 font-bold">
              <FileQuestion size={16} className="text-indigo-700" />
              <span>Format UAS Aktif: Soal Essay Komprehensif ({activeQuestions.length} Soal - Tugas Mandiri Individu)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleFormat('proyek_video')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Video size={13} />
                <span>Beralih ke Proyek Video &rarr;</span>
              </button>
              <span className="text-indigo-800 bg-indigo-100 px-2.5 py-1 rounded-full font-semibold">
                Tugas Mandiri
              </span>
            </div>
          </div>

          {/* Navigation Sub-tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveTab('soal')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${activeTab === 'soal'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <BookOpen size={14} />
                <span>1. Daftar Soal Essay UAS ({activeQuestions.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('kerjakan')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${activeTab === 'kerjakan'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Edit3 size={14} />
                <span>2. Lembar Jawaban (Individu)</span>
              </button>

              <button
                onClick={() => setActiveTab('status')}
                className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${activeTab === 'status'
                  ? 'bg-indigo-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Award size={14} />
                <span>3. Status & Nilai UAS Saya</span>
              </button>

              {isDosen && (
                <button
                  onClick={() => setActiveTab('kelola-dosen')}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all ${activeTab === 'kelola-dosen'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
                    }`}
                >
                  <ShieldCheck size={14} />
                  <span>4. Kelola Soal & Nilai (Dosen)</span>
                </button>
              )}
            </div>

            {isDosen && (
              <button
                type="button"
                onClick={handleOpenAddQuestion}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                <Plus size={14} />
                <span>+ Tambah Soal UAS</span>
              </button>
            )}
          </div>

          {/* Question Add/Edit Modal or Inline Form */}
          {isAddingQuestion && isDosen && (
            <form onSubmit={handleSaveQuestion} className="bg-indigo-50/80 border border-indigo-300 rounded-2xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <Edit3 size={16} className="text-indigo-700" />
                  <span>{editingQuestionId !== null ? 'Edit Soal Essay UAS' : 'Tambah Soal Essay UAS Baru'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingQuestion(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Pokok Bahasan Soal UAS *</label>
                  <input
                    type="text"
                    required
                    value={qTitle}
                    onChange={e => setQTitle(e.target.value)}
                    placeholder="Contoh: Rekonstruksi Paradigma Filsafat Ilmu MPI"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Skor (Maks)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={qMaxScore}
                    onChange={e => setQMaxScore(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topik / Ruang Lingkup Materi RPS</label>
                <input
                  type="text"
                  value={qTopic}
                  onChange={e => setQTopic(e.target.value)}
                  placeholder="Contoh: Rekonstruksi Paradigma Filsafat Ilmu MPI (Pertemuan 2, 4, 7, 15)"
                  className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teks Lengkap Soal Essay UAS *</label>
                <textarea
                  rows={4}
                  required
                  value={qQuestion}
                  onChange={e => setQQuestion(e.target.value)}
                  placeholder="Tuliskan pertanyaan essay UAS secara komprehensif, berbasis sintesis seluruh materi perkuliahan..."
                  className="w-full p-2.5 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Rubrik Penilaian / Kriteria Jawaban</label>
                <input
                  type="text"
                  value={qRubric}
                  onChange={e => setQRubric(e.target.value)}
                  placeholder="Contoh: Kedalaman integrasi ketiga pilar filosofis (10 poin), orisinalitas analisis (10 poin)"
                  className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-200">
                <button
                  type="button"
                  onClick={() => setIsAddingQuestion(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuestions}
                  className="px-4 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} />
                  <span>{isSavingQuestions ? 'Menyimpan...' : 'Simpan Soal UAS'}</span>
                </button>
              </div>
            </form>
          )}

          {/* SUB-TAB 1: DAFTAR SOAL ESSAY UAS */}
          {activeTab === 'soal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Naskah Soal Essay Evaluasi Akhir Semester ({activeQuestions.length} Soal - Tugas Individu)
                </span>
                {isDosen && (
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="inline-flex sm:hidden items-center gap-1 px-3 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-bold"
                  >
                    <Plus size={14} />
                    <span>+ Tambah Soal</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {activeQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-7 w-7 rounded-full bg-indigo-800 text-white text-xs font-extrabold flex items-center justify-center">
                          {q.number}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{q.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                          Bobot: {q.maxScore || 20} Poin
                        </span>
                        {isDosen && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditQuestion(q)}
                              className="p-1 text-slate-400 hover:text-indigo-700 rounded hover:bg-slate-100"
                              title="Edit Soal Ini"
                            >
                              <Edit3 size={14} />
                            </button>
                            {(activeQuestions?.length || 0) > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                                title="Hapus Soal Ini"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {q.topic && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        Cakupan Materi: <span className="text-slate-700 font-semibold">{q.topic}</span>
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                      {q.question}
                    </p>

                    {q.rubric && (
                      <div className="text-[11px] text-indigo-900 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-200 flex items-start gap-1.5">
                        <HelpCircle size={14} className="text-indigo-700 flex-shrink-0 mt-0.5" />
                        <span><strong>Rubrik Penilaian:</strong> {q.rubric}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('kerjakan')}
                  className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Buka Lembar Jawaban UAS</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: LEMBAR JAWABAN UAS (INDIVIDU) */}
          {activeTab === 'kerjakan' && (
            studentSubmission && !isDosen ? (
              <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-xs space-y-6 animate-fadeIn">
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Lock size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-800 text-white px-2.5 py-0.5 rounded-full">
                          FORMULIR TERKUNCI (SATU KALI KIRIM)
                        </span>
                        <span className="text-xs font-bold text-indigo-950">
                          {studentSubmission.studentName}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-900 mt-1 leading-relaxed">
                        Anda telah berhasil mengirimkan lembar jawaban UAS pada{' '}
                        <strong>
                          {new Date(studentSubmission.submittedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                        </strong>.
                      </p>
                      <p className="text-[11px] text-slate-600 mt-1">
                        Sesuai pedoman integritas akademik SIAKAD, formulir dikunci setelah pengiriman berhasil. Tidak ada pengiriman ganda.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('status')}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex-shrink-0"
                  >
                    Lihat Hasil Penilaian & Transkrip
                  </button>
                </div>

                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <strong>Fitur Perbaikan (Revisi Ujian):</strong> Apabila terjadi kesalahan substansial atau dokumen tertukar, mahasiswa hanya dapat mengirimkan ulang tugas jika Dosen Pengampu telah <em>menghapus atau mereset</em> status tugas sebelumnya di sistem. Hubungi dosen pengampu Anda untuk membuka kembali akses pengiriman.
                  </div>
                </div>

                {/* Preview of Submitted Answers */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileQuestion size={16} className="text-indigo-700" />
                      <span>Arsip Lembar Jawaban UAS yang Telah Terkirim:</span>
                    </h4>
                    <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      Tersimpan Permanen di SIAKAD
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {activeQuestions.map((q) => {
                      const ans = studentSubmission.answers?.[q.number] || '';
                      return (
                        <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Soal #{q.number}: {q.title}
                            </span>
                            <span className="text-[11px] font-bold text-indigo-700">
                              Maks {q.maxScore || 20} Poin
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed whitespace-pre-wrap">
                            {ans || '(Tidak ada uraian teks langsung, dilampirkan via dokumen)'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {(studentSubmission.docLink || studentSubmission.fileData) && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-xs font-bold text-slate-800 block">Lampiran Dokumen Tambahan:</span>
                      <div className="flex flex-wrap gap-2">
                        {studentSubmission.docLink && (
                          <a
                            href={studentSubmission.docLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-indigo-800"
                          >
                            <ExternalLink size={13} />
                            <span>Buka Dokumen Lampiran (Docs/Drive)</span>
                          </a>
                        )}
                        {studentSubmission.fileData && (
                          <a
                            href={studentSubmission.fileData}
                            download={studentSubmission.fileName || 'Jawaban_UAS.pdf'}
                            className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-blue-800"
                          >
                            <ExternalLink size={13} />
                            <span>Unduh File: {studentSubmission.fileName || 'Berkas Jawaban UAS'}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : !isExamOpen && !isDosen ? (
              <div className="bg-white rounded-2xl p-8 border border-rose-200 shadow-xs text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Lock size={32} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-3 py-1 rounded-full">
                    AKSES UJIAN UAS DIKUNCI
                  </span>
                  <h4 className="font-extrabold text-lg text-slate-900 mt-2">
                    Ujian Akhir Semester (UAS) Sedang Ditutup
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                    Dosen Pengampu telah mengunci formulir pengumpulan ujian UAS. Mahasiswa hanya dapat mengirimkan jawaban ujian pada jam ujian resmi saat tombol dibuka oleh dosen.
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 max-w-sm mx-auto">
                  Silakan pantau pengumuman dosen atau tunggu hingga jadwal ujian resmi dimulai.
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitUasEssay} className="space-y-6">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tugas Individu</span>
                      <h3 className="font-bold text-base text-slate-900">
                        Form Lembar Jawaban UAS Mahasiswa
                      </h3>
                    </div>
                    {draftSavedTimestamp && (
                      <span className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        Draft tersimpan otomatis: {draftSavedTimestamp}
                      </span>
                    )}
                  </div>

                  {/* Question Navigation Chips */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeQuestions.map((q) => {
                      const hasAnswer = (answers[q.number] || '').trim().length > 10;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setSelectedQuestionNumber(q.number)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedQuestionNumber === q.number
                            ? 'bg-indigo-800 text-white shadow-xs'
                            : hasAnswer
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          <span>Soal #{q.number}</span>
                          {hasAnswer && <CheckCircle2 size={12} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Question Box & Input */}
                  {activeQuestions
                    .filter(q => q.number === selectedQuestionNumber)
                    .map((q) => (
                      <div key={q.id} className="space-y-3 pt-2">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-1">
                            <span>Soal Nomor {q.number}: {q.title}</span>
                            <span className="text-indigo-700">Maks {q.maxScore || 20} Poin</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.question}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Uraian Jawaban Anda (Soal No. {q.number}) *
                          </label>
                          <textarea
                            rows={6}
                            value={answers[q.number] || ''}
                            onChange={e => handleAnswerChange(q.number, e.target.value)}
                            placeholder="Tuliskan jawaban komprehensif UAS Anda..."
                            className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Karakter: {(answers[q.number] || '').length}</span>
                            <span>Tersimpan otomatis ke draft lokal</span>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Optional Google Docs link or File Upload */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 pt-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <LinkIcon size={14} className="text-indigo-700" />
                      <span>Lampiran Dokumen Tambahan (Google Docs / PDF / Word) - Opsional</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Tautan Google Docs / Google Drive Lembar Jawaban
                        </label>
                        <input
                          type="url"
                          value={docLink}
                          onChange={e => setDocLink(e.target.value)}
                          placeholder="https://docs.google.com/document/d/..."
                          className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Unggah File Dokumen Jawaban (PDF / DOCX)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setUploadedFile({ name: file.name, data: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-700 file:text-white hover:file:bg-indigo-800 cursor-pointer"
                        />
                        {uploadedFile && (
                          <p className="text-xs text-indigo-800 font-semibold mt-1">
                            File terpilih: {uploadedFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      Mahasiswa: <strong>{currentStudent ? currentStudent.name : 'Pilih nama mahasiswa di atas'}</strong>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !currentStudent || (!isExamOpen && !isDosen)}
                      className="px-6 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Send size={14} />
                      <span>
                        {isSubmitting
                          ? 'Mengirimkan...'
                          : !isExamOpen && !isDosen
                            ? 'Ujian UAS Sedang Dikunci'
                            : 'Kirim Lembar Jawaban UAS (Satu Kali Kirim)'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            )
          )}

          {/* SUB-TAB 3: STATUS & HASIL PENILAIAN */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Transkrip Evaluasi UAS</span>
                    <h3 className="font-bold text-base text-slate-900">
                      Status Pengumpulan & Penilaian UAS (Individu)
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                    Semester Ganjil
                  </span>
                </div>

                {studentSubmission ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                            Lembar Jawaban UAS Berhasil Dikumpulkan
                          </h4>
                          <p className="text-[11px] text-indigo-800">
                            Waktu: {new Date(studentSubmission.submittedAt).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>

                      {studentSubmission.grade !== undefined ? (
                        <div className="text-right">
                          <span className="text-[10px] text-indigo-700 uppercase font-semibold block">Nilai UAS:</span>
                          <span className="text-2xl font-black text-indigo-900">{studentSubmission.grade} / 100</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
                          Menunggu Penilaian Dosen
                        </span>
                      )}
                    </div>

                    {/* AI Detection & Orisinalitas Card */}
                    {studentSubmission.aiDetectionScore !== undefined && (
                      <div className={`p-4 rounded-xl border ${studentSubmission.aiDetectionScore >= 50
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : studentSubmission.aiDetectionScore >= 25
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                          : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                        }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-black/10">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            {studentSubmission.aiDetectionScore >= 50 ? (
                              <ShieldAlert className="text-rose-600 shrink-0" size={18} />
                            ) : (
                              <ShieldCheck className="text-emerald-600 shrink-0" size={18} />
                            )}
                            <span>Sistem Deteksi Orisinalitas & Copas AI UAS SIAKAD</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black self-start sm:self-auto ${studentSubmission.aiDetectionScore >= 50
                            ? 'bg-rose-600 text-white'
                            : studentSubmission.aiDetectionScore >= 25
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-700 text-white'
                            }`}>
                            {studentSubmission.aiVerdict || (studentSubmission.aiDetectionScore >= 50 ? 'Terindikasi AI / Copas' : 'Orisinal Mahasiswa')} ({studentSubmission.aiDetectionScore}%)
                          </span>
                        </div>

                        <div className="pt-2 text-xs space-y-1.5">
                          {studentSubmission.aiAnalysisNotes && (
                            <p className="leading-relaxed">{studentSubmission.aiAnalysisNotes}</p>
                          )}
                          {studentSubmission.aiDetectedFlags && studentSubmission.aiDetectedFlags.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-black/5">
                              <span className="font-bold text-[11px] block mb-1">Frasa / Pola Khusus AI yang Teridentifikasi:</span>
                              <div className="flex flex-wrap gap-1">
                                {studentSubmission.aiDetectedFlags.map((flg, i) => (
                                  <span key={i} className="bg-white/80 border border-rose-300 text-rose-800 text-[10px] px-2 py-0.5 rounded font-mono">
                                    "{flg}"
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Auto-grading and Feedback */}
                    {studentSubmission.autoGraded && (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-indigo-600" />
                          <span>
                            <strong>Penilaian Otomatis Aktif:</strong> Lembar jawaban essay UAS telah diuji silang dengan rubrik dan silabus RPS.
                          </span>
                        </div>
                        <span className="font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                          {studentSubmission.grade} Poin
                        </span>
                      </div>
                    )}

                    {studentSubmission.feedback && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <span className="font-bold text-slate-800 block mb-1">Catatan Evaluasi:</span>
                        <p className="italic text-slate-700 bg-white p-2.5 rounded border border-slate-200">
                          "{studentSubmission.feedback}"
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Ringkasan Jawaban Soal Essay UAS Anda:
                      </h4>
                      {activeQuestions.map((q) => {
                        const ans = studentSubmission.answers?.[q.number] || '';
                        return (
                          <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                              <span>Soal No. {q.number}: {q.title}</span>
                              <span className="text-indigo-700 font-semibold">{q.maxScore || 20} Poin</span>
                            </div>
                            <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                              {ans || '(Tidak ada teks jawaban langsung, lihat dokumen lampiran)'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Anda Belum Mengumpulkan Tugas UAS</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Silakan buka tab "2. Lembar Jawaban (Individu)" untuk mulai mengerjakan soal essay UAS.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kerjakan')}
                      className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      Mulai Kerjakan Lembar Jawaban
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 4: KELOLA DOSEN (DOSEN ONLY) */}
          {activeTab === 'kelola-dosen' && isDosen && (
            <div className="space-y-6">
              {/* Question Management Box */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 size={18} className="text-indigo-700" />
                    <div>
                      <h3 className="font-bold text-base text-slate-900">
                        Kelola Naskah Soal Essay UAS ({activeQuestions.length} Soal)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Format soal essay dapat di-generate otomatis dari materi RPS (Pertemuan 9-15) atau dibuat & diedit secara manual.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncingRps}
                      onClick={handleSyncFromRps}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                      title="Otomatis sinkronkan dan buat 5 soal essay sesuai topik materi RPS Pertemuan 9-15"
                    >
                      <Sparkles size={14} className={isSyncingRps ? 'animate-spin text-indigo-700' : 'text-indigo-700'} />
                      <span>{isSyncingRps ? 'Menyinkronkan...' : 'Auto-Generate dari RPS (Ptm 9-15)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddQuestion}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={14} />
                      <span>+ Buat Soal Manual</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {activeQuestions.map((q) => (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Soal #{q.number}: {q.title}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                            {q.maxScore || 20} Poin
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1">{q.question}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditQuestion(q)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                        >
                          Edit
                        </button>
                        {activeQuestions.length > 1 && (
                          questionToDelete === q.id ? (
                            <div className="flex items-center gap-1 bg-rose-100 p-1 rounded-lg border border-rose-300">
                              <span className="text-[10px] text-rose-900 font-bold px-1">Yakin hapus?</span>
                              <button
                                type="button"
                                onClick={() => setQuestionToDelete(null)}
                                className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-slate-700 rounded hover:bg-slate-50"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                disabled={isSavingQuestions}
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded disabled:opacity-50"
                              >
                                Ya
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setQuestionToDelete(q.id)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                            >
                              Hapus
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rekap Pengumpulan & Deteksi AI Mahasiswa (Ternilai Otomatis) */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-indigo-700" />
                    <h3 className="font-bold text-base text-slate-900">
                      Rekap Pengumpulan & Deteksi AI Mahasiswa UAS (Ternilai Otomatis)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-800 bg-indigo-100 px-3 py-1 rounded-full">
                    {activeSubmissions.length} Mahasiswa Telah Mengumpulkan
                  </span>
                </div>

                {activeSubmissions.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    Belum ada mahasiswa yang mengumpulkan lembar jawaban UAS.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-extrabold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Nama Mahasiswa</th>
                          <th className="py-2.5 px-3 text-center">Nilai UAS</th>
                          <th className="py-2.5 px-3 text-center">Status Orisinalitas / AI</th>
                          <th className="py-2.5 px-3">Indikator Frasa AI</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeSubmissions.map((sub, idx) => {
                          const aiScore = sub.aiDetectionScore ?? 0;
                          return (
                            <tr key={sub.id || idx} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-semibold text-slate-500">{idx + 1}</td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{sub.studentName}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="font-extrabold text-sm text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                                  {sub.grade !== undefined ? `${sub.grade} Poin` : '—'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${aiScore >= 50
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : aiScore >= 25
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  }`}>
                                  {aiScore >= 50 ? (
                                    <ShieldAlert size={12} className="text-rose-600" />
                                  ) : (
                                    <ShieldCheck size={12} className="text-emerald-600" />
                                  )}
                                  <span>{sub.aiVerdict || (aiScore >= 50 ? 'Terindikasi AI' : 'Orisinal')} ({aiScore}%)</span>
                                </span>
                              </td>
                              <td className="py-3 px-3 max-w-xs">
                                {sub.aiDetectedFlags && sub.aiDetectedFlags.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {sub.aiDetectedFlags.slice(0, 3).map((flg, fi) => (
                                      <span key={fi} className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded font-mono">
                                        "{flg}"
                                      </span>
                                    ))}
                                    {sub.aiDetectedFlags.length > 3 && (
                                      <span className="text-[10px] text-slate-400">+{sub.aiDetectedFlags.length - 3} lainnya</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Tidak ada frasa AI mencurigakan</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudentForGrading(sub.studentId);
                                      if (sub.grade !== undefined) setGradingScore(sub.grade);
                                      if (sub.feedback) setGradingFeedback(sub.feedback);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
                                  >
                                    Koreksi / Nilai
                                  </button>
                                  <button
                                    type="button"
                                    disabled={resettingUasId === sub.studentId}
                                    onClick={() => {
                                      if (confirmResetUasId === sub.studentId) {
                                        handleResetUasSubmission(sub.studentId, sub.studentName);
                                      } else {
                                        setConfirmResetUasId(sub.studentId);
                                      }
                                    }}
                                    className={`px-2 py-1 text-xs font-bold rounded-lg border transition-all ${confirmResetUasId === sub.studentId
                                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                                      : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                      }`}
                                    title="Reset tugas essay UAS mahasiswa ini untuk membuka kembali formulir perbaikan (revisi)"
                                  >
                                    {resettingUasId === sub.studentId
                                      ? 'Mereset...'
                                      : confirmResetUasId === sub.studentId
                                        ? 'Yakin Reset?'
                                        : 'Reset Revisi'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Individual Student Grading Panel */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award size={18} className="text-indigo-700" />
                    <h3 className="font-bold text-base text-slate-900">
                      Penilaian Lembar Jawaban UAS Mahasiswa (Individu)
                    </h3>
                  </div>
                  <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full font-semibold">
                    Akses Dosen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Mahasiswa</label>
                    <select
                      value={selectedStudentForGrading}
                      onChange={e => setSelectedStudentForGrading(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      {students.map(s => {
                        const hasSubmitted = activeSubmissions.some(sub => sub.studentId === s.id);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} {hasSubmitted ? '✓ (Terkumpul)' : '—'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nilai UAS (0-100)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={gradingScore}
                      onChange={e => setGradingScore(Number(e.target.value))}
                      className="w-full p-2 text-xs rounded-lg border border-slate-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Umpan Balik</label>
                    <input
                      type="text"
                      value={gradingFeedback}
                      onChange={e => setGradingFeedback(e.target.value)}
                      placeholder="Catatan hasil koreksi..."
                      className="w-full p-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGradeStudentEssay}
                    disabled={isSavingGrade}
                    className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    {isSavingGrade ? 'Menyimpan...' : 'Simpan Nilai UAS Mahasiswa'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
