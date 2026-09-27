import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Student, SiakadDatabase, AttendanceStatus, AppNotification } from './types';
import { INITIAL_DATABASE } from './data/initialData';
import {
  fetchDatabase,
  sendHeartbeat,
  addStudentApi,
  isStudentOnline,
} from './services/api';
import { soundAlert } from './utils/soundAlert';

import { Header } from './components/Header';
import { RpsMeetingList } from './components/RpsMeetingList';
import { IndividualTaskView } from './components/IndividualTaskView';
import { GroupProjectView } from './components/GroupProjectView';
import { AttendanceView } from './components/AttendanceView';
import { GradeRecapView } from './components/GradeRecapView';
import { UtsExamView } from './components/UtsExamView';
import { UasExamView } from './components/UasExamView';
import { DosenPortal } from './components/DosenPortal';
import { StudentSelectorModal } from './components/StudentSelectorModal';
import { DosenLoginModal } from './components/DosenLoginModal';
import { WhatsAppShareModal } from './components/WhatsAppShareModal';
import { CourseSelectorModal } from './components/CourseSelectorModal';
import { RpsDocumentModal } from './components/RpsDocumentModal';
import { SemesterTransitionModal } from './components/SemesterTransitionModal';
import { DosenProfileModal } from './components/DosenProfileModal';
import { InteractiveQuizView } from './components/InteractiveQuizView';
import { StudentBiodataModal } from './components/StudentBiodataModal';
import { TopDeadlineBanner } from './components/TopDeadlineBanner';
import { ToastNotification } from './components/ToastNotification';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { DailyMotivationCard } from './components/DailyMotivationCard';
import { StudentGradeDashboardCard } from './components/StudentGradeDashboardCard';
import { StudentMessageModal } from './components/StudentMessageModal';
import { LeaderboardView } from './components/LeaderboardView';
import {
  calculateAllDeadlines,
  getRecentSubmissionsList,
  isUrgentDeadlineSimulated,
  setUrgentDeadlineSimulation,
  setCustomDeadline,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './utils/deadlineNotifier';

import {
  Calendar,
  BookOpen,
  Users,
  Award,
  ShieldCheck,
  Smartphone,
  Share2,
  CheckCircle2,
  Wifi,
  WifiOff,
  FileQuestion,
  Gamepad2,
  Film,
  MessageSquare,
  Trophy,
} from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<SiakadDatabase>(INITIAL_DATABASE);
  const [isOffline, setIsOffline] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => {
    return localStorage.getItem('siakad_current_student_id') || 'mhs-1';
  });
  const [isDosen, setIsDosen] = useState<boolean>(() => {
    return sessionStorage.getItem('siakad_dosen_auth') === 'true';
  });

  // Dark / Light Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('siakad_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('siakad_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [activeTab, setActiveTab] = useState<string>('jadwal');
  const [selectedStudentForTask, setSelectedStudentForTask] = useState<Student | null>(null);

  // Audio state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('siakad_sound_enabled') !== 'false';
  });
  const prevOnlineIdsRef = useRef<Set<string>>(new Set());

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isAddStudentMode, setIsAddStudentMode] = useState(false);
  const [isDosenLoginOpen, setIsDosenLoginOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCourseSelectorOpen, setIsCourseSelectorOpen] = useState(false);
  const [isRpsModalOpen, setIsRpsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSemesterTransitionOpen, setIsSemesterTransitionOpen] = useState(false);
  const [isBiodataModalOpen, setIsBiodataModalOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isStudentMessageOpen, setIsStudentMessageOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isDeadlineSimulated, setIsDeadlineSimulated] = useState<boolean>(() => {
    return isUrgentDeadlineSimulated();
  });
  const prevSubmissionsCountRef = useRef<number>(-1);
  const hasChimedDeadlineRef = useRef<boolean>(false);

  // Load database function
  const reloadData = useCallback(async () => {
    const res = await fetchDatabase();
    setDb(res.db);
    setIsOffline(res.isOffline);
  }, []);

  // Initial load
  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Periodic data polling every 12 seconds for real-time multi-device sync
  useEffect(() => {
    const interval = setInterval(() => {
      reloadData();
    }, 12000);
    return () => clearInterval(interval);
  }, [reloadData]);

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      soundAlert.enableAudio();
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Monitor active online students and trigger sound alert when a new student comes online
  useEffect(() => {
    if (!db?.students || db.students.length === 0) return;

    const currentOnlineStudents = db.students.filter(s => isStudentOnline(s.lastActive));
    const currentOnlineIds = new Set(currentOnlineStudents.map(s => s.id));

    // Check if any student is newly online compared to previous set
    if (prevOnlineIdsRef.current.size > 0 && soundEnabled) {
      let hasNewOnlineStudent = false;
      for (const id of currentOnlineIds) {
        if (!prevOnlineIdsRef.current.has(id)) {
          hasNewOnlineStudent = true;
          break;
        }
      }
      if (hasNewOnlineStudent) {
        soundAlert.playOnlineChime();
      }
    }

    prevOnlineIdsRef.current = currentOnlineIds;
  }, [db?.students, soundEnabled]);

  const handleToggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('siakad_sound_enabled', String(next));
      if (next) {
        soundAlert.enableAudio();
        soundAlert.playOnlineChime();
      }
      return next;
    });
  };

  // Current student object
  const currentStudent = (db?.students || []).find(s => s.id === currentStudentId) || db?.students?.[0] || null;

  // Send presence heartbeat periodically if a student is chosen
  useEffect(() => {
    if (!currentStudent || isDosen) return;

    // Send immediately
    sendHeartbeat(currentStudent.id, currentStudent.name);

    // And repeat every 25 seconds
    const hbInterval = setInterval(() => {
      sendHeartbeat(currentStudent.id, currentStudent.name);
    }, 25000);

    return () => clearInterval(hbInterval);
  }, [currentStudent, isDosen]);

  // Handle student selection
  const handleSelectStudent = (student: Student) => {
    setCurrentStudentId(student.id);
    setSelectedStudentForTask(student);
    localStorage.setItem('siakad_current_student_id', student.id);
    sendHeartbeat(student.id, student.name);
  };

  // Add new student
  const handleAddNewStudent = async (data: {
    name: string;
    nim: string;
    rpsPart: string;
    topic: string;
    meetingNumber: number;
    groupId: number;
  }) => {
    const newStd = await addStudentApi(data);
    if (newStd) {
      handleSelectStudent(newStd);
    }
    await reloadData();
  };

  const handleOpenAddStudentModal = () => {
    setIsAddStudentMode(true);
    setIsStudentModalOpen(true);
  };

  // Dosen login
  const handleDosenLoginSuccess = () => {
    setIsDosen(true);
    sessionStorage.setItem('siakad_dosen_auth', 'true');
    setActiveTab('portal-dosen');
  };

  // Dosen logout
  const handleDosenLogout = () => {
    setIsDosen(false);
    sessionStorage.removeItem('siakad_dosen_auth');
    setActiveTab('jadwal');
  };

  // Count active online students
  const activeOnlineCount = (db?.students || []).filter(s => isStudentOnline(s.lastActive)).length;

  // Calculate upcoming deadlines and urgent deadlines (< 24 jam)
  const { allDeadlines, urgentDeadlines, nearestDeadline } = useMemo(() => {
    return calculateAllDeadlines(db, currentStudent?.id || null);
  }, [db, currentStudent?.id, isDeadlineSimulated]);

  // Feed of student submissions across tasks
  const submissionsFeed = useMemo(() => {
    return getRecentSubmissionsList(db);
  }, [db]);

  // Total count of submissions across individual tasks, UTS, and UAS
  const totalSubmissionsCount = (db?.submissions?.length || 0) +
    (db?.utsSubmissions?.length || 0) +
    (db?.uasSubmissions?.length || 0) +
    (db?.groups || []).filter(g => !!g.submission?.videoUrl).length;

  // Check if current student has tasks graded by lecturer
  const studentGradedInfo = useMemo(() => {
    if (!currentStudent || isDosen) return null;
    const stdId = currentStudent.id;
    const stdNim = currentStudent.nim;
    const stdName = currentStudent.name.toLowerCase().trim();
    const studentGradeObj = db?.grades?.[stdId] || (stdNim ? Object.values(db?.grades || {}).find((_, idx) => Object.keys(db?.grades || {})[idx] === stdNim) : undefined);

    // 1. Presentation submission: check all submissions for any with grade, or check db.grades
    const allIndSubs = (db?.submissions || []).filter(
      s => s.studentId === stdId || (Boolean(stdNim) && s.nim === stdNim) || (s.studentName && s.studentName.toLowerCase().trim() === stdName)
    );
    const indSubWithGrade = allIndSubs.find(s => s.grade !== undefined);
    let indGraded = indSubWithGrade || null;

    if (!indGraded && studentGradeObj && studentGradeObj.individualScore !== undefined && studentGradeObj.individualScore > 0) {
      indGraded = {
        id: `grade-ind-${stdId}`,
        studentId: stdId,
        studentName: currentStudent.name,
        rpsPart: currentStudent.rpsPart || `Pertemuan ${currentStudent.meetingNumber || 2}`,
        topic: currentStudent.topic || 'Tugas Presentasi RPS',
        meetingNumber: currentStudent.meetingNumber || 2,
        grade: studentGradeObj.individualScore,
        feedback: studentGradeObj.notes || 'Telah dinilai oleh Dosen Pengampu',
      } as any;
    }

    // 2. UTS submission: check all UTS submissions for any with grade, or check db.grades
    const allUtsSubs = (db?.utsSubmissions || []).filter(
      u => u.studentId === stdId || (Boolean(stdNim) && u.studentId === stdNim) || (u.studentName && u.studentName.toLowerCase().trim() === stdName)
    );
    const utsSubWithGrade = allUtsSubs.find(u => u.grade !== undefined);
    let utsGraded = utsSubWithGrade || null;

    if (!utsGraded && studentGradeObj && studentGradeObj.utsScore !== undefined && studentGradeObj.utsScore > 0) {
      utsGraded = {
        id: `grade-uts-${stdId}`,
        studentId: stdId,
        studentName: currentStudent.name,
        grade: studentGradeObj.utsScore,
        feedback: 'Telah dinilai oleh Dosen Pengampu',
      } as any;
    }

    // 3. UAS Group submission
    const grp = (db?.groups || []).find(g =>
      (g.members || []).some(m => m && (m.toLowerCase().trim() === stdName || m.includes(currentStudent.name))) ||
      g.id === currentStudent.groupId
    );
    let grpGraded = grp && grp.grade !== undefined ? grp : null;

    if (!grpGraded && studentGradeObj && studentGradeObj.uasScore !== undefined && studentGradeObj.uasScore > 0) {
      grpGraded = {
        id: currentStudent.groupId || 1,
        name: grp ? grp.name : `Kelompok ${currentStudent.groupId || 1}`,
        grade: studentGradeObj.uasScore,
        feedback: 'Telah dinilai oleh Dosen Pengampu',
      } as any;
    }

    if (!indGraded && !utsGraded && !grpGraded) return null;
    return { indGraded, utsGraded, grpGraded };
  }, [db, currentStudent, isDosen]);

  // Real-time listener for incoming task submissions
  useEffect(() => {
    if (prevSubmissionsCountRef.current === -1) {
      prevSubmissionsCountRef.current = totalSubmissionsCount;
      return;
    }

    if (totalSubmissionsCount > prevSubmissionsCountRef.current) {
      const latestSub = submissionsFeed[0];
      if (latestSub) {
        setActiveToast(latestSub);
        if (soundEnabled) {
          soundAlert.playSubmissionChime();
        }
      }
      prevSubmissionsCountRef.current = totalSubmissionsCount;
    }
  }, [totalSubmissionsCount, submissionsFeed, soundEnabled]);

  // Play gentle deadline warning sound once on initial launch if there is an urgent task < 24h
  useEffect(() => {
    if (!hasChimedDeadlineRef.current && urgentDeadlines.length > 0 && soundEnabled) {
      const timer = setTimeout(() => {
        soundAlert.playDeadlineWarningChime();
        hasChimedDeadlineRef.current = true;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [urgentDeadlines.length, soundEnabled]);

  const handleToggleDeadlineSimulation = (enabled: boolean) => {
    setUrgentDeadlineSimulation(enabled);
    setIsDeadlineSimulated(enabled);
    if (enabled) {
      setActiveToast({
        id: 'toast-sim-enabled',
        type: 'deadline',
        title: 'Pengingat Deadline Diaktifkan',
        message: 'Deadline Tugas Makalah & PPT Pertemuan 2 tersisa < 24 Jam. Banner pengingat aktif di atas!',
        timestamp: new Date().toISOString(),
        targetTab: 'tugas-individu',
      });
      if (soundEnabled) {
        soundAlert.playDeadlineWarningChime();
      }
    }
  };

  const handleSetCustomDeadline = (taskId: string, isoDate: string) => {
    setCustomDeadline(taskId, isoDate);
    reloadData();
  };

  const handleTriggerTestSubmissionNotif = () => {
    setActiveToast({
      id: `toast-test-sub-${Date.now()}`,
      type: 'submission',
      title: 'Tugas Dikumpulkan: Pertemuan 2',
      message: `${currentStudent?.name || 'Ahmad Fauzi'} berhasil mengumpulkan Slide Presentasi & Makalah Filsafat Ilmu`,
      timestamp: new Date().toISOString(),
      studentName: currentStudent?.name || 'Ahmad Fauzi',
      targetTab: 'tugas-individu',
    });
    if (soundEnabled) {
      soundAlert.playSubmissionChime();
    }
  };

  const handleTriggerTestDeadlineNotif = () => {
    setActiveToast({
      id: `toast-test-dead-${Date.now()}`,
      type: 'deadline',
      title: 'Peringatan Deadline: < 24 Jam Tersisa',
      message: 'Tugas Makalah & PPT Presentasi Pertemuan 2 harus diserahkan sebelum batas waktu berakhir!',
      timestamp: new Date().toISOString(),
      targetTab: 'tugas-individu',
    });
    if (soundEnabled) {
      soundAlert.playDeadlineWarningChime();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white pb-20 sm:pb-8 transition-colors duration-200 ${
      theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      
      {/* Top Urgent Deadline Reminder Banner (< 24 Jam) */}
      {urgentDeadlines.length > 0 && (
        <TopDeadlineBanner
          urgentDeadlines={urgentDeadlines}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenDeadlineSettings={() => setIsNotificationCenterOpen(true)}
          isSimulated={isDeadlineSimulated}
          onToggleSimulation={handleToggleDeadlineSimulation}
          isDosen={isDosen}
        />
      )}

      {/* Top Header */}
      <Header
        currentStudent={currentStudent}
        isDosen={isDosen}
        isOffline={isOffline}
        activeOnlineCount={activeOnlineCount}
        courseProfile={db.courseProfile}
        coursesCount={db.courses?.length || 1}
        soundEnabled={soundEnabled}
        utsFormat={db?.utsFormat || db?.courseProfile?.utsFormat || 'esai'}
        uasFormat={db?.uasFormat || db?.courseProfile?.uasFormat || 'proyek_video'}
        unreadNotificationCount={urgentDeadlines.length + submissionsFeed.filter(s => !s.read).length}
        hasUrgentDeadline={urgentDeadlines.length > 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        onToggleSound={handleToggleSound}
        onOpenStudentSelect={() => setIsStudentModalOpen(true)}
        onOpenDosenLogin={() => setIsDosenLoginOpen(true)}
        onLogoutDosen={handleDosenLogout}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenCourseSelect={() => setIsCourseSelectorOpen(true)}
        onOpenRpsModal={() => setIsRpsModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenSemesterTransition={() => setIsSemesterTransitionOpen(true)}
        onOpenBiodataModal={() => setIsBiodataModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 sm:py-6 space-y-6">
        
        {/* Banner Pemberitahuan Tugas Telah Dinilai Dosen */}
        {studentGradedInfo && (
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border-2 border-emerald-400/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Award size={22} className="animate-bounce text-emerald-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                    Pemberitahuan Resmi Dosen
                  </span>
                  <span className="text-xs text-emerald-300 font-bold">
                    Tugas Anda Telah Dinilai Dosen Pengampu!
                  </span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed max-w-2xl space-y-1">
                  {studentGradedInfo.indGraded && (
                    <p>
                      • Tugas Presentasi &amp; Makalah ({studentGradedInfo.indGraded.rpsPart || 'RPS'}): Skor <strong className="text-emerald-300 text-sm font-extrabold">{studentGradedInfo.indGraded.grade}/100</strong>.
                      {studentGradedInfo.indGraded.feedback && ` Catatan Evaluasi Dosen: "${studentGradedInfo.indGraded.feedback}".`}
                    </p>
                  )}
                  {studentGradedInfo.utsGraded && (
                    <p>
                      • Ujian UTS 5 Esai: Nilai <strong className="text-emerald-300 text-sm font-extrabold">{studentGradedInfo.utsGraded.grade}/100</strong>.
                      {studentGradedInfo.utsGraded.feedback && ` Catatan: "${studentGradedInfo.utsGraded.feedback}".`}
                    </p>
                  )}
                  {studentGradedInfo.grpGraded && (
                    <p>
                      • Proyek UAS Video Kelompok {studentGradedInfo.grpGraded.name}: Nilai <strong className="text-emerald-300 text-sm font-extrabold">{studentGradedInfo.grpGraded.grade}/100</strong>.
                      {studentGradedInfo.grpGraded.feedback && ` Catatan: "${studentGradedInfo.grpGraded.feedback}".`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab(studentGradedInfo.indGraded ? 'tugas-individu' : studentGradedInfo.utsGraded ? 'tugas-uts' : 'nilai')}
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
              >
                Buka &amp; Lihat Rincian Nilai
              </button>
            </div>
          </div>
        )}

        {/* Daily Motivation & Educational Quotes Card */}
        <DailyMotivationCard
          studentName={currentStudent?.name}
          isDosen={isDosen}
          onOpenMessageModal={() => setIsStudentMessageOpen(true)}
        />

        {/* Dasbor Nilai & Status Akademik Mahasiswa Real-Time */}
        {!isDosen && currentStudent && (
          <StudentGradeDashboardCard
            currentStudent={currentStudent}
            grades={db.grades || {}}
            submissions={db.submissions || []}
            utsSubmissions={db.utsSubmissions || []}
            groups={db.groups || []}
            meetings={db.meetings || []}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectStudentTask={(std, meetingNumber) => {
              setSelectedStudentForTask(std);
              setActiveTab('tugas-individu');
            }}
          />
        )}

        {/* TAB 1: JADWAL & RPS 16 PERTEMUAN */}
        {activeTab === 'jadwal' && (
          <RpsMeetingList
            meetings={db.meetings}
            students={db.students}
            submissions={db.submissions}
            grades={db.grades || {}}
            currentStudent={currentStudent}
            onSelectStudentTask={(std, meetingNumber) => {
              setSelectedStudentForTask(std);
              setActiveTab('tugas-individu');
            }}
            onOpenUploadForStudent={(std, meetingNumber) => {
              setSelectedStudentForTask(std);
              setActiveTab('tugas-individu');
            }}
          />
        )}

        {/* TAB 2: TUGAS PRESENTASI (INDIVIDU/KELOMPOK) (MAKALAH & PPT PART 01 - 15) */}
        {activeTab === 'tugas-individu' && (
          <IndividualTaskView
            students={db.students}
            currentStudent={currentStudent}
            submissions={db.submissions}
            grades={db.grades || {}}
            meetings={db.meetings || []}
            onRefreshData={reloadData}
            onSelectStudent={handleSelectStudent}
            selectedStudentForTask={selectedStudentForTask}
            isDosen={isDosen}
          />
        )}

        {/* TAB 2.5: TUGAS UTS (SOAL ESSAY INDIVIDU / PROYEK VIDEO KELOMPOK) */}
        {activeTab === 'tugas-uts' && (
          <UtsExamView
            utsQuestions={db?.utsQuestions || []}
            questions={db?.utsQuestions || []}
            students={db?.students || []}
            currentStudent={currentStudent}
            utsSubmissions={db?.utsSubmissions || []}
            submissions={db?.utsSubmissions || []}
            utsFormat={db?.utsFormat || db?.courseProfile?.utsFormat || 'esai'}
            groups={db?.groups || []}
            grades={db?.grades || {}}
            isDosen={isDosen}
            examSettings={db?.utsExamSettings}
            onRefreshData={reloadData}
            onSelectStudent={handleSelectStudent}
            onOpenDosenLogin={() => setIsDosenLoginOpen(true)}
          />
        )}

        {/* TAB 3: TUGAS UAS (PROYEK VIDEO KELOMPOK / SOAL ESSAY INDIVIDU) */}
        {(activeTab === 'tugas-kelompok' || activeTab === 'tugas-uas') && (
          <UasExamView
            groups={db.groups || []}
            students={db.students || []}
            currentStudent={currentStudent}
            uasQuestions={db.uasQuestions || []}
            uasSubmissions={db.uasSubmissions || []}
            uasFormat={db?.uasFormat || db?.courseProfile?.uasFormat || 'proyek_video'}
            isDosen={isDosen}
            examSettings={db?.uasExamSettings}
            onRefreshData={reloadData}
            onSelectStudent={handleSelectStudent}
            onOpenDosenLogin={() => setIsDosenLoginOpen(true)}
          />
        )}

        {/* TAB 3.5: GAME KUIS INTERAKTIF RPS (10 SOAL + KAMERA) */}
        {activeTab === 'kuis-interaktif' && (
          <InteractiveQuizView
            students={db.students}
            currentStudent={currentStudent}
            isDosen={isDosen}
            onRefreshData={reloadData}
            onSelectStudent={handleSelectStudent}
            onOpenDosenLogin={() => setIsDosenLoginOpen(true)}
            meetings={db.meetings}
            courseTitle={db.courseProfile?.courseTitle}
          />
        )}

        {/* TAB 4: ABSENSI KULIAH 16 PERTEMUAN */}
        {activeTab === 'absensi' && (
          <AttendanceView
            students={db.students}
            meetings={db.meetings}
            attendance={db.attendance}
            attendanceNotes={db.attendanceNotes || {}}
            isDosen={isDosen}
            currentStudent={currentStudent}
            onRefreshData={reloadData}
            onOpenDosenLogin={() => setIsDosenLoginOpen(true)}
            onOpenAddStudent={handleOpenAddStudentModal}
            courseProfile={db.courseProfile}
            archivedSemesters={db.archivedSemesters || []}
            grades={db.grades}
          />
        )}

        {/* TAB 4.5: PAPAN PERINGKAT / LEADERBOARD MAHASISWA */}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            students={db.students || []}
            grades={db.grades || {}}
            submissions={db.submissions || []}
            quizSubmissions={db.quizSubmissions || []}
            utsSubmissions={db.utsSubmissions || []}
            uasSubmissions={db.uasSubmissions || []}
            attendance={db.attendance || {}}
            currentStudentId={currentStudentId}
            onSelectStudent={handleSelectStudent}
            isDosen={isDosen}
          />
        )}

        {/* TAB 5: REKAP NILAI SIAKAD */}
        {activeTab === 'nilai' && (
          <GradeRecapView
            students={db.students}
            grades={db.grades}
            groups={db.groups}
            submissions={db.submissions}
            utsSubmissions={db.utsSubmissions || []}
            uasSubmissions={db.uasSubmissions || []}
            isDosen={isDosen}
            onRefreshData={reloadData}
            courseProfile={db.courseProfile}
            meetings={db.meetings}
          />
        )}

        {/* TAB 6: PORTAL DOSEN (PASSWORD PROTECTED) */}
        {activeTab === 'portal-dosen' && isDosen && (
          <DosenPortal
            students={db.students}
            groups={db.groups}
            submissions={db.submissions}
            meetings={db.meetings}
            grades={db.grades}
            utsQuestions={db.utsQuestions || []}
            utsSubmissions={db.utsSubmissions || []}
            uasQuestions={db.uasQuestions || []}
            uasSubmissions={db.uasSubmissions || []}
            courseProfile={db.courseProfile}
            rpsRawText={db.rpsRawText}
            messages={db.messages || []}
            db={db}
            onRefreshData={reloadData}
            onOpenAddStudent={handleOpenAddStudentModal}
            onLogout={handleDosenLogout}
            onOpenCourseSelector={() => setIsCourseSelectorOpen(true)}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            onOpenSemesterTransition={() => setIsSemesterTransitionOpen(true)}
            onOpenRpsModal={() => setIsRpsModalOpen(true)}
          />
        )}

      </main>

      {/* Floating WhatsApp Share trigger for mobile */}
      <div className="fixed bottom-16 sm:bottom-6 right-4 z-30">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-xs border border-white/20 cursor-pointer"
          title="Bagikan ke WhatsApp"
        >
          <Share2 size={15} />
          <span className="hidden sm:inline">Bagikan Link ke WA</span>
        </button>
      </div>

      {/* Floating Student Message to Dosen button */}
      {!isDosen && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 z-30">
          <button
            type="button"
            onClick={() => setIsStudentMessageOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-xs border border-white/20 cursor-pointer"
            title="Kirim Pesan / Konfirmasi Pengumpulan Tugas ke Dosen"
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">Pesan / Lapor Tugas ke Dosen</span>
            <span className="sm:hidden">Lapor Dosen</span>
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('jadwal')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'jadwal' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Calendar size={17} />
          <span>RPS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tugas-individu')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'tugas-individu' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen size={17} />
          <span>Tugas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tugas-uts')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'tugas-uts' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileQuestion size={17} />
          <span>UTS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tugas-kelompok')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'tugas-kelompok' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Users size={17} />
          <span>UAS</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kuis-interaktif')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'kuis-interaktif' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Gamepad2 size={17} className={activeTab === 'kuis-interaktif' ? 'animate-bounce' : ''} />
          <span>Kuis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'leaderboard' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Trophy size={17} className={activeTab === 'leaderboard' ? 'animate-bounce text-yellow-400' : ''} />
          <span>Ranking</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nilai')}
          className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-semibold ${
            activeTab === 'nilai' ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Award size={17} />
          <span>Nilai</span>
        </button>

        {isDosen && (
          <button
            type="button"
            onClick={() => setActiveTab('portal-dosen')}
            className={`flex flex-col items-center py-1 px-1 rounded-lg text-[9px] font-bold ${
              activeTab === 'portal-dosen' ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-400 dark:text-indigo-300'
            }`}
          >
            <ShieldCheck size={17} />
            <span>Dosen</span>
          </button>
        )}
      </nav>

      {/* Modals */}
      <StudentBiodataModal
        isOpen={isBiodataModalOpen}
        onClose={() => setIsBiodataModalOpen(false)}
        students={db.students}
        isDosen={isDosen}
        onRefreshData={reloadData}
        onSelectStudent={handleSelectStudent}
      />

      <StudentSelectorModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setIsAddStudentMode(false);
        }}
        students={db.students}
        currentStudentId={currentStudentId}
        onSelectStudent={handleSelectStudent}
        onAddNewStudent={handleAddNewStudent}
        isDosen={isDosen}
        initialAddMode={isAddStudentMode}
      />

      <DosenLoginModal
        isOpen={isDosenLoginOpen}
        onClose={() => setIsDosenLoginOpen(false)}
        onLoginSuccess={handleDosenLoginSuccess}
      />

      <WhatsAppShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Multi-Course Manager Modal */}
      <CourseSelectorModal
        isOpen={isCourseSelectorOpen}
        onClose={() => setIsCourseSelectorOpen(false)}
        courses={db.courses || []}
        activeCourseId={db.activeCourseId || 'default'}
        courseProfile={db.courseProfile}
        isDosen={isDosen}
        onCourseSwitched={reloadData}
      />

      {/* View RPS Document Modal */}
      <RpsDocumentModal
        isOpen={isRpsModalOpen}
        onClose={() => setIsRpsModalOpen(false)}
        courseProfile={db.courseProfile}
        meetings={db.meetings || []}
        rpsRawText={db.rpsRawText}
      />

      {/* Dosen Profile & Campus Name Modal */}
      <DosenProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        courseProfile={db.courseProfile}
        onProfileUpdated={reloadData}
      />

      {/* Semester Transition & Archive Modal */}
      <SemesterTransitionModal
        isOpen={isSemesterTransitionOpen}
        onClose={() => setIsSemesterTransitionOpen(false)}
        profile={db.courseProfile}
        currentCourseProfile={db.courseProfile}
        meetings={db.meetings || []}
        currentMeetings={db.meetings || []}
        students={db.students || []}
        currentStudents={db.students || []}
        grades={db.grades || {}}
        currentGrades={db.grades || {}}
        attendance={db.attendance || {}}
        onSuccess={reloadData}
        onTransitionSuccess={reloadData}
      />

      {/* Real-time Toast Notification Pop-up with Sound Chime */}
      <ToastNotification
        notification={activeToast}
        onClose={() => setActiveToast(null)}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* Full Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        urgentDeadlines={urgentDeadlines}
        allDeadlines={allDeadlines}
        submissionsFeed={submissionsFeed}
        currentStudent={currentStudent}
        isDosen={isDosen}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onMarkAllRead={() => {
          markAllNotificationsAsRead(submissionsFeed.map(s => s.id));
          reloadData();
        }}
        onMarkSingleRead={(id) => {
          markNotificationAsRead(id);
          reloadData();
        }}
        isSimulated={isDeadlineSimulated}
        onToggleSimulation={handleToggleDeadlineSimulation}
        onTriggerTestSubmissionNotif={handleTriggerTestSubmissionNotif}
        onTriggerTestDeadlineNotif={handleTriggerTestDeadlineNotif}
        onSetCustomDeadline={handleSetCustomDeadline}
      />

      {/* Student to Dosen Message Modal */}
      <StudentMessageModal
        isOpen={isStudentMessageOpen}
        onClose={() => setIsStudentMessageOpen(false)}
        currentStudent={currentStudent}
        students={db.students || []}
        courseProfile={db.courseProfile}
        allMessages={db.messages || []}
        onMessageSent={reloadData}
      />

      {/* Global Footer */}
      <footer className="py-6 px-4 text-center text-xs text-slate-500 border-t border-slate-200 mt-12 bg-white/80 backdrop-blur-xs">
        <p className="text-slate-700 font-semibold">
          SIAKAD & LMS {db.courseProfile?.courseTitle || 'Filsafat Ilmu'} • {db.courseProfile?.campusName || 'STAI Jarinabi'}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Aplikasi ini dibuat oleh <span className="font-semibold text-emerald-800">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</span>
        </p>
      </footer>

    </div>
  );
}
