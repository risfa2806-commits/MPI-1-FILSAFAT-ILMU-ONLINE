import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, IndividualSubmission, MeetingSchedule, StudentGrade } from '../types';
import {
  submitIndividualTask,
  deleteSubmissionApi,
  addStudentApi,
  addMeetingPresenterApi,
  removeMeetingPresenterApi,
  updateMeetingPresentationGroupApi,
  submitPeerReviewApi,
  swapMeetingPresentersApi,
  updateStudentApi,
} from '../services/api';
import { DocumentPreviewModal, DocumentPreviewData } from './DocumentPreviewModal';
import {
  FileText,
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink,
  Download,
  AlertCircle,
  AlertTriangle,
  User,
  Save,
  Clock,
  Sparkles,
  Award,
  Trash2,
  UserPlus,
  Plus,
  X,
  Users,
  Check,
  Lock,
  Unlock,
  Search,
  Printer,
  Eye,
  RotateCcw,
  Presentation,
  Star,
  MessageSquare,
  Send,
  Calendar,
  ChevronRight,
  BookOpen,
  ArrowRightLeft,
  Edit2,
  Edit3,
} from 'lucide-react';

interface IndividualTaskViewProps {
  students: Student[];
  currentStudent: Student | null;
  submissions: IndividualSubmission[];
  grades?: Record<string, StudentGrade>;
  meetings?: MeetingSchedule[];
  onRefreshData: () => Promise<void>;
  onSelectStudent: (student: Student) => void;
  selectedStudentForTask?: Student | null;
  isDosen?: boolean;
}

export const IndividualTaskView: React.FC<IndividualTaskViewProps> = ({
  students = [],
  currentStudent,
  submissions = [],
  grades = {},
  meetings = [],
  onRefreshData,
  onSelectStudent,
  selectedStudentForTask,
  isDosen = false,
}) => {
  // Target student for task viewing/uploading: defaults to current logged in student or first student
  const [activeTargetId, setActiveTargetId] = useState<string>(
    selectedStudentForTask?.id || currentStudent?.id || students?.[0]?.id || ''
  );

  useEffect(() => {
    if (selectedStudentForTask) {
      setActiveTargetId(selectedStudentForTask.id);
    } else if (currentStudent) {
      setActiveTargetId(currentStudent.id);
    }
  }, [selectedStudentForTask, currentStudent]);

  // List of available presentation meetings (Pertemuan 2 through 16)
  const availableMeetings = useMemo(() => {
    if (meetings && meetings.length > 0) {
      const filtered = meetings.filter(m => m.meetingNumber >= 2);
      if (filtered.length > 0) return filtered;
    }
    return Array.from({ length: 15 }, (_, i) => ({
      meetingNumber: i + 2,
      dateStr: `Pertemuan ${i + 2}`,
      isoDate: '',
      title: i + 2 === 8 ? 'Ujian Tengah Semester (UTS) - Sintesis Materi Filsafat' : i + 2 === 16 ? 'Ujian Akhir Semester (UAS) - Laporan / Proyek Video' : `Kajian Filsafat Ilmu Pertemuan ${i + 2}`,
      presenters: [],
      partCodes: [`Pertemuan ${i + 2}`],
      type: i + 2 === 8 ? 'uts' : i + 2 === 16 ? 'uas' : 'kuliah',
    })) as MeetingSchedule[];
  }, [meetings]);

  const targetStudent = (students || []).find(s => s.id === activeTargetId) || students?.[0];

  // Active meeting selected for uploading or reviewing task: defaults to selectedStudentForTask, currentStudent, or student assigned meeting
  const [selectedMeetingNumber, setSelectedMeetingNumber] = useState<number>(() => {
    return selectedStudentForTask?.meetingNumber || currentStudent?.meetingNumber || targetStudent?.meetingNumber || 2;
  });

  // State to permit students to edit / replace existing un-graded submission
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [docPreviewData, setDocPreviewData] = useState<DocumentPreviewData | null>(null);

  // When external student selection explicitly arrives, update meeting
  useEffect(() => {
    if (selectedStudentForTask?.meetingNumber) {
      setSelectedMeetingNumber(selectedStudentForTask.meetingNumber);
      setIsEditingExisting(false);
    }
  }, [selectedStudentForTask?.id, selectedStudentForTask?.meetingNumber]);

  // Reset editing mode whenever meeting number changes
  useEffect(() => {
    setIsEditingExisting(false);
  }, [selectedMeetingNumber]);

  // Persistent local submission overrides to update UI immediately upon submission,
  // ensure the locked state and submitted status persist across re-renders without UI mismatch.
  const [localSubmissions, setLocalSubmissions] = useState<IndividualSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('siakad_local_submissions_v1');
      if (saved && (saved.trim().startsWith('{') || saved.trim().startsWith('['))) {
        return JSON.parse(saved);
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const sanitized = localSubmissions.map(sub => {
        const copy = { ...sub };
        if (copy.pptFileData && copy.pptFileData.startsWith('data:') && copy.pptFileData.length > 50000) {
          copy.pptFileData = '';
        }
        if (copy.makalahFileData && copy.makalahFileData.startsWith('data:') && copy.makalahFileData.length > 50000) {
          copy.makalahFileData = '';
        }
        return copy;
      });
      localStorage.setItem('siakad_local_submissions_v1', JSON.stringify(sanitized));
    } catch (e) {
      console.error(e);
    }
  }, [localSubmissions]);

  // Merge server submissions and local submissions per student AND per meeting
  // SERVER SUBMISSION AND SERVER GRADES ARE ALWAYS AUTHORITATIVE!
  const effectiveSubmissions = useMemo(() => {
    const list = [...(submissions || [])];
    localSubmissions.forEach(localSub => {
      const targetMeeting = Number(localSub.meetingNumber) || 2;
      const idx = list.findIndex(s =>
        (s.id && localSub.id && s.id === localSub.id) ||
        (s.studentId === localSub.studentId && (Number(s.meetingNumber) || 2) === targetMeeting)
      );
      if (idx >= 0) {
        // Crucial fix: preserve server grade, feedback, and gradedAt over un-graded local overrides
        list[idx] = {
          ...localSub,
          ...list[idx],
          grade: list[idx].grade !== undefined ? list[idx].grade : localSub.grade,
          feedback: list[idx].feedback || localSub.feedback,
          gradedAt: list[idx].gradedAt || localSub.gradedAt,
        };
      } else {
        list.unshift(localSub);
      }
    });
    return list;
  }, [submissions, localSubmissions]);

  const currentMeetingSchedule = useMemo(() => {
    return (meetings || []).find(m => m.meetingNumber === selectedMeetingNumber)
      || availableMeetings.find(m => m.meetingNumber === selectedMeetingNumber);
  }, [meetings, availableMeetings, selectedMeetingNumber]);

  // All submissions by this target student across all meetings
  const targetStudentSubmissions = useMemo(() => {
    if (!targetStudent) return [];
    return (effectiveSubmissions || []).filter(s =>
      s.studentId === targetStudent.id ||
      (Boolean(targetStudent.nim) && Boolean(s.nim) && s.nim === targetStudent.nim) ||
      (Boolean(s.studentName) && s.studentName.toLowerCase().trim() === targetStudent.name.toLowerCase().trim())
    );
  }, [effectiveSubmissions, targetStudent]);

  // Submission for the active student in the currently selected meeting
  const existingSubmission = useMemo(() => {
    if (!targetStudent) return undefined;
    return (effectiveSubmissions || []).find(s =>
      s.studentId === targetStudent.id && (Number(s.meetingNumber) || 2) === selectedMeetingNumber
    ) || (effectiveSubmissions || []).find(s =>
      (Number(s.meetingNumber) || 2) === selectedMeetingNumber && (
        (Boolean(targetStudent.nim) && Boolean(s.nim) && s.nim === targetStudent.nim) ||
        (Boolean(s.studentName) && s.studentName.toLowerCase().trim() === targetStudent.name.toLowerCase().trim())
      )
    );
  }, [effectiveSubmissions, targetStudent, selectedMeetingNumber]);

  // Effective grade from either submission or grades table fallback (hanya jika mahasiswa telah mengirimkan tugas)
  const currentGradeObj = grades[targetStudent?.id || ''];
  const hasSubmitted = Boolean(existingSubmission);
  const effectiveGrade = (existingSubmission && existingSubmission.grade !== undefined)
    ? existingSubmission.grade
    : (hasSubmitted && selectedMeetingNumber === (targetStudent?.meetingNumber || 2) && currentGradeObj?.individualScore !== undefined && currentGradeObj.individualScore > 0 && existingSubmission?.feedback
        ? currentGradeObj.individualScore
        : undefined);
  const effectiveFeedback = existingSubmission?.feedback || (effectiveGrade !== undefined ? currentGradeObj?.notes : undefined);
  const hasEffectiveGrade = effectiveGrade !== undefined && effectiveGrade > 0;

  // Meeting Presenters (Kelompok PPT/Makalah di pertemuan ini)
  const meetingPresenters = useMemo(() => {
    return (students || []).filter(
      s => (Number(s.meetingNumber) || 2) === selectedMeetingNumber
    );
  }, [students, selectedMeetingNumber]);

  // Verifikasi apakah mahasiswa yang sedang aktif/login ditugaskan di pertemuan yang dipilih ini
  const isAssignedToThisMeeting = useMemo(() => {
    if (isDosen) return true; // Dosen bebas membuka/mengelola semua pertemuan
    if (!currentStudent) return true; // Jika tidak ada profil mahasiswa spesifik yang login, jangan memblokir secara global

    const studentMeeting = Number(currentStudent.meetingNumber) || 2;
    if (studentMeeting === selectedMeetingNumber) return true;

    // Cek apakah tercantum dalam daftar presenters jadwal pertemuan RPS
    const isListedInSchedule = (currentMeetingSchedule?.presenters || []).some(
      p => p.trim().toLowerCase() === currentStudent.name.trim().toLowerCase()
    );
    if (isListedInSchedule) return true;

    // Cek apakah tercantum dalam mahasiswa pemakalah pertemuan ini
    const isPresenter = (meetingPresenters || []).some(
      p => p.id === currentStudent.id || p.name.trim().toLowerCase() === currentStudent.name.trim().toLowerCase()
    );
    if (isPresenter) return true;

    return false;
  }, [isDosen, currentStudent, selectedMeetingNumber, currentMeetingSchedule, meetingPresenters]);

  // Verifikasi apakah mahasiswa memilih profil mahasiswa lain (bukan namanya sendiri)
  const isIdentityMismatch = useMemo(() => {
    if (isDosen) return false; // Dosen boleh mengelola tugas atas nama mahasiswa
    if (!currentStudent || !targetStudent) return false;
    return targetStudent.id !== currentStudent.id;
  }, [isDosen, currentStudent, targetStudent]);

  // Mahasiswa membuka form pertemuan yang bukan jatah/kamar tugasnya
  const isSalahKamar = useMemo(() => {
    if (isDosen) return false;
    if (!currentStudent) return false;
    return !isAssignedToThisMeeting;
  }, [isDosen, currentStudent, isAssignedToThisMeeting]);

  // Helper untuk beralih kembali ke akun / nama mahasiswa sendiri
  const handleSwitchToMyAccount = () => {
    if (currentStudent) {
      setActiveTargetId(currentStudent.id);
      onSelectStudent(currentStudent);
      if (currentStudent.meetingNumber) {
        setSelectedMeetingNumber(currentStudent.meetingNumber);
      }
      setIsEditingExisting(false);
      setErrorMsg(null);
    }
  };

  // Helper untuk beralih kembali ke kamar pertemuan yang sesuai jadwal sendiri
  const handleSwitchToMyMeeting = () => {
    if (currentStudent?.meetingNumber) {
      setSelectedMeetingNumber(currentStudent.meetingNumber);
      setIsEditingExisting(false);
      setErrorMsg(null);
    }
  };

  // Form states
  const [pptType, setPptType] = useState<'link' | 'file'>(existingSubmission?.pptType || 'link');
  const [pptUrl, setPptUrl] = useState<string>(existingSubmission?.pptUrl || '');
  const [pptFileName, setPptFileName] = useState<string>(existingSubmission?.pptFileName || '');
  const [pptFileData, setPptFileData] = useState<string>(existingSubmission?.pptFileData || '');

  const [makalahType, setMakalahType] = useState<'link' | 'file'>(existingSubmission?.makalahType || 'link');
  const [makalahUrl, setMakalahUrl] = useState<string>(existingSubmission?.makalahUrl || '');
  const [makalahFileName, setMakalahFileName] = useState<string>(existingSubmission?.makalahFileName || '');
  const [makalahFileData, setMakalahFileData] = useState<string>(existingSubmission?.makalahFileData || '');

  // Choice: 'both' | 'ppt_only' | 'makalah_only'
  const [submissionChoice, setSubmissionChoice] = useState<'both' | 'ppt_only' | 'makalah_only'>(
    existingSubmission?.submissionChoice || 'both'
  );

  // Toggle/Tab Format Tugas: 'all' | 'file_pdf' | 'file_ppt' | 'input_link'
  const [activeFormatTab, setActiveFormatTab] = useState<'all' | 'file_pdf' | 'file_ppt' | 'input_link'>('all');

  const handleSelectFormatTab = (tab: 'all' | 'file_pdf' | 'file_ppt' | 'input_link') => {
    setActiveFormatTab(tab);
    if (tab === 'file_pdf') {
      setSubmissionChoice('makalah_only');
      setMakalahType('file');
    } else if (tab === 'file_ppt') {
      setSubmissionChoice('ppt_only');
      setPptType('file');
    } else if (tab === 'input_link') {
      setSubmissionChoice('both');
      setPptType('link');
      setMakalahType('link');
    } else if (tab === 'all') {
      setSubmissionChoice('both');
    }
  };

  const [notes, setNotes] = useState<string>(existingSubmission?.notes || '');
  const [partnerName, setPartnerName] = useState<string>(existingSubmission?.partnerName || '');
  const [presentationType, setPresentationType] = useState<'individu' | 'kelompok'>(
    currentMeetingSchedule?.presentationFormat || existingSubmission?.presentationType || 'individu'
  );
  const [topic, setTopic] = useState<string>(existingSubmission?.topic || targetStudent?.topic || '');
  const [viewMode, setViewMode] = useState<'form' | 'gallery'>('form');
  const [gallerySearch, setGallerySearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Peer review modal states (Review presentasi teman sekelas)
  const [reviewingSubmission, setReviewingSubmission] = useState<IndividualSubmission | null>(null);
  const [peerRating, setPeerRating] = useState<number>(5);
  const [peerComment, setPeerComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendPeerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingSubmission) return;
    const cleanComment = peerComment.trim();
    if (!cleanComment) {
      setReviewFeedback({ type: 'error', text: 'Silakan tulis komentar atau ulasan presentasi terlebih dahulu.' });
      return;
    }
    setIsSubmittingReview(true);
    setReviewFeedback(null);
    try {
      const reviewerName = currentStudent?.name || (isDosen ? 'Dosen Pengampu' : 'Rekan Mahasiswa');
      const reviewerId = currentStudent?.id || (isDosen ? 'dosen' : 'mhs');
      const res = await submitPeerReviewApi(reviewingSubmission.id, {
        reviewerId,
        reviewerName,
        rating: peerRating,
        comment: cleanComment,
      });
      if (res.success) {
        setReviewFeedback({ type: 'success', text: 'Ulasan presentasi berhasil dikirim dan tersimpan di database SIAKAD!' });
        setPeerComment('');
        const newRev = {
          id: `pr-${Date.now()}`,
          reviewerId,
          reviewerName,
          rating: peerRating,
          comment: cleanComment,
          createdAt: new Date().toISOString(),
        };
        setReviewingSubmission(prev => {
          if (!prev) return null;
          return {
            ...prev,
            peerReviews: [newRev, ...(prev.peerReviews || [])],
          };
        });
        setLocalSubmissions(prev =>
          prev.map(sub =>
            sub.id === reviewingSubmission.id
              ? { ...sub, peerReviews: [newRev, ...(sub.peerReviews || [])] }
              : sub
          )
        );
        await onRefreshData().catch(() => {});
      } else {
        setReviewFeedback({ type: 'error', text: res.error || 'Gagal mengirim ulasan.' });
      }
    } catch (err: any) {
      setReviewFeedback({ type: 'error', text: err?.message || 'Terjadi gangguan jaringan.' });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Add student form state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdNim, setNewStdNim] = useState('');
  const [newStdRpsPart, setNewStdRpsPart] = useState('');
  const [newStdTopic, setNewStdTopic] = useState('');
  const [newStdMeeting, setNewStdMeeting] = useState(2);
  const [newStdGroupId, setNewStdGroupId] = useState(1);
  const [isAddingNewStd, setIsAddingNewStd] = useState(false);
  const [addStdFeedback, setAddStdFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName.trim()) {
      setAddStdFeedback({ type: 'error', text: 'Nama mahasiswa wajib diisi.' });
      return;
    }
    setIsAddingNewStd(true);
    setAddStdFeedback(null);
    try {
      const created = await addStudentApi({
        name: newStdName.trim().toUpperCase(),
        nim: newStdNim.trim() || `2026${String((students?.length || 0) + 1).padStart(4, '0')}`,
        rpsPart: newStdRpsPart.trim() || `Part ${String((students?.length || 0) + 1).padStart(2, '0')}`,
        topic: newStdTopic.trim() || 'Telaah Mandiri Filsafat Ilmu MPI',
        meetingNumber: Number(newStdMeeting) || 2,
        groupId: Number(newStdGroupId) || 1,
      });
      if (created) {
        setAddStdFeedback({
          type: 'success',
          text: `Mahasiswa ${created.name} berhasil ditambahkan!`,
        });
        await onRefreshData().catch(() => {});
        setActiveTargetId(created.id);
        onSelectStudent(created);
        setNewStdName('');
        setNewStdNim('');
        setNewStdRpsPart('');
        setNewStdTopic('');
        setShowAddStudentModal(false);
      } else {
        setAddStdFeedback({ type: 'error', text: 'Gagal menambahkan mahasiswa baru.' });
      }
    } catch {
      setAddStdFeedback({ type: 'error', text: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsAddingNewStd(false);
    }
  };

  // Ref to track which submission/meeting/student was loaded into the form
  // to avoid polling re-renders wiping out user inputs
  const lastInitializedKeyRef = useRef<string>('');

  // When target student or selected meeting changes, reload form with existing submission if available
  useEffect(() => {
    const currentKey = `${activeTargetId || ''}_${selectedMeetingNumber}_${existingSubmission?.id || 'none'}`;
    if (lastInitializedKeyRef.current === currentKey) {
      return;
    }
    lastInitializedKeyRef.current = currentKey;

    if (existingSubmission) {
      setPptType(existingSubmission.pptType || 'link');
      setPptUrl(existingSubmission.pptUrl || '');
      setPptFileName(existingSubmission.pptFileName || '');
      setPptFileData(existingSubmission.pptFileData || '');

      setMakalahType(existingSubmission.makalahType || 'link');
      setMakalahUrl(existingSubmission.makalahUrl || '');
      setMakalahFileName(existingSubmission.makalahFileName || '');
      setMakalahFileData(existingSubmission.makalahFileData || '');

      setNotes(existingSubmission.notes || '');
      setPartnerName(existingSubmission.partnerName || '');
      setPresentationType(currentMeetingSchedule?.presentationFormat || existingSubmission.presentationType || 'individu');
      setTopic(existingSubmission.topic || currentMeetingSchedule?.title || targetStudent?.topic || '');
      setSubmissionChoice(existingSubmission.submissionChoice || 'both');
    } else {
      setPptType('link');
      setPptUrl('');
      setPptFileName('');
      setPptFileData('');
      setMakalahType('link');
      setMakalahUrl('');
      setMakalahFileName('');
      setMakalahFileData('');
      setNotes('');
      setPartnerName('');
      setPresentationType(currentMeetingSchedule?.presentationFormat || 'individu');
      setTopic(
        selectedMeetingNumber === targetStudent?.meetingNumber
          ? (targetStudent?.topic || currentMeetingSchedule?.title || '')
          : (currentMeetingSchedule?.title || targetStudent?.topic || `Materi Kajian Pertemuan ${selectedMeetingNumber}`)
      );
      setSubmissionChoice('both');
    }
    setSubmitSuccessMsg(null);
    setErrorMsg(null);
  }, [activeTargetId, selectedMeetingNumber, existingSubmission?.id]);

  // Handle PPT file upload
  const handlePptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg('Ukuran file PPT maksimal 20MB. Anda juga dapat menggunakan opsi Link Canva / Google Drive.');
      return;
    }

    setPptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPptFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Makalah file upload
  const handleMakalahFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Ukuran file Makalah maksimal 15MB.');
      return;
    }

    setMakalahFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setMakalahFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submission Confirmation Modal State
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);

  // Submit Handler - Triggers Confirmation Dialog first
  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitSuccessMsg(null);

    // Anti-impersonation: Mahasiswa tidak bisa mengirim tugas jika bukan namanya sendiri yang dipilih
    if (isIdentityMismatch) {
      setErrorMsg(
        `Pengumpulan Ditolak: Anda tidak dapat mengumpulkan tugas atas nama mahasiswa lain (${targetStudent.name}). Silakan beralih ke nama Anda sendiri (${currentStudent?.name}).`
      );
      return;
    }

    // Anti-salah kamar: Mahasiswa tidak bisa mengirim tugas jika salah kamar pertemuan
    if (isSalahKamar) {
      setErrorMsg(
        `Pengumpulan Ditolak (Salah Kamar): Anda membuka ruang Pertemuan #${selectedMeetingNumber}. Jadwal resmi presentasi Anda adalah Pertemuan #${currentStudent?.meetingNumber || 2}. Silakan beralih ke kamar pertemuan Anda.`
      );
      return;
    }

    // Validation based on submission choice
    const hasPpt = (pptType === 'link' && !!pptUrl.trim()) || (pptType === 'file' && !!pptFileData);
    const hasMakalah = (makalahType === 'link' && !!makalahUrl.trim()) || (makalahType === 'file' && !!makalahFileData);

    if (submissionChoice === 'ppt_only') {
      if (!hasPpt) {
        setErrorMsg('Harap masukkan link PPT / Canva atau upload file PPT Anda.');
        return;
      }
    } else if (submissionChoice === 'makalah_only') {
      if (!hasMakalah) {
        setErrorMsg('Harap masukkan link Makalah (Google Docs/Drive) atau upload file Makalah Anda.');
        return;
      }
    } else {
      // both: student chose both, or can provide at least one
      if (!hasPpt && !hasMakalah) {
        setErrorMsg('Harap unggah salah satu (PPT atau Makalah) atau keduanya sesuai pilihan Anda.');
        return;
      }
    }

    // Open Confirmation Modal to verify student and files
    setIsConfirmSubmitOpen(true);
  };

  // Confirmed Submission Execution
  const handleConfirmAndExecuteSubmit = async () => {
    setIsConfirmSubmitOpen(false);
    setErrorMsg(null);
    setSubmitSuccessMsg(null);

    if (isIdentityMismatch || isSalahKamar) {
      setErrorMsg('Pengumpulan dibatalkan: Akses terkunci karena bukan akun sendiri atau salah kamar pertemuan.');
      return;
    }

    setIsSubmitting(true);

    const currentRpsPart =
      selectedMeetingNumber === targetStudent.meetingNumber && targetStudent.rpsPart
        ? targetStudent.rpsPart
        : (currentMeetingSchedule?.partCodes?.[0] || `Pertemuan ${selectedMeetingNumber}`);

    const payload: IndividualSubmission = {
      id: existingSubmission?.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      rpsPart: currentRpsPart,
      topic: topic.trim() || currentMeetingSchedule?.title || targetStudent.topic,
      partnerName: partnerName.trim() || undefined,
      presentationType,
      meetingNumber: selectedMeetingNumber,
      submissionChoice,
      pptType,
      pptUrl: pptType === 'link' ? pptUrl.trim() : undefined,
      pptFileName: pptType === 'file' ? pptFileName : undefined,
      pptFileData: pptType === 'file' ? pptFileData : undefined,
      makalahType,
      makalahUrl: makalahType === 'link' ? makalahUrl.trim() : undefined,
      makalahFileName: makalahType === 'file' ? makalahFileName : undefined,
      makalahFileData: makalahType === 'file' ? makalahFileData : undefined,
      notes: notes.trim(),
      submittedAt: new Date().toISOString(),
      grade: existingSubmission?.grade,
      feedback: existingSubmission?.feedback,
    };

    // 1. Immediately update local state on user click so form locks and status flips to "Terkirim" without UI delay
    setLocalSubmissions(prev => {
      const filtered = prev.filter(
        s => s.id !== payload.id &&
        !(s.studentId === payload.studentId && (Number(s.meetingNumber) || 2) === selectedMeetingNumber)
      );
      return [payload, ...filtered];
    });

    try {
      // 2. Asynchronous database call to verify completion
      const result = await submitIndividualTask(payload);
      if (result.success) {
        lastInitializedKeyRef.current = '';
        setIsEditingExisting(false);
        setSubmitSuccessMsg(
          result.offlineStored
            ? `Tugas Pertemuan ${selectedMeetingNumber} berhasil disimpan di perangkat (Mode Offline) & akan disinkronkan otomatis ke dosen!`
            : `Tugas Pertemuan ${selectedMeetingNumber} berhasil dikirim dan tersimpan permanen di database! Dosen dapat langsung mengakses tugas Anda.`
        );
        // 3. Reconcile with server database
        await onRefreshData().catch(() => {});
      } else if (result.error) {
        setErrorMsg(result.error);
      } else {
        // Keep submission in local view so student work is never lost
        setIsEditingExisting(false);
        setSubmitSuccessMsg(`Tugas Pertemuan ${selectedMeetingNumber} tersimpan di penyimpanan lokal perangkat. Data aman dan tidak hilang.`);
      }
    } catch (err: any) {
      console.warn('Network notice during task submission:', err);
      // Keep submission in local view so student work is never lost
      setIsEditingExisting(false);
      setSubmitSuccessMsg(`Tugas Pertemuan ${selectedMeetingNumber} berhasil disimpan di perangkat lokal (Mode Cadangan).`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dosen deletion action (if lecturer is viewing this task page)
  const [isDosenDeleting, setIsDosenDeleting] = useState(false);
  const [isConfirmingDeleteSub, setIsConfirmingDeleteSub] = useState(false);

  const handleExecuteDosenDeleteSubmission = async () => {
    if (!existingSubmission) return;
    const deletedId = existingSubmission.id;
    const deletedStudentId = targetStudent.id;
    const deletedMeetingNum = selectedMeetingNumber;
    const backupSubmission = existingSubmission;

    // 1. Immediately update local state so the form unlocks with ZERO delay
    setLocalSubmissions(prev => prev.filter(
      s => s.id !== deletedId &&
      !(s.studentId === deletedStudentId && (Number(s.meetingNumber) || 2) === deletedMeetingNum)
    ));
    setIsDosenDeleting(true);

    try {
      // 2. Asynchronous database call to verify completion
      await deleteSubmissionApi(deletedId, { part: 'all' });
      setSubmitSuccessMsg(
        `Tugas Pertemuan ${deletedMeetingNum} milik ${targetStudent.name} berhasil dihapus oleh Dosen. Akses pengunggahan kembali dibuka untuk mahasiswa.`
      );
      setIsConfirmingDeleteSub(false);
      await onRefreshData().catch(() => {});
    } catch {
      // Revert if database delete failed
      setLocalSubmissions(prev => [backupSubmission, ...prev]);
      setErrorMsg('Gagal menghapus tugas mahasiswa di database.');
    } finally {
      setIsDosenDeleting(false);
    }
  };

  // Group format is determined directly by presentationType ('kelompok' vs 'individu')
  const isGroupFormat = presentationType === 'kelompok';
  const [showAddPresenterModal, setShowAddPresenterModal] = useState(false);
  const [selectedStudentIdToAdd, setSelectedStudentIdToAdd] = useState('');
  const [customStudentNameToAdd, setCustomStudentNameToAdd] = useState('');
  const [customNimToAdd, setCustomNimToAdd] = useState('');
  const [isAddingPresenter, setIsAddingPresenter] = useState(false);
  const [presenterActionMsg, setPresenterActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Meeting Presentation Group Name state
  const [showEditMeetingGroupNameModal, setShowEditMeetingGroupNameModal] = useState(false);
  const [editingMeetingGroupName, setEditingMeetingGroupName] = useState('');
  const [isSavingMeetingGroupName, setIsSavingMeetingGroupName] = useState(false);

  const handleOpenEditMeetingGroupName = () => {
    setEditingMeetingGroupName(currentMeetingSchedule?.groupName || `Kelompok Pertemuan #${selectedMeetingNumber}`);
    setShowEditMeetingGroupNameModal(true);
  };

  const handleSaveMeetingGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetingGroupName.trim()) return;
    setIsSavingMeetingGroupName(true);
    try {
      await updateMeetingPresentationGroupApi(selectedMeetingNumber, {
        groupName: editingMeetingGroupName.trim().toUpperCase(),
      });
      if (currentMeetingSchedule) {
        currentMeetingSchedule.groupName = editingMeetingGroupName.trim().toUpperCase();
      }
      await onRefreshData().catch(() => {});
      setShowEditMeetingGroupNameModal(false);
    } finally {
      setIsSavingMeetingGroupName(false);
    }
  };

  // Edit Student Name state (sinkronisasi data mahasiswa SIAKAD)
  const [editingStudentInMeeting, setEditingStudentInMeeting] = useState<{ id: string; originalName: string; currentName: string; nim?: string } | null>(null);
  const [isSavingStudentName, setIsSavingStudentName] = useState(false);
  const [editStudentNameMsg, setEditStudentNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveStudentName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentInMeeting || !editingStudentInMeeting.currentName.trim()) return;
    setIsSavingStudentName(true);
    setEditStudentNameMsg(null);
    try {
      const newNameUpper = editingStudentInMeeting.currentName.trim().toUpperCase();
      const origNameUpper = editingStudentInMeeting.originalName.trim().toUpperCase();
      
      // Update student in database
      await updateStudentApi(editingStudentInMeeting.id, {
        name: newNameUpper,
      });

      // Update presenters array in meeting if listed
      const curPres = currentMeetingSchedule?.presenters || [];
      const updatedPres = curPres.map(p => p.trim().toUpperCase() === origNameUpper ? newNameUpper : p);
      await updateMeetingPresentationGroupApi(selectedMeetingNumber, {
        presenters: updatedPres,
      });

      setEditStudentNameMsg({ type: 'success', text: 'Nama mahasiswa berhasil diperbarui di data mahasiswa & sistem!' });
      await onRefreshData().catch(() => {});
      setTimeout(() => {
        setEditingStudentInMeeting(null);
        setEditStudentNameMsg(null);
      }, 1000);
    } catch (err: any) {
      setEditStudentNameMsg({ type: 'error', text: err?.message || 'Gagal mengubah nama mahasiswa.' });
    } finally {
      setIsSavingStudentName(false);
    }
  };

  // Swap Presenters state (HANYA DOSEN: "hanya dosen yang bisa menukar")
  const [showSwapPresenterModal, setShowSwapPresenterModal] = useState(false);
  const [swapStudent1, setSwapStudent1] = useState('');
  const [swapMeetingNum2, setSwapMeetingNum2] = useState<number>(
    selectedMeetingNumber === 2 ? 3 : 2
  );
  const [swapStudent2, setSwapStudent2] = useState('');
  const [isSwappingPresenter, setIsSwappingPresenter] = useState(false);
  const [swapPresenterMsg, setSwapPresenterMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenSwapPresenterModal = () => {
    const defaultS1 = meetingPresenters[0]?.name || '';
    const otherMeetings = (meetings || []).filter(
      m => m.meetingNumber >= 2 && m.meetingNumber <= 15 && m.meetingNumber !== selectedMeetingNumber
    );
    const targetMeetNum = otherMeetings[0]?.meetingNumber || (selectedMeetingNumber === 2 ? 3 : 2);
    const targetPresenters = (students || []).filter(s => (Number(s.meetingNumber) || 2) === targetMeetNum);
    const defaultS2 = targetPresenters[0]?.name || '';

    setSwapStudent1(defaultS1);
    setSwapMeetingNum2(targetMeetNum);
    setSwapStudent2(defaultS2);
    setSwapPresenterMsg(null);
    setShowSwapPresenterModal(true);
  };

  const handleExecuteSwapPresenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapStudent1 || !swapStudent2) {
      setSwapPresenterMsg({ type: 'error', text: 'Pilih mahasiswa dari kedua pertemuan yang ingin ditukar.' });
      return;
    }
    setIsSwappingPresenter(true);
    setSwapPresenterMsg(null);
    try {
      const res = await swapMeetingPresentersApi({
        meetingNumA: selectedMeetingNumber,
        studentNameA: swapStudent1,
        meetingNumB: swapMeetingNum2,
        studentNameB: swapStudent2,
      });
      if (res.success) {
        setSwapPresenterMsg({ type: 'success', text: res.message || 'Mahasiswa berhasil ditukar!' });
        await onRefreshData().catch(() => {});
        setTimeout(() => {
          setShowSwapPresenterModal(false);
          setSwapPresenterMsg(null);
        }, 1200);
      } else {
        setSwapPresenterMsg({ type: 'error', text: res.error || 'Gagal menukar mahasiswa.' });
      }
    } catch {
      setSwapPresenterMsg({ type: 'error', text: 'Gangguan jaringan saat menukar mahasiswa.' });
    } finally {
      setIsSwappingPresenter(false);
    }
  };

  // Check if any peer in this meeting group already submitted
  const peerSubmission = isGroupFormat && selectedMeetingNumber
    ? (effectiveSubmissions || []).find(
        sub =>
          (Number(sub.meetingNumber) || 2) === selectedMeetingNumber &&
          sub.studentId !== targetStudent.id &&
          (sub.pptUrl || sub.pptFileData || sub.makalahUrl || sub.makalahFileData)
      )
    : null;

  const handleAddPresenterToMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingPresenter(true);
    setPresenterActionMsg(null);
    try {
      const currentRpsPart =
        selectedMeetingNumber === targetStudent.meetingNumber && targetStudent.rpsPart
          ? targetStudent.rpsPart
          : (currentMeetingSchedule?.partCodes?.[0] || `Pertemuan ${selectedMeetingNumber}`);

      let payload: any = {
        presentationFormat: 'kelompok',
        topic: topic || currentMeetingSchedule?.title || targetStudent.topic,
        rpsPart: currentRpsPart,
      };
      if (selectedStudentIdToAdd) {
        payload.studentId = selectedStudentIdToAdd;
      } else if (customStudentNameToAdd.trim()) {
        payload.studentName = customStudentNameToAdd.trim();
        payload.nim = customNimToAdd.trim();
      } else {
        setPresenterActionMsg({ type: 'error', text: 'Pilih mahasiswa dari kelas atau ketik nama mahasiswa baru.' });
        setIsAddingPresenter(false);
        return;
      }

      const res = await addMeetingPresenterApi(selectedMeetingNumber, payload);
      if (res.success) {
        setPresenterActionMsg({ type: 'success', text: 'Mahasiswa berhasil ditambahkan ke kelompok presentasi ini!' });
        setSelectedStudentIdToAdd('');
        setCustomStudentNameToAdd('');
        setCustomNimToAdd('');
        setPresentationType('kelompok');
        setTimeout(() => {
          setShowAddPresenterModal(false);
          setPresenterActionMsg(null);
        }, 1200);
        await onRefreshData().catch(() => {});
      } else {
        setPresenterActionMsg({ type: 'error', text: res.error || 'Gagal menambahkan mahasiswa ke kelompok' });
      }
    } catch {
      setPresenterActionMsg({ type: 'error', text: 'Koneksi ke server bermasalah.' });
    } finally {
      setIsAddingPresenter(false);
    }
  };

  const handleRemovePresenterFromMeeting = async (studentName: string) => {
    try {
      const res = await removeMeetingPresenterApi(selectedMeetingNumber, studentName);
      if (res.success) {
        setSubmitSuccessMsg(`Mahasiswa ${studentName} berhasil dihapus dari kelompok presentasi.`);
        await onRefreshData().catch(() => {});
      } else {
        setErrorMsg(res.error || 'Gagal menghapus mahasiswa dari kelompok');
      }
    } catch {
      setErrorMsg('Koneksi ke server bermasalah saat menghapus mahasiswa.');
    }
  };

  const handleTogglePresentationFormat = async (fmt: 'individu' | 'kelompok') => {
    setPresentationType(fmt);
    if (currentMeetingSchedule) {
      currentMeetingSchedule.presentationFormat = fmt;
    }
    if (existingSubmission) {
      existingSubmission.presentationType = fmt;
    }
    setLocalSubmissions(prev =>
      prev.map(sub =>
        (Number(sub.meetingNumber) || 2) === selectedMeetingNumber
          ? { ...sub, presentationType: fmt }
          : sub
      )
    );
    try {
      await updateMeetingPresentationGroupApi(selectedMeetingNumber, {
        presentationFormat: fmt,
      });
      await onRefreshData().catch(() => {});
    } catch (e) {
      console.warn('Format update error:', e);
    }
  };

  const filteredGallerySubmissions = (effectiveSubmissions || []).filter(sub => {
    const q = gallerySearch.toLowerCase().trim();
    if (!q) return true;
    const std = students.find(s => s.id === sub.studentId);
    return (
      (sub.studentName && sub.studentName.toLowerCase().includes(q)) ||
      (std?.name && std.name.toLowerCase().includes(q)) ||
      (sub.nim && sub.nim.toLowerCase().includes(q)) ||
      (std?.nim && std.nim.toLowerCase().includes(q)) ||
      (sub.topic && sub.topic.toLowerCase().includes(q)) ||
      (std?.topic && std.topic.toLowerCase().includes(q)) ||
      (sub.partnerName && sub.partnerName.toLowerCase().includes(q)) ||
      (sub.notes && sub.notes.toLowerCase().includes(q)) ||
      (sub.rpsPart && sub.rpsPart.toLowerCase().includes(q)) ||
      (std?.rpsPart && std.rpsPart.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              <FileText size={13} />
              <span>Tugas Presentasi (Individu/Kelompok) Sesuai RPS</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-title">
              Pengumpulan Tugas Presentasi (Individu/Kelompok) (Pertemuan 2 s/d Pertemuan 15)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">
              Mahasiswa mengunggah Makalah dan Slide Presentasi PPT (file PPTX/PDF atau Link Canva) sesuai pembagian tugas (individu atau kelompok) oleh dosen. Tugas yang dikirim otomatis tersimpan dan langsung terhubung ke portal Dosen.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-900 max-w-xs">
            <div className="font-bold flex items-center gap-1.5 text-emerald-950 mb-1">
              <Sparkles size={14} className="text-emerald-700" />
              <span>Otomatis Tersimpan</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Tidak perlu tekan Ctrl+S. Setelah klik tombol <strong>Kirim</strong>, data langsung aman dan tersimpan di server & portal dosen.
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation: Form Tugas vs Galeri Peer Review & Unduh */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="tab-btn-form-tugas"
              type="button"
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'form'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileText size={14} />
              <span>Formulir Penyerahan Tugas</span>
            </button>
            <button
              id="tab-btn-galeri-tugas"
              type="button"
              onClick={() => setViewMode('gallery')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'gallery'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Users size={14} />
              <span>Galeri & Unduh PPT/Makalah Teman Sekelas</span>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                viewMode === 'gallery' ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-600 text-white'
              }`}>
                {effectiveSubmissions.length} Terkumpul
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {viewMode === 'form'
              ? '🔒 Aturan: Satu Kali Kirim (Revisi hanya jika direset oleh Dosen)'
              : '👥 Mahasiswa dapat meninjau, mereview & mengunduh berkas presentasi teman'}
          </div>
        </div>

        {/* Student Selector Quick Pills (Shown in Form Mode) */}
        {viewMode === 'form' && (
          <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pilih Mahasiswa untuk Melihat / Mengunggah Tugas:
            </label>
            {isDosen && (
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentModal(!showAddStudentModal);
                  setAddStdFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-xs w-fit"
              >
                {showAddStudentModal ? <X size={14} /> : <UserPlus size={14} />}
                <span>{showAddStudentModal ? 'Tutup Form' : '+ Tambah Mahasiswa Baru'}</span>
              </button>
            )}
          </div>

          {/* Add Student Success/Error Message */}
          {addStdFeedback && (
            <div
              className={`p-3 mb-3 rounded-xl text-xs flex items-center gap-2 ${
                addStdFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {addStdFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span>{addStdFeedback.text}</span>
            </div>
          )}

          {/* Add Student Inline Form (Hanya Dosen) */}
          {isDosen && showAddStudentModal && (
            <form
              onSubmit={handleCreateNewStudent}
              className="p-4 mb-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 text-xs shadow-xs animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                  <UserPlus size={16} className="text-emerald-700" />
                  <span>Daftarkan Mahasiswa Baru (Individu & Kelompok)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Nama Lengkap Mahasiswa *</label>
                  <input
                    type="text"
                    required
                    value={newStdName}
                    onChange={e => setNewStdName(e.target.value)}
                    placeholder="Contoh: AHMAD FAUZI"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">NIM (Nomor Induk Mahasiswa)</label>
                  <input
                    type="text"
                    value={newStdNim}
                    onChange={e => setNewStdNim(e.target.value)}
                    placeholder={`Contoh: 2026${String((students?.length || 0) + 1).padStart(4, '0')}`}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Bagian RPS (Part/Pertemuan)</label>
                  <input
                    type="text"
                    value={newStdRpsPart}
                    onChange={e => setNewStdRpsPart(e.target.value)}
                    placeholder={`Contoh: Part ${String((students?.length || 0) + 1).padStart(2, '0')} atau Pertemuan 15`}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Topik Makalah / Materi Kajian</label>
                  <input
                    type="text"
                    value={newStdTopic}
                    onChange={e => setNewStdTopic(e.target.value)}
                    placeholder="Contoh: Epistemologi & Landasan Filsafat Manajemen Pendidikan Islam"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Masuk Kelompok Video UAS (1-5)</label>
                  <select
                    value={newStdGroupId}
                    onChange={e => setNewStdGroupId(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value={1}>Kelompok 1 (Ontologi Filsafat)</option>
                    <option value={2}>Kelompok 2 (Epistemologi Keilmuan)</option>
                    <option value={3}>Kelompok 3 (Aksiologi & Etika)</option>
                    <option value={4}>Kelompok 4 (Kritik Paradigma)</option>
                    <option value={5}>Kelompok 5 (Masa Depan AI & Filsafat)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingNewStd || !newStdName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isAddingNewStd ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Simpan & Pilih Mahasiswa Ini</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {students.map((std) => {
              const hasSubmitted = effectiveSubmissions.some(s => s.studentId === std.id);
              const isSelected = std.id === activeTargetId;

              return (
                <button
                  type="button"
                  key={std.id}
                  onClick={() => {
                    setActiveTargetId(std.id);
                    onSelectStudent(std);
                    setSelectedMeetingNumber(std.meetingNumber || 2);
                    setIsEditingExisting(false);
                  }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs scale-[1.02]'
                      : hasSubmitted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>{std.rpsPart}</span>
                  <span className="font-normal opacity-80 truncate max-w-[90px] sm:max-w-[130px]">{std.name.split(' ')[0]}</span>
                  {hasSubmitted && <CheckCircle2 size={12} className={isSelected ? 'text-emerald-400' : 'text-emerald-600'} />}
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* VIEW MODE 1: GALERI & REVIEW TUGAS TEMAN SEKELAS */}
      {viewMode === 'gallery' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Gallery Header & Search Toolbar */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">
                    Galeri & Review Tugas Presentasi Rekan Mahasiswa
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mahasiswa dapat melihat materi kajian, mereview catatan, serta mengunduh berkas PPT dan Makalah milik teman sekelas.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200"
                >
                  <Printer size={14} />
                  <span>Cetak / PDF</span>
                </button>
                <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  {effectiveSubmissions.length} dari {students.length} Mahasiswa Terkumpul
                </span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={gallerySearch}
                onChange={e => setGallerySearch(e.target.value)}
                placeholder="Cari nama mahasiswa, NIM, materi kajian, atau part RPS..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              {gallerySearch && (
                <button
                  type="button"
                  onClick={() => setGallerySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Submissions Cards Grid */}
          {filteredGallerySubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <FileText size={28} />
              </div>
              <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                {gallerySearch ? 'Tidak Ada Tugas yang Cocok' : 'Belum Ada Tugas Presentasi yang Dikumpulkan'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {gallerySearch
                  ? 'Silakan coba kata kunci lain untuk mencari nama atau topik materi mahasiswa.'
                  : 'Mahasiswa yang telah mengunggah PPT dan Makalah akan otomatis tampil di galeri ini agar teman sekelas dapat membaca dan mengunduh berkasnya.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGallerySubmissions.map((sub, idx) => {
                const std = students.find(s => s.id === sub.studentId) || {
                  name: sub.studentName || 'Mahasiswa',
                  nim: sub.nim || '-',
                  rpsPart: `Part ${idx + 1}`,
                  topic: sub.topic || 'Topik Presentasi',
                  meetingNumber: sub.meetingNumber || 2,
                  groupId: 1,
                };

                return (
                  <div
                    key={sub.id || idx}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold bg-emerald-800 text-white px-2.5 py-0.5 rounded-md">
                            {sub.rpsPart || std.rpsPart || `Part ${idx + 1}`}
                          </span>
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            Pertemuan {sub.meetingNumber || std.meetingNumber || 2}
                          </span>
                          <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                            {sub.presentationType === 'kelompok' ? '👥 Kelompok' : '👤 Individu'}
                          </span>
                        </div>
                        {sub.grade !== undefined && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Award size={11} className="text-amber-700" />
                            Nilai: {sub.grade}
                          </span>
                        )}
                      </div>

                      {/* Presenter Name */}
                      <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                          {sub.studentName || std.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>NIM: {sub.nim || std.nim}</span>
                          {sub.partnerName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 font-medium">Rekan: {sub.partnerName}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Topic */}
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                          Topik Kajian:
                        </span>
                        <p className="font-semibold text-slate-800 leading-relaxed">
                          {sub.topic || std.topic}
                        </p>
                      </div>

                      {/* Notes */}
                      {sub.notes && (
                        <div className="text-xs text-slate-600 bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100 italic line-clamp-3">
                          "{sub.notes}"
                        </div>
                      )}

                      {/* Feedback */}
                      {sub.feedback && (
                        <div className="text-[11px] text-indigo-900 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100">
                          <strong className="text-indigo-950 font-bold block mb-0.5">Catatan Review Dosen:</strong>
                          <span>{sub.feedback}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions: PPT & Makalah */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        {sub.pptType === 'link' && sub.pptUrl ? (
                          <a
                            href={sub.pptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <ExternalLink size={13} />
                            <span>Buka Slide PPT</span>
                          </a>
                        ) : sub.pptFileData ? (
                          <a
                            href={sub.pptFileData}
                            download={sub.pptFileName || `PPT_${sub.studentName || 'Presentasi'}.pptx`}
                            className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Unduh PPT</span>
                          </a>
                        ) : (
                          <div className="flex-1 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs text-center font-medium italic">
                            Belum Ada PPT
                          </div>
                        )}

                        {sub.makalahType === 'link' && sub.makalahUrl ? (
                          <a
                            href={sub.makalahUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <ExternalLink size={13} />
                            <span>Buka Makalah</span>
                          </a>
                        ) : sub.makalahFileData ? (
                          <a
                            href={sub.makalahFileData}
                            download={sub.makalahFileName || `Makalah_${sub.studentName || 'Makalah'}.pdf`}
                            className="flex-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Download size={13} />
                            <span>Unduh Makalah</span>
                          </a>
                        ) : (
                          <div className="flex-1 px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs text-center font-medium italic">
                            Belum Ada Makalah
                          </div>
                        )}
                      </div>

                      {/* Peer Review Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingSubmission(sub);
                          setPeerRating(5);
                          setPeerComment('');
                          setReviewFeedback(null);
                        }}
                        className="w-full px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                      >
                        <Star size={13} className="text-amber-500 fill-amber-400" />
                        <span>Review Presentasi & Beri Masukan ({sub.peerReviews?.length || 0})</span>
                      </button>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>Dikirim: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tersimpan'}</span>
                        <span className="text-emerald-700 font-semibold">Tersimpan Permanen</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: FORM TUGAS MAHASISWA */}
      {viewMode === 'form' && targetStudent && (
        <div className="space-y-5">
          {/* BAR PILIH PERTEMUAN: Akses Seluruh Pertemuan (Pertemuan 2 s/d 16) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    <span>Pilih Pertemuan Tugas Presentasi (Pertemuan 2 s/d 16)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih pertemuan yang ingin dilihat atau diunggah berkas PPT & Makalahnya (saat ini aktif: <strong>Pertemuan {selectedMeetingNumber}</strong>).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1.5 shadow-2xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  {targetStudentSubmissions.length} Pertemuan Terkumpul
                </span>
              </div>
            </div>

            {/* Quick Pills for Meetings 2 to 16 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
              {availableMeetings.map(m => {
                const isSelected = m.meetingNumber === selectedMeetingNumber;
                const isAssignedToTarget = targetStudent.meetingNumber === m.meetingNumber;
                const isMyMeeting = Boolean(currentStudent && (Number(currentStudent.meetingNumber) || 2) === m.meetingNumber);
                const subForMeeting = (effectiveSubmissions || []).find(
                  s => s.studentId === targetStudent.id && (Number(s.meetingNumber) || 2) === m.meetingNumber
                );
                const hasSubmittedThis = Boolean(subForMeeting);

                return (
                  <button
                    key={m.meetingNumber}
                    type="button"
                    onClick={() => setSelectedMeetingNumber(m.meetingNumber)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex flex-col items-center gap-0.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm scale-105'
                        : hasSubmittedThis
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                        : isMyMeeting
                        ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                        : isAssignedToTarget
                        ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>Pertemuan {m.meetingNumber}</span>
                      {hasSubmittedThis ? (
                        <CheckCircle2 size={13} className={isSelected ? 'text-emerald-300' : 'text-emerald-600'} />
                      ) : isMyMeeting ? (
                        <span className="text-[10px] text-amber-600 font-extrabold">★</span>
                      ) : isAssignedToTarget ? (
                        <span className="text-[10px] text-amber-500">★</span>
                      ) : null}
                    </div>
                    <span className={`text-[10px] font-normal truncate max-w-[120px] ${
                      isSelected
                        ? 'text-emerald-100'
                        : hasSubmittedThis
                        ? 'text-emerald-700 font-semibold'
                        : isMyMeeting
                        ? 'text-amber-800 font-extrabold'
                        : 'text-slate-400'
                    }`}>
                      {hasSubmittedThis ? 'Terkirim ✓' : isMyMeeting ? '★ Kamar Anda' : isAssignedToTarget ? 'Jadwal Profil' : 'Buka Form'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: RPS Assignment Info Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold bg-emerald-800 text-white px-2.5 py-1 rounded-md">
                  Pertemuan {selectedMeetingNumber} ({currentMeetingSchedule?.partCodes?.[0] || `Part ${selectedMeetingNumber}`})
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Kelompok {targetStudent.groupId}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {targetStudent.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NIM: {targetStudent.nim} • Kelompok Video: Kelompok {targetStudent.groupId}
                </p>
                {currentMeetingSchedule?.dateStr && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Jadwal: {currentMeetingSchedule.dateStr}</span>
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Topik / Judul Materi Pertemuan #{selectedMeetingNumber}:
                  </span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                    "{existingSubmission?.topic || currentMeetingSchedule?.title || targetStudent.topic}"
                  </p>
                </div>
                {existingSubmission?.partnerName && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide block">
                      Rekan Teman Presentasi:
                    </span>
                    <p className="text-xs font-bold text-indigo-950">
                      👥 {existingSubmission.partnerName}
                    </p>
                  </div>
                )}
                {existingSubmission?.presentationType && (
                  <div className="text-[11px] text-slate-500">
                    Format: <span className="font-semibold text-slate-700">{existingSubmission.presentationType === 'kelompok' ? 'Presentasi Kelompok' : 'Presentasi Individu'}</span>
                  </div>
                )}
              </div>

              {/* Status Banner */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Status Tugas Pertemuan {selectedMeetingNumber}:</span>
                  {hasEffectiveGrade ? (
                    <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                      <Award size={13} className="text-emerald-700" /> Sudah Dinilai ({effectiveGrade}/100)
                    </span>
                  ) : existingSubmission ? (
                    <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 size={13} /> Terkirim (Menunggu Nilai)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Clock size={13} /> Belum Dikirim (Siap Upload)
                    </span>
                  )}
                </div>

                {existingSubmission?.submittedAt && (
                  <div className="text-[11px] text-slate-400 mt-1.5">
                    Waktu Kirim: {new Date(existingSubmission.submittedAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                )}

                {/* Dosen Quick Action: Hapus / Reset Tugas di Atas (mudah diakses tanpa scroll) */}
                {isDosen && existingSubmission && (
                  <div className="mt-2.5">
                    {!isConfirmingDeleteSub ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteSub(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors shadow-2xs cursor-pointer"
                        title={`Hapus / Reset tugas Pertemuan ${selectedMeetingNumber} mahasiswa ini (Akses Dosen)`}
                      >
                        <Trash2 size={13} />
                        <span>Hapus / Reset Pertemuan {selectedMeetingNumber} (Akses Dosen)</span>
                      </button>
                    ) : (
                      <div className="p-3 bg-rose-100/90 border border-rose-300 rounded-xl space-y-2 animate-fadeIn">
                        <p className="text-[11px] font-semibold text-rose-950">
                          Yakin hapus tugas Pertemuan {selectedMeetingNumber} milik <strong>{targetStudent.name}</strong>? Mahasiswa dapat mengunggah ulang.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingDeleteSub(false)}
                            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={isDosenDeleting}
                            onClick={handleExecuteDosenDeleteSubmission}
                            className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                          >
                            <Trash2 size={12} />
                            <span>{isDosenDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Identity Mismatch Badge */}
                {isIdentityMismatch && (
                  <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span className="truncate">Bukan Akun Anda: {targetStudent.name.split(' ')[0]}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchToMyAccount}
                      className="text-[10px] font-bold px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer shrink-0"
                    >
                      Pilih Saya
                    </button>
                  </div>
                )}

                {/* Salah Kamar Badge */}
                {isSalahKamar && (
                  <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <span className="truncate">Salah Kamar: Jadwal Anda P#{currentStudent?.meetingNumber || 2}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSwitchToMyMeeting}
                      className="text-[10px] font-bold px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded cursor-pointer shrink-0"
                    >
                      Pindah Kamar
                    </button>
                  </div>
                )}
              </div>

              {/* Dosen Grade & Feedback if available */}
              {hasEffectiveGrade && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 shadow-2xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Award size={15} className="text-emerald-700" />
                      Nilai Resmi Dosen Pengampu:
                    </span>
                    <span className="text-base font-black text-emerald-800 bg-emerald-200/90 px-2.5 py-0.5 rounded-lg border border-emerald-400">
                      {effectiveGrade} <span className="text-xs font-normal text-emerald-700">/ 100</span>
                    </span>
                  </div>
                  {effectiveFeedback && (
                    <p className="text-xs text-emerald-900 mt-1 italic bg-white/80 p-2.5 rounded-lg border border-emerald-200 leading-relaxed">
                      "{effectiveFeedback}"
                    </p>
                  )}
                  {existingSubmission?.gradedAt && (
                    <div className="text-[10px] text-emerald-700 font-medium">
                      Waktu Penilaian: {new Date(existingSubmission.gradedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>
              )}

              {/* All Meetings Progress for this student */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Riwayat Pengumpulan ({targetStudent.name.split(' ')[0]}):</span>
                  <span className="text-emerald-700 font-extrabold">{targetStudentSubmissions.length} Terkumpul</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableMeetings.map(m => {
                    const subM = targetStudentSubmissions.find(s => (Number(s.meetingNumber) || 2) === m.meetingNumber);
                    const isCur = m.meetingNumber === selectedMeetingNumber;
                    return (
                      <button
                        key={m.meetingNumber}
                        type="button"
                        onClick={() => setSelectedMeetingNumber(m.meetingNumber)}
                        className={`text-[10px] px-2 py-1 rounded-md font-bold transition-all border cursor-pointer ${
                          isCur
                            ? 'bg-slate-900 text-white border-slate-900 scale-105'
                            : subM
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`Pertemuan ${m.meetingNumber}: ${subM ? 'Terkirim (Nilai: ' + (subM.grade ?? 'Belum dinilai') + ')' : 'Belum Dikirim'}`}
                      >
                        P{m.meetingNumber} {subM ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Download / Open existing PPT buttons */}
              {existingSubmission && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-1">Akses File Terkirim (Pertemuan {selectedMeetingNumber}):</div>
                  
                  {existingSubmission.pptType === 'link' && existingSubmission.pptUrl && (
                    <a
                      href={existingSubmission.pptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={14} />
                      <span>Buka Link PPT / Canva</span>
                    </a>
                  )}

                  {existingSubmission.pptType === 'file' && existingSubmission.pptFileData && (
                    <a
                      href={existingSubmission.pptFileData}
                      download={existingSubmission.pptFileName || `PPT-Pertemuan-${selectedMeetingNumber}.pptx`}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      <Download size={14} />
                      <span>Download File PPT ({existingSubmission.pptFileName || 'PPT'})</span>
                    </a>
                  )}

                  {existingSubmission.makalahType === 'link' && existingSubmission.makalahUrl && (
                    <a
                      href={existingSubmission.makalahUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink size={14} />
                      <span>Buka Link Makalah</span>
                    </a>
                  )}

                  {existingSubmission.makalahType === 'file' && existingSubmission.makalahFileData && (
                    <a
                      href={existingSubmission.makalahFileData}
                      download={existingSubmission.makalahFileName || `Makalah-Pertemuan-${selectedMeetingNumber}.pdf`}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200 transition-colors"
                    >
                      <Download size={14} />
                      <span>Download File Makalah</span>
                    </a>
                  )}

                  {/* Mahasiswa / Dosen: Edit / Perbarui Tugas (Revisi) */}
                  {(!existingSubmission.grade || isDosen) && (
                    <button
                      type="button"
                      id="btn-edit-tugas-left-col"
                      onClick={() => setIsEditingExisting(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors cursor-pointer shadow-xs active:scale-95"
                      title="Perbarui link atau unggah ulang file tugas pertemuan ini"
                    >
                      <Edit3 size={14} />
                      <span>Perbarui / Upload Ulang (Revisi)</span>
                    </button>
                  )}

                  {/* Dosen Only: Delete / Reset Submission */}
                  {isDosen && (
                    <div className="pt-2">
                      {!isConfirmingDeleteSub ? (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDeleteSub(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                          title={`Hapus tugas pertemuan ${selectedMeetingNumber} mahasiswa ini (Akses Dosen)`}
                        >
                          <Trash2 size={14} />
                          <span>Hapus / Reset Pertemuan {selectedMeetingNumber} (Akses Dosen)</span>
                        </button>
                      ) : (
                        <div className="p-3 bg-rose-100/90 border border-rose-300 rounded-xl space-y-2">
                          <p className="text-[11px] font-semibold text-rose-950">
                            Yakin hapus tugas Pertemuan {selectedMeetingNumber} milik <strong>{targetStudent.name}</strong>? Mahasiswa dapat mengunggah ulang.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsConfirmingDeleteSub(false)}
                              className="flex-1 py-1 px-2 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isDosenDeleting}
                              onClick={handleExecuteDosenDeleteSubmission}
                              className="flex-1 py-1 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 size={12} />
                              <span>{isDosenDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Upload Form OR Locked Submission View */}
          <div className="lg:col-span-2">
            {existingSubmission && !isDosen && !isEditingExisting ? (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-emerald-700" />
                    <h3 className="font-bold text-base text-slate-900">
                      Tugas Terkirim: Pertemuan {selectedMeetingNumber} ({existingSubmission.rpsPart || currentMeetingSchedule?.partCodes?.[0] || 'RPS'})
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    Tugas Pertemuan {selectedMeetingNumber} Telah Dikirim
                  </span>
                </div>

                {/* Graded by Lecturer Notification Banner */}
                {hasEffectiveGrade && (
                  <div className="p-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-xl shadow-md border border-emerald-400/40 flex items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
                        <Award size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                            SUDAH DINILAI DOSEN
                          </span>
                          <span className="text-xs text-emerald-200 font-semibold">
                            Nilai Dosen: <strong className="text-sm text-yellow-300 font-extrabold">{effectiveGrade}</strong> / 100
                          </span>
                        </div>
                        <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                          {effectiveFeedback
                            ? `Catatan Dosen: "${effectiveFeedback}"`
                            : 'Tugas presentasi telah diverifikasi dan dinilai permanen oleh Dosen Pengampu.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Notice / Single-Submission Lock Enforcement */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      <span>Status Pengumpulan: Berkas Pertemuan {selectedMeetingNumber} Tersimpan Permanen</span>
                    </div>
                    <span className="text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <Lock size={11} />
                      Formulir Terkunci (Satu Kali Kirim)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tugas presentasi Anda untuk <strong>Pertemuan {selectedMeetingNumber} ({existingSubmission.rpsPart || currentMeetingSchedule?.partCodes?.[0] || 'RPS'})</strong> telah tercatat dan tersimpan secara permanen di basis data SIAKAD.
                  </p>

                  <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Lock size={16} className="text-slate-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Aturan Satu Kali Kirim:</strong> Formulir pengiriman terkunci dan tidak dapat diubah oleh mahasiswa. Jika Anda memerlukan perbaikan (revisi), silakan hubungi Dosen Pengampu untuk menghapus/mereset status tugas ini di portal dosen.
                      </div>
                    </div>

                    {isDosen && (
                      <button
                        type="button"
                        id="btn-dosen-reset-tugas-pertemuan"
                        disabled={isDosenDeleting}
                        onClick={handleExecuteDosenDeleteSubmission}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        title="Buka akses pengiriman ulang untuk mahasiswa ini dengan mereset data tugas"
                      >
                        <Trash2 size={13} />
                        <span>{isDosenDeleting ? 'Mereset...' : 'Dosen: Buka Akses Revisi (Reset Tugas)'}</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    {/* Mahasiswa / Dosen: Edit / Upload Ulang Berkas Tugas (Revisi) */}
                    {(!existingSubmission.grade || isDosen) && (
                      <button
                        type="button"
                        id="btn-edit-tugas-main-panel"
                        onClick={() => setIsEditingExisting(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Buka form untuk mengganti file atau link tugas pertemuan ini"
                      >
                        <Edit3 size={14} />
                        <span>Perbarui / Upload Ulang Berkas Tugas (Revisi)</span>
                      </button>
                    )}
                    {selectedMeetingNumber < 16 && (
                      <button
                        type="button"
                        id="btn-upload-pertemuan-selanjutnya"
                        onClick={() => {
                          setSelectedMeetingNumber(prev => Math.min(16, prev + 1));
                          setIsEditingExisting(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Upload size={14} />
                        <span>Upload Tugas Pertemuan Selanjutnya (Pertemuan {selectedMeetingNumber + 1}) ➔</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id="btn-shortcut-ke-galeri"
                      onClick={() => setViewMode('gallery')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Users size={14} />
                      <span>Lihat, Review & Unduh Tugas Rekan ({effectiveSubmissions.length} Berkas)</span>
                    </button>
                  </div>
                </div>

                {/* Submitted Files List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Berkas Tugas yang Telah Anda Kirim:</h4>

                  {/* PPT File Preview */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0 font-black text-xs">
                        PPT
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {existingSubmission.pptFileName || 'Slide Presentasi PPT'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {existingSubmission.pptType === 'link' ? (existingSubmission.pptUrl || 'Tautan Canva/Google Slides') : 'Berkas Slide Presentasi'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {existingSubmission.pptType === 'link' && existingSubmission.pptUrl ? (
                        <a
                          href={existingSubmission.pptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ExternalLink size={13} />
                          <span>Buka Link PPT</span>
                        </a>
                      ) : existingSubmission.pptFileData ? (
                        <a
                          href={existingSubmission.pptFileData}
                          download={existingSubmission.pptFileName || `PPT_${targetStudent.name}.pptx`}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Download size={13} />
                          <span>Unduh Berkas PPT</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum Ada PPT</span>
                      )}
                    </div>
                  </div>

                  {/* Makalah File Preview */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-black text-xs">
                        DOC
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {existingSubmission.makalahFileName || 'Makalah Lengkap (PDF/DOC)'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {existingSubmission.makalahType === 'link' ? (existingSubmission.makalahUrl || 'Tautan Google Docs/Drive') : 'Berkas Makalah Kajian'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {existingSubmission.makalahType === 'link' && existingSubmission.makalahUrl ? (
                        <a
                          href={existingSubmission.makalahUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ExternalLink size={13} />
                          <span>Buka Link Makalah</span>
                        </a>
                      ) : existingSubmission.makalahFileData ? (
                        <a
                          href={existingSubmission.makalahFileData}
                          download={existingSubmission.makalahFileName || `Makalah_${targetStudent.name}.pdf`}
                          className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <Download size={13} />
                          <span>Unduh Berkas Makalah</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum Ada Makalah</span>
                      )}
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Topik Kajian:</span>{' '}
                      <span className="text-slate-900">{existingSubmission.topic || targetStudent.topic}</span>
                    </div>
                    {existingSubmission.partnerName && (
                      <div>
                        <span className="font-bold text-slate-700">Rekan Presentasi (Kelompok):</span>{' '}
                        <span className="text-slate-900">{existingSubmission.partnerName}</span>
                      </div>
                    )}
                    {existingSubmission.notes && (
                      <div>
                        <span className="font-bold text-slate-700">Catatan/Abstrak Ringkasan:</span>
                        <p className="text-slate-600 italic mt-0.5">"{existingSubmission.notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Reviews Received from Classmates */}
                  <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950 dark:text-indigo-200">
                        <MessageSquare size={14} className="text-indigo-700 dark:text-indigo-400" />
                        <span>Ulasan & Pertanyaan Diskusi dari Teman Sekelas ({existingSubmission.peerReviews?.length || 0}):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReviewingSubmission(existingSubmission);
                          setPeerRating(5);
                          setPeerComment('');
                          setReviewFeedback(null);
                        }}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Buka Detail Ulasan</span>
                      </button>
                    </div>

                    {existingSubmission.peerReviews && existingSubmission.peerReviews.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {existingSubmission.peerReviews.map((rev) => (
                          <div key={rev.id} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-100 dark:border-indigo-900/50 text-xs shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 dark:text-white">{rev.reviewerName}</span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                  <Star key={i} size={10} className="fill-amber-400" />
                                ))}
                              </div>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 italic mt-1">"{rev.comment}"</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        Belum ada ulasan masuk. Saat presentasi berlangsung, rekan sekelas dapat memberikan rating dan ulasan melalui Galeri Tugas.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100">
                    <span>Dikumpulkan: {existingSubmission.submittedAt ? new Date(existingSubmission.submittedAt).toLocaleString('id-ID') : 'Tersimpan'}</span>
                    <span className="text-emerald-700 font-bold">✓ Integritas Data Anti-Hilang Aktif</span>
                  </div>
                </div>
              </div>
            ) : (
            <form onSubmit={handleSubmitTask} className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Upload size={18} className="text-emerald-700" />
                  <h3 className="font-bold text-base text-slate-900">
                    Form Upload PPT & Makalah: Pertemuan {selectedMeetingNumber} ({currentMeetingSchedule?.partCodes?.[0] || `Pertemuan ${selectedMeetingNumber}`})
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">
                    {targetStudent.name}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    Pertemuan #{selectedMeetingNumber}
                  </span>
                </div>
              </div>

              {/* Akses Dosen: Tombol Cepat Hapus/Reset Tugas (Terletak di Bagian Paling Atas Form agar Selalu Terlihat Tanpa Scroll) */}
              {isDosen && existingSubmission && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-2.5">
                    <Trash2 size={18} className="text-rose-600 shrink-0" />
                    <div>
                      <strong className="block text-xs font-extrabold text-rose-900">
                        AKSES DOSEN: TUGAS PERTEMUAN #{selectedMeetingNumber} SUDAH TERKUMPUL
                      </strong>
                      <p className="text-[11px] text-rose-800">
                        Mahasiswa ini ({targetStudent.name}) telah mengumpulkan tugas. Jika salah file atau butuh perbaikan, Anda dapat meresetnya sekarang agar form kembali terbuka bagi mahasiswa.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {!isConfirmingDeleteSub ? (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDeleteSub(true)}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Hapus / Reset tugas ini agar mahasiswa bisa upload ulang"
                      >
                        <Trash2 size={14} />
                        <span>Hapus / Buka Revisi</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-rose-300">
                        <button
                          type="button"
                          onClick={() => setIsConfirmingDeleteSub(false)}
                          className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isDosenDeleting}
                          onClick={handleExecuteDosenDeleteSubmission}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <Trash2 size={12} />
                          <span>{isDosenDeleting ? 'Mereset...' : 'Ya, Hapus'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Peringatan Keras Bukan Akun Sendiri (Anti Impersonation) */}
              {isIdentityMismatch && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-xs text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-extrabold text-rose-900 mb-0.5">
                        PERINGATAN: BUKAN AKUN MAHASISWA ANDA!
                      </strong>
                      <p className="text-rose-800 leading-relaxed">
                        Anda saat ini membuka formulir atas nama <strong>{targetStudent.name}</strong> ({targetStudent.nim || 'NIM -'}). Sesuai integritas akademik SIAKAD, Anda <strong>dilarang</strong> mengumpulkan tugas atas nama orang lain.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchToMyAccount}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <User size={14} />
                    <span>Pilih Nama Saya ({currentStudent?.name.split(' ')[0]}) ➔</span>
                  </button>
                </div>
              )}

              {/* Peringatan Salah Kamar Pertemuan (Anti Salah Kamar) */}
              {isSalahKamar && (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm font-extrabold text-amber-900 mb-0.5">
                        PERINGATAN: SALAH KAMAR PERTEMUAN!
                      </strong>
                      <p className="text-amber-800 leading-relaxed">
                        Anda saat ini membuka ruang tugas <strong>Pertemuan #{selectedMeetingNumber}</strong>. Berdasarkan jadwal RPS SIAKAD, jadwal presentasi resmi Anda adalah <strong>Pertemuan #{currentStudent?.meetingNumber || 2}</strong>. Pengumpulan tugas di kamar pertemuan lain terkunci.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchToMyMeeting}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Calendar size={14} />
                    <span>Pindah ke Kamar Saya (Pertemuan #{currentStudent?.meetingNumber || 2}) ➔</span>
                  </button>
                </div>
              )}

              {/* Mode Edit Banner jika mengedit tugas yang sudah terkirim */}
              {isEditingExisting && existingSubmission && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-center justify-between gap-3 animate-fadeIn shadow-2xs">
                  <div className="flex items-center gap-2">
                    <RotateCcw size={16} className="text-amber-700 shrink-0" />
                    <span>
                      <strong>Mode Edit Aktif:</strong> Anda sedang memperbarui tugas Pertemuan #{selectedMeetingNumber}. Perubahan baru akan otomatis menggantikan berkas lama Anda.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(false)}
                    className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold cursor-pointer shrink-0"
                  >
                    Batal Edit
                  </button>
                </div>
              )}

              {/* SELECTOR PERTEMUAN LANGSUNG DI DALAM FORM (Pertemuan 2 s/d 16) */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/90 to-emerald-50/90 border border-emerald-300/80 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Calendar size={16} className="text-emerald-700" />
                    <span>Pilih Sesi Pertemuan Tugas yang Akan Anda Kirim (Pertemuan 2 s/d 16):</span>
                  </label>
                  <select
                    id="select-pertemuan-form-dropdown"
                    value={selectedMeetingNumber}
                    onChange={e => {
                      setSelectedMeetingNumber(Number(e.target.value));
                      setIsEditingExisting(false);
                    }}
                    className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 shadow-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {availableMeetings.map(m => {
                      const subM = (effectiveSubmissions || []).find(
                        s => s.studentId === targetStudent.id && (Number(s.meetingNumber) || 2) === m.meetingNumber
                      );
                      const isGraded = subM && subM.grade !== undefined;
                      const isMyRoom = Boolean(currentStudent && (Number(currentStudent.meetingNumber) || 2) === m.meetingNumber);
                      return (
                        <option key={m.meetingNumber} value={m.meetingNumber}>
                          {isMyRoom ? '★ [Kamar Anda] ' : ''}Pertemuan {m.meetingNumber}: {m.title.slice(0, 40)}... {subM ? (isGraded ? `(Dinilai: ${subM.grade})` : '(Terkirim ✓)') : '(Siap Kirim)'}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {/* Meeting Quick Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {availableMeetings.map(m => {
                    const isCur = m.meetingNumber === selectedMeetingNumber;
                    const isMyRoom = Boolean(currentStudent && (Number(currentStudent.meetingNumber) || 2) === m.meetingNumber);
                    const subM = (effectiveSubmissions || []).find(
                      s => s.studentId === targetStudent.id && (Number(s.meetingNumber) || 2) === m.meetingNumber
                    );
                    return (
                      <button
                        key={m.meetingNumber}
                        type="button"
                        onClick={() => {
                          setSelectedMeetingNumber(m.meetingNumber);
                          setIsEditingExisting(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all border cursor-pointer ${
                          isCur
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs scale-105'
                            : subM
                            ? 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : isMyRoom
                            ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        P{m.meetingNumber} {subM ? '✓' : isMyRoom ? '★' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Graded by Lecturer Notification Banner */}
              {existingSubmission?.grade !== undefined && (
                <div className="p-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-xl shadow-md border border-emerald-400/40 flex items-center justify-between gap-4 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
                      <Award size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-xs">
                          SUDAH DINILAI DOSEN
                        </span>
                        <span className="text-xs text-emerald-200 font-semibold">
                          Nilai Dosen: <strong className="text-sm text-yellow-300 font-extrabold">{existingSubmission.grade}</strong> / 100
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                        {existingSubmission.feedback
                          ? `Catatan Dosen: "${existingSubmission.feedback}"`
                          : 'Tugas presentasi telah diverifikasi dan dinilai permanen oleh Dosen Pengampu.'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <span className="inline-block text-[11px] font-bold bg-white text-emerald-900 px-3 py-1.5 rounded-lg shadow-xs">
                      Telah Dinilai
                    </span>
                  </div>
                </div>
              )}

              {/* Alert Feedback Messages */}
              {submitSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>{submitSuccessMsg}</div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>{errorMsg}</div>
                </div>
              )}

              {/* Presentation Format & Kelompok PPT/Makalah Management (Ditentukan Dosen) */}
              <div className="space-y-4 bg-indigo-50/70 p-4 sm:p-5 rounded-xl border border-indigo-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Users size={16} className="text-indigo-700" />
                      <span>Format Presentasi PPT & Makalah (Pertemuan #{selectedMeetingNumber})</span>
                    </label>
                    <span className="text-[11px] text-indigo-700">
                      {isDosen ? 'Ditentukan oleh Dosen Pengampu' : 'Format penugasan pertemuan ini'}
                    </span>
                  </div>
                  <div className="flex items-center bg-indigo-100 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      id="btn-format-individu"
                      onClick={() => handleTogglePresentationFormat('individu')}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                        presentationType === 'individu' ? 'bg-white text-indigo-950 shadow-xs font-bold' : 'text-indigo-700 hover:text-indigo-950'
                      }`}
                    >
                      Individu
                    </button>
                    <button
                      type="button"
                      id="btn-format-kelompok"
                      onClick={() => handleTogglePresentationFormat('kelompok')}
                      className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                        presentationType === 'kelompok' ? 'bg-white text-indigo-950 shadow-xs font-bold' : 'text-indigo-700 hover:text-indigo-950'
                      }`}
                    >
                      Kelompok PPT & Makalah
                    </button>
                  </div>
                </div>

                {/* Edit presentation topic */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Topik / Judul Materi Presentasi Pertemuan #{selectedMeetingNumber}:
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {isDosen ? 'Dapat disunting Dosen' : 'Dapat disesuaikan oleh mahasiswa'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Judul topik materi presentasi..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Roster Mahasiswa Pemakalah & Tombol Tambah, Tukar, dan Edit Nama */}
                <div className={`p-3.5 rounded-xl border space-y-3 ${
                  presentationType === 'kelompok'
                    ? 'bg-white border-indigo-200/80'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                  {/* Header Group Name + Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md text-white ${
                        presentationType === 'kelompok' ? 'bg-indigo-900' : 'bg-emerald-800'
                      }`}>
                        {currentMeetingSchedule?.groupName || (presentationType === 'kelompok' ? `Kelompok Pertemuan #${selectedMeetingNumber}` : `Format Mandiri - Pertemuan #${selectedMeetingNumber}`)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        presentationType === 'kelompok' ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}>
                        {presentationType === 'kelompok' ? 'Kelompok PPT & Makalah' : 'Tugas Mandiri (Individu)'}
                      </span>
                      {(isDosen || meetingPresenters.some(p => p.name === currentStudent?.name)) && (
                        <button
                          type="button"
                          onClick={handleOpenEditMeetingGroupName}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                          title="Edit Nama Kelompok / Label Pertemuan"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Action buttons: Tambah & Tukar (HANYA DOSEN yang bisa menukar) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(isDosen || meetingPresenters.some(p => p.name === currentStudent?.name || p.id === currentStudent?.id)) && (
                        <button
                          type="button"
                          onClick={() => setShowAddPresenterModal(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          title="Tambah Mahasiswa ke Pertemuan Ini (Pilih dari Data Mahasiswa atau Tambah Baru)"
                        >
                          <UserPlus size={13} />
                          <span>+ Tambah</span>
                        </button>
                      )}
                      {isDosen && (
                        <button
                          type="button"
                          onClick={handleOpenSwapPresenterModal}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          title="Tukar Mahasiswa Antar Pertemuan (Hanya Dosen)"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Tukar Mahasiswa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {editStudentNameMsg && (
                    <div
                      className={`p-2.5 rounded-lg text-xs font-medium ${
                        editStudentNameMsg.type === 'success'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {editStudentNameMsg.text}
                    </div>
                  )}

                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users size={14} className={presentationType === 'kelompok' ? 'text-indigo-600' : 'text-emerald-700'} />
                    <span>
                      {presentationType === 'kelompok'
                        ? `Anggota Kelompok PPT & Makalah (${meetingPresenters?.length || 0} Mahasiswa):`
                        : `Mahasiswa Pemakalah Individu (${meetingPresenters?.length || 0} Mahasiswa):`}
                    </span>
                  </div>

                  {/* Roster of Students in this Presentation Group */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(meetingPresenters || []).map(m => {
                      const isEditingThis = editingStudentInMeeting?.id === m.id;
                      const isSelf = currentStudent?.id === m.id || currentStudent?.name === m.name;

                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded-lg border text-xs transition-all ${
                            isSelf
                              ? 'bg-indigo-50 border-indigo-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {isEditingThis ? (
                            <form onSubmit={handleSaveStudentName} className="space-y-1.5">
                              <span className="text-[10px] font-bold text-indigo-900 uppercase block">
                                Ubah Nama Mahasiswa (Sinkron ke Data Mahasiswa):
                              </span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  required
                                  value={editingStudentInMeeting.currentName}
                                  onChange={e =>
                                    setEditingStudentInMeeting({
                                      ...editingStudentInMeeting,
                                      currentName: e.target.value,
                                    })
                                  }
                                  className="flex-1 px-2 py-1 text-xs bg-white border border-indigo-400 rounded-md uppercase font-bold"
                                />
                                <button
                                  type="submit"
                                  disabled={isSavingStudentName}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md font-bold text-xs flex items-center gap-1 cursor-pointer"
                                  title="Simpan ke Database Mahasiswa"
                                >
                                  <Save size={12} />
                                  <span>{isSavingStudentName ? '...' : 'Simpan'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStudentInMeeting(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                                  title="Batal"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-indigo-200 text-indigo-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  {m.name.charAt(0)}
                                </div>
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-slate-900 truncate">{m.name}</p>
                                    {isSelf && (
                                      <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-500">NIM: {m.nim || '-'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {(isDosen || isSelf) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStudentInMeeting({
                                        id: m.id,
                                        originalName: m.name,
                                        currentName: m.name,
                                        nim: m.nim,
                                      });
                                      setEditStudentNameMsg(null);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                                    title="Ubah Nama Mahasiswa (Tersinkron ke Data Mahasiswa SIAKAD)"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                                {isDosen && (meetingPresenters?.length || 0) > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePresenterFromMeeting(m.name)}
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                                    title="Hapus mahasiswa dari pertemuan ini"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                    {/* Add Presenter Modal / In-line Box */}
                    {showAddPresenterModal && (
                      <div className="p-3 bg-slate-50 border border-indigo-200 rounded-xl space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950">
                            Tambah Mahasiswa ke Kelompok Pertemuan #{targetStudent.meetingNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAddPresenterModal(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {presenterActionMsg && (
                          <div
                            className={`p-2 rounded-lg text-xs font-medium ${
                              presenterActionMsg.type === 'success'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {presenterActionMsg.text}
                          </div>
                        )}

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Opsi 1: Pilih Mahasiswa yang Sudah Ada di Kelas:
                            </label>
                            <select
                              value={selectedStudentIdToAdd}
                              onChange={e => {
                                setSelectedStudentIdToAdd(e.target.value);
                                if (e.target.value) {
                                  setCustomStudentNameToAdd('');
                                  setCustomNimToAdd('');
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-medium"
                            >
                              <option value="">-- Pilih dari daftar mahasiswa kelas --</option>
                              {students
                                .filter(s => !meetingPresenters.some(mp => mp.id === s.id))
                                .map(s => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.nim || 'Tanpa NIM'}) - Jadwal Sekarang: {s.rpsPart}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="text-[11px] text-slate-400 text-center font-bold">-- ATAU --</div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Opsi 2: Input Mahasiswa Baru (Nama & NIM):
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={customStudentNameToAdd}
                                onChange={e => {
                                  setCustomStudentNameToAdd(e.target.value);
                                  if (e.target.value) setSelectedStudentIdToAdd('');
                                }}
                                placeholder="Nama Mahasiswa Baru..."
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                              />
                              <input
                                type="text"
                                value={customNimToAdd}
                                onChange={e => setCustomNimToAdd(e.target.value)}
                                placeholder="NIM Mahasiswa..."
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setShowAddPresenterModal(false)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={isAddingPresenter}
                              onClick={handleAddPresenterToMeeting}
                              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Check size={13} />
                              <span>{isAddingPresenter ? 'Menambahkan...' : 'Tambahkan ke Kelompok'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notice if group member already submitted */}
                    {peerSubmission && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span>Materi Kelompok Telah Diunggah oleh Rekan ({peerSubmission.studentName}):</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Tugas PPT & Makalah kelompok ini sudah diunggah. Anda dapat mengunduh atau meninjau file materi yang sudah diunggah oleh rekan Anda.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {peerSubmission.pptUrl && (
                            <a
                              href={peerSubmission.pptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                              <ExternalLink size={12} />
                              <span>Buka Link PPT Kelompok</span>
                            </a>
                          )}
                          {peerSubmission.pptFileData && (
                            <a
                              href={peerSubmission.pptFileData}
                              download={peerSubmission.pptFileName || 'PPT-Kelompok.pptx'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                              <Download size={12} />
                              <span>Unduh File PPT Kelompok</span>
                            </a>
                          )}
                          {peerSubmission.makalahUrl && (
                            <a
                              href={peerSubmission.makalahUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                              <ExternalLink size={12} />
                              <span>Buka Link Makalah Kelompok</span>
                            </a>
                          )}
                          {peerSubmission.makalahFileData && (
                            <a
                              href={peerSubmission.makalahFileData}
                              download={peerSubmission.makalahFileName || 'Makalah-Kelompok.pdf'}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                            >
                              <Download size={12} />
                              <span>Unduh File Makalah Kelompok</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                {/* Additional Partner Name Note (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-indigo-900">
                      Catatan Rekan / Teman Tambahan (Opsional):
                    </label>
                  </div>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                    placeholder="Nama teman tambahan jika ada..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tombol Pergantian Format Tugas (Toggle / Tab Dinamis dengan type='button' tanpa Refresh Halaman) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText size={16} className="text-emerald-700" />
                    <span>Tombol Pergantian Format Tugas (Pilih Format Pengumpulan):</span>
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full self-start sm:self-auto">
                    Toggle Dinamis • Tanpa Reload
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pilih format pengumpulan tugas yang Anda inginkan. Beralih secara dinamis antara <strong>Upload File PDF Makalah</strong>, <strong>Upload Berkas Slide Presentasi PPT</strong>, atau <strong>Input Tautan Link (Canva/Docs)</strong> tanpa me-refresh halaman:
                </p>

                {/* Tab / Toggle Controls dengan type='button' */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-format-toggle-pdf-makalah"
                    onClick={() => handleSelectFormatTab('file_pdf')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 text-center cursor-pointer ${
                      activeFormatTab === 'file_pdf'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-[1.01]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <FileText size={17} className={activeFormatTab === 'file_pdf' ? 'text-emerald-200' : 'text-emerald-700'} />
                    <span>Upload File PDF Makalah</span>
                    <span className={`text-[10px] font-normal ${activeFormatTab === 'file_pdf' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Berkas PDF / DOCX
                    </span>
                  </button>

                  <button
                    type="button"
                    id="btn-format-toggle-file-ppt"
                    onClick={() => handleSelectFormatTab('file_ppt')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 text-center cursor-pointer ${
                      activeFormatTab === 'file_ppt'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-[1.01]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <Presentation size={17} className={activeFormatTab === 'file_ppt' ? 'text-emerald-200' : 'text-emerald-700'} />
                    <span>Upload File Presentasi PPT</span>
                    <span className={`text-[10px] font-normal ${activeFormatTab === 'file_ppt' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Berkas PPTX / PDF
                    </span>
                  </button>

                  <button
                    type="button"
                    id="btn-format-toggle-input-link"
                    onClick={() => handleSelectFormatTab('input_link')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 text-center cursor-pointer ${
                      activeFormatTab === 'input_link'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-[1.01]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <LinkIcon size={17} className={activeFormatTab === 'input_link' ? 'text-emerald-200' : 'text-indigo-600'} />
                    <span>Input Tautan Link</span>
                    <span className={`text-[10px] font-normal ${activeFormatTab === 'input_link' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Canva / Docs / Drive
                    </span>
                  </button>

                  <button
                    type="button"
                    id="btn-format-toggle-all"
                    onClick={() => handleSelectFormatTab('all')}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex flex-col items-center gap-1 text-center cursor-pointer ${
                      activeFormatTab === 'all'
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm scale-[1.01]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    <Sparkles size={17} className={activeFormatTab === 'all' ? 'text-amber-200' : 'text-amber-600'} />
                    <span>Kombinasi Lengkap</span>
                    <span className={`text-[10px] font-normal ${activeFormatTab === 'all' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      PPT & Makalah Sekaligus
                    </span>
                  </button>
                </div>

                {/* Sub-choice Indicator */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Format Aktif: <strong>{activeFormatTab === 'file_pdf' ? 'Upload File Dokumen PDF Makalah' : activeFormatTab === 'file_ppt' ? 'Upload Berkas Slide Presentasi PPT' : activeFormatTab === 'input_link' ? 'Input Tautan Link Online' : 'Kombinasi Bebas (PPT & Makalah)'}</strong></span>
                  </span>
                  <span className="text-emerald-800 font-semibold">
                    {submissionChoice === 'both' ? 'Mahasiswa dapat mengisi salah satu atau keduanya' : 'Lengkapi bagian tugas yang Anda pilih'}
                  </span>
                </div>
              </div>

              {/* Section 1: Presentation Slides (PPT / Canva) */}
              <div className={`space-y-3 p-4 rounded-xl border transition-all ${
                submissionChoice === 'makalah_only' ? 'bg-slate-50/40 border-slate-200 opacity-60' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText size={15} className="text-emerald-700" />
                    <span>
                      1. Presentasi PPT (File PPTX/PDF atau Link Canva)
                      {submissionChoice === 'ppt_only' ? ' * (Wajib)' : submissionChoice === 'both' ? ' (Dianjurkan)' : ' (Opsional)'}
                    </span>
                  </label>
                  
                  {/* Mode switcher */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setPptType('link')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        pptType === 'link' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link Canva / Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setPptType('file')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        pptType === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File PPT
                    </button>
                  </div>
                </div>

                {pptType === 'link' ? (
                  <div>
                    <div className="relative">
                      <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="Tempelkan link Canva / Google Slides / Drive Anda di sini (https://...)"
                        value={pptUrl}
                        onChange={e => setPptUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Pastikan link Canva atau Google Drive diatur ke <em>"Siapa saja yang memiliki link dapat melihat"</em>.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".ppt,.pptx,.pdf"
                      onChange={handlePptFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
                    />
                    {pptFileName && (
                      <p className="text-xs text-emerald-800 font-medium mt-1.5 flex items-center gap-1">
                        <CheckCircle2 size={13} /> File terpilih: {pptFileName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Makalah Dokumen */}
              <div className={`space-y-3 p-4 rounded-xl border transition-all ${
                submissionChoice === 'ppt_only' ? 'bg-slate-50/40 border-slate-200 opacity-60' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText size={15} className="text-emerald-700" />
                    <span>
                      2. Makalah Makul (PDF/DOCX atau Link Google Docs)
                      {submissionChoice === 'makalah_only' ? ' * (Wajib)' : submissionChoice === 'both' ? ' (Dianjurkan)' : ' (Opsional)'}
                    </span>
                  </label>

                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setMakalahType('link')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        makalahType === 'link' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link Docs / Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setMakalahType('file')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        makalahType === 'file' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File Makalah
                    </button>
                  </div>
                </div>

                {makalahType === 'link' ? (
                  <div>
                    <div className="relative">
                      <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="Link Google Docs / PDF Drive makalah (https://...)"
                        value={makalahUrl}
                        onChange={e => setMakalahUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleMakalahFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-900 cursor-pointer"
                    />
                    {makalahFileName && (
                      <p className="text-xs text-slate-700 font-medium mt-1.5 flex items-center gap-1">
                        <CheckCircle2 size={13} /> File makalah: {makalahFileName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Notes / Ringkasan Pokok */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Ringkasan Inti Presentasi untuk Dosen:
                </label>
                <textarea
                  rows={3}
                  placeholder="Tuliskan poin penting kajian filsafat, rumusan masalah, atau catatan presentasi Anda..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Aturan Pengumpulan: Satu kali kirim. Hubungi Dosen jika memerlukan perbaikan (revisi).</span>
                </div>

                <button
                  id="btn-kirim-tugas-individu"
                  type="submit"
                  disabled={isSubmitting || isIdentityMismatch || isSalahKamar}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    isIdentityMismatch || isSalahKamar
                      ? 'bg-slate-400 text-white cursor-not-allowed opacity-85'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50 cursor-pointer active:scale-95'
                  }`}
                >
                  {isIdentityMismatch ? (
                    <>
                      <Lock size={16} />
                      <span>Terkunci: Bukan Akun Sendiri (Pilih Nama Anda)</span>
                    </>
                  ) : isSalahKamar ? (
                    <>
                      <Lock size={16} />
                      <span>Terkunci: Salah Kamar (Jadwal: Pertemuan #{currentStudent?.meetingNumber || 2})</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>{isSubmitting ? 'Mengirim & Menyimpan...' : `Kirim Tugas Pertemuan ${selectedMeetingNumber} (Tersimpan Otomatis)`}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
            )}
          </div>

        </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PENGIRIMAN TUGAS PRESENTASI */}
      {isConfirmSubmitOpen && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-300">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Konfirmasi Pengiriman Tugas Pertemuan {selectedMeetingNumber}</h3>
                  <p className="text-xs text-emerald-200">Pastikan materi & file presentasi sudah tepat sebelum dikirim</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {/* Student info */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Mahasiswa Pengunggah:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{targetStudent.name} ({targetStudent.nim})</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Pertemuan & Topik RPS:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right max-w-[240px] truncate">
                    Pertemuan {selectedMeetingNumber} ({currentMeetingSchedule?.partCodes?.[0] || 'RPS'}) • {topic || currentMeetingSchedule?.title || targetStudent.topic}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Format Presentasi:</span>
                  <span className="font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs">
                    {presentationType === 'kelompok' ? 'Kelompok PPT & Makalah' : 'Individu'}
                  </span>
                </div>
              </div>

              {/* Uploaded Files Summary */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ringkasan File yang Akan Dikirim:
                </h4>

                {/* File PPT / Canva */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-2.5">
                  <Presentation size={16} className="text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white block text-xs">1. Materi Presentasi (PPT / Canva)</span>
                    {pptType === 'file' ? (
                      pptFileName ? (
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate mt-0.5">
                          📄 File: {pptFileName}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Tidak ada file dipilih</p>
                      )
                    ) : (
                      pptUrl ? (
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium truncate mt-0.5">
                          🔗 Link: {pptUrl}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Tidak ada link dimasukkan</p>
                      )
                    )}
                  </div>
                </div>

                {/* File Makalah */}
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-start gap-2.5">
                  <FileText size={16} className="text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 dark:text-white block text-xs">2. Dokumen Makalah (PDF / Docs)</span>
                    {makalahType === 'file' ? (
                      makalahFileName ? (
                        <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium truncate mt-0.5">
                          📄 File: {makalahFileName}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Tidak disertakan</p>
                      )
                    ) : (
                      makalahUrl ? (
                        <p className="text-xs text-indigo-800 dark:text-indigo-300 font-medium truncate mt-0.5">
                          🔗 Link: {makalahUrl}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Tidak disertakan</p>
                      )
                    )}
                  </div>
                </div>

                {notes && (
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-bold text-slate-900 dark:text-white block text-xs mb-1">Catatan Mahasiswa:</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">{notes}</p>
                  </div>
                )}
              </div>

              {/* Warning Notice Box */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
                <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold block mb-0.5">PERINGATAN ATURAN PENGUMPULAN:</strong>
                  Sesuai kebijakan akademik SIAKAD, pengumpulan tugas Pertemuan {selectedMeetingNumber} ini bersifat <strong>Satu Kali Kirim (One-Time Submit)</strong>. Setelah dikirim, formulir pertemuan ini akan langsung terkunci permanen dan Anda tidak dapat mengganti file secara mandiri kecuali Dosen membuka kunci status tugas Anda.
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-batal-konfirmasi-sub"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Periksa Ulang / Batal
              </button>
              <button
                type="button"
                id="btn-setuju-kirim-sub"
                onClick={handleConfirmAndExecuteSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Mengirim...' : 'Ya, File Sudah Benar & Kirim Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Peer Review & Unduh Berkas Tugas Presentasi Teman Sekelas */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                  ⭐
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Review & Unduh Tugas Presentasi
                  </h3>
                  <p className="text-xs text-slate-300">
                    {reviewingSubmission.studentName} • {reviewingSubmission.rpsPart}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewingSubmission(null);
                  setReviewFeedback(null);
                }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Submission Information */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-lg">
                    {reviewingSubmission.rpsPart} • Pertemuan {reviewingSubmission.meetingNumber || 2}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Dikirim: {new Date(reviewingSubmission.submittedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {reviewingSubmission.topic || 'Topik Presentasi Sesuai RPS'}
                </h4>
                {reviewingSubmission.partnerName && (
                  <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
                    👥 Rekan Kelompok: {reviewingSubmission.partnerName}
                  </p>
                )}
                {reviewingSubmission.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                    Catatan Pemapar: "{reviewingSubmission.notes}"
                  </p>
                )}
              </div>

              {/* Action Buttons: Direct Open & Download PPT and Makalah */}
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Berkas Presentasi & Dokumen:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {reviewingSubmission.pptType === 'link' && reviewingSubmission.pptUrl ? (
                    <a
                      href={reviewingSubmission.pptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <ExternalLink size={15} />
                      <span>Buka Slide PPT / Canva</span>
                    </a>
                  ) : reviewingSubmission.pptFileData ? (
                    <a
                      href={reviewingSubmission.pptFileData}
                      download={reviewingSubmission.pptFileName || `PPT_${reviewingSubmission.studentName}.pptx`}
                      className="p-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <Download size={15} />
                      <span>Unduh File PPT ({reviewingSubmission.pptFileName || 'PPTX'})</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-slate-100 text-slate-400 rounded-xl text-xs text-center italic">
                      Belum Ada Slide PPT
                    </div>
                  )}

                  {(reviewingSubmission.makalahUrl || reviewingSubmission.makalahFileData || reviewingSubmission.topic) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDocPreviewData({
                          title: `Makalah Tugas: ${reviewingSubmission.topic || reviewingSubmission.rpsPart}`,
                          studentName: reviewingSubmission.studentName,
                          meetingNumber: Number(reviewingSubmission.meetingNumber) || 2,
                          rpsPart: reviewingSubmission.rpsPart,
                          topic: reviewingSubmission.topic,
                          docType: 'makalah',
                          fileUrl: reviewingSubmission.makalahUrl,
                          fileData: reviewingSubmission.makalahFileData,
                          fileName: reviewingSubmission.makalahFileName,
                          submittedAt: reviewingSubmission.submittedAt,
                          grade: reviewingSubmission.grade,
                          feedback: reviewingSubmission.feedback,
                          notes: reviewingSubmission.notes,
                        });
                      }}
                      className="p-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <FileText size={15} />
                      <span>Buka & Pratinjau Naskah Dokumen Makalah</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-slate-100 text-slate-400 rounded-xl text-xs text-center italic">
                      Belum Ada Makalah
                    </div>
                  )}
                </div>
              </div>

              {/* Peer Review Submission Form */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Star size={15} className="text-amber-500 fill-amber-400" />
                    <span>Beri Penilaian & Ulasan Diskusi Kelas</span>
                  </h5>
                  <span className="text-[11px] text-slate-500">
                    Sebagai: <strong>{currentStudent?.name || (isDosen ? 'Dosen' : 'Rekan Mahasiswa')}</strong>
                  </span>
                </div>

                <form onSubmit={handleSendPeerReview} className="space-y-3">
                  {/* Rating selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Rating Presentasi (1 - 5 Bintang):
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setPeerRating(star)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            peerRating >= star
                              ? 'bg-amber-100 border-amber-300 text-amber-600 scale-105'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 hover:text-amber-400'
                          }`}
                        >
                          <Star size={20} className={peerRating >= star ? 'fill-amber-400' : ''} />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1">
                        {peerRating === 5 && 'Sangat Baik & Lengkap'}
                        {peerRating === 4 && 'Bagus & Informatif'}
                        {peerRating === 3 && 'Cukup'}
                        {peerRating === 2 && 'Perlu Peningkatan'}
                        {peerRating === 1 && 'Kurang'}
                      </span>
                    </div>
                  </div>

                  {/* Comment box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Komentar, Pertanyaan Diskusi, atau Apresiasi:
                    </label>
                    <textarea
                      value={peerComment}
                      onChange={(e) => setPeerComment(e.target.value)}
                      placeholder={`Tulis masukan konstruktif untuk ${reviewingSubmission.studentName} saat presentasi...`}
                      rows={3}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {reviewFeedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      reviewFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {reviewFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                      <span>{reviewFeedback.text}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReview || !peerComment.trim()}
                      className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <Send size={13} />
                      <span>{isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan / Komentar'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* List of Existing Peer Reviews */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Ulasan Rekan Mahasiswa ({reviewingSubmission.peerReviews?.length || 0}):
                  </h5>
                </div>

                {reviewingSubmission.peerReviews && reviewingSubmission.peerReviews.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {reviewingSubmission.peerReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {rev.reviewerName}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                              <Star key={i} size={11} className="fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          "{rev.comment}"
                        </p>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(rev.createdAt).toLocaleDateString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400 italic">
                    Belum ada ulasan dari teman sekelas. Jadilah yang pertama memberikan review presentasi ini!
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setReviewingSubmission(null);
                  setReviewFeedback(null);
                }}
                className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU DOKUMEN MAKALAH */}
      <DocumentPreviewModal
        isOpen={Boolean(docPreviewData)}
        onClose={() => setDocPreviewData(null)}
        data={docPreviewData}
      />

      {/* Edit Nama Kelompok Presentasi Modal */}
      {showEditMeetingGroupNameModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveMeetingGroupName}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 size={16} className="text-indigo-600" />
                <span>Ubah Nama Kelompok Presentasi (Pertemuan #{selectedMeetingNumber})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowEditMeetingGroupNameModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kelompok Baru:
              </label>
              <input
                type="text"
                required
                value={editingMeetingGroupName}
                onChange={e => setEditingMeetingGroupName(e.target.value.toUpperCase())}
                placeholder="Contoh: KELOMPOK 1 - TIM ONTOLOGI"
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-indigo-300 focus:ring-2 focus:ring-indigo-500 uppercase"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditMeetingGroupNameModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingMeetingGroupName || !editingMeetingGroupName.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Save size={13} />
                <span>{isSavingMeetingGroupName ? 'Menyimpan...' : 'Simpan Nama Kelompok'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tukar Mahasiswa Antar Pertemuan Modal (HANYA DOSEN) */}
      {isDosen && showSwapPresenterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteSwapPresenter}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Tukar Mahasiswa Presentasi (Hanya Dosen)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Tukar posisi mahasiswa antar kelompok pertemuan presentasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSwapPresenterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {swapPresenterMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  swapPresenterMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {swapPresenterMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                <span>{swapPresenterMsg.text}</span>
              </div>
            )}

            {/* Mahasiswa dari Pertemuan Saat Ini */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mahasiswa dari Pertemuan #{selectedMeetingNumber}:
              </label>
              <select
                value={swapStudent1}
                onChange={e => setSwapStudent1(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                {meetingPresenters.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} (NIM: {m.nim || '-'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-center text-amber-600 my-1">
              <ArrowRightLeft size={20} className="rotate-90 sm:rotate-0" />
            </div>

            {/* Pertemuan Tujuan & Mahasiswa Tujuan */}
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tukar dengan Pertemuan:
                </label>
                <select
                  value={swapMeetingNum2}
                  onChange={e => {
                    const newTargetNum = Number(e.target.value);
                    setSwapMeetingNum2(newTargetNum);
                    const targetPresenters = (students || []).filter(
                      s => (Number(s.meetingNumber) || 2) === newTargetNum
                    );
                    setSwapStudent2(targetPresenters[0]?.name || '');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  {(meetings || [])
                    .filter(
                      m =>
                        m.meetingNumber >= 2 &&
                        m.meetingNumber <= 15 &&
                        m.meetingNumber !== selectedMeetingNumber
                    )
                    .map(m => (
                      <option key={m.meetingNumber} value={m.meetingNumber}>
                        Pertemuan #{m.meetingNumber} — "{m.title}"
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mahasiswa yang Ditukar (Pertemuan #{swapMeetingNum2}):
                </label>
                <select
                  value={swapStudent2}
                  onChange={e => setSwapStudent2(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  {(students || [])
                    .filter(s => (Number(s.meetingNumber) || 2) === swapMeetingNum2)
                    .map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} (NIM: {m.nim || '-'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSwapPresenterModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSwappingPresenter || !swapStudent1 || !swapStudent2}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <ArrowRightLeft size={13} />
                <span>{isSwappingPresenter ? 'Menukar...' : 'Tukar Mahasiswa'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
