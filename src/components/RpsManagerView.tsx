import React, { useState } from 'react';
import { MeetingSchedule, DosenProfile, Student, GroupProject } from '../types';
import {
  uploadRpsApi,
  parseRpsFileApi,
  updateCourseProfileApi,
  resetCourseProfileApi,
  updateMeetingApi,
  addMeetingApi,
  deleteMeetingApi,
  recalculateAllGradesApi,
} from '../services/api';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Calendar,
  Settings,
  CheckCircle2,
  Trash2,
  Edit3,
  Plus,
  RefreshCw,
  AlertCircle,
  Save,
  Users,
  User,
  GraduationCap,
  Sparkles,
  Layers,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface RpsManagerViewProps {
  meetings: MeetingSchedule[];
  courseProfile?: DosenProfile;
  students: Student[];
  groups: GroupProject[];
  rpsRawText?: string;
  onRefreshData: () => Promise<void>;
}

export const RpsManagerView: React.FC<RpsManagerViewProps> = ({
  meetings = [],
  courseProfile,
  students = [],
  groups = [],
  rpsRawText = '',
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'upload-sync' | 'mk-profile' | 'meetings-schedule' | 'uts-uas-rules'>('upload-sync');

  // Upload & text sync state
  const [pastedRpsText, setPastedRpsText] = useState<string>(rpsRawText || '');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string>('');
  const [isReadingDoc, setIsReadingDoc] = useState<boolean>(false);
  const [defaultFormat, setDefaultFormat] = useState<'auto' | 'individu' | 'kelompok'>('auto');
  const [utsFormat, setUtsFormat] = useState<'esai' | 'proyek'>('esai');
  const [uasFormat, setUasFormat] = useState<'proyek' | 'esai'>('proyek');
  const [isProcessingSync, setIsProcessingSync] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Course profile edit state
  const [courseForm, setCourseForm] = useState<DosenProfile>({
    name: courseProfile?.name || 'Dr. H. Ahmad Fauzi, M.Ag.',
    nip: courseProfile?.nip || '197508122002121003',
    courseTitle: courseProfile?.courseTitle || 'Filsafat Ilmu',
    courseCode: courseProfile?.courseCode || 'MPI-501',
    sks: courseProfile?.sks || 3,
    semester: courseProfile?.semester || 'Semester Ganjil 2026/2027',
    studyProgram: courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)',
    description: courseProfile?.description || 'Mata kuliah ini membahas fondasi ontologis, epistemologis, dan aksiologis keilmuan dalam tata kelola lembaga pendidikan Islam kontemporer.',
  });
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isConfirmingResetCourse, setIsConfirmingResetCourse] = useState(false);
  const [courseFeedback, setCourseFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Meeting schedule quick edit state
  const [editingMeetingNum, setEditingMeetingNum] = useState<number | null>(null);
  const [meetingForm, setMeetingForm] = useState<Partial<MeetingSchedule>>({});
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<number | null>(null);
  const [meetingFeedback, setMeetingFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New meeting modal
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState<Partial<MeetingSchedule>>({
    title: '',
    dateStr: '',
    description: '',
    presentationFormat: 'individu',
    taskType: 'makalah_ppt',
    presenters: [],
  });
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);

  // Handle file upload from laptop (supports .docx, .doc, .pdf, .txt, .md)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsReadingDoc(true);
    setSyncFeedback(null);

    const isBinaryDoc = /\.(docx|doc|pdf)$/i.test(file.name);

    if (isBinaryDoc) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const resultStr = (event.target?.result as string) || '';
            const base64Data = resultStr.includes('base64,')
              ? resultStr.split('base64,')[1]
              : btoa(resultStr);

            setUploadedFileBase64(base64Data);

            const parseRes = await parseRpsFileApi({
              base64: base64Data,
              filename: file.name,
              defaultPresentationFormat: defaultFormat,
            });

            if (parseRes.success && parseRes.text) {
              setPastedRpsText(parseRes.text);
              const mCount = parseRes.detectedMeetings?.length || 16;
              setSyncFeedback({
                type: 'success',
                message: `Dokumen Word/PDF "${file.name}" berhasil diekstrak (${parseRes.text.length} karakter, ${mCount} pertemuan terbaca). Silakan klik "Sinkronkan Sekarang" untuk memperbarui jadwal & tugas perkuliahan!`,
              });
            } else {
              setSyncFeedback({
                type: 'error',
                message: parseRes.error || 'Gagal mengekstrak teks dari dokumen RPS.',
              });
            }
          } catch (err: any) {
            setSyncFeedback({
              type: 'error',
              message: `Gagal memproses dokumen: ${err.message || 'Format tidak valid'}`,
            });
          } finally {
            setIsReadingDoc(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setIsReadingDoc(false);
        setSyncFeedback({
          type: 'error',
          message: `Gagal membaca file: ${err.message || 'Kesalahan baca'}`,
        });
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsReadingDoc(false);
        const text = event.target?.result as string;
        if (text) {
          setPastedRpsText(text);
          setSyncFeedback({
            type: 'success',
            message: `File teks "${file.name}" berhasil dibaca (${text.length} karakter). Klik tombol "Sinkronkan Sekarang" untuk menerapkan.`,
          });
        }
      };
      reader.onerror = () => {
        setIsReadingDoc(false);
        setSyncFeedback({
          type: 'error',
          message: 'Gagal membaca file dari komputer. Coba salin dan tempelkan teks RPS langsung ke area teks.',
        });
      };
      reader.readAsText(file);
    }
  };

  // Sample RPS Template Generator
  const handleLoadSampleRps = () => {
    const sample = `RENCANA PEMBELAJARAN SEMESTER (RPS)
Mata Kuliah: Filsafat Ilmu
Kode Mata Kuliah: MPI-501
SKS: 3 SKS
Semester: Ganjil 2026/2027
Program Studi: Manajemen Pendidikan Islam (MPI 1)
Dosen Pengampu: Dr. H. Ahmad Fauzi, M.Ag.

JADWAL PERTEMUAN DAN MATERI PERKULIAHAN:
Pertemuan 1: Orientasi Perkuliahan, Kontrak Belajar, dan Pengantar Filsafat Ilmu
Pertemuan 2: Hakikat Ilmu Pengetahuan dan Perbedaan Ilmu, Pengetahuan, serta Mitos
Pertemuan 3: Landasan Ontologis Ilmu: Hakikat Realitas dan Objek Studi Pendidikan Islam
Pertemuan 4: Landasan Epistemologis Ilmu: Sumber Pengetahuan, Rasionalisme, dan Empirisme
Pertemuan 5: Metode Ilmiah, Validitas Data, dan Pendekatan Riset dalam Manajemen Pendidikan
Pertemuan 6: Landasan Aksiologis Ilmu: Nilai, Moral, dan Etika Pemanfaatan Ilmu
Pertemuan 7: Integrasi Ilmu dan Agama: Paradigma Keilmuan Islam Kontemporer
Pertemuan 8: Evaluasi Tengah Semester (UTS): Analisis Kritis Esai Studi Kasus Filsafat
Pertemuan 9: Positivisme, Post-Positivisme, dan Kritik Terhadap Saintisme
Pertemuan 10: Fenomenologi, Hermeneutika, dan Konstruktivisme dalam Studi Manajemen
Pertemuan 11: Kritisime, Teori Kritis Frankfurt, dan Dekonstruksi Paradigma Pendidikan
Pertemuan 12: Paradigma Manajemen Pendidikan Islam: Ontologi Kelembagaan dan Kepemimpinan
Pertemuan 13: Filsafat Teknologi, Artificial Intelligence, dan Tantangan Etika Pendidikan Digital
Pertemuan 14: Kebijakan Pendidikan Nasional dalam Perspektif Filsafat Humanisme Islam
Pertemuan 15: Rekonstruksi Epistemologi Keilmuan MPI Menghadapi Era Society 5.0
Pertemuan 16: Evaluasi Akhir Semester (UAS): Presentasi dan Publikasi Proyek Video Edukasi AI`;

    setPastedRpsText(sample);
    setSyncFeedback({
      type: 'success',
      message: 'Template RPS 16 Pertemuan berhasil dimuat! Anda dapat mengedit teksnya atau langsung klik tombol Sinkronkan.',
    });
  };

  // Generate Complete 16-Meeting RPS Syllabus Automatically
  const handleGenerateRpsAuto = async () => {
    const currentTitle = courseForm.name || 'Filsafat Ilmu';
    const currentProdi = courseForm.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)';
    const currentCode = courseForm.code || 'MPI-501';

    const generatedRps = `RENCANA PEMBELAJARAN SEMESTER (RPS)
Mata Kuliah: ${currentTitle}
Kode Mata Kuliah: ${currentCode}
SKS: ${courseForm.sks || 3} SKS
Semester: ${courseForm.semester || 'Ganjil 2026/2027'}
Program Studi: ${currentProdi}
Dosen Pengampu: ${courseProfile?.name || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}

DESKRIPSI DAN CAPAIAN PEMBELAJARAN:
Mata kuliah ini membekali mahasiswa dengan wawasan mendalam mengenai fondasi ontologis, epistemologis, dan aksiologis dalam praksis pendidikan Islam, kepemimpinan, dan etika ilmiah modern.

JADWAL PERTEMUAN DAN MATERI PERKULIAHAN:
Pertemuan 1: Orientasi Perkuliahan, Kontrak Belajar, dan Pengantar ${currentTitle}
Pertemuan 2: Hakikat Ilmu Pengetahuan dan Perbedaan Ilmu, Pengetahuan, serta Mitos
Pertemuan 3: Landasan Ontologis Ilmu: Hakikat Realitas dan Objek Studi Pendidikan Islam
Pertemuan 4: Landasan Epistemologis Ilmu: Sumber Pengetahuan, Rasionalisme, dan Empirisme
Pertemuan 5: Metode Ilmiah, Validitas Data, dan Pendekatan Riset dalam Manajemen Pendidikan
Pertemuan 6: Landasan Aksiologis Ilmu: Nilai, Moral, dan Etika Pemanfaatan Ilmu
Pertemuan 7: Integrasi Ilmu dan Agama: Paradigma Keilmuan Islam Kontemporer
Pertemuan 8: Evaluasi Tengah Semester (UTS): Analisis Kritis Esai Studi Kasus Filsafat
Pertemuan 9: Positivisme, Post-Positivisme, dan Kritik Terhadap Saintisme
Pertemuan 10: Fenomenologi, Hermeneutika, dan Konstruktivisme dalam Studi Manajemen
Pertemuan 11: Kritisime, Teori Kritis Frankfurt, dan Dekonstruksi Paradigma Pendidikan
Pertemuan 12: Paradigma Manajemen Pendidikan Islam: Ontologi Kelembagaan dan Kepemimpinan
Pertemuan 13: Filsafat Teknologi, Artificial Intelligence, dan Tantangan Etika Pendidikan Digital
Pertemuan 14: Kebijakan Pendidikan Nasional dalam Perspektif Filsafat Humanisme Islam
Pertemuan 15: Rekonstruksi Epistemologi Keilmuan Menghadapi Era Society 5.0
Pertemuan 16: Evaluasi Akhir Semester (UAS): Presentasi dan Publikasi Proyek Video Edukasi AI`;

    setPastedRpsText(generatedRps);
    setIsProcessingSync(true);
    setSyncFeedback(null);
    try {
      const res = await uploadRpsApi({
        rpsText: generatedRps,
        defaultPresentationFormat: defaultFormat,
      });
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `✨ Berhasil generate RPS otomatis! 16 pertemuan lengkap untuk ${currentTitle} telah dibuat dan disinkronkan ke jadwal perkuliahan.`,
        });
        await onRefreshData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Gagal menyinkronkan RPS otomatis.',
        });
      }
    } catch {
      setSyncFeedback({
        type: 'error',
        message: 'Koneksi bermasalah saat generate RPS otomatis.',
      });
    } finally {
      setIsProcessingSync(false);
    }
  };

  // Trigger Automatic Sync from RPS
  const handleSyncRps = async () => {
    if (!pastedRpsText.trim() && !uploadedFileBase64) {
      setSyncFeedback({
        type: 'error',
        message: 'Silakan tempelkan teks RPS atau unggah file RPS dari laptop terlebih dahulu.',
      });
      return;
    }

    setIsProcessingSync(true);
    setSyncFeedback(null);

    try {
      const res = await uploadRpsApi({
        rpsText: pastedRpsText.trim(),
        rpsBase64: uploadedFileBase64 || undefined,
        rpsFilename: uploadedFileName || undefined,
        defaultPresentationFormat: defaultFormat,
      });

      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: `Berhasil sinkronisasi otomatis! Sistem telah membaca dan memperbarui ${res.meetingsCount || 16} pertemuan, jadwal perkuliahan, dan tugas RPS.`,
        });
        await onRefreshData();
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Terjadi kesalahan saat memproses RPS.',
        });
      }
    } catch (err) {
      console.error(err);
      setSyncFeedback({
        type: 'error',
        message: 'Gagal menghubungkan ke server untuk memproses RPS.',
      });
    } finally {
      setIsProcessingSync(false);
    }
  };

  // Save Course Profile
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCourse(true);
    setCourseFeedback(null);

    try {
      const ok = await updateCourseProfileApi(courseForm);
      if (ok) {
        setCourseFeedback({
          type: 'success',
          message: 'Data profil Mata Kuliah berhasil diperbarui dan disimpan!',
        });
        await onRefreshData();
      } else {
        setCourseFeedback({
          type: 'error',
          message: 'Gagal memperbarui profil mata kuliah.',
        });
      }
    } finally {
      setIsSavingCourse(false);
    }
  };

  // Reset / Clear Course
  const handleResetCourse = async () => {
    setIsSavingCourse(true);
    try {
      const ok = await resetCourseProfileApi();
      if (ok) {
        setCourseFeedback({
          type: 'success',
          message: 'Data Mata Kuliah berhasil direset.',
        });
        setIsConfirmingResetCourse(false);
        await onRefreshData();
      }
    } finally {
      setIsSavingCourse(false);
    }
  };

  // Start editing meeting
  const handleStartEditMeeting = (m: MeetingSchedule) => {
    setEditingMeetingNum(m.meetingNumber);
    setMeetingForm({
      dateStr: m.dateStr,
      isoDate: m.isoDate,
      title: m.title,
      description: m.description,
      presentationFormat: m.presentationFormat || 'individu',
      groupName: m.groupName || (m.groupId ? `KELOMPOK ${m.groupId}` : ''),
      taskType: m.taskType || (m.type === 'uts' ? 'uts_esai' : m.type === 'uas' ? 'uas_proyek' : 'makalah_ppt'),
      presenters: m.presenters,
    });
    setMeetingFeedback(null);
  };

  // Save meeting changes
  const handleSaveMeeting = async (meetingNumber: number) => {
    setIsSavingMeeting(true);
    setMeetingFeedback(null);

    try {
      const updated = await updateMeetingApi(meetingNumber, meetingForm);
      if (updated) {
        setMeetingFeedback({
          type: 'success',
          message: `Pertemuan ke-${meetingNumber} berhasil diperbarui (Tanggal presensi & format tugas tersinkron).`,
        });
        setEditingMeetingNum(null);
        await onRefreshData();
      } else {
        setMeetingFeedback({
          type: 'error',
          message: 'Gagal menyimpan perubahan pertemuan.',
        });
      }
    } finally {
      setIsSavingMeeting(false);
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async (meetingNumber: number) => {
    try {
      const ok = await deleteMeetingApi(meetingNumber);
      if (ok) {
        setMeetingFeedback({
          type: 'success',
          message: `Pertemuan ke-${meetingNumber} berhasil dihapus.`,
        });
        setMeetingToDelete(null);
        await onRefreshData();
      }
    } catch {
      setMeetingFeedback({
        type: 'error',
        message: 'Gagal menghapus pertemuan.',
      });
    }
  };

  // Add new meeting
  const handleAddNewMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingForm.title?.trim()) {
      setMeetingFeedback({ type: 'error', message: 'Judul materi pertemuan wajib diisi.' });
      return;
    }

    setIsAddingMeeting(true);
    try {
      const res = await addMeetingApi({
        ...newMeetingForm,
        dateStr: newMeetingForm.dateStr?.trim() || 'Sabtu, 24 Oktober 2026',
        isoDate: newMeetingForm.isoDate || new Date().toISOString().split('T')[0],
      });
      if (res) {
        setShowAddMeetingModal(false);
        setNewMeetingForm({
          title: '',
          dateStr: '',
          description: '',
          presentationFormat: 'individu',
          taskType: 'makalah_ppt',
          presenters: [],
        });
        setMeetingFeedback({
          type: 'success',
          message: 'Pertemuan baru berhasil ditambahkan ke RPS!',
        });
        await onRefreshData();
      }
    } finally {
      setIsAddingMeeting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
              <Sparkles size={13} />
              <span>Otomatisasi & Sinkronisasi RPS Dosen</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif-title">
              Kelola RPS, Mata Kuliah & Tugas Perkuliahan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Dosen dapat mengunggah file RPS dari laptop atau menempelkan teks RPS. Sistem akan <strong>otomatis membaca, menyinkronkan, dan membuat 16 pertemuan</strong>, tugas presentasi (individu/kelompok), UTS, dan UAS secara instan. Mata Kuliah dan tanggal presensi dapat diedit atau dihapus secara fleksibel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncRps}
              disabled={isProcessingSync || !pastedRpsText.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw size={14} className={isProcessingSync ? 'animate-spin' : ''} />
              <span>{isProcessingSync ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('upload-sync')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'upload-sync'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UploadCloud size={14} />
            <span>Upload & Sinkronkan RPS</span>
          </button>

          <button
            onClick={() => setActiveTab('mk-profile')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'mk-profile'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={14} />
            <span>Profil & Hapus Mata Kuliah</span>
          </button>

          <button
            onClick={() => setActiveTab('meetings-schedule')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'meetings-schedule'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar size={14} />
            <span>Jadwal & Tanggal Presensi ({meetings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('uts-uas-rules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'uts-uas-rules'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Settings size={14} />
            <span>Ketentuan UTS & UAS Dosen</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: UPLOAD & SYNC RPS ================= */}
      {activeTab === 'upload-sync' && (
        <div className="space-y-5">
          {syncFeedback && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-rose-700 flex-shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{syncFeedback.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Col: Upload & Rules */}
            <div className="space-y-4">
              {/* Upload Box */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <UploadCloud size={16} className="text-emerald-700" />
                  <span>1. Unggah File RPS dari Laptop</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pilih file RPS berformat <strong>.txt, .doc, .docx, .pdf, atau .md</strong> dari komputer Anda:
                </p>

                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                  {isReadingDoc ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Loader2 size={28} className="text-emerald-600 animate-spin mb-2" />
                      <span className="text-xs font-bold text-emerald-800">
                        Mengekstrak & Menganalisis Dokumen...
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        {uploadedFileName}
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={28} className="text-slate-400 mb-2" />
                      <span className="text-xs font-bold text-slate-800">
                        {uploadedFileName ? uploadedFileName : 'Klik untuk Pilih File RPS'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        Mendukung Word (.docx, .doc), PDF (.pdf), atau Plain Text (.txt)
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf,.txt,.md,.rtf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isReadingDoc}
                  />
                </label>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleRps}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>Gunakan Contoh Template RPS 16 Pertemuan</span>
                  </button>
                </div>
              </div>

              {/* Automation Rules */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Settings size={16} className="text-emerald-700" />
                  <span>2. Ketentuan Tugas Presentasi (Individu / Kelompok)</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tentukan bagaimana sistem membagi format tugas presentasi perkuliahan (tergantung dosen yang membagi):
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Format Tugas Presentasi:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultFormat('auto')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        defaultFormat === 'auto'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400" />
                        <span>Otomatis Sesuai Teks RPS</span>
                      </div>
                      <span className="text-[10px] opacity-80">Rekomendasi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultFormat('kelompok')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        defaultFormat === 'kelompok'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-indigo-400" />
                        <span>Tugas Presentasi Kelompok</span>
                      </div>
                      <span className="text-[10px] opacity-80">Semua Kelompok</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultFormat('individu')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                        defaultFormat === 'individu'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-emerald-400" />
                        <span>Tugas Presentasi Individu</span>
                      </div>
                      <span className="text-[10px] opacity-80">Mandiri (PPT/Makalah)</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <p>• <strong>Pertemuan 8</strong> otomatis dijadikan UTS (Esai 5 Soal Analitis).</p>
                  <p>• <strong>Pertemuan 16</strong> otomatis dijadikan UAS (Proyek Video Edukasi AI / Makalah).</p>
                </div>
              </div>
            </div>

            {/* Right Col: RPS Text Area Editor */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <FileText size={16} className="text-emerald-700" />
                    <span>3. Area Salin / Tempel Teks RPS Lengkap</span>
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      id="btn-muat-template-rps"
                      onClick={handleLoadSampleRps}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 flex items-center gap-1 cursor-pointer"
                      title="Muat contoh format teks RPS 16 pertemuan lengkap"
                    >
                      <BookOpen size={12} />
                      <span>Muat Template RPS</span>
                    </button>
                    <button
                      type="button"
                      id="btn-generate-rps-otomatis"
                      disabled={isProcessingSync}
                      onClick={handleGenerateRpsAuto}
                      className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Otomatis buat dan sinkronkan silabus 16 pertemuan sesuai nama mata kuliah"
                    >
                      <Sparkles size={12} className={isProcessingSync ? 'animate-spin' : ''} />
                      <span>{isProcessingSync ? 'Memproses...' : '✨ Generate RPS Otomatis'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tempelkan isi RPS dari dokumen Word atau PDF Anda di sini, atau klik tombol <strong>"Generate RPS Otomatis"</strong> untuk menyusun silabus 16 pertemuan secara instan.
                </p>

                <textarea
                  value={pastedRpsText}
                  onChange={(e) => setPastedRpsText(e.target.value)}
                  placeholder="Tempelkan isi teks Rencana Pembelajaran Semester (RPS) di sini..."
                  rows={14}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 leading-relaxed"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Total saat ini: <strong>{meetings.length} Pertemuan Terdaftar</strong>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    id="btn-quick-gen-rps-footer"
                    disabled={isProcessingSync}
                    onClick={handleGenerateRpsAuto}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles size={14} className={isProcessingSync ? 'animate-spin' : ''} />
                    <span>✨ Generate 16 Pertemuan</span>
                  </button>
                  <button
                    type="button"
                    id="btn-baca-sync-rps"
                    onClick={handleSyncRps}
                    disabled={isProcessingSync || (!pastedRpsText.trim() && !uploadedFileBase64)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={14} className={isProcessingSync ? 'animate-spin' : ''} />
                    <span>{isProcessingSync ? 'Memproses Jadwal...' : '🚀 Baca & Sinkronkan Otomatis RPS'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PROFIL & HAPUS MATA KULIAH ================= */}
      {activeTab === 'mk-profile' && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Data Identitas Mata Kuliah & Dosen Pengampu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dosen dapat mengubah nama mata kuliah, kode MK, bobot SKS, semester, prodi, atau mereset data MK.
              </p>
            </div>
            {!isConfirmingResetCourse ? (
              <button
                type="button"
                onClick={() => setIsConfirmingResetCourse(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto"
              >
                <Trash2 size={13} />
                <span>Hapus / Reset Mata Kuliah</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 p-1 bg-rose-100 border border-rose-300 rounded-xl self-start sm:self-auto">
                <span className="text-[11px] font-bold text-rose-950 px-1">Yakin reset?</span>
                <button
                  type="button"
                  onClick={() => setIsConfirmingResetCourse(false)}
                  className="px-2 py-1 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSavingCourse}
                  onClick={handleResetCourse}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isSavingCourse ? '...' : 'Ya, Reset'}
                </button>
              </div>
            )}
          </div>

          {courseFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                courseFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>{courseFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSaveCourse} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Mata Kuliah:
                </label>
                <input
                  type="text"
                  value={courseForm.courseTitle}
                  onChange={(e) => setCourseForm({ ...courseForm, courseTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode Mata Kuliah:
                </label>
                <input
                  type="text"
                  value={courseForm.courseCode}
                  onChange={(e) => setCourseForm({ ...courseForm, courseCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bobot SKS:
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={courseForm.sks}
                  onChange={(e) => setCourseForm({ ...courseForm, sks: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Semester & Tahun Akademik:
                </label>
                <input
                  type="text"
                  value={courseForm.semester}
                  onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Program Studi & Kelas:
                </label>
                <input
                  type="text"
                  value={courseForm.studyProgram}
                  onChange={(e) => setCourseForm({ ...courseForm, studyProgram: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Dosen Pengampu:
                </label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Dosen:
                </label>
                <input
                  type="text"
                  value={courseForm.nip}
                  onChange={(e) => setCourseForm({ ...courseForm, nip: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi & Capaian Pembelajaran Mata Kuliah:
                </label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingCourse}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Save size={14} />
                <span>{isSavingCourse ? 'Menyimpan...' : 'Simpan Perubahan Mata Kuliah'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 3: JADWAL 16 PERTEMUAN & TANGGAL PRESENSI ================= */}
      {activeTab === 'meetings-schedule' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Daftar 16 Pertemuan & Pengaturan Tanggal Presensi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap tanggal presensi dapat diedit. Format tugas presentasi dapat diatur sebagai <strong>Individu</strong> atau <strong>Kelompok</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMeetingModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Plus size={14} />
              <span>Tambah Pertemuan Baru</span>
            </button>
          </div>

          {meetingFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                meetingFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <CheckCircle2 size={15} className="text-emerald-700" />
              <span>{meetingFeedback.message}</span>
            </div>
          )}

          {/* List of Meetings */}
          <div className="grid grid-cols-1 gap-3.5">
            {meetings.map((m) => {
              const isEditing = editingMeetingNum === m.meetingNumber;

              if (isEditing) {
                return (
                  <div
                    key={m.meetingNumber}
                    className="p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/20 shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs px-2.5 py-1 rounded bg-slate-900 text-white">
                        EDIT PERTEMUAN {m.meetingNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingMeetingNum(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tanggal Presensi / Pertemuan:
                        </label>
                        <input
                          type="text"
                          value={meetingForm.dateStr || ''}
                          onChange={(e) => setMeetingForm({ ...meetingForm, dateStr: e.target.value })}
                          placeholder="Contoh: Sabtu, 12 September 2026"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Format Presentasi:
                        </label>
                        <select
                          value={meetingForm.presentationFormat || 'individu'}
                          onChange={(e) => setMeetingForm({ ...meetingForm, presentationFormat: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          <option value="individu">Individu (PPT / Makalah Mandiri)</option>
                          <option value="kelompok">Kelompok (Presentasi Tim)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nama Kelompok / Pemakalah:
                        </label>
                        <input
                          type="text"
                          value={meetingForm.groupName || ''}
                          onChange={(e) => setMeetingForm({ ...meetingForm, groupName: e.target.value })}
                          placeholder="Contoh: KELOMPOK 1 / Nama Pemateri"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Judul Materi Perkuliahan:
                        </label>
                        <input
                          type="text"
                          value={meetingForm.title || ''}
                          onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Deskripsi & Keterangan Tugas:
                        </label>
                        <textarea
                          rows={2}
                          value={meetingForm.description || ''}
                          onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingMeetingNum(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveMeeting(m.meetingNumber)}
                        disabled={isSavingMeeting}
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Save size={13} />
                        <span>{isSavingMeeting ? 'Menyimpan...' : 'Simpan Pertemuan'}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.meetingNumber}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-xs px-2.5 py-0.5 rounded bg-slate-900 text-white">
                        PERTEMUAN {m.meetingNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                        <Calendar size={12} />
                        {m.dateStr}
                      </span>
                      {m.presentationFormat === 'kelompok' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <Users size={11} /> Presentasi Kelompok
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <User size={11} /> Presentasi Individu
                        </span>
                      )}
                      {m.type === 'uts' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          UTS
                        </span>
                      )}
                      {m.type === 'uas' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                          UAS
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {m.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {m.description}
                    </p>

                    {m.groupName && (
                      <div className="text-[11px] font-semibold text-indigo-700">
                        Nama Kelompok: {m.groupName}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditMeeting(m)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Edit3 size={13} />
                      <span>Edit Pertemuan</span>
                    </button>
                    {meetingToDelete === m.meetingNumber ? (
                      <div className="flex items-center gap-1 bg-rose-100 p-1 rounded-xl border border-rose-300">
                        <span className="text-[10px] text-rose-900 font-bold px-1">Hapus?</span>
                        <button
                          type="button"
                          onClick={() => setMeetingToDelete(null)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-white text-slate-700 rounded hover:bg-slate-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(m.meetingNumber)}
                          className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded"
                        >
                          Ya
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMeetingToDelete(m.meetingNumber)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs transition-colors"
                        title="Hapus Pertemuan"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 4: KETENTUAN UTS & UAS DOSEN ================= */}
      {activeTab === 'uts-uas-rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* UTS Rules */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                UTS
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Ujian Tengah Semester (Pertemuan 8)
                </h3>
                <p className="text-xs text-slate-500">Bobot Penilaian Resmi: 25%</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dosen menentukan apakah UTS dikerjakan dalam bentuk <strong>Ujian Esai 5 Soal Komprehensif</strong> atau <strong>Proyek Analisis Mandiri</strong>:
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="utsFormat"
                  value="esai"
                  checked={utsFormat === 'esai'}
                  onChange={() => setUtsFormat('esai')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ujian Tertulis 5 Soal Esai Studi Kasus (Standar RPS)</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="utsFormat"
                  value="proyek"
                  checked={utsFormat === 'proyek'}
                  onChange={() => setUtsFormat('proyek')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Proyek Analisis Filsafat Mandiri / Esai Bebas</span>
              </label>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>Info Sistem:</strong> Soal UTS tersinkron dengan 5 tema pokok RPS: Ontologi, Epistemologi, Aksiologi, Metodologi Ilmiah, dan Integrasi Ilmu-Agama. Mahasiswa menjawab langsung di portal.
            </div>
          </div>

          {/* UAS Rules */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                UAS
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Ujian Akhir Semester (Pertemuan 16)
                </h3>
                <p className="text-xs text-slate-500">Bobot Penilaian Resmi: 25%</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dosen menentukan format UAS mahasiswa sebagai <strong>Proyek Video Edukasi AI Berkelompok</strong> atau <strong>Karya Tulis Ilmiah Akhir</strong>:
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="uasFormat"
                  value="proyek"
                  checked={uasFormat === 'proyek'}
                  onChange={() => setUasFormat('proyek')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Proyek Video Edukasi AI Kelompok (Canva, CapCut, AI)</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs font-semibold">
                <input
                  type="radio"
                  name="uasFormat"
                  value="esai"
                  checked={uasFormat === 'esai'}
                  onChange={() => setUasFormat('esai')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Makalah Komprehensif / Publikasi Jurnal Akhir</span>
              </label>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed">
              <strong>Info Kelompok:</strong> Terdaftar 5 kelompok mahasiswa. Nilai video yang diberikan Dosen akan otomatis disinkronkan ke seluruh anggota kelompok pada rekap nilai transkrip akhir.
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Meeting */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-lg w-full border border-slate-200 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Tambah Pertemuan Perkuliahan Baru
            </h3>

            <form onSubmit={handleAddNewMeeting} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Materi Pertemuan:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pertemuan 17: Diskusi Panel..."
                  value={newMeetingForm.title || ''}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Pertemuan:
                  </label>
                  <input
                    type="text"
                    placeholder="Sabtu, 31 Oktober 2026"
                    value={newMeetingForm.dateStr || ''}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, dateStr: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Format Tugas:
                  </label>
                  <select
                    value={newMeetingForm.presentationFormat || 'individu'}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, presentationFormat: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="individu">Individu</option>
                    <option value="kelompok">Kelompok</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Singkat:
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan materi perkuliahan..."
                  value={newMeetingForm.description || ''}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMeetingModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingMeeting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  {isAddingMeeting ? 'Menyimpan...' : 'Simpan Pertemuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
