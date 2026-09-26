import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  User,
  GraduationCap,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  History,
  Clock,
  ShieldCheck,
  Check,
  Trash2,
} from 'lucide-react';
import { Student, DosenProfile, StudentDosenMessage } from '../types';
import { sendStudentMessageApi, deleteStudentMessageApi, clearAllMessagesApi } from '../services/api';

interface StudentMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent?: Student | null;
  students: Student[];
  courseProfile?: DosenProfile;
  onMessageSent?: () => void;
  allMessages?: StudentDosenMessage[];
}

export const StudentMessageModal: React.FC<StudentMessageModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  students = [],
  courseProfile,
  onMessageSent,
  allMessages = [],
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(currentStudent?.id || '');
  const [category, setCategory] = useState<StudentDosenMessage['category']>('tugas_makalah');
  const [meetingNumber, setMeetingNumber] = useState<number>(1);
  const [subject, setSubject] = useState<string>('Pemberitahuan Pengumpulan Tugas Makalah & PPT');
  const [content, setContent] = useState<string>('');
  const [attachmentLink, setAttachmentLink] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeView, setActiveView] = useState<'compose' | 'history'>('compose');

  // Local message state for immediate responsiveness
  const [localMessages, setLocalMessages] = useState<StudentDosenMessage[]>(allMessages);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  useEffect(() => {
    setLocalMessages(allMessages);
  }, [allMessages]);

  const dosenName = courseProfile?.name || (courseProfile?.dosenName ? `${courseProfile.dosenName}${courseProfile.dosenTitle ? ', ' + courseProfile.dosenTitle : ''}` : 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.');
  const campus = courseProfile?.campusName || 'STAI Jarinabi';
  const courseTitle = courseProfile?.courseTitle || 'Filsafat Ilmu';
  const studyProgram = courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';

  // Sync selected student when currentStudent prop changes or modal opens
  useEffect(() => {
    if (currentStudent?.id) {
      setSelectedStudentId(currentStudent.id);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [currentStudent, students, isOpen]);

  const activeStudent = students.find((s) => s.id === selectedStudentId) || currentStudent || null;

  // Filter messages sent by this student (from local state for instant updates)
  const studentHistory = (localMessages || []).filter(
    (m) => m.studentId === activeStudent?.id || m.studentNim === activeStudent?.nim
  );

  // Instant optimistic deletion of a single message
  const handleDeleteSingleMessage = async (messageId: string) => {
    setIsDeleting(true);
    setConfirmDeleteId(null);
    setLocalMessages(prev => prev.filter(m => m.id !== messageId));
    setActionToast('Pesan berhasil dihapus dari riwayat.');
    setTimeout(() => setActionToast(null), 3000);

    try {
      await deleteStudentMessageApi(messageId, activeStudent?.id);
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.warn('Failed to delete message on backend:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Instant optimistic clear all messages for student
  const handleClearAllStudentMessages = async () => {
    setIsDeleting(true);
    setConfirmClearAll(false);
    setLocalMessages(prev =>
      prev.filter(m => m.studentId !== activeStudent?.id && m.studentNim !== activeStudent?.nim)
    );
    setActionToast('Seluruh riwayat pesan Anda berhasil dibersihkan.');
    setTimeout(() => setActionToast(null), 3500);

    try {
      await clearAllMessagesApi('by_student', activeStudent?.id);
      if (onMessageSent) onMessageSent();
    } catch (err) {
      console.warn('Failed to clear messages on backend:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Template autofill handler
  const applyTemplate = (type: 'makalah' | 'uts' | 'uas' | 'revisi' | 'konsultasi') => {
    const stdName = activeStudent?.name || '[Nama Mahasiswa]';
    const stdNim = activeStudent?.nim || '[NIM]';

    switch (type) {
      case 'makalah':
        setCategory('tugas_makalah');
        setSubject(`Pengumpulan Tugas Makalah & PPT Pertemuan #${meetingNumber}`);
        setContent(
          `Assalamu'alaikum Warahmatullahi Wabarakatuh, Yth. Ibu Dosen ${dosenName}.\n\nSaya ${stdName} (NIM: ${stdNim}) ingin memberitahukan bahwa saya telah mengunggah berkas Makalah dan Slide Presentasi PPT untuk materi perkuliahan Pertemuan #${meetingNumber} ke sistem SIAKAD.\n\nMohon arahan dan masukan dari Ibu Dosen untuk kelengkapan tugas saya. Terima kasih banyak.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`
        );
        break;
      case 'uts':
        setCategory('tugas_uts');
        setSubject('Pemberitahuan Penyelesaian & Pengumpulan Ujian Tengah Semester (UTS)');
        setContent(
          `Assalamu'alaikum Warahmatullahi Wabarakatuh, Yth. Ibu Dosen ${dosenName}.\n\nAlhamdulillah saya ${stdName} (NIM: ${stdNim}) telah menyelesaikan dan mengirimkan seluruh jawaban UTS Esai (5 Soal Analisis) melalui sistem SIAKAD.\n\nMohon perkenan Ibu Dosen untuk memeriksa dan memberikan evaluasi hasil pengerjaan saya. Terima kasih.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`
        );
        break;
      case 'uas':
        setCategory('tugas_uas');
        setSubject('Pemberitahuan Pengumpulan Proyek Video UAS Kelompok');
        setContent(
          `Assalamu'alaikum Warahmatullahi Wabarakatuh, Yth. Ibu Dosen ${dosenName}.\n\nSaya ${stdName} (NIM: ${stdNim}), mewakili kelompok mata kuliah ${courseTitle}, memberitahukan bahwa kami telah mengunggah tautan video dan laporan Proyek UAS ke sistem SIAKAD.\n\nMohon perkenan Ibu Dosen untuk meninjau dan menilai proyek kami. Terima kasih banyak atas bimbingan Ibu selama semester ini.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`
        );
        break;
      case 'revisi':
        setCategory('revisi');
        setSubject('Pemberitahuan Pengunggahan Berkas Revisi Tugas');
        setContent(
          `Assalamu'alaikum Warahmatullahi Wabarakatuh, Yth. Ibu Dosen ${dosenName}.\n\nSaya ${stdName} (NIM: ${stdNim}) telah merevisi berkas tugas sesuai catatan dan arahan yang Ibu berikan sebelumnya. Berkas perbaikan terbaru sudah saya perbarui di SIAKAD.\n\nTerima kasih atas bimbingan dan koreksi yang diberikan.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`
        );
        break;
      case 'konsultasi':
        setCategory('konsultasi');
        setSubject('Konsultasi Materi Perkuliahan & Bimbingan Tugas');
        setContent(
          `Assalamu'alaikum Warahmatullahi Wabarakatuh, Yth. Ibu Dosen ${dosenName}.\n\nMohon izin bertanya dan berkonsultasi mengenai materi perkuliahan ${courseTitle}. Apakah ada waktu luang yang bisa saya manfaatkan untuk bimbingan singkat terkait tugas saya?\n\nTerima kasih atas waktu dan perhatian Ibu Dosen.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.`
        );
        break;
    }
  };

  // Default content on first open if empty
  useEffect(() => {
    if (!content && isOpen && activeStudent) {
      applyTemplate('makalah');
    }
  }, [isOpen, activeStudent]);

  if (!isOpen) return null;

  // Send message to internal SIAKAD
  const handleSendSiakad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) {
      setErrorMessage('Pilih atau tentukan identitas mahasiswa terlebih dahulu.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Isi pesan pemberitahuan tidak boleh kosong.');
      return;
    }

    setIsSending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload: Partial<StudentDosenMessage> = {
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        studentNim: activeStudent.nim,
        category,
        subject: subject.trim() || 'Pemberitahuan Tugas Mahasiswa',
        content: content.trim(),
        meetingNumber: category === 'tugas_makalah' ? meetingNumber : undefined,
        taskTitle: category === 'tugas_makalah' ? `Pertemuan #${meetingNumber}` : category,
        attachmentLink: attachmentLink.trim() || undefined,
        submittedAt: new Date().toISOString(),
        read: false,
      };

      const res = await sendStudentMessageApi(payload);
      if (res.success) {
        setSuccessMessage('Pesan pemberitahuan berhasil dikirimkan ke Portal Dosen SIAKAD!');
        if (onMessageSent) onMessageSent();
        setTimeout(() => {
          setSuccessMessage('');
          setActiveView('history');
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Gagal mengirim pesan ke sistem.');
      }
    } catch {
      setErrorMessage('Terjadi kendala jaringan saat mengirimkan pesan.');
    } finally {
      setIsSending(false);
    }
  };

  // Open direct formatted WhatsApp to Lecturer
  const handleSendWhatsApp = () => {
    if (!activeStudent) return;
    const waText = encodeURIComponent(
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n` +
      `Yth. Ibu Dosen ${dosenName}\n` +
      `Dosen Pengampu Mata Kuliah ${courseTitle} (${campus})\n\n` +
      `Saya mahasiswa:\n` +
      `• Nama : ${activeStudent.name}\n` +
      `• NIM  : ${activeStudent.nim}\n` +
      `• Prodi: ${studyProgram}\n` +
      `• Perihal: ${subject}\n\n` +
      `Pesan Pemberitahuan:\n` +
      `${content}\n\n` +
      (attachmentLink ? `Tautan Berkas:\n${attachmentLink}\n\n` : '') +
      `Pemberitahuan ini juga telah tercatat di SIAKAD Online Kampus.\n` +
      `Terima kasih banyak atas bimbingan Ibu Dosen.\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`
    );

    // Default Indonesian WhatsApp link (opens web or app with pre-filled message)
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-amber-300">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">Pesan & Pemberitahuan Tugas ke Dosen</h2>
              <p className="text-xs text-emerald-200">
                Kirim notifikasi pengumpulan tugas, revisi, atau konsultasi langsung ke Ibu Dosen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs (Tulis Pesan vs Riwayat Pesan Terkirim) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveView('compose')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeView === 'compose'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Tulis Pesan Baru</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeView === 'history'
                ? 'border-emerald-700 text-emerald-900 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Terkirim ({studentHistory.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          {/* Lecturer Destination Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Tujuan Penerima</div>
                <div className="text-sm font-bold text-slate-900">{dosenName}</div>
                <div className="text-[11px] text-slate-600">
                  Dosen Pengampu {courseTitle} • {campus}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">
              Portal Dosen Aktif
            </span>
          </div>

          {activeView === 'compose' ? (
            <form onSubmit={handleSendSiakad} className="space-y-4">
              
              {/* Feedback Alert */}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-2 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Student Identity Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Identitas Pengirim (Mahasiswa)
                </label>
                {currentStudent ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-xs">{currentStudent.name}</span>
                      <span className="text-slate-500 text-[11px] ml-2 font-mono">(NIM: {currentStudent.nim})</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                      Akun Aktif
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  >
                    <option value="" disabled>-- Pilih Nama Anda dari Daftar Mahasiswa --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (NIM: {s.nim}) - Kelompok {s.groupId}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Template Quick Pills */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pilih Template Pesan Cepat:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyTemplate('makalah')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      category === 'tugas_makalah'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    📄 Tugas Makalah & PPT
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('uts')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      category === 'tugas_uts'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    📝 Jawaban UTS Esai
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('uas')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      category === 'tugas_uas'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    🎬 Proyek Video UAS
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('revisi')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      category === 'revisi'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    🔄 Revisi Tugas
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate('konsultasi')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                      category === 'konsultasi'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    💬 Konsultasi Dosen
                  </button>
                </div>
              </div>

              {/* Category & Specific Meeting Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className={category === 'tugas_makalah' ? 'sm:col-span-8' : 'sm:col-span-12'}>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kategori Pemberitahuan
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="tugas_makalah">Pengumpulan Tugas Makalah & PPT</option>
                    <option value="tugas_uts">Pengumpulan Tugas UTS (Esai 5 Soal)</option>
                    <option value="tugas_uas">Pengumpulan Tugas UAS (Video / Proyek Kelompok)</option>
                    <option value="revisi">Revisi / Perbaikan Pengumpulan Berkas</option>
                    <option value="konsultasi">Konsultasi Materi RPS / Bimbingan</option>
                    <option value="izin">Keterangan Izin / Sakit Perkuliahan</option>
                    <option value="umum">Pesan Akademis Lainnya</option>
                  </select>
                </div>

                {category === 'tugas_makalah' && (
                  <div className="sm:col-span-4">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Pertemuan RPS
                    </label>
                    <select
                      value={meetingNumber}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        setMeetingNumber(num);
                        setSubject(`Pengumpulan Tugas Makalah & PPT Pertemuan #${num}`);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Pertemuan #{n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Perihal / Judul Pesan
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Pengumpulan Makalah Pertemuan 3"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Isi Pesan / Keterangan untuk Ibu Dosen
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan pesan dengan santun kepada Ibu Dosen..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans"
                  required
                />
              </div>

              {/* Attachment Link (Optional) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tautan Berkas Tambahan (Google Drive / Docs / Video YouTube - Opsional)</span>
                </label>
                <input
                  type="url"
                  value={attachmentLink}
                  onChange={(e) => setAttachmentLink(e.target.value)}
                  placeholder="https://drive.google.com/... atau https://docs.google.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Actions Button Row */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  title="Format pesan dan buka di WhatsApp"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Kirim via WhatsApp ke Dosen</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {isSending ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Mengirim ke SIAKAD...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim ke SIAKAD Dosen</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          ) : (
            /* History View */
            <div className="space-y-3">
              {/* Feedback toast banner */}
              {actionToast && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionToast}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                <div className="text-xs font-bold text-slate-800">
                  Pesan & Pemberitahuan yang Pernah Anda Kirimkan ({studentHistory.length})
                </div>
                {studentHistory.length > 0 && (
                  <div>
                    {confirmClearAll ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-lg">
                        <span className="text-[11px] text-rose-800 font-bold">Hapus semua riwayat pesan Anda?</span>
                        <button
                          type="button"
                          onClick={handleClearAllStudentMessages}
                          disabled={isDeleting}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isDeleting ? 'Menghapus...' : 'Ya, Hapus Semua'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClearAll(false)}
                          disabled={isDeleting}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClearAll(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Kosongkan riwayat pesan saya jika penuh"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Pesan Jika Penuh</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {studentHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                  <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">Belum ada riwayat pesan terkirim dari Anda.</p>
                  <button
                    type="button"
                    onClick={() => setActiveView('compose')}
                    className="mt-3 px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors"
                  >
                    Tulis Pesan Pertama Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {studentHistory.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 border border-slate-200 rounded-xl bg-white hover:border-emerald-300 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-xs">{m.subject}</span>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(m.submittedAt).toLocaleString('id-ID')}</span>
                            <span>•</span>
                            <span className="capitalize">{m.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.replied
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.read
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.replied ? 'Sudah Dibalas Dosen' : m.read ? 'Sudah Dibaca Dosen' : 'Terkirim (Menunggu Dosen)'}
                          </span>
                          {confirmDeleteId === m.id ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg">
                              <span className="text-[10px] text-rose-800 font-bold">Hapus?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleMessage(m.id)}
                                disabled={isDeleting}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {isDeleting ? '...' : 'Ya'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={isDeleting}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(m.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus pesan ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-700 text-[11px] whitespace-pre-line leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {m.content}
                      </p>

                      {m.attachmentLink && (
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          <a href={m.attachmentLink} target="_blank" rel="noopener noreferrer" className="underline truncate">
                            {m.attachmentLink}
                          </a>
                        </div>
                      )}

                      {/* Lecturer Reply if any */}
                      {m.replyText && (
                        <div className="mt-2 p-2.5 bg-emerald-50 border-l-3 border-emerald-600 rounded text-[11px] text-emerald-950">
                          <div className="font-bold text-emerald-900 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Tanggapan Ibu Dosen {dosenName}:</span>
                          </div>
                          <p className="mt-0.5 leading-relaxed">{m.replyText}</p>
                          {m.repliedAt && (
                            <span className="text-[9px] text-emerald-600 mt-1 block">
                              Dibalas pada: {new Date(m.repliedAt).toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Micro Footer */}
        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Aplikasi ini dibuat oleh <span className="font-semibold text-emerald-800">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</span>
        </div>

      </div>
    </div>
  );
};
