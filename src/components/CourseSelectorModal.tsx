import React, { useState } from 'react';
import {
  X,
  Plus,
  BookOpen,
  Check,
  Trash2,
  School,
  User,
  Layers,
  ArrowRight,
  AlertCircle,
  FileText,
  Upload,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { CourseSummary, DosenProfile } from '../types';
import { switchCourseApi, addCourseApi, deleteCourseApi, parseRpsFileApi } from '../services/api';

interface CourseSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseSummary[];
  activeCourseId?: string;
  courseProfile?: DosenProfile;
  isDosen: boolean;
  onCourseSwitched: (updatedDb: any) => void;
}

export const CourseSelectorModal: React.FC<CourseSelectorModalProps> = ({
  isOpen,
  onClose,
  courses = [],
  activeCourseId,
  courseProfile,
  isDosen,
  onCourseSwitched,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [sks, setSks] = useState(3);
  const [semester, setSemester] = useState(courseProfile?.semester || 'Semester Ganjil 2026/2027');
  const [studyProgram, setStudyProgram] = useState(courseProfile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)');
  const [campusName, setCampusName] = useState(courseProfile?.campusName || 'STAI Jarinabi');
  const [dosenName, setDosenName] = useState(courseProfile?.dosenName || 'Risfa Tri Ulfa');
  const [dosenTitle, setDosenTitle] = useState(courseProfile?.dosenTitle || 'S.Pd., M.Pd., Gr.');
  const [description, setDescription] = useState('');
  const [rpsText, setRpsText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileBase64, setUploadedFileBase64] = useState('');
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState<'auto' | 'kelompok' | 'individu'>('auto');
  const [parsedSummary, setParsedSummary] = useState<{
    meetingsCount: number;
    kelompokCount: number;
    individuCount: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null);

  if (!isOpen) return null;

  // Handle RPS document upload (.docx, .doc, .pdf, .txt)
  const handleRpsDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsingDoc(true);
    setErrorMsg('');
    setParsedSummary(null);

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
            setRpsText(parseRes.text);

            const prof = parseRes.detectedProfile;
            if (prof) {
              if (prof.courseTitle) setTitle(prof.courseTitle);
              if (prof.courseCode) setCode(prof.courseCode);
              if (prof.sks) setSks(prof.sks);
              if (prof.semester) setSemester(prof.semester);
              if (prof.studyProgram) setStudyProgram(prof.studyProgram);
              if (prof.campusName) setCampusName(prof.campusName);
              if (prof.dosenName) setDosenName(prof.dosenName);
              if (prof.dosenTitle) setDosenTitle(prof.dosenTitle);
              if (prof.description) setDescription(prof.description);
            }

            const meetings = parseRes.detectedMeetings || [];
            const kelompokCount = meetings.filter((m: any) => m.presentationFormat === 'kelompok').length;
            const individuCount = meetings.filter((m: any) => m.presentationFormat === 'individu' && m.type === 'kuliah').length;

            setParsedSummary({
              meetingsCount: meetings.length,
              kelompokCount,
              individuCount,
            });
          } else {
            setErrorMsg(parseRes.error || 'Gagal mengekstrak teks dari berkas RPS.');
          }
        } catch (err: any) {
          setErrorMsg(`Gagal memproses file RPS: ${err.message || 'Format tidak valid'}`);
        } finally {
          setIsParsingDoc(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(`Gagal membaca berkas: ${err.message || 'Format tidak valid'}`);
      setIsParsingDoc(false);
    }
  };

  // Handle switching course
  const handleSwitch = async (courseId: string) => {
    if (courseId === activeCourseId) {
      onClose();
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await switchCourseApi(courseId);
      if (res.success && res.data) {
        onCourseSwitched(res.data);
        onClose();
      } else {
        setErrorMsg(res.error || 'Gagal berpindah mata kuliah');
      }
    } catch {
      setErrorMsg('Kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding new course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Nama mata kuliah wajib diisi!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await addCourseApi({
        title: title.trim(),
        code: code.trim(),
        sks,
        semester: semester.trim(),
        studyProgram: studyProgram.trim(),
        campusName: campusName.trim(),
        dosenName: dosenName.trim(),
        dosenTitle: dosenTitle.trim(),
        description: description.trim(),
        rpsText: rpsText.trim(),
        rpsBase64: uploadedFileBase64 || undefined,
        rpsFilename: uploadedFileName || undefined,
        defaultPresentationFormat: defaultFormat,
      });

      if (res.success && res.data) {
        setSuccessMsg('Mata kuliah baru & seluruh jadwal RPS 16 pertemuan berhasil dibuat!');
        setTimeout(() => {
          onCourseSwitched(res.data);
          setShowAddForm(false);
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res.error || 'Gagal menambahkan mata kuliah');
      }
    } catch {
      setErrorMsg('Kesalahan server saat membuat mata kuliah');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete course confirmation
  const handleOpenDeleteConfirm = (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMsg('');
    setCourseToDelete({ id: courseId, title: courseName });
  };

  const handleExecuteDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await deleteCourseApi(courseToDelete.id);
      if (res.success) {
        setSuccessMsg(`Mata kuliah "${courseToDelete.title}" berhasil dihapus.`);
        setCourseToDelete(null);
        if (res.data) {
          onCourseSwitched(res.data);
        } else {
          const remaining = courses.filter(c => c.id !== courseToDelete.id);
          if (remaining.length > 0) {
            await handleSwitch(remaining[0].id);
          }
        }
      } else {
        setErrorMsg(res.error || 'Gagal menghapus mata kuliah');
      }
    } catch {
      setErrorMsg('Kesalahan koneksi saat menghapus mata kuliah');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Daftar Mata Kuliah Diampu</h2>
              <p className="text-xs text-slate-400">
                1 Dosen dapat mengampu lebih dari satu mata kuliah di SIAKAD ini
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-800">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isDosen && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-950">Mode Akses Mahasiswa:</span>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Anda dapat melihat dan memilih mata kuliah yang ingin dibuka. Fitur <strong>menambah mata kuliah baru</strong>, <strong>menghapus data MK</strong>, dan <strong>mengunggah dokumen RPS</strong> secara eksklusif hanya dapat dikelola oleh Dosen Pengampu.
                </p>
              </div>
            </div>
          )}

          {!showAddForm || !isDosen ? (
            <>
              {/* Courses List */}
              <div className="space-y-3">
                {/* Delete Confirmation Box */}
                {isDosen && courseToDelete && (
                  <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-rose-100 text-rose-700 rounded-lg flex-shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-rose-950">Konfirmasi Hapus Mata Kuliah</h4>
                        <p className="text-xs text-rose-800 mt-0.5">
                          Apakah Anda yakin ingin menghapus mata kuliah <strong>"{courseToDelete.title}"</strong>? Seluruh jadwal pertemuan, mahasiswa, dan tugas di dalamnya akan dihapus permanen.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setCourseToDelete(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleExecuteDeleteCourse}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Menghapus...' : 'Ya, Hapus Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Pilih Mata Kuliah ({courses?.length || 0})
                  </span>
                  {isDosen && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Mata Kuliah</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {(courses || []).map((c) => {
                    const isActive = c.id === activeCourseId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSwitch(c.id)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                {c.code}
                              </span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span>{c.sks} SKS</span>
                              <span>•</span>
                              <span>{c.semester}</span>
                              <span>•</span>
                              <span>Prodi: {c.studyProgram}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 flex items-center space-x-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{c.dosenName}{c.dosenTitle ? ', ' + c.dosenTitle : ''}</span>
                              <span className="text-slate-300">•</span>
                              <School className="w-3 h-3 text-slate-400" />
                              <span className="font-semibold text-emerald-800">{c.campusName || 'STAI Jarinabi'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isDosen && (courses?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenDeleteConfirm(c.id, c.title, e)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center space-x-1 text-xs font-semibold transition-colors"
                              title="Hapus mata kuliah ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isActive ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Add Course Form */
            <form onSubmit={handleAddCourse} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Tambah Mata Kuliah Baru yang Diampu</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                >
                  Kembali ke Daftar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Smart RPS Document Upload (Word docx / PDF / txt) */}
                <div className="sm:col-span-2 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center space-x-2 text-emerald-950 font-bold text-xs">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Upload Berkas RPS (Word .docx / .doc / PDF / .txt)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold w-fit">
                      Auto-Extract 16 Pertemuan & Tugas
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mb-3 leading-relaxed">
                    Unggah dokumen RPS Mata Kuliah. Sistem otomatis membaca rincian MK, SKS, Dosen, menyusun jadwal 16 pertemuan, dan langsung membagi tugas presentasi (individu / kelompok) secara otomatis.
                  </p>

                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white/90 hover:bg-white rounded-xl p-4 cursor-pointer transition-all shadow-2xs">
                    <input
                      type="file"
                      accept=".docx,.doc,.pdf,.txt,.md"
                      className="hidden"
                      onChange={handleRpsDocUpload}
                      disabled={isParsingDoc}
                    />
                    {isParsingDoc ? (
                      <div className="flex items-center space-x-2 text-emerald-700 py-1">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-xs font-semibold">Mengekstrak teks & menganalisis dokumen RPS ({uploadedFileName})...</span>
                      </div>
                    ) : uploadedFileName ? (
                      <div className="flex items-center space-x-2 text-emerald-900 py-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-bold">{uploadedFileName}</span>
                        <span className="text-[10px] text-emerald-700 underline ml-2">Ganti berkas</span>
                      </div>
                    ) : (
                      <div className="text-center py-1">
                        <Upload className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-800">Klik atau seret berkas RPS (Word / PDF) ke sini</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Mendukung Microsoft Word (.docx, .doc), Adobe PDF (.pdf), atau Plain Text (.txt)</p>
                      </div>
                    )}
                  </label>

                  {/* Parsing summary card */}
                  {parsedSummary && (
                    <div className="mt-3 bg-white p-3 rounded-lg border border-emerald-200 text-xs text-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hasil Pembacaan RPS:</span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-800">
                          {parsedSummary.meetingsCount} Pertemuan Terbaca
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {parsedSummary.kelompokCount} Tugas Presentasi Kelompok
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {parsedSummary.individuCount} Tugas Presentasi Individu
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          UTS & UAS Siap
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Format Penugasan Dosen Selector */}
                  <div className="mt-3 pt-2 border-t border-emerald-100">
                    <label className="block text-[11px] font-bold text-emerald-950 mb-1.5">
                      Penentuan Dosen untuk Format Tugas Presentasi:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDefaultFormat('auto')}
                        className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          defaultFormat === 'auto'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <span className="block font-bold">Otomatis Sesuai RPS</span>
                        <span className="text-[10px] opacity-80">Sesuai teks RPS per sesi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDefaultFormat('kelompok')}
                        className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          defaultFormat === 'kelompok'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <span className="block font-bold">Tugas Presentasi Kelompok</span>
                        <span className="text-[10px] opacity-80">Materi dibagi per kelompok</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDefaultFormat('individu')}
                        className={`px-2.5 py-1.5 rounded-lg border text-left text-[11px] transition-all ${
                          defaultFormat === 'individu'
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <span className="block font-bold">Tugas Presentasi Individu</span>
                        <span className="text-[10px] opacity-80">Materi dibagi mandiri</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Mata Kuliah Baru *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Manajemen Lembaga Pendidikan Islam"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Contoh: MPI-502"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot SKS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={sks}
                    onChange={(e) => setSks(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="Semester Ganjil 2026/2027"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program Studi
                  </label>
                  <input
                    type="text"
                    value={studyProgram}
                    onChange={(e) => setStudyProgram(e.target.value)}
                    placeholder="Manajemen Pendidikan Islam (MPI 1)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Kampus / Perguruan Tinggi
                  </label>
                  <input
                    type="text"
                    value={campusName}
                    onChange={(e) => setCampusName(e.target.value)}
                    placeholder="STAI Jarinabi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Dosen Pengampu
                  </label>
                  <input
                    type="text"
                    value={dosenName}
                    onChange={(e) => setDosenName(e.target.value)}
                    placeholder="Risfa Tri Ulfa"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gelar Dosen
                  </label>
                  <input
                    type="text"
                    value={dosenTitle}
                    onChange={(e) => setDosenTitle(e.target.value)}
                    placeholder="S.Pd., M.Pd., Gr."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RPS / Pokok Bahasan 16 Pertemuan (Opsional)
                  </label>
                  <textarea
                    value={rpsText}
                    onChange={(e) => setRpsText(e.target.value)}
                    placeholder="Tempel rincian RPS untuk mata kuliah baru ini..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center space-x-2"
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan & Aktifkan MK'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Dosen: {courseProfile?.name || 'Risfa Tri Ulfa, S.Pd., M.Pd., Gr.'}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
