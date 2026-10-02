import React, { useState, useMemo } from 'react';
import {
  Student,
  StudentGrade,
  IndividualSubmission,
  QuizSubmission,
  UtsSubmission,
  SiakadDatabase,
} from '../types';
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  Sparkles,
  Flame,
  CheckCircle2,
  BookOpen,
  Gamepad2,
  FileCheck,
  Printer,
  ChevronRight,
  TrendingUp,
  Star,
  Shield,
  User,
} from 'lucide-react';
import { isStudentOnline } from '../services/api';

interface LeaderboardViewProps {
  students: Student[];
  grades: Record<string, StudentGrade>;
  submissions: IndividualSubmission[];
  quizSubmissions: QuizSubmission[];
  utsSubmissions: UtsSubmission[];
  uasSubmissions: UtsSubmission[];
  attendance: Record<number, Record<string, string>>;
  currentStudentId: string | null;
  onSelectStudent: (student: Student) => void;
  isDosen: boolean;
}

export interface StudentScoreCard {
  student: Student;
  rank: number;
  totalPoints: number;
  attendancePoints: number;
  presentationPoints: number;
  quizPoints: number;
  examPoints: number;
  bonusPoints: number;
  isOnline: boolean;
  hasSubmittedTask: boolean;
  quizBestScore: number;
  utsScore?: number;
  uasScore?: number;
  badges: Array<{ name: string; icon: string; color: string }>;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  students = [],
  grades = {},
  submissions = [],
  quizSubmissions = [],
  utsSubmissions = [],
  uasSubmissions = [],
  attendance = {},
  currentStudentId,
  onSelectStudent,
  isDosen,
}) => {
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'presentation' | 'quiz' | 'exam' | 'attendance'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate scores and ranks for all students
  const studentScores: StudentScoreCard[] = useMemo(() => {
    return (students || []).map(std => {
      const studentGrade = grades[std.id] || (std.nim ? grades[std.nim] : undefined);
      const sub = submissions.find(s =>
        s.studentId === std.id ||
        (Boolean(std.nim) && (s.nim === std.nim || s.studentId === std.nim)) ||
        (s.studentName && s.studentName.toLowerCase().trim() === std.name.toLowerCase().trim())
      );
      const studentQuizzes = quizSubmissions.filter(q =>
        q.studentId === std.id ||
        (Boolean(std.nim) && (q.studentId === std.nim || (q.studentName && q.studentName.toLowerCase().trim() === std.name.toLowerCase().trim())))
      );
      const bestQuizScore = studentQuizzes.length > 0
        ? Math.max(...studentQuizzes.map(q => q.score || 0))
        : 0;

      const uts = utsSubmissions.find(u =>
        u.studentId === std.id ||
        (Boolean(std.nim) && (u.studentId === std.nim || (u.studentName && u.studentName.toLowerCase().trim() === std.name.toLowerCase().trim())))
      );
      const uas = uasSubmissions.find(u =>
        u.studentId === std.id ||
        (Boolean(std.nim) && (u.studentId === std.nim || (u.studentName && u.studentName.toLowerCase().trim() === std.name.toLowerCase().trim())))
      );
      const utsScore = (uts && uts.grade !== undefined && uts.grade > 0)
        ? uts.grade
        : (studentGrade?.utsScore !== undefined && studentGrade.utsScore > 0 ? studentGrade.utsScore : undefined);
      const uasScore = (uas && uas.grade !== undefined && uas.grade > 0)
        ? uas.grade
        : (studentGrade?.uasScore !== undefined && studentGrade.uasScore > 0
            ? studentGrade.uasScore
            : (studentGrade?.groupScore !== undefined && studentGrade.groupScore > 0 ? studentGrade.groupScore : undefined));

      // Attendance calculation: count meetings marked 'H'
      let attendedCount = 0;
      let totalRecorded = 0;
      Object.keys(attendance).forEach(mNum => {
        const meetingAtt = attendance[Number(mNum)];
        if (meetingAtt && meetingAtt[std.id]) {
          totalRecorded++;
          if (meetingAtt[std.id] === 'H') attendedCount++;
        }
      });
      const attendancePercent = totalRecorded > 0 ? (attendedCount / totalRecorded) * 100 : 100;
      const attendancePoints = Math.round(attendancePercent);

      // Presentation score: HANYA jika dosen telah memberikan penilaian resmi
      let presentationPoints = 0;
      if (sub && sub.grade !== undefined && sub.grade > 0) {
        presentationPoints = sub.grade;
      } else if (sub && studentGrade?.individualScore !== undefined && studentGrade.individualScore > 0) {
        presentationPoints = studentGrade.individualScore;
      } else {
        presentationPoints = 0;
      }

      // Quiz Points
      const quizPoints = bestQuizScore > 0 ? bestQuizScore : 0;

      // Exam Points: HANYA dihitung jika komponen ujian telah dinilai resmi oleh dosen
      let examPoints = 0;
      if (utsScore !== undefined && uasScore !== undefined) {
        examPoints = Math.round((utsScore + uasScore) / 2);
      } else if (utsScore !== undefined) {
        examPoints = utsScore;
      } else if (uasScore !== undefined) {
        examPoints = uasScore;
      }

      // Bonus Points (online active status & promptness)
      const isOnline = isStudentOnline(std.lastActive);
      const bonusPoints = (isOnline ? 15 : 5) + (sub ? 10 : 0);

      // Total composite points
      const totalPoints = attendancePoints + presentationPoints + quizPoints + examPoints + bonusPoints;

      // Badges
      const badges: Array<{ name: string; icon: string; color: string }> = [];
      if (attendancePercent >= 95) {
        badges.push({ name: 'Presensi 100%', icon: '🌟', color: 'bg-emerald-100 text-emerald-800' });
      }
      if (presentationPoints >= 90) {
        badges.push({ name: 'Presentasi Teladan', icon: '💎', color: 'bg-indigo-100 text-indigo-800' });
      }
      if (bestQuizScore >= 90) {
        badges.push({ name: 'Master Kuis RPS', icon: '🧠', color: 'bg-amber-100 text-amber-900' });
      }
      if ((utsScore !== undefined && utsScore >= 90) || (uasScore !== undefined && uasScore >= 90)) {
        badges.push({ name: 'Cendekiawan Filsafat', icon: '📜', color: 'bg-purple-100 text-purple-800' });
      }

      return {
        student: std,
        rank: 0,
        totalPoints,
        attendancePoints,
        presentationPoints,
        quizPoints,
        examPoints,
        bonusPoints,
        isOnline,
        hasSubmittedTask: Boolean(sub),
        quizBestScore: bestQuizScore,
        utsScore,
        uasScore,
        badges,
      };
    }).sort((a, b) => {
      if (activeCategory === 'presentation') return b.presentationPoints - a.presentationPoints;
      if (activeCategory === 'quiz') return b.quizPoints - a.quizPoints;
      if (activeCategory === 'exam') return b.examPoints - a.examPoints;
      if (activeCategory === 'attendance') return b.attendancePoints - a.attendancePoints;
      return b.totalPoints - a.totalPoints;
    }).map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [students, grades, submissions, quizSubmissions, utsSubmissions, uasSubmissions, attendance, activeCategory]);

  // Filtered list by search
  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return studentScores;
    const q = searchQuery.toLowerCase();
    return studentScores.filter(
      item =>
        item.student.name.toLowerCase().includes(q) ||
        (item.student.nim && item.student.nim.includes(q)) ||
        (item.student.rpsPart && item.student.rpsPart.toLowerCase().includes(q)) ||
        (item.student.topic && item.student.topic.toLowerCase().includes(q))
    );
  }, [studentScores, searchQuery]);

  // Top 3 Podium
  const top1 = studentScores[0];
  const top2 = studentScores[1];
  const top3 = studentScores[2];

  // Current active student ranking
  const activeStudentRank = studentScores.find(s => s.student.id === currentStudentId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-amber-600/30 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-12 w-48 h-48 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-xs font-bold text-amber-200">
              <Sparkles size={14} className="text-amber-300 animate-spin" />
              <span>SIAKAD Hall of Fame & Academic Leaderboard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Trophy className="text-yellow-400 shrink-0" size={30} />
              <span>Papan Peringkat Mahasiswa MPI 1</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              Pemeringkatan berbasis total akumulasi poin keaktifan, ketepatan pengumpulan tugas presentasi, performa kuis cerdas cermat RPS, dan capaian ujian (UTS & UAS).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-xs border border-white/20 shadow-xs cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Cetak Piagam / PDF</span>
            </button>
            {activeStudentRank && (
              <div className="px-4 py-2 bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md">
                <Crown size={15} className="text-slate-900" />
                <span>Peringkat Anda: #{activeStudentRank.rank} ({activeStudentRank.totalPoints} Poin)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Trophy size={14} />
              <span>⭐ Total Akumulasi Poin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('presentation')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'presentation'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <BookOpen size={14} />
              <span>Tugas Presentasi & Makalah</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('quiz')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Gamepad2 size={14} />
              <span>Kuis Cerdas Cermat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('exam')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'exam'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileCheck size={14} />
              <span>Ujian UTS & UAS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('attendance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCategory === 'attendance'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Keaktifan Presensi</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau NIM..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM (Visual Display) */}
      {!searchQuery && top1 && top2 && top3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 items-end">
          {/* Rank 2 (Silver) */}
          <div className="order-2 md:order-1 bg-gradient-to-b from-slate-100 via-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 border-2 border-slate-300 dark:border-slate-700 shadow-md text-center relative flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-extrabold flex items-center justify-center text-lg shadow-inner mb-3 border-2 border-slate-300">
              🥈 2
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Runner Up / Perak
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-full">
              {top2.student.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">NIM: {top2.student.nim}</p>

            <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-sm">
              {activeCategory === 'presentation' ? `${top2.presentationPoints} Poin Tugas` :
               activeCategory === 'quiz' ? `${top2.quizPoints} Poin Kuis` :
               activeCategory === 'exam' ? `${top2.examPoints} Poin Ujian` :
               activeCategory === 'attendance' ? `${top2.attendancePoints}% Hadir` :
               `${top2.totalPoints} Total Poin`}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1 mt-3">
              {top2.badges.map((b, i) => (
                <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.color}`}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onSelectStudent(top2.student)}
              className="mt-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Detail Tugas & Nilai</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Rank 1 (Gold - Taller Podium) */}
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 via-white to-amber-100/50 dark:from-amber-950/40 dark:via-slate-900 dark:to-amber-950/20 rounded-2xl p-6 border-2 border-amber-400 dark:border-amber-500 shadow-xl text-center relative flex flex-col items-center -mt-2 md:-mt-4">
            <div className="absolute -top-3 px-3 py-0.5 bg-amber-500 text-slate-950 rounded-full font-black text-[10px] tracking-wider uppercase shadow-md flex items-center gap-1">
              <Crown size={12} /> Juara 1 Kelas MPI 1
            </div>

            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black flex items-center justify-center text-2xl shadow-lg mb-3 ring-4 ring-amber-200 dark:ring-amber-500/40 mt-1">
              🥇 1
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
              Bintang Utama / Emas
            </span>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-full">
              {top1.student.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">NIM: {top1.student.nim} • {top1.student.rpsPart}</p>

            <div className="mt-3 px-5 py-2 rounded-full bg-amber-500 text-slate-950 font-extrabold text-base shadow-md">
              {activeCategory === 'presentation' ? `${top1.presentationPoints} Poin Tugas` :
               activeCategory === 'quiz' ? `${top1.quizPoints} Poin Kuis` :
               activeCategory === 'exam' ? `${top1.examPoints} Poin Ujian` :
               activeCategory === 'attendance' ? `${top1.attendancePoints}% Hadir` :
               `${top1.totalPoints} Total Poin`}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1 mt-3">
              {top1.badges.map((b, i) => (
                <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.color}`}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onSelectStudent(top1.student)}
              className="mt-4 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Detail Tugas & Nilai</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="order-3 md:order-3 bg-gradient-to-b from-orange-50/70 via-white to-orange-100/40 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-5 border-2 border-amber-700/40 dark:border-amber-700/60 shadow-md text-center relative flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 font-extrabold flex items-center justify-center text-lg shadow-inner mb-3 border-2 border-amber-600/50">
              🥉 3
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
              Peringkat Tiga / Perunggu
            </span>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-full">
              {top3.student.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">NIM: {top3.student.nim}</p>

            <div className="mt-3 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 font-black text-sm">
              {activeCategory === 'presentation' ? `${top3.presentationPoints} Poin Tugas` :
               activeCategory === 'quiz' ? `${top3.quizPoints} Poin Kuis` :
               activeCategory === 'exam' ? `${top3.examPoints} Poin Ujian` :
               activeCategory === 'attendance' ? `${top3.attendancePoints}% Hadir` :
               `${top3.totalPoints} Total Poin`}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1 mt-3">
              {top3.badges.map((b, i) => (
                <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.color}`}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onSelectStudent(top3.student)}
              className="mt-4 text-xs font-bold text-amber-900 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Detail Tugas & Nilai</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Tabel Peringkat 15 Mahasiswa Lengkap
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filteredRankings.length} Mahasiswa Ditampilkan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 text-center w-14">Rank</th>
                <th className="py-3 px-4">Nama Mahasiswa & NIM</th>
                <th className="py-3 px-4 text-center">Part RPS</th>
                <th className="py-3 px-4 text-center">Presensi</th>
                <th className="py-3 px-4 text-center">Tugas Presentasi</th>
                <th className="py-3 px-4 text-center">Kuis RPS</th>
                <th className="py-3 px-4 text-center">UTS & UAS</th>
                <th className="py-3 px-4 text-center">Total Poin</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRankings.map(item => {
                const isCurrent = item.student.id === currentStudentId;
                const isTop3 = item.rank <= 3;

                return (
                  <tr
                    key={item.student.id}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      <div
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                          item.rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-xs ring-2 ring-amber-300'
                            : item.rank === 2
                            ? 'bg-slate-300 text-slate-800 ring-2 ring-slate-200'
                            : item.rank === 3
                            ? 'bg-amber-700 text-white ring-2 ring-amber-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.rank}
                      </div>
                    </td>

                    {/* Name & NIM */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs">
                            {item.student.name.charAt(0)}
                          </div>
                          {item.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {item.student.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-400 text-slate-950">
                                Anda
                              </span>
                            )}
                            {item.isOnline && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                                Online
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            NIM: {item.student.nim}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Part RPS */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                        {item.student.rpsPart}
                      </span>
                    </td>

                    {/* Attendance */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {item.attendancePoints}%
                      </span>
                    </td>

                    {/* Presentation */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.presentationPoints}
                        </span>
                        {item.hasSubmittedTask ? (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Terkumpul
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
                        )}
                      </div>
                    </td>

                    {/* Quiz */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {item.quizPoints}
                      </span>
                    </td>

                    {/* Exam UTS & UAS */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                          {item.examPoints > 0 ? item.examPoints : '-'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          UTS: {item.utsScore !== undefined && item.utsScore > 0 ? item.utsScore : '-'} | UAS: {item.uasScore !== undefined && item.uasScore > 0 ? item.uasScore : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Total Points */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1 font-black text-sm text-amber-600 dark:text-amber-400">
                        <Flame size={14} className="text-amber-500" />
                        <span>{item.totalPoints}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectStudent(item.student)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Profil Aktif' : 'Pilih Profil'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
