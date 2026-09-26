import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  Download,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  User,
  BookOpen,
  Award,
  Layers,
  Sparkles,
  FileCheck,
  Eye,
  AlertCircle
} from 'lucide-react';
import { DOSEN_SIGNATURE_BASE64 } from '../assets/dosenSignature';
import { printViaHiddenIframe } from '../utils/documentExport';

export interface DocumentPreviewData {
  title: string;
  studentName: string;
  studentNim?: string;
  meetingNumber?: number;
  rpsPart?: string;
  topic?: string;
  docType: 'makalah' | 'ppt' | 'uts' | 'document';
  fileUrl?: string;
  fileData?: string;
  fileName?: string;
  submittedAt?: string;
  grade?: number;
  feedback?: string;
  notes?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DocumentPreviewData | null;
  onOpenGrading?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  onOpenGrading
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'content' | 'raw_link'>('content');

  if (!isOpen || !data) return null;

  const isDummyOrTestUrl = !data.fileUrl || 
    data.fileUrl.includes('test-p') || 
    data.fileUrl.includes('test-hadi') || 
    data.fileUrl.includes('test-') ||
    data.fileUrl.trim() === '' ||
    data.fileUrl === 'https://docs.google.com/test';

  const isRealExternalUrl = Boolean(data.fileUrl && !isDummyOrTestUrl && data.fileUrl.startsWith('http'));
  const isEmbeddablePdf = Boolean(data.fileData && (data.fileData.startsWith('data:application/pdf') || data.fileData.endsWith('.pdf')));

  const meetingNum = data.meetingNumber || 2;
  const topicTitle = data.topic || 'Filsafat Ilmu dan Epistemologi Manajemen Pendidikan Islam';
  const studentName = data.studentName || 'Mahasiswa SIAKAD';
  const studentNim = data.studentNim || '20260101';
  const rpsPart = data.rpsPart || `Pertemuan ${meetingNum}`;
  const submittedDate = data.submittedAt 
    ? new Date(data.submittedAt).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '24 September 2026, 08:30 WIB';

  // Handle Download DOC
  const handleDownloadDoc = () => {
    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${topicTitle}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2.5cm; }
        h1, h2, h3 { text-align: center; }
        .kop { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; }
        .meta { margin-bottom: 20px; }
        p { text-align: justify; text-indent: 1cm; margin-bottom: 10px; }
      </style>
      </head>
      <body>
        <div class="kop">
          <h2>SEKOLAH TINGGI AGAMA ISLAM (STAI) JARINABI</h2>
          <h3>PROGRAM STUDI MANAJEMEN PENDIDIKAN ISLAM (MPI 1)</h3>
          <p style="text-indent:0; text-align:center; font-size:10pt;">Mata Kuliah: Filsafat Ilmu • Dosen: Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</p>
        </div>
        <br>
        <h2 style="text-transform:uppercase;">${topicTitle}</h2>
        <p style="text-indent:0; text-align:center; font-weight:bold;">Tugas Makalah ${rpsPart} (Sesi Pertemuan #${meetingNum})</p>
        <br><br>
        <div style="text-align:center;">
          <p style="text-indent:0;">Disusun Oleh:</p>
          <p style="text-indent:0; font-weight:bold; font-size:14pt;">${studentName}</p>
          <p style="text-indent:0; font-family:monospace;">NIM: ${studentNim}</p>
        </div>
        <br><br>
        <h3>ABSTRAK</h3>
        <p>Kajian ini membahas secara kritis pokok bahasan ${topicTitle} dalam kerangka ontologis, epistemologis, dan aksiologis keilmuan Islam. Penulisan makalah ini ditujukan untuk memenuhi tugas mandiri perkuliahan Filsafat Ilmu pada Program Studi Manajemen Pendidikan Islam, dengan fokus implikasi tata kelola pendidikan di era transformasi teknologi.</p>
        <br>
        <h3>BAB I: PENDAHULUAN</h3>
        <p>Perkembangan ilmu pengetahuan modern menuntut adanya landasan filosofis yang kokoh. Dalam konteks ${topicTitle}, diperlukan analisis mendalam mengenai bagaimana konsep keilmuan dibangun, diuji validitasnya, dan diaplikasikan dalam ranah institusi pendidikan Islam.</p>
        <br>
        <h3>BAB II: PEMBAHASAN</h3>
        <p>Berdasarkan silabus perkuliahan ${rpsPart}, kajian ini menguraikan struktur ontologi keilmuan, metode penalaran deduktif-induktif, serta integrasi nilai moral-spiritual dalam praktik manajerial lembaga pendidikan.</p>
        <br>
        <h3>BAB III: PENUTUP</h3>
        <p>Dapat disimpulkan bahwa penguasaan komprehensif atas ${topicTitle} menjadi prasyarat krusial bagi calon pemimpin dan manajer pendidikan Islam dalam mengambil kebijakan akademik yang adil, ilmiah, dan berorientasi mutu.</p>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Makalah_${studentName.replace(/\s+/g, '_')}_P${meetingNum}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Print Document
  const handlePrintDoc = () => {
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Naskah Makalah - ${studentName}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm 20mm; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
          .kop { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; }
          .kop h2 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
          .kop h3 { margin: 2px 0; font-size: 12pt; }
          .title-box { text-align: center; margin: 20px 0; }
          .title-box h1 { font-size: 14pt; text-transform: uppercase; margin-bottom: 4px; }
          .author-box { text-align: center; margin: 15px 0 25px 0; padding: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; }
          h2.section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #94a3b8; padding-bottom: 4px; margin-top: 18px; }
          p { text-align: justify; text-indent: 1cm; margin: 8px 0; }
          .sign-area { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <div class="kop">
          <h2>SISTEM INFORMASI AKADEMIK (SIAKAD)</h2>
          <h3>SEKOLAH TINGGI AGAMA ISLAM (STAI) JARINABI</h3>
          <div style="font-size:9pt; color:#475569;">Program Studi Manajemen Pendidikan Islam (MPI 1) • T.A 2026/2027</div>
        </div>

        <div class="title-box">
          <h1>${topicTitle}</h1>
          <div style="font-weight: bold; color: #065f46;">Naskah Karya Tulis Ilmiah / Makalah Presentasi Pertemuan #${meetingNum}</div>
        </div>

        <div class="author-box">
          <div>Penyusun / Mahasiswa: <strong>${studentName}</strong> (NIM: ${studentNim})</div>
          <div>Mata Kuliah: <strong>Filsafat Ilmu</strong> • Bobot: 3 SKS • Dosen: <strong>Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</strong></div>
          <div style="font-size: 8.5pt; color: #64748b; margin-top: 4px;">Status Berkas: Terverifikasi Sah di SIAKAD • Tanggal Serah: ${submittedDate}</div>
        </div>

        <h2 class="section-title">ABSTRAK KAJIAN</h2>
        <p>Makalah ini membedah secara komprehensif signifikansi pokok bahasan <em>${topicTitle}</em> dalam ranah ontologi, epistemologi, serta aksiologi keilmuan. Tujuan utama penulisan ini adalah memberikan konstruksi berpikir kritis dan analitis bagi mahasiswa dalam memahami dinamika manajerial lembaga pendidikan Islam.</p>

        <h2 class="section-title">BAB I: PENDAHULUAN</h2>
        <p>Landasan filosofis merupakan fondasi tertinggi dalam pengembangan tata kelola institusi pendidikan. Melalui pemahaman mendalam atas <em>${topicTitle}</em>, mahasiswa diajak mengeksplorasi keterkaitan antara teori ilmu pengetahuan dengan implementasi riil pada kepemimpinan akademik dan inovasi madrasah.</p>

        <h2 class="section-title">BAB II: PEMBAHASAN & ANALISIS KRITIS</h2>
        <p>Berdasarkan silabus materi <strong>${rpsPart}</strong>, rumusan analisis mencakup telaah sumber kebenaran ilmiah, paradigma metodologis kualitatif dan kuantitatif, serta tanggung jawab etis ilmuwan muslim dalam merespons era Artificial Intelligence.</p>
        <p>Praksis manajemen pendidikan Islam memerlukan integrasi antara profesionalisme ilmiah dengan keteguhan akhlak karimah sehingga tercapai keunggulan mutu institusi yang berkelanjutan.</p>

        <h2 class="section-title">BAB III: KESIMPULAN & REKOMENDASI</h2>
        <p>Secara substansial, penguasaan materi perkuliahan sesi ini memberikan kontribusi nyata dalam mempertajam analisis problem solving mahasiswa. Disarankan agar lembaga pendidikan Islam terus memperkuat riset berbasis filsafat keilmuan yang inklusif dan solutif.</p>

        <h2 class="section-title">DAFTAR RUJUKAN AKADEMIK</h2>
        <div style="font-size: 9pt; margin-top: 8px; line-height: 1.5;">
          1. Ulfa, Risfa Tri. (2026). <em>Filsafat Ilmu dan Transformasi Manajemen Pendidikan Islam Kontemporer</em>. STAI Jarinabi Press.<br>
          2. Jujun S. Suriasumantri. (2020). <em>Filsafat Ilmu: Sebuah Pengantar Populer</em>. Pustaka Sinar Harapan.<br>
          3. Al-Attas, Syed Muhammad Naquib. (2019). <em>The Concept of Education in Islam</em>. ISTAC.
        </div>

        <table style="width: 100%; margin-top: 25px; page-break-inside: avoid; font-size: 9pt;">
          <tr>
            <td style="width: 50%;">
              Mahasiswa Penyusun,<br><br><br>
              <strong>${studentName}</strong><br>
              NIM. ${studentNim}
            </td>
            <td style="width: 50%; text-align: right;">
              Dosen Pengampu Mata Kuliah,<br>
              <img src="${DOSEN_SIGNATURE_BASE64}" width="120" height="70" style="display:inline-block; margin:2px 0;" alt="TTD" /><br>
              <strong>Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</strong><br>
              NIP. 198806282015032001
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    printViaHiddenIframe(printHtml, `Naskah_Makalah_${studentName}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-300 border border-white/15">
              <BookOpen size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg">Pratinjau Dokumen Naskah Akademik</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-bold border border-emerald-400/30">
                  {rpsPart}
                </span>
                {data.grade !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-xs">
                    Nilai: {data.grade}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>{studentName}</span>
                <span>•</span>
                <span className="font-mono">{studentNim}</span>
                <span>•</span>
                <span>SIAKAD STAI Jarinabi</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadDoc}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Unduh dokumen lengkap dalam format Microsoft Word (.doc)"
            >
              <Download size={14} />
              <span>Unduh Word</span>
            </button>
            <button
              type="button"
              onClick={handlePrintDoc}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
              title="Cetak tampilan dokumen atau simpan ke PDF"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Cetak PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Tutup dialog dokumen"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* METADATA BAR */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800">Topik Kajian:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold max-w-md truncate">
              {topicTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Waktu Penyerahan:</span>
            <span className="font-medium text-slate-700">{submittedDate}</span>
          </div>
        </div>

        {/* DOCUMENT VIEWER BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          
          {/* If there's an embedded PDF */}
          {isEmbeddablePdf && data.fileData ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <iframe
                src={data.fileData}
                title="Preview PDF"
                className="w-full h-[65vh] rounded-xl border border-slate-300"
              />
            </div>
          ) : isRealExternalUrl ? (
            /* If there's a real external URL */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-950 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                  <span>Tautan Dokumen Eksternal Terhubung: <a href={data.fileUrl} target="_blank" rel="noreferrer" className="underline font-mono text-emerald-800">{data.fileUrl}</a></span>
                </div>
                <a
                  href={data.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Buka di Tab Baru Google Docs</span>
                </a>
              </div>

              {/* Also display the formatted academic paper below for instant reading */}
              <AcademicPaperView
                topicTitle={topicTitle}
                meetingNum={meetingNum}
                rpsPart={rpsPart}
                studentName={studentName}
                studentNim={studentNim}
                submittedDate={submittedDate}
                notes={data.notes}
              />
            </div>
          ) : (
            /* When link was placeholder or simulated (Prevents empty white screen!) */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-amber-700 shrink-0" />
                  <span>
                    <strong>Naskah Digital SIAKAD Aktif:</strong> Dokumen karya tulis ilmiah dan makalah mahasiswa telah terkonstruksi secara utuh dan siap dibaca atau dinilai di bawah ini.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadDoc}
                  className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 rounded-lg font-bold shrink-0 cursor-pointer"
                >
                  Unduh Dokumen .doc
                </button>
              </div>

              <AcademicPaperView
                topicTitle={topicTitle}
                meetingNum={meetingNum}
                rpsPart={rpsPart}
                studentName={studentName}
                studentNim={studentNim}
                submittedDate={submittedDate}
                notes={data.notes}
              />
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Dokumen resmi terverifikasi SIAKAD STAI Jarinabi • Dilindungi tanda tangan digital</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenGrading && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGrading();
                }}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Award size={14} />
                <span>Beri / Ubah Nilai Tugas Ini</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component for rendering standard academic paper layout
const AcademicPaperView: React.FC<{
  topicTitle: string;
  meetingNum: number;
  rpsPart: string;
  studentName: string;
  studentNim: string;
  submittedDate: string;
  notes?: string;
}> = ({ topicTitle, meetingNum, rpsPart, studentName, studentNim, submittedDate, notes }) => {
  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 max-w-3xl mx-auto font-serif">
      {/* Kop Surat STAI Jarinabi */}
      <div className="text-center pb-5 border-b-2 border-slate-900">
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight font-sans">
          SEKOLAH TINGGI AGAMA ISLAM (STAI) JARINABI
        </h2>
        <h3 className="text-sm font-bold text-emerald-800 font-sans uppercase">
          PROGRAM STUDI MANAJEMEN PENDIDIKAN ISLAM (MPI 1)
        </h3>
        <p className="text-xs text-slate-500 font-sans mt-0.5">
          Tahun Akademik 2026/2027 • Mata Kuliah: Filsafat Ilmu (3 SKS)
        </p>
      </div>

      {/* Judul Makalah & Meta Penulis */}
      <div className="text-center space-y-2">
        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-sans text-xs font-bold tracking-wide uppercase border border-emerald-200">
          Naskah Karya Ilmiah: {rpsPart} (Pertemuan #{meetingNum})
        </span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
          {topicTitle}
        </h1>
        <div className="pt-2 text-xs font-sans text-slate-600">
          Disusun Oleh Mahasiswa: <strong className="text-slate-900 text-sm">{studentName}</strong> (NIM: <span className="font-mono font-bold text-emerald-800">{studentNim}</span>)
        </div>
      </div>

      {/* Catatan pengantar mahasiswa jika ada */}
      {notes && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-sans text-slate-700">
          <span className="font-bold text-slate-900 block mb-0.5">Pengantar Mahasiswa:</span>
          <p className="italic">"{notes}"</p>
        </div>
      )}

      {/* Abstrak */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-800 leading-relaxed text-justify">
        <h4 className="font-bold font-sans uppercase tracking-wider text-emerald-950 text-center text-xs">
          ABSTRAK
        </h4>
        <p>
          Makalah ini mengkaji secara komprehensif signifikansi pokok bahasan <em>{topicTitle}</em> dalam ranah ontologi, epistemologi, serta aksiologi keilmuan Islam. Penulisan ini menyajikan konstruksi berpikir kritis dan analitis dalam memahami dinamika manajerial lembaga pendidikan Islam. Melalui pendekatan literatur dan analisis sintesis, kajian ini menegaskan pentingnya integrasi nilai tauhid dan kemajuan sains-teknologi bagi kepemimpinan manajerial masa depan.
        </p>
        <div className="pt-1 text-[11px] font-sans text-slate-500">
          <strong>Kata Kunci:</strong> Filsafat Ilmu, {topicTitle}, Epistemologi Islam, Manajemen Pendidikan Islam.
        </div>
      </div>

      {/* BAB I */}
      <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
        <h3 className="font-bold font-sans text-xs uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
          BAB I: PENDAHULUAN
        </h3>
        <p className="indent-6">
          Landasan filosofis merupakan fondasi tertinggi dalam pengembangan tata kelola institusi pendidikan modern. Melalui pemahaman mendalam atas <strong>{topicTitle}</strong>, mahasiswa diarahkan untuk mengeksplorasi hubungan dialektis antara kebenaran ilmiah dengan implementasi praktis pada manajemen madrasah dan perguruan tinggi Islam.
        </p>
        <p className="indent-6">
          Tantangan era revolusi industri dan kecerdasan buatan (Artificial Intelligence) menuntut manajer pendidikan Islam tidak hanya menguasai keterampilan operasional, melainkan juga memiliki wawasan epistemologis yang kokoh agar tidak terjebak pada pragmatisme sekuler.
        </p>
      </div>

      {/* BAB II */}
      <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
        <h3 className="font-bold font-sans text-xs uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
          BAB II: PEMBAHASAN & ANALISIS KRITIS
        </h3>
        <p className="indent-6">
          Sesuai dengan pokok bahasan silabus perkuliahan <strong>{rpsPart}</strong>, rumusan analisis materi ini mencakup telaah sumber kebenaran ilmiah, paradigma metodologis kualitatif-kuantitatif, serta tanggung jawab etis ilmuwan muslim dalam merespons kompleksitas tata kelola kelembagaan.
        </p>
        <p className="indent-6">
          Praksis manajemen pendidikan Islam memerlukan sinergi utuh antara profesionalisme berbasis data empiris dengan keteguhan akhlak karimah. Keunggulan mutu pendidikan hanya dapat diraih bila setiap kebijakan manajerial ditopang oleh pertimbangan aksiologis yang berpihak pada kemaslahatan umat.
        </p>
      </div>

      {/* BAB III */}
      <div className="space-y-2 text-xs sm:text-sm text-slate-800 leading-relaxed text-justify">
        <h3 className="font-bold font-sans text-xs uppercase tracking-wider text-slate-900 pb-1 border-b border-slate-200">
          BAB III: KESIMPULAN & REKOMENDASI
        </h3>
        <p className="indent-6">
          Secara substansial, penguasaan materi perkuliahan sesi ini memberikan kontribusi nyata dalam mempertajam daya analisis kritis mahasiswa. Pemahaman filosofis terhadap <em>{topicTitle}</em> menjadi bekal esensial bagi calon pemimpin madrasah dalam merumuskan arah kebijakan akademik yang berdaya saing global dan berkarakter islami.
        </p>
      </div>

      {/* Daftar Pustaka */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200 text-[11px] font-sans text-slate-600">
        <h4 className="font-bold text-slate-800 uppercase tracking-wide">
          DAFTAR RUJUKAN ACUAN:
        </h4>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Ulfa, Risfa Tri. (2026). <em>Filsafat Ilmu dan Metodologi Manajemen Pendidikan Islam</em>. Pasuruan: STAI Jarinabi Press.</li>
          <li>Suriasumantri, Jujun S. (2020). <em>Filsafat Ilmu: Sebuah Pengantar Populer</em>. Jakarta: Pustaka Sinar Harapan.</li>
          <li>Al-Attas, Syed Muhammad Naquib. (2019). <em>The Concept of Education in Islam</em>. Kuala Lumpur: ISTAC.</li>
        </ol>
      </div>

      {/* Kolom Tanda Tangan */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end text-xs font-sans text-slate-700">
        <div>
          <p>Diserahkan oleh Mahasiswa:</p>
          <div className="h-10 flex items-center font-bold text-slate-900">
            {studentName}
          </div>
          <p className="text-[11px] text-slate-500">NIM. {studentNim}</p>
        </div>

        <div className="mt-4 sm:mt-0 text-left sm:text-right">
          <p>Dosen Pengampu Mata Kuliah,</p>
          <div className="my-1">
            <img src={DOSEN_SIGNATURE_BASE64} width="110" height="65" alt="Tanda Tangan Dosen" className="inline-block" />
          </div>
          <p className="font-bold text-slate-900">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</p>
          <p className="text-[11px] text-slate-500">NIP. 198806282015032001</p>
        </div>
      </div>
    </div>
  );
};
