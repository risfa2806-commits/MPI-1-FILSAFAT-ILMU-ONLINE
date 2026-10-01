import React from 'react';
import { Student, StudentGrade, IndividualSubmission, UtsSubmission, GroupProject, MeetingSchedule } from '../types';
import {
  Award,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  Video,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  UserCheck,
} from 'lucide-react';

interface StudentGradeDashboardCardProps {
  currentStudent: Student;
  grades: Record<string, StudentGrade>;
  submissions: IndividualSubmission[];
  utsSubmissions?: UtsSubmission[];
  groups?: GroupProject[];
  meetings?: MeetingSchedule[];
  onNavigateTab: (tab: string) => void;
  onSelectStudentTask?: (student: Student, meetingNumber?: number) => void;
}

export const StudentGradeDashboardCard: React.FC<StudentGradeDashboardCardProps> = ({
  currentStudent,
  grades = {},
  submissions = [],
  utsSubmissions = [],
  groups = [],
  meetings = [],
  onNavigateTab,
  onSelectStudentTask,
}) => {
  const stdId = currentStudent.id;
  const stdNim = currentStudent.nim;
  const stdName = currentStudent.name.toLowerCase().trim();
  const assignedMeetingNum = Number(currentStudent.meetingNumber) || 2;

  // 1. Individual Presentation & Makalah Submission & Grade
  const studentSubs = (submissions || []).filter(
    s => s.studentId === stdId ||
         (Boolean(stdNim) && (s.nim === stdNim || s.studentId === stdNim)) ||
         (s.studentName && s.studentName.toLowerCase().trim() === stdName) ||
         (s.studentName && stdName && (
           currentStudent.name.toLowerCase().includes(s.studentName.toLowerCase()) ||
           s.studentName.toLowerCase().includes(currentStudent.name.toLowerCase())
         ))
  );
  const gradedIndSub = studentSubs.find(s => s.grade !== undefined && s.grade > 0);
  const indSub = gradedIndSub || studentSubs[0];
  const hasSubmittedInd = Boolean(indSub && (indSub.pptUrl || indSub.makalahUrl || indSub.pptFileData || indSub.makalahFileData || indSub.submittedAt));

  const studentGradeObj = grades[stdId] || (stdNim ? grades[stdNim] : undefined);

  // Nilai tugas individu muncul jika dosen telah menilai (baik di sub.grade atau di db.grades)
  const indScore = (indSub && indSub.grade !== undefined && indSub.grade > 0)
    ? indSub.grade
    : (studentGradeObj?.individualScore !== undefined && studentGradeObj.individualScore > 0
        ? studentGradeObj.individualScore
        : undefined);
  const hasIndGrade = indScore !== undefined && indScore > 0;
  const indFeedback = indSub?.feedback || (hasIndGrade ? studentGradeObj?.notes : undefined);

  // 2. UTS Submission & Grade
  const utsSub = (utsSubmissions || []).find(
    u => u.studentId === stdId ||
         (Boolean(stdNim) && (u.studentId === stdNim || (u as any).nim === stdNim)) ||
         (u.studentName && u.studentName.toLowerCase().trim() === stdName) ||
         (u.studentName && stdName && (
           currentStudent.name.toLowerCase().includes(u.studentName.toLowerCase()) ||
           u.studentName.toLowerCase().includes(currentStudent.name.toLowerCase())
         ))
  );
  const hasSubmittedUts = Boolean(utsSub && (utsSub.docLink || utsSub.fileData || (utsSub.answers && Object.values(utsSub.answers).some(a => typeof a === 'string' && a.trim().length > 0))));
  const utsScore = (utsSub && utsSub.grade !== undefined && utsSub.grade > 0)
    ? utsSub.grade
    : (studentGradeObj?.utsScore !== undefined && studentGradeObj.utsScore > 0
        ? studentGradeObj.utsScore
        : undefined);
  const hasUtsGrade = utsScore !== undefined && utsScore > 0;
  const utsFeedback = utsSub?.feedback || (hasUtsGrade ? studentGradeObj?.notes : undefined);

  // 3. UAS Group Submission & Grade
  const studentGroup = (groups || []).find(g =>
    g.id === currentStudent.groupId ||
    (g.members || []).some(m => m && (m.toLowerCase().trim() === stdName || m.includes(currentStudent.name) || currentStudent.name.includes(m)))
  );
  const hasSubmittedUas = Boolean(studentGroup?.submission?.videoUrl || studentGroup?.submission?.driveUrl || studentGroup?.submission?.fileData);
  const uasScore = (studentGroup && studentGroup.grade !== undefined && studentGroup.grade > 0)
    ? studentGroup.grade
    : (studentGroup?.submission?.grade !== undefined && studentGroup.submission.grade > 0
        ? studentGroup.submission.grade
        : (studentGradeObj?.uasScore !== undefined && studentGradeObj.uasScore > 0
            ? studentGradeObj.uasScore
            : (studentGradeObj?.groupScore !== undefined && studentGradeObj.groupScore > 0 ? studentGradeObj.groupScore : undefined)));
  const hasUasGrade = uasScore !== undefined && uasScore > 0;
  const uasFeedback = studentGroup?.feedback || studentGroup?.submission?.feedback || (hasUasGrade ? studentGradeObj?.notes : undefined);

  // 4. Cumulative Final Grade
  // Nilai akhir kumulatif HANYA dihitung dari komponen yang sudah dinilai dosen
  const hasAnyGrade = hasIndGrade || hasUtsGrade || hasUasGrade;
  let finalScore: number | undefined = undefined;
  if (hasAnyGrade) {
    if (studentGradeObj?.finalScore !== undefined && studentGradeObj.finalScore > 0) {
      finalScore = studentGradeObj.finalScore;
    } else {
      let weight = 0.15 + 0.10;
      let wScore = (studentGradeObj?.attendanceScore || 100) * 0.15 + (studentGradeObj?.attitudeScore || 85) * 0.10;
      if (hasIndGrade) { wScore += indScore! * 0.25; weight += 0.25; }
      if (hasUtsGrade) { wScore += utsScore! * 0.25; weight += 0.25; }
      if (hasUasGrade) { wScore += uasScore! * 0.25; weight += 0.25; }
      finalScore = Math.round(wScore / weight);
    }
  }

  const letterGrade = hasAnyGrade
    ? (studentGradeObj?.letterGrade && studentGradeObj.letterGrade !== '-'
        ? studentGradeObj.letterGrade
        : (finalScore! >= 85 ? 'A' : finalScore! >= 80 ? 'A-' : finalScore! >= 75 ? 'B+' : finalScore! >= 70 ? 'B' : finalScore! >= 60 ? 'C+' : 'D'))
    : '-';
  const isPassed = finalScore !== undefined && finalScore >= 60;

  // Assigned meeting info
  const meetingInfo = (meetings || []).find(m => m.meetingNumber === assignedMeetingNum);

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 shadow-inner">
              <UserCheck size={24} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] tracking-wider uppercase">
                  Dasbor Akademik Mahasiswa
                </span>
                <span className="text-xs text-emerald-300 font-bold">
                  NIM: {currentStudent.nim}
                </span>
                <span className="text-[11px] text-slate-300">
                  • Kelompok {currentStudent.groupId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-0.5">
                {currentStudent.name}
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Tugas RPS: <strong>Pertemuan {assignedMeetingNum}</strong> ({currentStudent.rpsPart}) • Topik: <em>{currentStudent.topic}</em>
              </p>
            </div>
          </div>

          {/* Cumulative Score Pill */}
          <div className="flex items-center gap-3 self-start md:self-center bg-white/10 px-4 py-2.5 rounded-xl border border-white/15 backdrop-blur-xs">
            <div className="text-right">
              <div className="text-[10px] text-emerald-200 font-medium">Nilai Akhir Kumulatif</div>
              <div className="text-xl font-black text-white">
                {finalScore !== undefined ? `${finalScore} / 100` : '-'}
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/20"></div>
            <div className="text-center">
              <div className="text-[10px] text-emerald-200 font-medium">Predikat</div>
              <div className="text-lg font-black text-emerald-300">{letterGrade}</div>
            </div>
          </div>
        </div>

        {/* Highlight notification */}
        {hasIndGrade ? (
          <div className="mt-3.5 pt-3 border-t border-emerald-700/50 flex items-center gap-2 text-xs text-emerald-200 bg-emerald-800/40 p-2.5 rounded-xl border border-emerald-600/30">
            <Sparkles size={16} className="text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <span>
              <strong>Pemberitahuan Nilai:</strong> Tugas Presentasi &amp; Makalah Anda telah dinilai oleh Dosen Pengampu dengan skor <strong className="text-white bg-emerald-600 px-1.5 py-0.5 rounded font-extrabold">{indScore}/100</strong>.
              {indFeedback && ` Catatan Dosen: "${indFeedback}"`}
            </span>
          </div>
        ) : hasSubmittedInd ? (
          <div className="mt-3.5 pt-3 border-t border-blue-700/50 flex items-center gap-2 text-xs text-blue-200 bg-blue-900/40 p-2.5 rounded-xl border border-blue-600/30">
            <Clock size={16} className="text-blue-300 shrink-0" />
            <span>
              <strong>Status Tugas:</strong> Berkas Tugas Presentasi &amp; Makalah Pertemuan #{assignedMeetingNum} telah berhasil dikirim. Menunggu penilaian Dosen Pengampu (otomatis via rubrik maupun evaluasi manual). Nilai belum dirilis.
            </span>
          </div>
        ) : (
          <div className="mt-3.5 pt-3 border-t border-amber-700/50 flex items-center gap-2 text-xs text-amber-200 bg-amber-950/40 p-2.5 rounded-xl border border-amber-700/40">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Pengingat Tugas:</strong> Anda belum mengunggah Tugas Presentasi &amp; Makalah Pertemuan #{assignedMeetingNum}. Nilai tidak akan muncul sampai Anda mengirimkan tugas dan dinilai oleh Dosen Pengampu.
            </span>
          </div>
        )}
      </div>

      {/* Grid 4 Kolom: Rincian Status Nilai & Tugas Mahasiswa */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50/70">
        
        {/* KARTU 1: TUGAS PRESENTASI & MAKALAH */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          hasIndGrade
            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/50 shadow-xs'
            : hasSubmittedInd
            ? 'bg-blue-50/80 border-blue-200'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <FileText size={13} className="text-emerald-700" />
                Tugas Presentasi (25%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                P#{assignedMeetingNum}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-800 line-clamp-1 mb-2" title={currentStudent.topic}>
              {currentStudent.topic}
            </div>

            {hasIndGrade ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-emerald-100/90 border border-emerald-300 p-2 rounded-lg">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Award size={14} className="text-emerald-700" />
                    Nilai Dosen:
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {indScore} <span className="text-xs font-normal text-emerald-600">/ 100</span>
                  </span>
                </div>
                {indFeedback && (
                  <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded border border-emerald-200 italic line-clamp-2" title={indFeedback}>
                    💬 "{indFeedback}"
                  </p>
                )}
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Tugas Selesai &amp; Dinilai Dosen
                </div>
              </div>
            ) : hasSubmittedInd ? (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  <Clock size={13} /> Berkas Terkirim
                </div>
                <p className="text-[11px] text-slate-600">
                  Tugas telah berhasil dikirim. Menunggu Dosen Pengampu memberikan penilaian (otomatis maupun manual). Nilai belum dirilis.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg shadow-2xs">
                  <AlertCircle size={13} className="text-amber-700" /> Belum Unggah PPT
                </div>
                <p className="text-[11px] text-slate-500">
                  Silakan unggah PPT Presentasi &amp; Makalah Pertemuan #{assignedMeetingNum}. Nilai tidak akan muncul sebelum berkas diunggah dan dinilai dosen.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onSelectStudentTask) onSelectStudentTask(currentStudent, assignedMeetingNum);
              onNavigateTab('tugas-individu');
            }}
            className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              hasIndGrade
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : hasSubmittedInd
                ? 'bg-blue-700 hover:bg-blue-800 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white font-black'
            }`}
          >
            <span>
              {hasIndGrade
                ? 'Lihat Detail Nilai & Berkas'
                : hasSubmittedInd
                ? 'Periksa Berkas Terkirim'
                : 'Unggah PPT'}
            </span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* KARTU 2: UJIAN UTS 5 ESAI */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          hasUtsGrade
            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/50 shadow-xs'
            : hasSubmittedUts
            ? 'bg-blue-50/80 border-blue-200'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <BookOpen size={13} className="text-amber-700" />
                Ujian UTS 5 Esai (25%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                P#8
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-800 mb-2">
              Ujian Tengah Semester Evaluasi RPS
            </div>

            {hasUtsGrade ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-emerald-100/90 border border-emerald-300 p-2 rounded-lg">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Award size={14} className="text-emerald-700" />
                    Nilai UTS:
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {utsScore} <span className="text-xs font-normal text-emerald-600">/ 100</span>
                  </span>
                </div>
                {utsFeedback && (
                  <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded border border-emerald-200 italic line-clamp-2">
                    💬 "{utsFeedback}"
                  </p>
                )}
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Lembar UTS Dinilai Dosen
                </div>
              </div>
            ) : hasSubmittedUts ? (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  <Clock size={13} /> Jawaban Terkirim
                </div>
                <p className="text-[11px] text-slate-600">
                  Jawaban esai telah dikirim. Menunggu Dosen Pengampu menilai (otomatis via rubrik/AI maupun manual). Nilai belum dirilis.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <AlertCircle size={12} /> Belum Dikerjakan
                </div>
                <p className="text-[11px] text-slate-500">
                  5 soal esai evaluasi perkuliahan pertemuan 1-7. Nilai tidak muncul sebelum lembar dikirim dan dinilai dosen.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('tugas-uts')}
            className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
              hasUtsGrade
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            <span>{hasUtsGrade ? 'Lihat Lembar Jawaban UTS' : hasSubmittedUts ? 'Periksa Jawaban UTS' : 'Buka Lembar Soal UTS'}</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* KARTU 3: PROYEK VIDEO AI KELOMPOK (UAS) */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          hasUasGrade
            ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/50 shadow-xs'
            : hasSubmittedUas
            ? 'bg-blue-50/80 border-blue-200'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Video size={13} className="text-purple-700" />
                Proyek Video AI UAS (25%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900">
                P#16
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-800 line-clamp-1 mb-2">
              {studentGroup ? studentGroup.name : `Kelompok ${currentStudent.groupId}`}
            </div>

            {hasUasGrade ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-emerald-100/90 border border-emerald-300 p-2 rounded-lg">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Award size={14} className="text-emerald-700" />
                    Nilai UAS:
                  </span>
                  <span className="text-lg font-black text-emerald-800">
                    {uasScore} <span className="text-xs font-normal text-emerald-600">/ 100</span>
                  </span>
                </div>
                {uasFeedback && (
                  <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded border border-emerald-200 italic line-clamp-2">
                    💬 "{uasFeedback}"
                  </p>
                )}
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 size={11} /> Proyek Video Dinilai Dosen
                </div>
              </div>
            ) : hasSubmittedUas ? (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200">
                  <Clock size={13} /> Video Terkirim
                </div>
                <p className="text-[11px] text-slate-600">
                  Video AI kelompok telah dikirim. Menunggu Dosen Pengampu menilai proyek. Nilai belum dirilis.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <AlertCircle size={12} /> Belum Unggah Video
                </div>
                <p className="text-[11px] text-slate-500">
                  Kolaborasi video AI edukasi 1080p Kelompok {currentStudent.groupId}. Nilai tidak muncul sebelum video dikirim dan dinilai dosen.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('tugas-kelompok')}
            className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs ${
              hasUasGrade
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            <span>{hasUasGrade ? 'Lihat Proyek UAS' : hasSubmittedUas ? 'Periksa Proyek Video' : 'Buka Proyek UAS'}</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* KARTU 4: REKAPITULASI NILAI LENGKAP */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={13} className="text-emerald-700" />
                Rekap Transkrip Nilai
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                hasAnyGrade
                  ? (isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800')
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {hasAnyGrade ? (isPassed ? 'LULUS' : 'TIDAK LULUS') : 'MENUNGGU NILAI'}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Kehadiran (15%):</span>
                <span className="font-bold text-slate-800">{studentGradeObj?.attendanceScore ?? 100}%</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Sikap &amp; Keaktifan (10%):</span>
                <span className="font-bold text-slate-800">{studentGradeObj?.attitudeScore ?? 85}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Tugas Presentasi (25%):</span>
                <span className={`font-extrabold ${hasIndGrade ? 'text-emerald-700' : hasSubmittedInd ? 'text-blue-700' : 'text-amber-700'}`}>
                  {hasIndGrade ? indScore : (hasSubmittedInd ? 'Menunggu Nilai' : 'Belum Unggah PPT')}
                </span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span>Ujian UTS (25%):</span>
                <span className="font-extrabold text-indigo-700">
                  {hasUtsGrade ? utsScore : (hasSubmittedUts ? 'Menunggu Nilai' : '-')}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Proyek UAS (25%):</span>
                <span className="font-extrabold text-purple-700">
                  {hasUasGrade ? uasScore : (hasSubmittedUas ? 'Menunggu Nilai' : '-')}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('nilai')}
            className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <span>Buka Transkrip Lengkap</span>
            <ArrowRight size={12} />
          </button>
        </div>

      </div>
    </div>
  );
};
