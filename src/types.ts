export type AttendanceStatus = 'H' | 'I' | 'S' | 'A' | 'BELUM'; // H: Hadir, I: Izin, S: Sakit, A: Alfa

export interface Student {
  id: string;
  nim: string;
  name: string;
  birthPlace?: string; // Tempat Lahir (contoh: Pasuruan, Malang, Surabaya)
  birthDate?: string;  // Tanggal Lahir (contoh: 1998-05-14)
  address?: string;    // Alamat lengkap domisili / tempat tinggal
  gender?: string;     // Laki-laki / Perempuan
  phone?: string;      // No HP / WhatsApp
  rpsPart: string;
  topic: string;
  meetingNumber: number;
  groupId: number;
  isOnline?: boolean;
  lastActive?: string;
  createdAt: string;
}

export interface GroupProject {
  id: number;
  name: string;
  members: string[];
  title: string;
  description: string;
  toolsSuggested: string;
  submission?: {
    videoUrl?: string;
    canvaUrl?: string;
    driveUrl?: string;
    aiToolsUsed: string;
    summaryNotes: string;
    submittedAt: string;
    submittedBy: string;
    fileName?: string;
    fileData?: string;
  };
  grade?: number;
  feedback?: string;
  gradedAt?: string;
}

export interface PeerReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface IndividualSubmission {
  id: string;
  studentId: string;
  nim?: string;
  studentName: string;
  rpsPart: string;
  topic: string;
  meetingNumber: number;
  pptType: 'link' | 'file';
  pptUrl?: string;
  pptFileName?: string;
  pptFileData?: string; // base64 or stored URL
  makalahType?: 'link' | 'file';
  makalahUrl?: string;
  makalahFileName?: string;
  makalahFileData?: string;
  notes?: string;
  partnerName?: string; // Nama teman/rekan kolaborasi presentasi & tugas PPT
  presentationType?: 'individu' | 'kelompok';
  submissionChoice?: 'all' | 'ppt_only' | 'makalah_only';
  submittedAt: string;
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  peerReviews?: PeerReview[];
}

export interface MeetingSchedule {
  meetingNumber: number;
  dateStr: string;
  isoDate: string;
  title: string;
  presenters: string[];
  partCodes: string[];
  type: 'kuliah' | 'uts' | 'uas';
  description: string;
  presentationFormat?: 'individu' | 'kelompok'; // Penentuan Dosen: tugas presentasi kelompok atau individu
  groupName?: string;                           // Nama kelompok jika presentasi kelompok
  groupId?: number;
  taskType?: 'makalah_ppt' | 'presentasi_kelompok' | 'uts_esai' | 'uas_proyek' | 'kuliah';
  assignmentDescription?: string;
}

export interface UtsQuestion {
  id: number;
  number: number;
  title: string;
  topic: string;
  question: string;
  rubric: string;
  maxScore: number;
  guide?: string;
}

export interface UtsSubmission {
  id: string;
  studentId: string;
  studentName: string;
  submittedAt: string;
  answers: Record<number, string>; // question number (1-5) -> answer text
  docLink?: string;                // Optional Google Docs / Drive link
  fileName?: string;
  fileData?: string;               // Optional uploaded document
  grade?: number;                  // 0 - 100
  questionScores?: Record<number, number>; // question number (1-5) -> score (0-20)
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  autoGraded?: boolean;
  aiDetectionScore?: number;       // 0 - 100% skor indikasi kecerdasan buatan / AI
  aiVerdict?: 'Orisinal Mahasiswa' | 'Campuran' | 'Terindikasi AI / Copas';
  aiDetectedFlags?: string[];      // Daftar frasa atau pola khas AI yang terdeteksi
  aiAnalysisNotes?: string;
}

export interface StudentGrade {
  attendanceScore: number; // 15%
  attitudeScore: number;   // 10% (Sikap & Keaktifan)
  individualScore?: number; // 25% (PPT & Makalah - hanya muncul setelah dinilai dosen)
  utsScore?: number;       // 25% (Tugas UTS 5 Soal Essay - hanya muncul setelah dinilai dosen)
  uasScore?: number;       // 25% (Tugas UAS Video Kelompok - hanya muncul setelah dinilai dosen)
  groupScore?: number;      // Video AI / UAS
  finalScore?: number;      // 100%
  letterGrade: string;     // A, B+, -, etc.
  notes?: string;
}

export interface DosenProfile {
  name: string;
  dosenName?: string;
  dosenTitle?: string;
  campusName?: string;
  nip: string;
  courseTitle: string;
  courseCode: string;
  sks: number;
  semester: string;
  studyProgram: string;
  classCode?: string;
  academicYear?: string;
  totalMeetings?: number;
  description?: string;
  utsFormat?: 'esai' | 'proyek_video'; // Penentuan Dosen: format UTS
  uasFormat?: 'proyek_video' | 'esai'; // Penentuan Dosen: format UAS
}

export interface CourseSummary {
  id: string;
  title: string;
  code: string;
  sks: number;
  semester: string;
  campusName: string;
  dosenName: string;
  dosenTitle: string;
  studyProgram: string;
  totalStudents?: number;
}

export interface ArchivedSemester {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  semesterName: string;
  academicYear: string;
  archivedAt: string;
  totalStudents: number;
  students: Student[];
  grades: Record<string, StudentGrade>;
  attendance: Record<number, Record<string, AttendanceStatus>>;
  meetings: MeetingSchedule[];
  submissions?: IndividualSubmission[];
  utsSubmissions?: UtsSubmission[];
  uasSubmissions?: UtsSubmission[];
  quizSubmissions?: QuizSubmission[];
  groups?: GroupProject[];
}

export type QuizGameMode = 'pilihan_ganda' | 'balon' | 'kodok' | 'bebas_pilih';

export interface QuizSettings {
  isQuizActive: boolean;
  targetMeeting: string; // e.g. "Semua Pertemuan (Review RPS)" atau "Pertemuan 7"
  quizTitle: string;
  timeLimitMinutes: number; // e.g. 15
  description?: string;
  gameMode?: QuizGameMode; // 'pilihan_ganda' | 'balon' | 'kodok' | 'bebas_pilih'
  soundEffectsEnabled?: boolean; // Suara game lucu (boing, pop, ribbit, cheer)
  musicEnabled?: boolean; // Lagu penenang agar mahasiswa tenang mengerjakan
  defaultMusicTrack?: 'lofi-calm' | 'nature-pond' | 'zen-chimes';
  allowStudentModeSelection?: boolean; // Mahasiswa boleh memilih mode permainan
  autoAdvanceQuestions?: boolean; // Pindah otomatis ke soal berikutnya setelah memilih jawaban
}

export interface QuizQuestion {
  id: number;
  number: number;
  question: string;
  options: string[]; // 4 multiple choice options [A, B, C, D]
  correctIndex: number; // 0..3
  explanation: string;
  points: number; // e.g. 10
  badgeTopic: string; // e.g. "Ontologi Filsafat", "Epistemologi", "Aksiologi"
  animationTheme: 'book' | 'brain' | 'scale' | 'atom' | 'compass' | 'lightbulb' | 'shield' | 'target';
  ttsKeyword?: string; // Kata kunci untuk Teka-Teki Silang (huruf kapital tanpa spasi, misal: ONTOLOGI)
  ttsClue?: string;    // Petunjuk singkat untuk TTS
}

export interface QuizSubmission {
  id: string;
  studentId: string;
  studentName: string;
  score: number; // 0 - 100
  correctCount: number; // 0 - 10
  totalQuestions: number; // 10
  submittedAt: string;
  cameraVerified: boolean; // Proctoring camera verified during the exam
  answers: Record<number, number>; // questionId -> chosenIndex
  timeTakenSeconds?: number;
}

export interface CourseDataPayload {
  id: string;
  profile: DosenProfile;
  meetings: MeetingSchedule[];
  rpsRawText?: string;
  students: Student[];
  groups: GroupProject[];
  submissions: IndividualSubmission[];
  utsQuestions: UtsQuestion[];
  utsSubmissions: UtsSubmission[];
  uasQuestions?: UtsQuestion[];
  uasSubmissions?: UtsSubmission[];
  quizQuestions?: QuizQuestion[];
  quizSubmissions?: QuizSubmission[];
  quizSettings?: QuizSettings;
  utsExamSettings?: ExamScheduleSettings;
  uasExamSettings?: ExamScheduleSettings;
  attendance: Record<number, Record<string, AttendanceStatus>>;
  attendanceNotes?: Record<number, Record<string, string>>;
  grades: Record<string, StudentGrade>;
}

export interface ExamScheduleSettings {
  isOpen: boolean;
  openDate?: string;
  closeDate?: string;
  instructions?: string;
  openedAt?: string;
  closedAt?: string;
  openedBy?: string;
}

export interface SiakadDatabase {
  courses?: CourseSummary[];
  activeCourseId?: string;
  allCoursesData?: Record<string, CourseDataPayload>;
  archivedSemesters?: ArchivedSemester[];
  students: Student[];
  groups: GroupProject[];
  meetings: MeetingSchedule[];
  submissions: IndividualSubmission[];
  allTimeSubmissions?: IndividualSubmission[];
  utsQuestions: UtsQuestion[];
  utsSubmissions: UtsSubmission[];
  uasQuestions?: UtsQuestion[];
  uasSubmissions?: UtsSubmission[];
  quizQuestions?: QuizQuestion[];
  quizSubmissions?: QuizSubmission[];
  quizSettings?: QuizSettings;
  utsFormat?: 'esai' | 'proyek_video';
  uasFormat?: 'proyek_video' | 'esai';
  utsExamSettings?: ExamScheduleSettings;
  uasExamSettings?: ExamScheduleSettings;
  attendance: Record<number, Record<string, AttendanceStatus>>; // meetingNumber -> studentId -> status
  attendanceNotes?: Record<number, Record<string, string>>; // meetingNumber -> studentId -> catatan/keterangan khusus
  grades: Record<string, StudentGrade>; // studentId -> StudentGrade
  activeHeartbeats: Record<string, string>; // studentId -> timestamp ISO
  courseProfile?: DosenProfile;
  rpsRawText?: string;
  dosenPassword?: string;
  messages?: StudentDosenMessage[];
  lastUpdated: string;
}

export interface StudentDosenMessage {
  id: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  category: 'tugas_makalah' | 'tugas_uts' | 'tugas_uas' | 'revisi' | 'konsultasi' | 'izin' | 'umum';
  subject: string;
  content: string;
  taskTitle?: string;
  meetingNumber?: number;
  attachmentLink?: string;
  submittedAt: string;
  read: boolean;
  replied?: boolean;
  replyText?: string;
  repliedAt?: string;
}

export interface TaskDeadlineItem {
  id: string;
  taskType: 'individu' | 'uts' | 'uas' | 'kelompok' | 'kuis';
  title: string;
  meetingNumber?: number;
  deadlineIso: string;
  deadlineFormatted: string;
  hoursRemaining: number;
  minutesRemaining: number;
  isUrgent: boolean;      // < 24 jam tersisa
  isVeryUrgent: boolean;  // < 6 jam tersisa
  isOverdue: boolean;     // Lewat deadline
  isCompleted: boolean;   // Mahasiswa terkait sudah mengumpulkan
  targetTab: string;
  studentId?: string;
  studentName?: string;
  description?: string;
}

export interface AppNotification {
  id: string;
  type: 'deadline' | 'submission' | 'grade' | 'info';
  title: string;
  message: string;
  timestamp: string;
  taskType?: string;
  studentName?: string;
  studentId?: string;
  targetTab?: string;
  read?: boolean;
  urgent?: boolean;
}

