import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  Student,
  MeetingSchedule,
  AttendanceStatus,
  StudentGrade,
  DosenProfile,
  ArchivedSemester,
} from '../types';
import {
  exportAttendanceToWord,
  exportAttendanceToExcel,
  exportAttendanceToPdf,
  downloadAttendanceAsPdfFile,
} from '../utils/documentExport';

interface AttendanceRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  meetings: MeetingSchedule[];
  attendance: Record<number, Record<string, AttendanceStatus>>;
  grades?: Record<string, StudentGrade>;
  courseProfile?: DosenProfile;
  archivedSemesters?: ArchivedSemester[];
}

export const AttendanceRecapModal: React.FC<AttendanceRecapModalProps> = ({
  isOpen,
  onClose,
  students: currentStudents,
  meetings: currentMeetings,
  attendance: currentAttendance,
  grades: currentGrades = {},
  courseProfile,
  archivedSemesters = [],
}) => {
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'memenuhi' | 'kurang'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  // Determine active dataset based on selected semester
  const isCurrentSemester = selectedSemesterId === 'current';
  const archived = archivedSemesters.find((s) => s.id === selectedSemesterId);

  const activeStudents = isCurrentSemester ? currentStudents : archived?.students || [];
  const activeMeetings = isCurrentSemester ? currentMeetings : archived?.meetings || [];
  const activeAttendance = isCurrentSemester ? currentAttendance : archived?.attendance || {};
  const activeGrades = isCurrentSemester ? currentGrades : archived?.grades || {};

  const campus = courseProfile?.campusName || 'STAI Jarinabi';
  const dosenName =
    courseProfile?.name ||
    (courseProfile?.dosenName
      ? `${courseProfile.dosenName}${courseProfile.dosenTitle ? ', ' + courseProfile.dosenTitle : ''}`
      : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const title = isCurrentSemester ? courseProfile?.courseTitle || 'Filsafat Ilmu' : archived?.courseTitle || 'Filsafat Ilmu';
  const code = isCurrentSemester ? courseProfile?.courseCode || 'MPI-501' : archived?.courseCode || 'MPI-501';
  const sks = courseProfile?.sks || 3;
  const sem = isCurrentSemester
    ? courseProfile?.semester || 'Semester Ganjil 2026/2027'
    : archived?.semesterName || 'Semester Terarsip';
  const prodi = courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  // Build stats per student
  const studentStats = activeStudents.map((std, idx) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;

    for (let m = 1; m <= 16; m++) {
      const st = activeAttendance[m]?.[std.id];
      if (st === 'H') hadir++;
      else if (st === 'I') izin++;
      else if (st === 'S') sakit++;
      else if (st === 'A') alfa++;
    }

    const totalRecorded = hadir + izin + sakit + alfa;
    const weightedPresence = hadir + 0.8 * izin + 0.8 * sakit;
    const pctAttendance = Math.round((hadir / 16) * 100);
    const score =
      activeGrades[std.id]?.attendanceScore ??
      (totalRecorded > 0
        ? Math.min(100, Math.round((weightedPresence / Math.max(1, totalRecorded)) * 100))
        : 100);
    const isEligible = pctAttendance >= 75 || score >= 75;

    return {
      std,
      idx: idx + 1,
      hadir,
      izin,
      sakit,
      alfa,
      pctAttendance,
      score,
      isEligible,
    };
  });

  // Filtered students
  const filteredData = studentStats.filter((item) => {
    const matchesSearch =
      item.std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.std.nim.includes(searchTerm);
    if (!matchesSearch) return false;
    if (statusFilter === 'memenuhi') return item.isEligible;
    if (statusFilter === 'kurang') return !item.isEligible;
    return true;
  });

  // Per-meeting stats (columns 1..16)
  const meetingStats = Array.from({ length: 16 }, (_, i) => {
    const mNum = i + 1;
    let hCount = 0;
    activeStudents.forEach((s) => {
      if (activeAttendance[mNum]?.[s.id] === 'H') hCount++;
    });
    const pct = activeStudents.length > 0 ? Math.round((hCount / activeStudents.length) * 100) : 0;
    return { mNum, hCount, pct };
  });

  // Overall summary metrics
  const totalStudentsCount = activeStudents.length;
  const memenuhiCount = studentStats.filter((s) => s.isEligible).length;
  const kurangCount = totalStudentsCount - memenuhiCount;
  const avgAttendancePct =
    totalStudentsCount > 0
      ? Math.round(
          studentStats.reduce((acc, curr) => acc + curr.pctAttendance, 0) / totalStudentsCount
        )
      : 0;

  const exportOptions = {
    campusName: campus,
    dosenFullName: dosenName,
    courseTitle: title,
    courseCode: code,
    sks,
    semester: sem,
    studyProgram: prodi,
    academicYear: 'T.A 2026/2027',
    students: activeStudents,
    meetings: activeMeetings,
    attendance: activeAttendance,
    grades: activeGrades,
  };

  const handleDownloadWord = () => {
    exportAttendanceToWord(exportOptions);
  };

  const handleDownloadExcel = () => {
    exportAttendanceToExcel(exportOptions);
  };

  const handlePrintPdf = () => {
    exportAttendanceToPdf(exportOptions);
  };

  const handleDownloadPdfFile = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadAttendanceAsPdfFile(exportOptions);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Calendar className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Rekapitulasi Presensi Semua Pertemuan (1 s/d 16)
                <span className="text-[10px] uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  SIAKAD 16 Sesi
                </span>
              </h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                {title} • {sem} • {prodi}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
            title="Tutup Modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Semester Selector & Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {archivedSemesters.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Layers size={14} className="text-emerald-700" />
                <span className="text-xs font-semibold text-slate-600">Semester:</span>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-hidden"
                >
                  <option value="current">Semester Aktif ({courseProfile?.semester || 'Aktif'})</option>
                  {archivedSemesters.map((arch) => (
                    <option key={arch.id} value={arch.id}>
                      {arch.semesterName} ({arch.academicYear})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Status Presensi */}
            <div className="inline-flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold text-slate-700">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'all'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                Semua ({studentStats.length})
              </button>
              <button
                onClick={() => setStatusFilter('memenuhi')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'memenuhi'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'hover:text-emerald-800'
                }`}
              >
                Memenuhi Syarat (≥75%: {memenuhiCount})
              </button>
              <button
                onClick={() => setStatusFilter('kurang')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === 'kurang'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'hover:text-rose-800'
                }`}
              >
                Kurang Syarat ({kurangCount})
              </button>
            </div>
          </div>

          {/* Download Buttons (Cetak PDF, Unduh PDF, Word, Excel) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Buka dialog cetak printer atau simpan sebagai PDF dari browser"
            >
              <Printer size={14} />
              <span>Cetak PDF</span>
            </button>

            <button
              onClick={handleDownloadPdfFile}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Unduh file .pdf resmi langsung ke perangkat"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={handleDownloadWord}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Unduh Format Microsoft Word (.doc) Lengkap Tanda Tangan Digital Dosen"
            >
              <FileText size={14} />
              <span>Unduh Word (.doc)</span>
            </button>

            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              title="Unduh Format Microsoft Excel (.xls) dengan Pewarnaan Status & Formula"
            >
              <FileSpreadsheet size={14} />
              <span>Unduh Excel (.xls)</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border-b border-slate-200">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Users size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Total Mahasiswa</div>
              <div className="text-sm sm:text-base font-bold text-slate-800">
                {totalStudentsCount} Orang
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
              <Calendar size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Cakupan Sesi</div>
              <div className="text-sm sm:text-base font-bold text-slate-800">
                16 Pertemuan Lengkap
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Rata-rata Presensi</div>
              <div className="text-sm sm:text-base font-bold text-emerald-700">
                {avgAttendancePct}% Kehadiran
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Kelayakan UAS (≥75%)</div>
              <div className="text-sm sm:text-base font-bold text-slate-800">
                <span className="text-emerald-600 font-bold">{memenuhiCount}</span> /{' '}
                <span className="text-rose-600 font-bold">{kurangCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search input and student count */}
        <div className="px-4 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mahasiswa berdasarkan nama atau NIM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredData.length}</strong> dari{' '}
            {activeStudents.length} mahasiswa
          </div>
        </div>

        {/* Interactive 16-Meeting Matrix Table */}
        <div className="overflow-x-auto flex-1 p-3">
          <table className="w-full border-collapse text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-emerald-900 text-white font-bold text-center">
                <th rowSpan={2} className="p-2 border border-emerald-800 w-10">
                  No
                </th>
                <th rowSpan={2} className="p-2 border border-emerald-800 w-24">
                  NIM
                </th>
                <th rowSpan={2} className="p-2 border border-emerald-800 text-left min-w-[180px]">
                  Nama Mahasiswa
                </th>
                <th colSpan={16} className="py-1.5 px-2 border border-emerald-800 text-center">
                  Pertemuan Perkuliahan 1 s/d 16
                </th>
                <th colSpan={4} className="py-1.5 px-1 border border-emerald-800 text-center w-28">
                  Rekap
                </th>
                <th rowSpan={2} className="p-2 border border-emerald-800 w-14">
                  % Hdr
                </th>
                <th rowSpan={2} className="p-2 border border-emerald-800 w-16">
                  Nilai (15%)
                </th>
                <th rowSpan={2} className="p-2 border border-emerald-800 w-24">
                  Status
                </th>
              </tr>
              <tr className="bg-emerald-800 text-white font-semibold text-[11px] text-center">
                {Array.from({ length: 16 }, (_, i) => {
                  const m = i + 1;
                  const isUts = m === 8;
                  const isUas = m === 16;
                  return (
                    <th
                      key={m}
                      className={`p-1 border border-emerald-700 w-8 ${
                        isUts || isUas ? 'bg-emerald-950 text-amber-300 font-bold' : ''
                      }`}
                      title={isUts ? 'Pertemuan 8 (UTS)' : isUas ? 'Pertemuan 16 (UAS)' : `Pertemuan ${m}`}
                    >
                      P{m}
                      {(isUts || isUas) && (
                        <div className="text-[9px] font-normal leading-tight">
                          {isUts ? 'UTS' : 'UAS'}
                        </div>
                      )}
                    </th>
                  );
                })}
                <th className="p-1 border border-emerald-700 w-7 bg-emerald-700/80 text-emerald-100">
                  H
                </th>
                <th className="p-1 border border-emerald-700 w-7 bg-blue-800/80 text-blue-100">
                  I
                </th>
                <th className="p-1 border border-emerald-700 w-7 bg-amber-800/80 text-amber-100">
                  S
                </th>
                <th className="p-1 border border-emerald-700 w-7 bg-rose-800/80 text-rose-100">
                  A
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((item, idx) => {
                const std = item.std;

                return (
                  <tr
                    key={std.id}
                    className={`hover:bg-emerald-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="p-2 text-center text-slate-500 font-mono border border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="p-2 text-center font-mono text-slate-700 font-medium border border-slate-200">
                      {std.nim}
                    </td>
                    <td className="p-2 font-semibold text-slate-900 border border-slate-200">
                      <div>{std.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{std.rpsPart}</div>
                    </td>

                    {/* 16 Meeting columns */}
                    {Array.from({ length: 16 }, (_, i) => {
                      const mNum = i + 1;
                      const status = activeAttendance[mNum]?.[std.id] || '-';

                      let badgeClass = 'text-slate-400 font-mono';
                      if (status === 'H') badgeClass = 'bg-emerald-100 text-emerald-800 font-bold';
                      else if (status === 'I') badgeClass = 'bg-blue-100 text-blue-800 font-bold';
                      else if (status === 'S') badgeClass = 'bg-amber-100 text-amber-800 font-bold';
                      else if (status === 'A') badgeClass = 'bg-rose-100 text-rose-800 font-bold';

                      return (
                        <td
                          key={mNum}
                          className="p-1 text-center border border-slate-200 text-[11px]"
                        >
                          <span
                            className={`inline-block w-6 h-6 leading-6 rounded-md text-center ${badgeClass}`}
                          >
                            {status === 'BELUM' ? '-' : status}
                          </span>
                        </td>
                      );
                    })}

                    {/* H, I, S, A counts */}
                    <td className="p-1.5 text-center font-bold text-emerald-700 bg-emerald-50/50 border border-slate-200">
                      {item.hadir}
                    </td>
                    <td className="p-1.5 text-center font-bold text-blue-700 bg-blue-50/50 border border-slate-200">
                      {item.izin}
                    </td>
                    <td className="p-1.5 text-center font-bold text-amber-700 bg-amber-50/50 border border-slate-200">
                      {item.sakit}
                    </td>
                    <td className="p-1.5 text-center font-bold text-rose-700 bg-rose-50/50 border border-slate-200">
                      {item.alfa}
                    </td>

                    {/* % Kehadiran */}
                    <td className="p-2 text-center font-bold text-slate-800 border border-slate-200">
                      {item.pctAttendance}%
                    </td>

                    {/* Nilai Presensi (15%) */}
                    <td className="p-2 text-center font-bold text-emerald-700 bg-emerald-50/30 border border-slate-200">
                      {item.score}
                    </td>

                    {/* Status Kelulusan Presensi */}
                    <td className="p-2 text-center border border-slate-200">
                      {item.isEligible ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={11} /> Memenuhi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle size={11} /> Kurang
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Meeting Presence Stats Footer */}
              <tr className="bg-slate-100 font-bold text-slate-700 border-t-2 border-slate-300">
                <td colSpan={3} className="p-2 text-right border border-slate-300">
                  Total Mahasiswa Hadir:
                </td>
                {meetingStats.map((m) => (
                  <td
                    key={m.mNum}
                    className="p-1 text-center font-bold text-emerald-800 bg-emerald-100/60 border border-slate-300"
                  >
                    {m.hCount}
                  </td>
                ))}
                <td colSpan={7} className="p-2 text-center text-slate-500 text-[11px] border border-slate-300">
                  Roster Presensi 16 Sesi Lengkap
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold text-slate-600">
                <td colSpan={3} className="p-2 text-right border border-slate-300">
                  % Kehadiran Kelas:
                </td>
                {meetingStats.map((m) => (
                  <td
                    key={m.mNum}
                    className="p-1 text-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-slate-300"
                  >
                    {m.pct}%
                  </td>
                ))}
                <td colSpan={7} className="p-2 text-center text-slate-500 text-[11px] border border-slate-300">
                  Standar Minimal Kehadiran Mahasiswa Mengikuti UAS: 75%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Petunjuk Format:</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span> H = Hadir (100%)
            </span>
            <span className="flex items-center gap-1 text-blue-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span> I = Izin (80%)
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span> S = Sakit (80%)
            </span>
            <span className="flex items-center gap-1 text-rose-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span> A = Alfa (0%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
