import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, QuizSubmission, Student, MeetingSchedule, QuizSettings } from '../types';
import {
  fetchQuizApi,
  updateQuizQuestionsApi,
  autoGenerateQuizApi,
  submitQuizApi,
  fetchQuizSettingsApi,
  updateQuizSettingsApi,
  uploadQuizMaterialApi,
  deleteQuizSubmissionApi,
} from '../services/api';
import {
  Gamepad2,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  Timer,
  RefreshCw,
  Play,
  Check,
  Edit3,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Layers,
  Flame,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  UserCheck,
  AlertCircle,
  Brain,
  Atom,
  Compass,
  Scale,
  Target,
  Lightbulb,
  Shield,
  Book,
  Upload,
  Settings,
  ToggleLeft,
  ToggleRight,
  Music,
  Volume2,
  VolumeX,
  Smile,
  HelpCircle,
  Activity,
  FileSpreadsheet,
  FileText,
  Download,
  Printer,
} from 'lucide-react';
import { CartoonBalloonGame } from './quiz/CartoonBalloonGame';
import { CartoonFrogGame } from './quiz/CartoonFrogGame';
import { CartoonMultipleChoice } from './quiz/CartoonMultipleChoice';
import { QuizMonitoringMatrix } from './quiz/QuizMonitoringMatrix';
import { exportQuizRecap, printQuizRecapPdf } from '../utils/documentExport';
import { cartoonAudio } from '../utils/cartoonAudio';

interface InteractiveQuizViewProps {
  students: Student[];
  currentStudent: Student | null;
  isDosen: boolean;
  onRefreshData?: () => Promise<void>;
  onSelectStudent?: (student: Student) => void;
  onOpenDosenLogin?: () => void;
  meetings?: MeetingSchedule[];
  courseTitle?: string;
}

export const InteractiveQuizView: React.FC<InteractiveQuizViewProps> = ({
  students = [],
  currentStudent,
  isDosen = false,
  onRefreshData,
  onSelectStudent,
  onOpenDosenLogin,
  meetings = [],
  courseTitle = 'Filsafat Ilmu',
}) => {
  // --- Data State ---
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dosenViewMode, setDosenViewMode] = useState<'preview' | 'upload' | 'edit' | 'settings' | 'matrix' | 'recap'>('preview');

  // --- Quiz Settings State (Lecturer Controls) ---
  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    isQuizActive: true,
    targetMeeting: 'Pertemuan 2',
    quizTitle: 'Game Cerdas Cermat Kartun RPS Pascasarjana MPI 1',
    timeLimitMinutes: 15,
    description: 'Kuis animasi kartun interaktif: Pilihan Ganda, Tembak Balon, dan Lompat Kodok.',
    gameMode: 'bebas_pilih',
    soundEffectsEnabled: true,
    musicEnabled: false,
    defaultMusicTrack: 'lofi-calm',
    allowStudentModeSelection: true,
    autoAdvanceQuestions: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // --- Cartoon Game Mode State & Student Picker ---
  const [activeGameMode, setActiveGameMode] = useState<'pilihan_ganda' | 'balon' | 'kodok'>('balon');
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState<boolean>(false);

  // --- Auto-Advance Question State ---
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(false);
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    setIsAutoAdvancing(false);
  };

  const handleGoNext = () => {
    clearAutoAdvanceTimer();
    setCurrentIndex(i => Math.min(questions.length - 1, i + 1));
  };

  const handleGoPrev = () => {
    clearAutoAdvanceTimer();
    setCurrentIndex(i => Math.max(0, i - 1));
  };

  const handleSelectQuestionIndex = (idx: number) => {
    clearAutoAdvanceTimer();
    setCurrentIndex(idx);
  };

  // --- Material Upload State (Auto-Generate from Doc) ---
  const [materialFileName, setMaterialFileName] = useState<string>('');
  const [materialBase64, setMaterialBase64] = useState<string>('');
  const [materialRawText, setMaterialRawText] = useState<string>('');
  const [materialMeetingTarget, setMaterialMeetingTarget] = useState<string>('Pertemuan 2');
  const [isExtractingMaterial, setIsExtractingMaterial] = useState<boolean>(false);
  const materialInputRef = useRef<HTMLInputElement | null>(null);

  // --- Quiz Taking State ---
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  // --- Proctoring Camera State ---
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Submission Result State ---
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    score: number;
    correctCount: number;
    totalQuestions: number;
    explanationMap?: Record<number, { correctIndex: number; isCorrect: boolean; explanation: string }>;
  } | null>(null);

  // --- Dosen Edit State ---
  const [editingQuestions, setEditingQuestions] = useState<QuizQuestion[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // --- Dosen Delete / Reset Quiz Score State (Hanya Dosen yang berhak) ---
  const [deleteModalQuiz, setDeleteModalQuiz] = useState<{
    id: string;
    studentId?: string;
    studentName: string;
    score: number;
  } | null>(null);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState<boolean>(false);
  const [deleteQuizFeedback, setDeleteQuizFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteQuizSubmission = async () => {
    if (!deleteModalQuiz) return;
    setIsDeletingQuiz(true);
    setDeleteQuizFeedback(null);
    try {
      const res = await deleteQuizSubmissionApi(deleteModalQuiz.id, deleteModalQuiz.studentId);
      if (res.success) {
        setSubmissions(prev => prev.filter(s => s.id !== deleteModalQuiz.id));
        setDeleteQuizFeedback({
          type: 'success',
          text: `Nilai kuis ${deleteModalQuiz.studentName} berhasil dihapus. Akses kuis dibuka kembali untuk mahasiswa bersangkutan.`,
        });
        setTimeout(() => {
          setDeleteModalQuiz(null);
          setDeleteQuizFeedback(null);
        }, 1500);
        if (onRefreshData) onRefreshData();
      } else {
        setDeleteQuizFeedback({
          type: 'error',
          text: res.error || 'Gagal menghapus nilai kuis mahasiswa.',
        });
      }
    } catch {
      setDeleteQuizFeedback({
        type: 'error',
        text: 'Terjadi kesalahan sistem saat menghapus nilai kuis.',
      });
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  // Load quiz data
  const loadData = async () => {
    setIsLoading(true);
    const res = await fetchQuizApi();
    if (res.success && res.questions && res.questions.length > 0) {
      setQuestions(res.questions);
      setEditingQuestions(JSON.parse(JSON.stringify(res.questions)));
      setSubmissions(res.submissions || []);
    }
    const sRes = await fetchQuizSettingsApi();
    if (sRes.success && sRes.settings) {
      const sanitizedSettings = { ...sRes.settings };
      if ((sanitizedSettings.gameMode as string) === 'tts') {
        sanitizedSettings.gameMode = 'bebas_pilih';
      }
      setQuizSettings(sanitizedSettings);
      if (sanitizedSettings.targetMeeting) {
        setMaterialMeetingTarget(sanitizedSettings.targetMeeting);
      }
      if (
        sanitizedSettings.gameMode &&
        sanitizedSettings.gameMode !== 'bebas_pilih' &&
        ['balon', 'kodok', 'pilihan_ganda'].includes(sanitizedSettings.gameMode)
      ) {
        setActiveGameMode(sanitizedSettings.gameMode as 'balon' | 'kodok' | 'pilihan_ganda');
      }
      if (sanitizedSettings.autoAdvanceQuestions !== undefined) {
        setAutoAdvanceEnabled(sanitizedSettings.autoAdvanceQuestions);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lecturer: Save quiz active/inactive settings
  const handleSaveQuizSettings = async () => {
    setIsSavingSettings(true);
    const res = await updateQuizSettingsApi(quizSettings);
    setIsSavingSettings(false);
    if (res.success && res.settings) {
      setQuizSettings(res.settings);
      setSaveSuccessMsg('Status dan pengaturan kuis dosen berhasil diperbarui!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } else {
      alert(res.error || 'Gagal menyimpan pengaturan kuis.');
    }
  };

  // Lecturer: Handle Material Document Selection
  const handleFileMaterialSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMaterialFileName(file.name);
    const reader = new FileReader();
    if (file.name.endsWith('.txt')) {
      reader.onload = (ev) => {
        setMaterialRawText((ev.target?.result as string) || '');
      };
      reader.readAsText(file);
    } else {
      reader.onload = (ev) => {
        const res = ev.target?.result as string;
        setMaterialBase64(res || '');
      };
      reader.readAsDataURL(file);
    }
  };

  // Lecturer: Upload Material and auto-generate 10 questions
  const handleUploadMaterialAndGenerate = async () => {
    if (!materialFileName && !materialRawText.trim()) {
      alert('Pilih file dokumen materi (.docx, .pdf, .txt) atau masukkan teks ringkasan materi.');
      return;
    }
    setIsExtractingMaterial(true);
    try {
      const res = await uploadQuizMaterialApi({
        fileName: materialFileName,
        fileData: materialBase64,
        materialText: materialRawText,
        targetMeeting: materialMeetingTarget,
      });
      if (res.success && res.questions) {
        setQuestions(res.questions);
        setEditingQuestions(JSON.parse(JSON.stringify(res.questions)));
        if (res.settings) setQuizSettings(res.settings);
        setSaveSuccessMsg(res.message || '10 Soal Kuis RPS berhasil di-generate otomatis dari materi!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
        setDosenViewMode('preview');
        setMaterialFileName('');
        setMaterialBase64('');
        setMaterialRawText('');
      } else {
        alert(res.error || 'Gagal mengekstrak soal dari dokumen materi.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan saat memproses materi kuis.');
    } finally {
      setIsExtractingMaterial(false);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (quizStarted && !quizFinished) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [quizStarted, quizFinished]);

  // Webcam Proctoring Setup
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn('Video play error:', e));
        }
        setCameraActive(true);
      } else {
        setCameraError('Kamera tidak didukung oleh peramban ini.');
      }
    } catch (err: any) {
      console.warn('Camera access denied or error:', err);
      setCameraError('Izin akses kamera ditolak atau perangkat kamera tidak ditemukan.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Clean up camera and audio on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      cartoonAudio.stopMusic();
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    };
  }, []);

  // Student starts quiz
  const handleStartQuiz = async () => {
    clearAutoAdvanceTimer();
    // Unlock Web Audio API on user interaction
    cartoonAudio.resumeAudioContext();
    cartoonAudio.playBoing();

    setSelectedAnswers({});
    setCurrentIndex(0);
    setTimerSeconds(0);
    setQuizFinished(false);
    setLastResult(null);
    setStreak(0);
    await startCamera();
    setQuizStarted(true);
  };

  // Answer selection with automatic question advance
  const handleSelectOption = (questionId: number, optionIdx: number) => {
    clearAutoAdvanceTimer();

    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx,
    }));

    // Otomatis pindah sendiri ke soal berikutnya jika opsi autoAdvance aktif dan belum soal terakhir
    if (autoAdvanceEnabled && currentIndex < questions.length - 1) {
      setIsAutoAdvancing(true);
      autoAdvanceTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1));
        setIsAutoAdvancing(false);
        autoAdvanceTimeoutRef.current = null;
      }, 850);
    }
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    clearAutoAdvanceTimer();
    if (!currentStudent && !isDosen) {
      alert('Pilih nama mahasiswa Anda terlebih dahulu di bagian atas untuk menyimpan nilai kuis!');
      return;
    }

    const studentId = currentStudent ? currentStudent.id : 'mhs-simulasi-dosen';
    const studentName = currentStudent ? currentStudent.name : 'Dosen Pengampu (Simulasi)';

    setSubmitting(true);
    const res = await submitQuizApi({
      studentId,
      studentName,
      answers: selectedAnswers,
      cameraVerified: cameraActive,
      timeTakenSeconds: timerSeconds,
    });

    setSubmitting(false);
    if (res.success && typeof res.score === 'number') {
      cartoonAudio.playCheer();
      cartoonAudio.stopMusic();

      setLastResult({
        score: res.score,
        correctCount: res.correctCount || 0,
        totalQuestions: res.totalQuestions || questions.length,
        explanationMap: res.explanationMap,
      });
      setQuizFinished(true);
      stopCamera();
      if (onRefreshData) onRefreshData();
      loadData();
    } else {
      alert(res.error || 'Gagal mengirimkan jawaban kuis.');
    }
  };

  // Auto-generate 10 questions from RPS
  const handleAutoGenerateRps = async () => {
    setIsLoading(true);
    const res = await autoGenerateQuizApi();
    setIsLoading(false);
    if (res.success && res.questions) {
      setQuestions(res.questions);
      setEditingQuestions(JSON.parse(JSON.stringify(res.questions)));
      setSaveSuccessMsg(res.message || '10 Soal Kuis RPS berhasil di-generate!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } else {
      alert(res.error || 'Gagal generate soal kuis');
    }
  };

  // Save edited questions
  const handleSaveQuestions = async () => {
    setIsLoading(true);
    const res = await updateQuizQuestionsApi(editingQuestions);
    setIsLoading(false);
    if (res.success && res.questions) {
      setQuestions(res.questions);
      setSaveSuccessMsg('Daftar 10 Soal Kuis RPS berhasil diperbarui dan disimpan!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      setDosenViewMode('preview');
    } else {
      alert(res.error || 'Gagal menyimpan pembaruan soal.');
    }
  };

  // Find existing student submission
  const mySubmission = currentStudent
    ? submissions.find(s => s.studentId === currentStudent.id)
    : null;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper for animated topic icons
  const renderTopicIcon = (theme?: string) => {
    switch (theme) {
      case 'atom':
        return <Atom className="text-cyan-500 animate-spin-slow" size={28} />;
      case 'compass':
        return <Compass className="text-emerald-500 animate-pulse" size={28} />;
      case 'scale':
        return <Scale className="text-amber-500" size={28} />;
      case 'target':
        return <Target className="text-red-500" size={28} />;
      case 'shield':
        return <Shield className="text-indigo-500" size={28} />;
      case 'lightbulb':
        return <Lightbulb className="text-yellow-500 animate-bounce" size={28} />;
      case 'book':
        return <Book className="text-teal-500" size={28} />;
      case 'brain':
      default:
        return <Brain className="text-purple-500 animate-pulse" size={28} />;
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-amber-700 via-orange-600 to-amber-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 bg-radial from-white to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-amber-950/40 text-amber-200 text-xs font-bold px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5 shadow-xs">
                <Gamepad2 size={14} className="text-amber-300" />
                Game Cerdas Cermat RPS
              </span>
              <span className="bg-white/15 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                10 Soal Interaktif
              </span>
              <span className="bg-emerald-500/20 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <Camera size={12} /> Proctoring Kamera
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-serif-title">
              Kuis Evaluasi Pemahaman RPS ({courseTitle})
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Uji ketajaman analisis materi 16 pertemuan perkuliahan dengan sistem pengawasan kamera otomatis.
              Skor langsung terbit dan terintegrasi otomatis ke nilai keaktifan SIAKAD.
            </p>
          </div>

          {/* Dosen Control Tabs */}
          {isDosen ? (
            <div className="flex flex-wrap items-center gap-2 bg-black/25 p-1.5 rounded-xl border border-white/15 backdrop-blur-xs">
              <button
                onClick={() => setDosenViewMode('preview')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'preview' ? 'bg-white text-amber-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                <Play size={13} />
                <span>Simulasi Mahasiswa</span>
              </button>
              <button
                onClick={() => setDosenViewMode('upload')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'upload' ? 'bg-white text-amber-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                <Upload size={13} />
                <span>Upload Materi Kuis</span>
              </button>
              <button
                type="button"
                id="btn-quiz-auto-generate-header"
                disabled={isLoading}
                onClick={handleAutoGenerateRps}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title="Generate otomatis 10 soal pilihan ganda interaktif dari 16 pertemuan RPS"
              >
                <Sparkles size={13} className={isLoading ? 'animate-spin' : ''} />
                <span>{isLoading ? 'Menyinkronkan...' : '✨ Buat Soal Otomatis Kuis'}</span>
              </button>
              <button
                onClick={() => setDosenViewMode('edit')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'edit' ? 'bg-white text-amber-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                <Edit3 size={13} />
                <span>Atur 10 Soal RPS</span>
              </button>
              <button
                onClick={() => setDosenViewMode('settings')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'settings' ? 'bg-white text-amber-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                <Settings size={13} />
                <span>Jadwal & Status Kuis</span>
              </button>
              <button
                onClick={() => setDosenViewMode('matrix')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'matrix' ? 'bg-white text-amber-950 shadow-md font-black' : 'text-white/80 hover:text-white'
                }`}
              >
                <Activity size={13} className={dosenViewMode === 'matrix' ? 'text-orange-600' : 'text-amber-300 animate-pulse'} />
                <span>Matriks Point & Live Monitor</span>
              </button>
              <button
                onClick={() => setDosenViewMode('recap')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  dosenViewMode === 'recap' ? 'bg-white text-amber-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
              >
                <Award size={13} />
                <span>Rekap Nilai ({submissions.length})</span>
              </button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-200">
                <Award size={22} />
              </div>
              <div>
                <div className="text-[11px] text-amber-200 uppercase tracking-wider font-bold">Status Anda</div>
                <div className="text-sm font-bold text-white">
                  {mySubmission ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Selesai: {mySubmission.score}/100 Poin
                    </span>
                  ) : quizSettings?.isQuizActive ? (
                    <span className="text-emerald-200 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Kuis Aktif ({quizSettings.targetMeeting || 'RPS'})
                    </span>
                  ) : (
                    <span className="text-amber-200">Kuis Belum Dibuka</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOSEN VIEW: UPLOAD MATERI KUIS RPS                                        */}
      {/* ========================================================================= */}
      {isDosen && dosenViewMode === 'upload' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="text-amber-600" size={20} />
                Upload Dokumen Materi RPS & Generate 10 Soal Otomatis
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Unggah file materi perkuliahan (.docx, .pdf, .txt) atau masukkan ringkasan materi untuk langsung diolah menjadi 10 soal kuis pilihan ganda.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full w-fit">
              Otomatis Sinkron 10 Soal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload File Box */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Pilih Berkas Materi (.DOCX, .PDF, .TXT)
              </label>
              <div
                onClick={() => materialInputRef.current?.click()}
                className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
              >
                <input
                  ref={materialInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt,.doc"
                  onChange={handleFileMaterialSelect}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
                  <FileText size={26} />
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-800">
                  {materialFileName ? materialFileName : 'Klik atau Tarik File Materi ke Sini'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Format didukung: Word (.docx), PDF, Text (.txt)
                </div>
              </div>

              {materialFileName && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-semibold">
                  <span className="truncate">File terpilih: {materialFileName}</span>
                  <button
                    onClick={() => {
                      setMaterialFileName('');
                      setMaterialBase64('');
                    }}
                    className="text-red-600 hover:underline font-bold text-[11px] ml-2"
                  >
                    Hapus
                  </button>
                </div>
              )}
            </div>

            {/* Target Meeting & Raw Text */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Pertemuan Perkuliahan RPS
                </label>
                <select
                  value={materialMeetingTarget}
                  onChange={e => setMaterialMeetingTarget(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Semua Pertemuan (1 - 16)">Semua Pertemuan (Silabus Lengkap 1 - 16)</option>
                  {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={`Pertemuan ${num}`}>
                      Pertemuan {num}: {meetings.find(m => m.meetingNumber === num)?.topic || `Materi RPS Sesi ${num}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atau Tempel Ringkasan Materi / Silabus (Opsional)
                </label>
                <textarea
                  rows={4}
                  value={materialRawText}
                  onChange={e => setMaterialRawText(e.target.value)}
                  placeholder="Ketik atau tempel rangkuman materi di sini jika tidak menggunakan file dokumen..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Sistem akan membedah materi perkuliahan menjadi 10 butir pertanyaan kritis dengan 4 pilihan opsi dan kunci jawaban yang valid.
            </div>
            <button
              onClick={handleUploadMaterialAndGenerate}
              disabled={isExtractingMaterial || (!materialFileName && !materialRawText.trim())}
              className="px-6 py-2.5 rounded-xl bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isExtractingMaterial ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Mengekstrak 10 Soal...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Proses & Susun 10 Soal Otomatis</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOSEN VIEW: SETTINGS & SCHEDULE (KUIS TIDAK SELALU SETIAP PERTEMUAN)      */}
      {/* ========================================================================= */}
      {isDosen && dosenViewMode === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="text-amber-600" size={20} />
                Pengaturan Pelaksanaan & Jadwal Kuis Dosen
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Kuis tidak wajib dilaksanakan pada setiap pertemuan. Dosen bebas mengaktifkan atau menutup kuis sewaktu-waktu sesuai kebutuhan silabus.
              </p>
            </div>
            <button
              onClick={handleSaveQuizSettings}
              disabled={isSavingSettings}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-5 max-w-2xl">
            {/* Status Switch */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-slate-900">Status Akses Kuis Mahasiswa</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Jika diaktifkan (ON), mahasiswa dapat mengerjakan kuis. Jika ditutup (OFF), mahasiswa akan melihat pemberitahuan bahwa kuis belum dibuka.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setQuizSettings(prev => ({
                    ...prev,
                    isQuizActive: !prev.isQuizActive,
                  }))
                }
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                  quizSettings.isQuizActive ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    quizSettings.isQuizActive ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Cartoon Game Mode Selection by Lecturer */}
            <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 space-y-3">
              <div>
                <label className="block text-xs font-black text-amber-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Gamepad2 size={16} className="text-amber-600" />
                  Format Mode Game Animasi Kartun (Diatur Dosen)
                </label>
                <p className="text-xs text-amber-800/90 leading-relaxed">
                  Tentukan mode visual interaktif yang dihadapi mahasiswa: Tembak Balon Jawaban, Lompat Kodok Teratai, Pilihan Ganda Kartun, atau Bebas Pilih.
                </p>
              </div>

              <select
                value={quizSettings.gameMode || 'bebas_pilih'}
                onChange={e =>
                  setQuizSettings(prev => ({
                    ...prev,
                    gameMode: e.target.value as any,
                  }))
                }
                className="w-full text-xs sm:text-sm font-bold p-3 rounded-xl border border-amber-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-xs"
              >
                <option value="bebas_pilih">🌟 Bebas Pilih — Mahasiswa Bebas Memilih Mode Game Kartun Favorit</option>
                <option value="balon">🎈 Tembak Balon — Tembak Balon Huruf Jawaban di Angkasa Cerah</option>
                <option value="kodok">🐸 Lompat Kodok — Lompatkan Katak Filo ke Daun Teratai Jawaban</option>
                <option value="pilihan_ganda">🎯 Pilihan Ganda — Format Kartun Ceria Klasik</option>
              </select>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200/80">
                <span className="text-xs font-bold text-amber-900">
                  Izinkan Mahasiswa Berganti Mode Game saat Mengerjakan:
                </span>
                <input
                  type="checkbox"
                  checked={quizSettings.allowStudentModeSelection !== false}
                  onChange={e =>
                    setQuizSettings(prev => ({
                      ...prev,
                      allowStudentModeSelection: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200/80">
                <div>
                  <span className="text-xs font-bold text-amber-900 block">
                    Pindah Soal Otomatis (Auto-Advance):
                  </span>
                  <span className="text-[11px] text-amber-800/80">
                    Otomatis beralih ke soal berikutnya setelah mahasiswa memilih jawaban
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={quizSettings.autoAdvanceQuestions !== false}
                  onChange={e => {
                    const val = e.target.checked;
                    setQuizSettings(prev => ({
                      ...prev,
                      autoAdvanceQuestions: val,
                    }));
                    setAutoAdvanceEnabled(val);
                  }}
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Relaxing Study Music & Sound Effects Settings */}
            <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 space-y-3">
              <div>
                <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Music size={16} className="text-emerald-700" />
                  Fitur Lagu Penenang & Suara Game Lucu
                </label>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  Pengaturan efek suara animasi interaktif untuk mahasiswa saat menjawab soal kuis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Efek Suara Jawaban (SFX)</span>
                  <input
                    type="checkbox"
                    checked={quizSettings.soundEffectsEnabled !== false}
                    onChange={e =>
                      setQuizSettings(prev => ({
                        ...prev,
                        soundEffectsEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                  Pilihan Aliran Lagu Santai Bawaan
                </label>
                <select
                  value={quizSettings.defaultMusicTrack || 'lofi-calm'}
                  onChange={e =>
                    setQuizSettings(prev => ({
                      ...prev,
                      defaultMusicTrack: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-emerald-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="lofi-calm">🎵 Lofi Santai Belajar (Harmoni Lembut Fokus Akal)</option>
                  <option value="nature-pond">🐸 Kolam Katak Damai (Gemericik Air & Alam Asri)</option>
                  <option value="zen-chimes">🔔 Zen Chime Hutan Bambu (Suasana Tenang Reflektif)</option>
                </select>
              </div>
            </div>

            {/* Target Meeting */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kuis Terkait Pertemuan RPS Berapa?
              </label>
              <select
                value={quizSettings.targetMeeting}
                onChange={e =>
                  setQuizSettings(prev => ({
                    ...prev,
                    targetMeeting: e.target.value,
                  }))
                }
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="Semua Pertemuan (1 - 16)">Semua Pertemuan (Umum RPS)</option>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={`Pertemuan ${num}`}>
                    Pertemuan {num}: {meetings.find(m => m.meetingNumber === num)?.topic || `Materi Pertemuan ${num}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiz Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Kuis Evaluasi
              </label>
              <input
                type="text"
                value={quizSettings.quizTitle}
                onChange={e =>
                  setQuizSettings(prev => ({
                    ...prev,
                    quizTitle: e.target.value,
                  }))
                }
                className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Time Limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batas Waktu Pengerjaan (Menit)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={quizSettings.timeLimitMinutes || 15}
                  onChange={e =>
                    setQuizSettings(prev => ({
                      ...prev,
                      timeLimitMinutes: Number(e.target.value) || 15,
                    }))
                  }
                  className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Petunjuk / Deskripsi Kuis untuk Mahasiswa
              </label>
              <textarea
                rows={3}
                value={quizSettings.description || ''}
                onChange={e =>
                  setQuizSettings(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveQuizSettings}
                disabled={isSavingSettings}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
              >
                <Save size={15} />
                <span>Simpan Pengaturan Kuis Dosen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOSEN VIEW: EDIT QUESTIONS                                               */}
      {/* ========================================================================= */}
      {isDosen && dosenViewMode === 'edit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="text-amber-600" size={20} />
                Pengaturan 10 Soal Kuis RPS oleh Dosen
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Sesuaikan pertanyaan, opsi pilihan ganda, kunci jawaban, dan pembahasan materi perkuliahan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoGenerateRps}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200 transition-colors"
                title="Generate otomatis 10 soal bersumber dari 16 pertemuan RPS yang tersimpan"
              >
                <RefreshCw size={13} className="text-orange-600" />
                <span>Auto-Generate dari RPS</span>
              </button>
              <button
                onClick={handleSaveQuestions}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <Save size={14} />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {editingQuestions.map((q, idx) => (
              <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={q.badgeTopic || ''}
                      onChange={e => {
                        const copy = [...editingQuestions];
                        copy[idx].badgeTopic = e.target.value;
                        setEditingQuestions(copy);
                      }}
                      className="text-xs font-bold text-amber-900 bg-amber-100/60 px-2 py-1 rounded border border-amber-200 w-48 sm:w-64"
                      placeholder="Topik / Pertemuan RPS"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-500">Bobot: 10 Poin</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pertanyaan Soal</label>
                  <textarea
                    rows={2}
                    value={q.question}
                    onChange={e => {
                      const copy = [...editingQuestions];
                      copy[idx].question = e.target.value;
                      setEditingQuestions(copy);
                    }}
                    className="w-full text-xs sm:text-sm p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Opsi Pilihan Ganda (Centang radio button di sebelah kiri sebagai Kunci Jawaban Benar)
                  </label>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id || idx}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() => {
                          const copy = [...editingQuestions];
                          copy[idx].correctIndex = oIdx;
                          setEditingQuestions(copy);
                        }}
                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                        title="Tandai sebagai jawaban benar"
                      />
                      <span className="text-xs font-bold text-slate-500 w-5">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const copy = [...editingQuestions];
                          copy[idx].options[oIdx] = e.target.value;
                          setEditingQuestions(copy);
                        }}
                        className={`flex-1 text-xs p-2 rounded-lg border ${
                          q.correctIndex === oIdx
                            ? 'border-emerald-400 bg-emerald-50/50 font-medium text-emerald-950'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Penjelasan / Pembahasan (Muncul setelah mahasiswa selesai kuis)
                  </label>
                  <textarea
                    rows={2}
                    value={q.explanation || ''}
                    onChange={e => {
                      const copy = [...editingQuestions];
                      copy[idx].explanation = e.target.value;
                      setEditingQuestions(copy);
                    }}
                    placeholder="Pembahasan filosofis dan metodologis materi..."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveQuestions}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors"
            >
              <Save size={16} />
              <span>Simpan Seluruh Soal Kuis RPS</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOSEN VIEW: LIVE MONITORING & POINT MATRIX (SIAPA LEBIH DULU SELESAI)     */}
      {/* ========================================================================= */}
      {isDosen && dosenViewMode === 'matrix' && (
        <QuizMonitoringMatrix
          students={students}
          submissions={submissions}
          courseTitle={courseTitle}
          onRefresh={loadData}
        />
      )}

      {/* ========================================================================= */}
      {/* DOSEN VIEW: RECAP SUBMISSIONS                                             */}
      {/* ========================================================================= */}
      {isDosen && dosenViewMode === 'recap' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="text-amber-600" size={20} />
                Rekap Nilai Kuis Cerdas Cermat RPS Mahasiswa
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Data pengerjaan, skor otomatis, dan status verifikasi kamera pengawas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDosenViewMode('matrix')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center gap-1.5 transition-colors"
              >
                <Activity size={13} className="text-amber-700" />
                <span>Buka Matriks Point Live</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportQuizRecap({
                    campusName: 'STAI Jarinabi',
                    dosenFullName: 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
                    courseTitle,
                    submissions,
                    format: 'word',
                  })
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 transition-colors"
                title="Unduh rekapan hasil kuis lengkap format Microsoft Word (.doc)"
              >
                <FileText size={13} />
                <span>Unduh Word</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportQuizRecap({
                    campusName: 'STAI Jarinabi',
                    dosenFullName: 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
                    courseTitle,
                    submissions,
                    format: 'excel',
                  })
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 transition-colors"
                title="Unduh rekapan hasil kuis lengkap format Microsoft Excel (.xls)"
              >
                <FileSpreadsheet size={13} />
                <span>Unduh Excel</span>
              </button>
              <button
                type="button"
                id="btn-quiz-print-pdf"
                onClick={() =>
                  printQuizRecapPdf({
                    campusName: 'STAI Jarinabi',
                    dosenFullName: 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
                    courseTitle,
                    submissions,
                  })
                }
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Cetak rekapan hasil kuis mahasiswa lengkap ke PDF atau printer resmi"
              >
                <Printer size={13} />
                <span>Cetak PDF</span>
              </button>
              <button
                onClick={loadData}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Segarkan</span>
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Gamepad2 size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Belum ada mahasiswa yang mengirimkan jawaban kuis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Nama Mahasiswa</th>
                    <th className="py-2.5 px-3 text-center">Skor Kuis</th>
                    <th className="py-2.5 px-3 text-center">Jawaban Benar</th>
                    <th className="py-2.5 px-3 text-center">Pengawasan Kamera</th>
                    <th className="py-2.5 px-3 text-center">Waktu Pengerjaan</th>
                    <th className="py-2.5 px-3">Tanggal Kirim</th>
                    {isDosen && <th className="py-2.5 px-3 text-center">Aksi (Hapus Nilai)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map((sub, idx) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{sub.studentName}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-xs ${
                          sub.score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                          sub.score >= 60 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {sub.score} / 100
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                        {sub.correctCount} / {sub.totalQuestions}
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
                      <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                        {formatTime(sub.timeTakenSeconds || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      {isDosen && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModalQuiz({
                                id: sub.id,
                                studentId: sub.studentId,
                                studentName: sub.studentName,
                                score: sub.score,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            title="Hapus / Reset nilai kuis mahasiswa ini jika salah"
                          >
                            <Trash2 size={12} />
                            <span>Hapus Nilai</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT QUIZ INTERFACE (OR DOSEN PREVIEW SIMULATION)                     */}
      {/* ========================================================================= */}
      {(dosenViewMode === 'preview' || !isDosen) && (
        <div className="space-y-6">
          {/* STATE 0: QUIZ INACTIVE (WHEN LECTURER HAS NOT ACTIVATED QUIZ) */}
          {!quizStarted && !quizFinished && !quizSettings.isQuizActive && !isDosen && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-6">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Kuis Saat Ini Belum Diaktifkan
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                  Pelaksanaan kuis cerdas cermat diatur oleh dosen pengampu sewaktu-waktu sesuai dengan kebutuhan silabus perkuliahan.
                  <strong> Kuis tidak selalu diadakan di setiap pertemuan.</strong>
                </p>
                <div className="mt-4 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium inline-block text-left">
                  <div className="font-bold mb-1">Informasi Dosen Pengampu:</div>
                  <div>{quizSettings.description || 'Kuis akan diaktifkan saat sesi perkuliahan berlangsung. Silakan tunggu instruksi dosen.'}</div>
                </div>
              </div>

              {mySubmission && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-left space-y-2">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    <span>Riwayat Skor Kuis Anda Sebelumnya:</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-800">
                    {mySubmission.score} / 100 Poin
                  </div>
                  <div className="text-xs text-emerald-700">
                    Diselesaikan pada {new Date(mySubmission.submittedAt).toLocaleDateString('id-ID')} dengan status verifikasi pengawas kamera.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 1: WELCOME & START SCREEN (ACTIVE OR DOSEN PREVIEW) */}
          {!quizStarted && !quizFinished && (quizSettings.isQuizActive || isDosen) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-6">
              <div className="relative inline-block">
                <div className="h-20 w-20 rounded-3xl bg-amber-500/15 text-amber-700 flex items-center justify-center mx-auto border-2 border-amber-500/30 shadow-inner">
                  <Gamepad2 size={42} className="animate-pulse" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-serif-title">
                  Siap Uji Pemahaman RPS?
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                  Terdapat <strong>10 soal pilihan ganda</strong> yang disusun khusus dari silabus 16 pertemuan RPS.
                  Pengawasan kamera diaktifkan selama mengerjakan guna verifikasi integritas akademik.
                </p>
              </div>

              {/* Student Identification & Selection */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm shadow-xs">
                      {currentStudent?.name ? currentStudent.name.charAt(0) : isDosen ? 'D' : '?'}
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-black">Peserta Kuis Mahasiswa</div>
                      <div className="text-sm font-bold text-slate-900">
                        {currentStudent ? currentStudent.name : isDosen ? 'Dosen Pengampu (Mode Simulasi)' : 'Pilih Mahasiswa Terlebih Dahulu'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStudent && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        {currentStudent.nim}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsStudentPickerOpen(!isStudentPickerOpen)}
                      className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <UserCheck size={13} />
                      <span>{currentStudent ? 'Ganti Mahasiswa' : 'Pilih Mahasiswa'}</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown student picker */}
                {isStudentPickerOpen && (
                  <div className="p-3 bg-white rounded-xl border-2 border-amber-300 shadow-md space-y-2 animate-fade-in">
                    <div className="text-xs font-bold text-slate-700">Pilih Nama Anda dari Daftar Mahasiswa:</div>
                    <select
                      value={currentStudent?.id || ''}
                      onChange={e => {
                        const targetId = e.target.value;
                        const s = students.find(item => item.id === targetId);
                        if (s && onSelectStudent) {
                          onSelectStudent(s);
                        }
                        setIsStudentPickerOpen(false);
                      }}
                      className="w-full text-xs font-bold p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih Mahasiswa --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nim} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Game Mode Selector Preview for Student */}
              <div className="text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Gamepad2 size={16} className="text-amber-600" />
                    Pilih Format Game Animasi Kartun:
                  </div>
                  {quizSettings.gameMode && quizSettings.gameMode !== 'bebas_pilih' && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                      Direkomendasikan Dosen
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveGameMode('balon');
                      cartoonAudio.playPop();
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                      activeGameMode === 'balon'
                        ? 'border-sky-500 bg-sky-50 shadow-md ring-2 ring-sky-300 scale-102'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🎈</div>
                    <div className="font-black text-xs sm:text-sm text-sky-950">Tembak Balon</div>
                    <div className="text-[11px] text-sky-800/80 leading-tight">Pecahkan balon jawaban di langit awan</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveGameMode('kodok');
                      cartoonAudio.playRibbit();
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                      activeGameMode === 'kodok'
                        ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-300 scale-102'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🐸</div>
                    <div className="font-black text-xs sm:text-sm text-emerald-950">Lompat Kodok</div>
                    <div className="text-[11px] text-emerald-800/80 leading-tight">Katak Filo melompat ke daun teratai</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveGameMode('pilihan_ganda');
                      cartoonAudio.playBoing();
                    }}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                      activeGameMode === 'pilihan_ganda'
                        ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-300 scale-102'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="font-black text-xs sm:text-sm text-indigo-950">Pilihan Ganda</div>
                    <div className="text-[11px] text-indigo-800/80 leading-tight">Format animasi kartun ceria</div>
                  </button>
                </div>
              </div>

              {/* Rules & Camera Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                    <Check size={14} className="text-amber-600" />
                    10 Soal RPS
                  </div>
                  <div className="text-[11px] text-amber-900/80">
                    Setiap soal berbobot 10 poin (total 100 poin maksimal).
                  </div>
                </div>
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                  <div className="flex items-center gap-1.5 text-cyan-800 font-bold text-xs mb-1">
                    <Camera size={14} className="text-cyan-600" />
                    Kamera Aktif
                  </div>
                  <div className="text-[11px] text-cyan-900/80">
                    Webcam menyala di pojok layar sebagai pengawas digital.
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                    <Music size={14} className="text-emerald-600" />
                    Lagu Penenang & SFX
                  </div>
                  <div className="text-[11px] text-emerald-900/80">
                    Dilengkapi musik santai & suara kartun lucu saat bermain.
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  id="btn-start-quiz"
                  type="button"
                  onClick={handleStartQuiz}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-linear-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all transform hover:scale-102 flex items-center justify-center gap-2.5 mx-auto"
                >
                  <Play size={20} className="fill-white" />
                  <span>Mulai Game Kuis Kartun & Kamera Live</span>
                </button>
              </div>

              {mySubmission && (
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                  Catatan: Anda sudah pernah mengerjakan kuis ini dengan skor{' '}
                  <strong className="text-emerald-700 font-black">{mySubmission.score} / 100</strong>.
                  Mengerjakan ulang akan memperbarui skor keaktifan Anda.
                </div>
              )}
            </div>
          )}

          {/* STATE 2: ACTIVE QUIZ WITH WEBCAM PROCTORING HUD & CARTOON GAME ENGINE */}
          {quizStarted && !quizFinished && currentQ && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Quiz Arena (3 cols) */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Progress Header & Game Mode Switcher Tabs */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs">
                        Soal {currentIndex + 1} dari {questions.length}
                      </span>
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Timer size={13} className="text-amber-600" />
                        Waktu: <span className="font-mono text-slate-900">{formatTime(timerSeconds)}</span>
                      </span>
                    </div>

                    {/* Mode Switcher Pills (If allowed by Lecturer) */}
                    {(quizSettings.allowStudentModeSelection !== false || isDosen) && (
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGameMode('balon');
                            cartoonAudio.playPop();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            activeGameMode === 'balon'
                              ? 'bg-sky-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🎈</span>
                          <span className="hidden sm:inline">Balon</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGameMode('kodok');
                            cartoonAudio.playRibbit();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            activeGameMode === 'kodok'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🐸</span>
                          <span className="hidden sm:inline">Kodok</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveGameMode('pilihan_ganda');
                            cartoonAudio.playBoing();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            activeGameMode === 'pilihan_ganda'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <span>🎯</span>
                          <span className="hidden sm:inline">Pilihan</span>
                        </button>
                      </div>
                    )}

                    {/* Auto-Advance Toggle for Student */}
                    <button
                      type="button"
                      onClick={() => {
                        setAutoAdvanceEnabled(prev => !prev);
                        clearAutoAdvanceTimer();
                      }}
                      title="Nyalakan atau matikan otomatis pindah ke soal berikutnya setelah memilih jawaban"
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
                        autoAdvanceEnabled
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>⏩</span>
                      <span className="hidden sm:inline">Pindah Otomatis:</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                          autoAdvanceEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {autoAdvanceEnabled ? 'AKTIF' : 'OFF'}
                      </span>
                    </button>

                    {/* Question Navigator Dots */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {questions.map((q, idx) => (
                        <button
                          key={q.id || idx}
                          type="button"
                          onClick={() => handleSelectQuestionIndex(idx)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                            currentIndex === idx
                              ? 'bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1'
                              : selectedAnswers[q.id] !== undefined
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={`Soal ${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-advancing notification banner */}
                  {isAutoAdvancing && (
                    <div className="bg-emerald-500/15 border-2 border-emerald-400 text-emerald-950 px-4 py-2 rounded-2xl text-xs font-black flex items-center justify-between shadow-xs animate-pulse">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✨</span>
                        <span>Jawaban tersimpan! Membuka soal nomor {currentIndex + 2}...</span>
                      </div>
                      <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-lg font-mono">
                        Pindah Otomatis ⏩
                      </span>
                    </div>
                  )}

                  {/* Completion alert if currently on the last question */}
                  {currentIndex === questions.length - 1 && selectedAnswers[currentQ.id] !== undefined && (
                    <div className="bg-amber-500/15 border-2 border-amber-400 text-amber-950 px-4 py-2.5 rounded-2xl text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎉</span>
                        <span>Semua soal kuis telah Anda jawab! Klik tombol <strong>Selesai & Kirim Jawaban</strong> untuk mengumpulkan nilai.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={submitting}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 animate-bounce"
                      >
                        <span>{submitting ? 'Mengirim...' : 'Kirim Jawaban Sekarang 🚀'}</span>
                      </button>
                    </div>
                  )}

                  {/* CARTOON GAME MODE ARENA RENDERING */}
                  {activeGameMode === 'balon' && (
                    <CartoonBalloonGame
                      key={currentQ.id}
                      question={currentQ}
                      questionNumber={currentIndex + 1}
                      totalQuestions={questions.length}
                      selectedOptionIndex={selectedAnswers[currentQ.id]}
                      selectedAnswer={selectedAnswers[currentQ.id]}
                      onSelectOption={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onSelectAnswer={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onNextQuestion={handleGoNext}
                      onNext={handleGoNext}
                      onPrevQuestion={handleGoPrev}
                      onPrev={handleGoPrev}
                      hasPrev={currentIndex > 0}
                      hasNext={currentIndex < questions.length - 1}
                      isFirst={currentIndex === 0}
                      isLast={currentIndex === questions.length - 1}
                      isLastQuestion={currentIndex === questions.length - 1}
                      onSubmit={handleSubmitQuiz}
                      submitting={submitting}
                      answeredCount={answeredCount}
                    />
                  )}

                  {activeGameMode === 'kodok' && (
                    <CartoonFrogGame
                      key={currentQ.id}
                      question={currentQ}
                      questionNumber={currentIndex + 1}
                      totalQuestions={questions.length}
                      selectedOptionIndex={selectedAnswers[currentQ.id]}
                      selectedAnswer={selectedAnswers[currentQ.id]}
                      onSelectOption={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onSelectAnswer={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onNextQuestion={handleGoNext}
                      onNext={handleGoNext}
                      onPrevQuestion={handleGoPrev}
                      onPrev={handleGoPrev}
                      hasPrev={currentIndex > 0}
                      hasNext={currentIndex < questions.length - 1}
                      isFirst={currentIndex === 0}
                      isLast={currentIndex === questions.length - 1}
                      isLastQuestion={currentIndex === questions.length - 1}
                      onSubmit={handleSubmitQuiz}
                      submitting={submitting}
                      answeredCount={answeredCount}
                    />
                  )}

                  {activeGameMode === 'pilihan_ganda' && (
                    <CartoonMultipleChoice
                      key={currentQ.id}
                      question={currentQ}
                      questionNumber={currentIndex + 1}
                      totalQuestions={questions.length}
                      selectedOptionIndex={selectedAnswers[currentQ.id]}
                      selectedAnswer={selectedAnswers[currentQ.id]}
                      onSelectOption={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onSelectAnswer={optIdx => handleSelectOption(currentQ.id, optIdx)}
                      onNextQuestion={handleGoNext}
                      onNext={handleGoNext}
                      onPrevQuestion={handleGoPrev}
                      onPrev={handleGoPrev}
                      hasPrev={currentIndex > 0}
                      hasNext={currentIndex < questions.length - 1}
                      isFirst={currentIndex === 0}
                      isLast={currentIndex === questions.length - 1}
                      isLastQuestion={currentIndex === questions.length - 1}
                      onSubmit={handleSubmitQuiz}
                      submitting={submitting}
                      answeredCount={answeredCount}
                    />
                  )}
                </div>

              {/* Sidebar: Live Proctoring Monitor HUD (1 col) */}
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                      Pengawas AI Live
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      HUD v2.4
                    </span>
                  </div>

                  {/* Video Screen Container */}
                  <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {!cameraActive && (
                      <div className="p-4 text-center space-y-2">
                        <CameraOff className="mx-auto text-slate-500" size={32} />
                        <div className="text-xs text-slate-400 font-semibold">
                          {cameraError || 'Kamera belum aktif'}
                        </div>
                        <button
                          onClick={startCamera}
                          className="text-[11px] font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Camera size={12} />
                          <span>Aktifkan Kamera</span>
                        </button>
                      </div>
                    )}

                    {/* Scan line effect & Face target overlay */}
                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-x-0 h-0.5 bg-emerald-400/40 animate-scanline" />
                        <div className="absolute inset-8 border border-emerald-400/30 rounded-lg" />
                        <div className="absolute top-2 left-2 text-[9px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
                          REC • PROCTORING
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Peserta:</span>
                      <strong className="text-white truncate max-w-[130px]">
                        {currentStudent?.name || (isDosen ? 'Dosen' : 'Tamu')}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Status Kamera:</span>
                      <strong className={cameraActive ? 'text-emerald-400' : 'text-amber-400'}>
                        {cameraActive ? 'Terverifikasi Aktif' : 'Non-Kamera (Offline)'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Progres:</span>
                      <strong className="text-white">{answeredCount} dari 10 Soal</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400">
                    <span>SIAKAD Proctor v2</span>
                    <button
                      onClick={cameraActive ? stopCamera : startCamera}
                      className="text-xs text-slate-300 hover:text-white underline"
                    >
                      {cameraActive ? 'Matikan' : 'Nyalakan'}
                    </button>
                  </div>
                </div>

                {/* Quick submit trigger */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    Poin Langsung Dihitung
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Pastikan seluruh 10 soal sudah Anda jawab dengan yakin sebelum menekan tombol Kirim.
                  </p>
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                  >
                    {submitting ? 'Sedang Menilai...' : `Kirim Jawaban (${answeredCount}/10)`}
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* STATE 3: RESULT SCREEN WITH ANIMATED POINTS & EXPLANATIONS */}
          {quizFinished && lastResult && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-10 max-w-3xl mx-auto space-y-8 animate-fade-in">
              {/* Score Header */}
              <div className="text-center space-y-3">
                <div className="inline-flex p-3 rounded-3xl bg-amber-100 text-amber-800 border-2 border-amber-300">
                  <Award size={48} className="animate-bounce" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif-title">
                  Kuis Cerdas Cermat Selesai!
                </h3>
                <p className="text-slate-600 text-xs sm:text-sm">
                  Evaluasi otomatis atas penguasaan materi 16 pertemuan RPS telah berhasil dihitung.
                </p>

                {/* Big Score Box */}
                <div className="py-5 px-6 rounded-2xl bg-linear-to-b from-amber-500/10 to-orange-500/15 border-2 border-amber-400/40 inline-block">
                  <div className="text-xs font-black tracking-widest text-amber-900 uppercase">
                    POIN AKHIR ANDA
                  </div>
                  <div className="text-5xl sm:text-6xl font-black text-amber-700 font-mono my-1">
                    {lastResult.score}
                    <span className="text-2xl text-slate-500 font-sans"> / 100</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={14} />
                    {lastResult.correctCount} dari {lastResult.totalQuestions} Soal Terjawab Benar
                  </div>
                </div>
              </div>

              {/* Badges / Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Waktu Pengerjaan</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                    {formatTime(timerSeconds)}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-[11px] text-slate-500 font-bold uppercase">Verifikasi Kamera</div>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                    <Camera size={14} />
                    {cameraActive || lastResult ? 'Terekam Aktif' : 'Non-Kamera'}
                  </div>
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-[11px] text-emerald-800 font-bold uppercase">Integrasi SIAKAD</div>
                  <div className="text-sm font-bold text-emerald-900 mt-0.5 flex items-center justify-center gap-1">
                    <ShieldCheck size={14} />
                    Sinkron ke Nilai Sikap
                  </div>
                </div>
              </div>

              {/* Review All 10 Questions with Explanations */}
              <div className="space-y-4">
                <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <BookOpen className="text-amber-600" size={18} />
                  Pembahasan & Evaluasi Jawaban 10 Soal RPS:
                </h4>

                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const studentAns = selectedAnswers[q.id];
                    const isCorrect = studentAns === q.correctIndex;
                    const expInfo = lastResult.explanationMap?.[q.id];

                    return (
                      <div
                        key={q.id || idx}
                        className={`p-4 rounded-xl border ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-rose-200 bg-rose-50/40'
                        } space-y-2`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {q.badgeTopic || `Soal ${idx + 1}`}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              isCorrect
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isCorrect ? '+10 Poin (Benar)' : '0 Poin (Salah)'}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-semibold text-slate-900">
                          {q.question}
                        </p>

                        <div className="text-xs space-y-1 pt-1">
                          <div className="text-slate-600">
                            Jawaban Anda:{' '}
                            <strong className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                              {studentAns !== undefined
                                ? `${String.fromCharCode(65 + studentAns)}. ${q.options[studentAns]}`
                                : 'Tidak dijawab'}
                            </strong>
                          </div>
                          {!isCorrect && (
                            <div className="text-emerald-800 font-semibold">
                              Kunci Jawaban Benar:{' '}
                              <strong>
                                {String.fromCharCode(65 + q.correctIndex)}. {q.options[q.correctIndex]}
                              </strong>
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <div className="text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200 mt-2">
                            <strong className="text-amber-900">Pembahasan RPS:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer action */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handleStartQuiz}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>Ulangi Kuis untuk Latihan</span>
                </button>

                <button
                  onClick={() => {
                    setQuizStarted(false);
                    setQuizFinished(false);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Kembali ke Beranda Kuis
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI HAPUS NILAI KUIS (KHUSUS DOSEN)                         */}
      {/* ========================================================================= */}
      {deleteModalQuiz && (
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
                  setDeleteModalQuiz(null);
                  setDeleteQuizFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {deleteQuizFeedback && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    deleteQuizFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  {deleteQuizFeedback.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold">{deleteQuizFeedback.text}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="text-slate-500 font-medium">Mahasiswa Terpilih:</div>
                <div className="text-sm font-black text-slate-900">{deleteModalQuiz.studentName}</div>
                <div className="text-xs font-bold text-rose-700">
                  Skor Saat Ini: {deleteModalQuiz.score} / 100
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data dan nilai kuis mahasiswa ini? 
                <br /><br />
                <strong className="text-slate-900">Dampak:</strong> Lembar jawaban dan perolehan skor kuis akan dihapus permanen dari sistem, dan mahasiswa dapat mengerjakan kembali kuis jika dibutuhkan.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalQuiz(null);
                    setDeleteQuizFeedback(null);
                  }}
                  disabled={isDeletingQuiz}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteQuizSubmission}
                  disabled={isDeletingQuiz}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isDeletingQuiz ? (
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
