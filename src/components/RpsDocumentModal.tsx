import React from 'react';
import { BookOpen, Download, Printer, X, Award, Clock, CheckCircle2, User, School } from 'lucide-react';
import { DosenProfile, MeetingSchedule } from '../types';
import { exportRpsToWord, exportRpsToPdf } from '../utils/documentExport';

import { INITIAL_DATABASE } from '../data/initialData';

interface RpsDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: DosenProfile;
  courseProfile?: DosenProfile;
  meetings: MeetingSchedule[];
  rpsRawText?: string;
}

export const RpsDocumentModal: React.FC<RpsDocumentModalProps> = ({
  isOpen,
  onClose,
  profile,
  courseProfile,
  meetings,
  rpsRawText,
}) => {
  if (!isOpen) return null;

  const effectiveProfile: DosenProfile = profile || courseProfile || {
    name: 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.',
    dosenName: 'Risfa Tri Ulfa',
    dosenTitle: 'S.Pd., M.Pd., Gr.',
    campusName: 'STAI Jarinabi',
    nip: '19980515 202601 2 001',
    courseTitle: 'Filsafat Ilmu',
    courseCode: 'MPI-501',
    sks: 3,
    semester: 'Semester Ganjil 2026/2027',
    studyProgram: 'Manajemen Pendidikan Islam (MPI 1)',
  };

  const effectiveMeetings: MeetingSchedule[] = (meetings && meetings.length > 0)
    ? meetings
    : (INITIAL_DATABASE.meetings || []);

  const campus = effectiveProfile.campusName || 'STAI Jarinabi';
  const dosenFullName = effectiveProfile.name || (effectiveProfile.dosenName ? `${effectiveProfile.dosenName}${effectiveProfile.dosenTitle ? ', ' + effectiveProfile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const courseTitle = effectiveProfile.courseTitle || 'Filsafat Ilmu';
  const courseCode = effectiveProfile.courseCode || 'MPI-501';
  const sks = effectiveProfile.sks || 3;
  const semester = effectiveProfile.semester || 'Semester Ganjil 2026/2027';
  const prodi = effectiveProfile.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  const handleDownloadWord = () => {
    exportRpsToWord(effectiveProfile, effectiveMeetings, rpsRawText);
  };

  const handlePrint = () => {
    exportRpsToPdf(effectiveProfile, effectiveMeetings, rpsRawText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Dokumen Rencana Pembelajaran Semester (RPS)</h2>
              <p className="text-xs text-emerald-200">
                {courseTitle} ({courseCode}) • {campus}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadWord}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white transition-colors"
              title="Unduh format Microsoft Word (.doc)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh Word (.doc)</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white transition-colors"
              title="Cetak RPS"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Document View */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-slate-800 text-sm leading-relaxed">
          
          {/* Institutional Kop Surat */}
          <div className="text-center pb-5 border-b-2 border-slate-900/80">
            <div className="flex items-center justify-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-1">
              <School className="w-4 h-4" />
              <span>SISTEM INFORMASI AKADEMIK (SIAKAD)</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{campus}</h1>
            <p className="text-sm font-semibold text-slate-700 uppercase">PROGRAM STUDI {prodi}</p>
            <p className="text-xs text-slate-500 mt-0.5">Tahun Akademik 2026/2027 • Ditetapkan Dosen Pengampu</p>
          </div>

          <div className="text-center">
            <span className="inline-block px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-sm tracking-wide uppercase">
              RENCANA PEMBELAJARAN SEMESTER (RPS)
            </span>
          </div>

          {/* Mata Kuliah Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="space-y-2">
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Mata Kuliah</span>
                <span className="font-bold text-slate-900">: {courseTitle}</span>
              </div>
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Kode / Bobot SKS</span>
                <span className="font-semibold text-slate-800">: {courseCode} / {sks} SKS</span>
              </div>
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Semester / Kelas</span>
                <span className="font-semibold text-slate-800">: {semester}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Dosen Pengampu</span>
                <span className="font-bold text-emerald-800 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  <span>{dosenFullName}</span>
                </span>
              </div>
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Perguruan Tinggi</span>
                <span className="font-semibold text-slate-800">: {campus}</span>
              </div>
              <div className="flex text-xs">
                <span className="w-32 text-slate-500 font-medium">Total Pertemuan</span>
                <span className="font-semibold text-slate-800">: 16 Pertemuan (termasuk UTS & UAS)</span>
              </div>
            </div>
          </div>

          {/* I. Deskripsi Mata Kuliah */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-1.5 border-b border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>I. Deskripsi Mata Kuliah</span>
            </h3>
            <p className="mt-2 text-slate-700 text-xs md:text-sm text-justify">
              {effectiveProfile.description ||
                'Mata kuliah ini membekali mahasiswa dengan wawasan mendalam mengenai struktur ontologi, epistemologi, dan aksiologi keilmuan, serta metodologi penelitian kritis guna mendukung kepemimpinan dan tata kelola lembaga pendidikan Islam kontemporer yang adaptif terhadap era digital dan Artificial Intelligence.'}
            </p>
          </div>

          {/* II. Capaian Pembelajaran Lulusan & CPMK */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-1.5 border-b border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>II. Capaian Pembelajaran Lulusan (CPL) & CPMK</span>
            </h3>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
                <h4 className="font-bold text-emerald-950 text-xs mb-1 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sikap & Integritas Akademik</span>
                </h4>
                <p className="text-xs text-emerald-900">
                  Menjunjung tinggi nilai kejujuran ilmiah, etika orisinalitas riset, serta komitmen akademik dalam tata kelola keilmuan Islam.
                </p>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl">
                <h4 className="font-bold text-blue-950 text-xs mb-1 flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-blue-700" />
                  <span>Penguasaan Pengetahuan Ilmiah</span>
                </h4>
                <p className="text-xs text-blue-900">
                  Menguasai landasan epistemologi, teori kebenaran, metodologi ilmiah deduktif-induktif, dan integrasi ilmu-agama.
                </p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                <h4 className="font-bold text-amber-950 text-xs mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Keterampilan Tugas Mandiri</span>
                </h4>
                <p className="text-xs text-amber-900">
                  Mampu menyusun makalah ilmiah berbobot dan slide presentasi PPT sistematis serta mempresentasikannya di hadapan forum kelas.
                </p>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-xl">
                <h4 className="font-bold text-purple-950 text-xs mb-1 flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-purple-700" />
                  <span>Keterampilan Proyek Video Edukasi AI</span>
                </h4>
                <p className="text-xs text-purple-900">
                  Mampu berkolaborasi dalam kelompok menghasilkan video edukasi ilmiah berbasis Generative AI yang etis dan berdampak.
                </p>
              </div>
            </div>
          </div>

          {/* III. Bobot & Sistem Penilaian */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-1.5 border-b border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>III. Bobot & Sistem Penilaian Resmi</span>
            </h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-base font-black text-emerald-800">15%</div>
                <div className="font-semibold text-slate-700">Presensi Kuliah</div>
                <div className="text-[10px] text-slate-500">16 Pertemuan</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-base font-black text-emerald-800">10%</div>
                <div className="font-semibold text-slate-700">Sikap & Partisipasi</div>
                <div className="text-[10px] text-slate-500">Adab & Diskusi</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-base font-black text-emerald-800">25%</div>
                <div className="font-semibold text-slate-700">PPT & Makalah</div>
                <div className="text-[10px] text-slate-500">Tugas Mandiri</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-base font-black text-emerald-800">25%</div>
                <div className="font-semibold text-slate-700">UTS (Esai Kritis)</div>
                <div className="text-[10px] text-slate-500">5 Soal Analisis</div>
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 col-span-2 sm:col-span-1">
                <div className="text-base font-black text-emerald-800">25%</div>
                <div className="font-semibold text-slate-700">UAS (Video AI)</div>
                <div className="text-[10px] text-slate-500">Proyek Kelompok</div>
              </div>
            </div>
          </div>

          {/* IV. Rincian 16 Pertemuan Perkuliahan */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 pb-1.5 border-b border-slate-200 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>IV. Rincian Jadwal & Pokok Bahasan 16 Pertemuan</span>
            </h3>
            <div className="mt-3 overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5 text-center w-12 border-r border-slate-200">Ptm</th>
                    <th className="p-2.5 w-32 border-r border-slate-200">Jadwal</th>
                    <th className="p-2.5 border-r border-slate-200">Pokok Bahasan / Materi</th>
                    <th className="p-2.5 w-24 text-center border-r border-slate-200">Format</th>
                    <th className="p-2.5 w-40">Pemateri / Presenter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {effectiveMeetings.map(m => (
                    <tr key={m.meetingNumber} className={m.meetingNumber % 2 === 0 ? 'bg-slate-50/60' : 'bg-white'}>
                      <td className="p-2.5 text-center font-bold text-emerald-800 border-r border-slate-200">
                        {m.meetingNumber}
                      </td>
                      <td className="p-2.5 font-medium text-slate-600 border-r border-slate-200">
                        {m.dateStr}
                      </td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-bold text-slate-800">{m.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{m.description}</div>
                      </td>
                      <td className="p-2.5 text-center border-r border-slate-200">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.type === 'uts'
                            ? 'bg-amber-100 text-amber-800'
                            : m.type === 'uas'
                            ? 'bg-purple-100 text-purple-800'
                            : m.presentationFormat === 'kelompok'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.type === 'uts' ? 'UTS' : m.type === 'uas' ? 'UAS' : m.presentationFormat || 'Individu'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-700">
                        {m.presenters && m.presenters.length > 0 ? (
                          <div className="space-y-0.5">
                            {m.presenters.map((p, idx) => (
                              <div key={idx} className="font-medium text-slate-900">• {p}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Dosen Pengampu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dosen & Institution Stamp */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Institusi Penyelenggara:</p>
              <p className="font-bold text-emerald-800 text-sm">{campus}</p>
              <p>Program Studi {prodi}</p>
            </div>
            <div className="mt-4 sm:mt-0 text-left sm:text-right">
              <p>Dosen Pengampu Mata Kuliah,</p>
              <div className="h-12 flex items-center justify-start sm:justify-end text-emerald-800 font-serif italic text-sm">
                (Tertanda secara digital)
              </div>
              <p className="font-bold text-slate-900 text-sm">{dosenFullName}</p>
              <p className="text-slate-500">Dosen Pengampu {campus}</p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            RPS ini dapat diakses oleh seluruh mahasiswa dan dosen pengampu secara transparan.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Tutup Pratinjau
          </button>
        </div>

      </div>
    </div>
  );
};
