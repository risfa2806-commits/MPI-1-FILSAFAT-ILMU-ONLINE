import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  Student,
  MeetingSchedule,
  AttendanceStatus,
  StudentGrade,
  DosenProfile,
} from '../types';
import {
  exportAttendanceToPdf,
  downloadAttendanceAsPdfFile,
  downloadAttendanceAsHtmlFile,
  exportAttendanceToWord,
  exportAttendanceToExcel,
  printSingleMeetingAttendance,
  downloadSingleMeetingAttendanceAsPdfFile,
  exportSingleMeetingAttendanceToWord,
} from '../utils/documentExport';
import { DOSEN_SIGNATURE_BASE64 } from '../assets/dosenSignature';

interface AttendanceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  meetings: MeetingSchedule[];
  attendance: Record<number, Record<string, AttendanceStatus>>;
  grades?: Record<string, StudentGrade>;
  courseProfile?: DosenProfile;
  initialMeetingNumber?: number; // 0 for full 16 meetings, or 1-16 for single meeting
}

export const AttendanceExportModal: React.FC<AttendanceExportModalProps> = ({
  isOpen,
  onClose,
  students,
  meetings,
  attendance,
  grades = {},
  courseProfile,
  initialMeetingNumber = 0,
}) => {
  // Target: 0 means all 16 meetings, 1-16 means specific meeting
  const [selectedTarget, setSelectedTarget] = useState<number>(initialMeetingNumber);
  // Mode: 'print' | 'download_pdf' | 'download_word' | 'download_excel'
  const [activeTab, setActiveTab] = useState<'print' | 'download_pdf' | 'word' | 'excel'>('print');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const campus = courseProfile?.campusName || 'STAI Jarinabi';
  const dosenName =
    courseProfile?.name ||
    (courseProfile?.dosenName
      ? `${courseProfile.dosenName}${courseProfile.dosenTitle ? ', ' + courseProfile.dosenTitle : ''}`
      : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const title = courseProfile?.courseTitle || 'Filsafat Ilmu';
  const code = courseProfile?.courseCode || 'MPI-501';
  const sks = courseProfile?.sks || 3;
  const sem = courseProfile?.semester || 'Semester Ganjil 2026/2027';
  const prodi = courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  const activeMeeting = meetings.find((m) => m.meetingNumber === selectedTarget);

  const exportOpts = {
    campusName: campus,
    dosenFullName: dosenName,
    courseTitle: title,
    courseCode: code,
    sks,
    semester: sem,
    studyProgram: prodi,
    academicYear: 'T.A 2026/2027',
    students,
    meetings,
    attendance,
    grades,
  };

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Action: Print / Save as PDF
  const handlePrint = () => {
    setIsProcessing(true);
    try {
      if (selectedTarget === 0) {
        exportAttendanceToPdf(exportOpts);
        showNotification('Membuka jendela cetak / dialog simpan PDF Rekap 16 Pertemuan...');
      } else if (activeMeeting) {
        printSingleMeetingAttendance({
          ...exportOpts,
          meeting: activeMeeting,
        });
        showNotification(`Membuka jendela cetak Presensi Pertemuan ${selectedTarget}...`);
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal memproses cetak. Mencoba unduh berkas...');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Direct Download .PDF
  const handleDownloadPdf = async () => {
    setIsProcessing(true);
    showNotification('Sedang membuat file PDF berkualitas tinggi dengan TTD resmi...');
    try {
      if (selectedTarget === 0) {
        await downloadAttendanceAsPdfFile(exportOpts);
        showNotification('File PDF Rekap 16 Pertemuan berhasil diunduh!');
      } else if (activeMeeting) {
        await downloadSingleMeetingAttendanceAsPdfFile({
          ...exportOpts,
          meeting: activeMeeting,
        });
        showNotification(`File PDF Pertemuan ${selectedTarget} berhasil diunduh!`);
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal membuat PDF. Mengunduh format HTML mandiri...');
      downloadAttendanceAsHtmlFile(exportOpts);
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Download Word (.doc)
  const handleDownloadWord = () => {
    setIsProcessing(true);
    try {
      if (selectedTarget === 0) {
        exportAttendanceToWord(exportOpts);
        showNotification('Dokumen Microsoft Word (.doc) Rekap 16 Pertemuan berhasil diunduh!');
      } else if (activeMeeting) {
        exportSingleMeetingAttendanceToWord({
          ...exportOpts,
          meeting: activeMeeting,
        });
        showNotification(`Dokumen Word Pertemuan ${selectedTarget} berhasil diunduh!`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Download Excel (.xls)
  const handleDownloadExcel = () => {
    setIsProcessing(true);
    try {
      exportAttendanceToExcel(exportOpts);
      showNotification('Spreadsheet Microsoft Excel (.xls) berhasil diunduh!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Action: Download Standalone HTML
  const handleDownloadHtml = () => {
    downloadAttendanceAsHtmlFile(exportOpts);
    showNotification('File HTML Siap Cetak berhasil diunduh ke perangkat Anda!');
  };

  return (
    <div
      id="attendance-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="attendance-export-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 px-5 py-4 text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Printer size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight font-serif-title">
                Pusat Cetak & Unduh Rekapan Presensi
              </h2>
              <p className="text-xs text-emerald-200/80">
                Pilih format dokumen resmi, beralih antara dialog cetak printer atau unduh file PDF langsung
              </p>
            </div>
          </div>
          <button
            id="close-attendance-export-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-900 animate-fadeIn">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 text-slate-800">
          {/* Document Scope Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Pilih Dokumen yang Ingin Dicetak / Diunduh:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedTarget(0)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                  selectedTarget === 0
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    selectedTarget === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Layers size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold">Rekapitulasi 16 Pertemuan</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Format A4 Landscape lengkap matriks P1 s/d P16, total kehadiran, nilai 15%, & TTD Kaprodi/Dosen.
                  </div>
                </div>
              </button>

              <div
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  selectedTarget > 0
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      selectedTarget > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Calendar size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold">Berita Acara & Presensi Per Sesi</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Pilih nomor sesi pertemuan tertentu untuk dicetak lengkap dengan catatan perkuliahan & TTD.
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/70">
                  <select
                    value={selectedTarget > 0 ? selectedTarget : 1}
                    onChange={(e) => setSelectedTarget(Number(e.target.value))}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    {meetings.map((m) => (
                      <option key={m.meetingNumber} value={m.meetingNumber}>
                        Pertemuan #{m.meetingNumber}: {m.title.substring(0, 32)}... ({m.dateStr})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Switcher: Print Dialog vs Direct Download */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Pilih Mode Ekspor & Format Berkas:
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Bisa beralih kapan saja
              </span>
            </div>

            {/* Segmented Switcher Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('print')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-white text-rose-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Printer size={14} />
                <span>Cetak / Print</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('download_pdf')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'download_pdf'
                    ? 'bg-white text-rose-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download size={14} />
                <span>Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('word')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'word'
                    ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={14} />
                <span>Word (.doc)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                disabled={selectedTarget > 0}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedTarget > 0
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : activeTab === 'excel'
                    ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={selectedTarget > 0 ? 'Excel khusus rekap 16 pertemuan' : 'Unduh matriks Excel'}
              >
                <FileSpreadsheet size={14} />
                <span>Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Active Mode Detail Box & Primary Action Button */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            {activeTab === 'print' && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Printer size={15} className="text-rose-600" />
                  <span>Mode Dialog Cetak (Print / Save as PDF)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Membuka pratinjau dokumen dan dialog cetak browser. Anda dapat langsung mencetak ke mesin printer fisik atau memilih <strong>&quot;Save as PDF&quot; (Simpan sebagai PDF)</strong> di dialog browser Anda.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                    <span>Buka Jendela Cetak & Simpan PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadHtml}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    title="Unduh berkas HTML siap cetak mandiri"
                  >
                    <ExternalLink size={13} />
                    <span>Unduh HTML Mandiri</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'download_pdf' && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Download size={15} className="text-rose-600" />
                  <span>Mode Unduh File PDF Langsung (.pdf)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Langsung membuat dan mengunduh berkas <strong>.pdf</strong> resmi ke folder Download perangkat Anda tanpa perlu membuka dialog printer. Cocok untuk arsip digital dan pelaporan akademik.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Sedang Menyiapkan & Mengunduh PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={15} />
                        <span>Unduh Berkas PDF Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'word' && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileText size={15} className="text-blue-600" />
                  <span>Mode Unduh Dokumen Microsoft Word (.doc)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Mengunduh dokumen Word lengkap dengan kop surat resmi, tabel data presensi, dan tanda tangan digital dosen yang dapat dibuka dan diedit kembali menggunakan Microsoft Word.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleDownloadWord}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <FileText size={15} />
                    <span>Unduh Dokumen Word (.doc)</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'excel' && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileSpreadsheet size={15} className="text-emerald-700" />
                  <span>Mode Unduh Spreadsheet Microsoft Excel (.xls)</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Mengunduh spreadsheet Excel dengan pewarnaan sel matriks kehadiran 16 pertemuan, formula hitung hadir, persentase kehadiran, dan pengesahan tanda tangan.
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Unduh Spreadsheet Excel (.xls)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Verification & Signature Preview Card */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                <img
                  src={DOSEN_SIGNATURE_BASE64}
                  alt="Tanda Tangan Dosen"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Tanda Tangan Dosen Terverifikasi</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {dosenName} (NIP: 198806282015032001)
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  ✓ Tersemat otomatis di seluruh format dokumen cetak & unduh
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-3">
              <div className="text-[11px] text-slate-500 font-medium">Mahasiswa Terdaftar</div>
              <div className="text-xs font-bold text-slate-800">{students.length} Mahasiswa</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Aplikasi SIAKAD ini dibuat oleh <strong>Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-slate-600 hover:text-slate-900 font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
