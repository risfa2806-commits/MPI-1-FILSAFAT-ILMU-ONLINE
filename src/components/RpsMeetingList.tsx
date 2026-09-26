import React, { useState } from 'react';
import { MeetingSchedule, Student, IndividualSubmission } from '../types';
import { Calendar, User, FileText, CheckCircle2, Clock, ExternalLink, Download, Search } from 'lucide-react';

interface RpsMeetingListProps {
  meetings: MeetingSchedule[];
  students: Student[];
  submissions: IndividualSubmission[];
  currentStudent: Student | null;
  onSelectStudentTask: (student: Student) => void;
  onOpenUploadForStudent: (student: Student) => void;
}

export const RpsMeetingList: React.FC<RpsMeetingListProps> = ({
  meetings = [],
  students = [],
  submissions = [],
  currentStudent,
  onSelectStudentTask,
  onOpenUploadForStudent,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'kuliah' | 'evaluasi'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMeetings = (meetings || []).filter(m => {
    if (filterType === 'kuliah' && m.type !== 'kuliah') return false;
    if (filterType === 'evaluasi' && m.type === 'kuliah') return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = m.title ? m.title.toLowerCase().includes(q) : false;
      const matchDesc = m.description ? m.description.toLowerCase().includes(q) : false;
      const matchPresenter = (m.presenters || []).some(p => p && p.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchPresenter;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Info Box */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/30 text-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-400/30 mb-2">
              <Calendar size={13} />
              <span>Jadwal Resmi Kuliah Online (16 Kali Pertemuan)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-serif-title">
              Rencana Pembelajaran Semester (RPS) Filsafat Ilmu
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Dimulai <strong>Sabtu, 12 September 2026</strong> setiap hari Sabtu hingga 16 kali pertemuan. Setiap mahasiswa memegang materi presentasi mandiri (Pertemuan 2 s/d Pertemuan 15) dan proyek video edukasi AI kelompok (Kelompok 1 - 5).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/10">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-emerald-200">Total Pertemuan:</div>
              <div className="text-lg font-extrabold text-white">16 Pertemuan</div>
            </div>
            <div className="hidden sm:block h-8 w-[1px] bg-white/20 mx-1"></div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-emerald-200">Format Tugas:</div>
              <div className="text-xs font-semibold text-emerald-100">Makalah + PPT + Video AI</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-emerald-700/50">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'all'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              Semua (16)
            </button>
            <button
              onClick={() => setFilterType('kuliah')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'kuliah'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              Kuliah & Presentasi
            </button>
            <button
              onClick={() => setFilterType('evaluasi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === 'evaluasi'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-white/10 text-emerald-100 hover:bg-white/20'
              }`}
            >
              UTS & UAS
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              type="text"
              placeholder="Cari materi / pemakalah..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/20 text-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* 16 Pertemuan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(filteredMeetings || []).map((meeting) => {
          // Find students assigned to this meeting
          const assignedStudents = (students || []).filter(s => s.meetingNumber === meeting.meetingNumber);
          const isTodayMeeting = meeting.meetingNumber === 1; // 12 Sep 2026

          return (
            <div
              key={meeting.meetingNumber}
              className={`rounded-2xl bg-white border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                isTodayMeeting
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Meeting Card Header */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs px-2.5 py-1 rounded-md bg-slate-900 text-white tracking-wider">
                      PERTEMUAN {meeting.meetingNumber}
                    </span>
                    {meeting.type === 'uts' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        UTS
                      </span>
                    )}
                    {meeting.type === 'uas' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
                        UAS VIDEO AI
                      </span>
                    )}
                    {isTodayMeeting && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar size={13} className="text-slate-400" />
                    <span>{meeting.dateStr}</span>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {meeting.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {meeting.description}
                </p>

                {/* Presenters & Assigned RPS */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <User size={13} />
                    <span>Pemakalah & Presenter RPS:</span>
                  </div>

                  {(assignedStudents?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {assignedStudents.map(std => {
                        const submission = (submissions || []).find(s => s.studentId === std.id);
                        const isCurrent = currentStudent?.id === std.id;

                        return (
                          <div
                            key={std.id}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              isCurrent
                                ? 'bg-emerald-50/80 border-emerald-300'
                                : 'bg-slate-50/80 border-slate-200'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{std.name}</span>
                                <span className="text-[10px] font-bold bg-emerald-700 text-white px-1.5 py-0.2 rounded">
                                  {std.rpsPart}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {std.topic}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              {submission ? (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={12} /> Terkirim
                                  </span>

                                  {/* Download PPT or link */}
                                  {submission.pptType === 'link' && submission.pptUrl && (
                                    <a
                                      href={submission.pptUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                                      title="Buka Link PPT / Canva"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                  {submission.pptType === 'file' && submission.pptFileData && (
                                    <a
                                      href={submission.pptFileData}
                                      download={submission.pptFileName || `PPT-${std.rpsPart}-${std.name}.pptx`}
                                      className="p-1 text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors"
                                      title="Download File PPT"
                                    >
                                      <Download size={13} />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => onOpenUploadForStudent(std)}
                                  className="text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                                >
                                  <Clock size={11} />
                                  <span>Unggah PPT</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {meeting.presenters.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer / Action */}
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Pertemuan: {meeting.partCodes.join(', ')}</span>
                <span className="font-semibold text-emerald-800">
                  {meeting.type === 'kuliah' ? 'Perkuliahan Daring' : 'Evaluasi Akademik'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
