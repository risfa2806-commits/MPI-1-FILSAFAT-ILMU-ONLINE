import React, { useState, useRef } from 'react';
import { Student } from '../types';
import {
  updateStudentBiodataApi,
  deleteStudentApi,
  bulkImportStudentsApi,
  addStudentApi,
  uploadStudentDocumentApi,
  restoreCanonicalStudentsApi,
  updateGroupApi,
} from '../services/api';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Upload,
  Download,
  X,
  Check,
  Calendar,
  MapPin,
  Phone,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
  FileText,
  UserCheck,
  ShieldAlert,
  Loader2,
  RotateCcw,
} from 'lucide-react';

interface StudentBiodataModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  isDosen: boolean;
  onRefreshData: () => Promise<void>;
  onSelectStudent?: (student: Student) => void;
}

export const StudentBiodataModal: React.FC<StudentBiodataModalProps> = ({
  isOpen,
  onClose,
  students = [],
  isDosen = false,
  onRefreshData,
  onSelectStudent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'daftar' | 'input' | 'upload'>('daftar');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Manual Input / Edit Form State
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formNim, setFormNim] = useState('');
  const [formName, setFormName] = useState('');
  const [formBirthPlace, setFormBirthPlace] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGender, setFormGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [formPhone, setFormPhone] = useState('');
  const [formGroupId, setFormGroupId] = useState<number>(1);
  const [formGroupName, setFormGroupName] = useState('');
  const [formRpsPart, setFormRpsPart] = useState('');
  const [formTopic, setFormTopic] = useState('');
  const [formMeetingNumber, setFormMeetingNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Document Upload State
  const [uploadText, setUploadText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isUploading, setIsUploading] = useState(false);
  const [isParsingDoc, setIsParsingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Delete Confirmation State
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for restoring canonical 15 students
  const [isRestoringCanonical, setIsRestoringCanonical] = useState(false);

  if (!isOpen) return null;

  // Filter students
  const filteredStudents = (students || []).filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.nim && s.nim.toLowerCase().includes(q)) ||
      (s.birthPlace && s.birthPlace.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q));
    const matchesGroup = filterGroup === 'all' || String(s.groupId) === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const resetForm = () => {
    setEditingStudentId(null);
    setFormNim('');
    setFormName('');
    setFormBirthPlace('');
    setFormBirthDate('');
    setFormAddress('');
    setFormGender('Laki-laki');
    setFormPhone('');
    setFormGroupId(1);
    setFormGroupName('');
    setFormRpsPart(`Part ${String((students?.length || 0) + 1).padStart(2, '0')}`);
    setFormTopic('Filsafat Ilmu dan Metodologi MPI');
    setFormMeetingNumber(1);
  };

  const handleStartAdd = () => {
    resetForm();
    setActiveSubTab('input');
  };

  const handleStartEdit = (std: Student) => {
    setEditingStudentId(std.id);
    setFormNim(std.nim || '');
    setFormName(std.name || '');
    setFormBirthPlace(std.birthPlace || '');
    setFormBirthDate(std.birthDate || '');
    setFormAddress(std.address || '');
    setFormGender((std.gender as any) === 'Perempuan' ? 'Perempuan' : 'Laki-laki');
    setFormPhone(std.phone || '');
    setFormGroupId(std.groupId || 1);
    setFormGroupName('');
    setFormRpsPart(std.rpsPart || '');
    setFormTopic(std.topic || '');
    setFormMeetingNumber(std.meetingNumber || 1);
    setActiveSubTab('input');
  };

  // Submit Manual Form (Add or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Nama lengkap mahasiswa wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const payload = {
        name: formName.trim().toUpperCase(),
        nim: formNim.trim() || `202601${(students?.length || 0) + 1}`,
        birthPlace: formBirthPlace.trim(),
        birthDate: formBirthDate.trim(),
        address: formAddress.trim(),
        gender: formGender,
        phone: formPhone.trim(),
        groupId: Number(formGroupId) || 1,
        rpsPart: formRpsPart.trim() || `Part ${String((students?.length || 0) + 1).padStart(2, '0')}`,
        topic: formTopic.trim() || 'Studi Kasus Filsafat Ilmu MPI',
        meetingNumber: Number(formMeetingNumber) || 1,
      };

      if (formGroupName && formGroupName.trim()) {
        await updateGroupApi(Number(formGroupId) || 1, { name: formGroupName.trim().toUpperCase() });
      }

      if (editingStudentId) {
        const res = await updateStudentBiodataApi(editingStudentId, payload);
        if (res.success) {
          setFeedbackMessage({ type: 'success', text: `Data biodata ${payload.name} berhasil diperbarui!` });
          resetForm();
          await onRefreshData();
          setActiveSubTab('daftar');
        } else {
          setFeedbackMessage({ type: 'error', text: res.error || 'Gagal memperbarui biodata.' });
        }
      } else {
        const newStudent = await addStudentApi(payload);
        if (newStudent) {
          setFeedbackMessage({ type: 'success', text: `Mahasiswa ${payload.name} berhasil ditambahkan!` });
          resetForm();
          await onRefreshData();
          setActiveSubTab('daftar');
        } else {
          setFeedbackMessage({ type: 'error', text: 'Gagal menambahkan mahasiswa baru.' });
        }
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Student
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    try {
      const res = await deleteStudentApi(deletingStudent.id);
      if (res.success) {
        setFeedbackMessage({ type: 'success', text: `Mahasiswa ${deletingStudent.name} berhasil dihapus dari SIAKAD.` });
        setDeletingStudent(null);
        await onRefreshData();
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Gagal menghapus mahasiswa.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Terjadi kesalahan.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for restoring canonical 15 students
  const handleRestoreCanonical = async () => {
    if (!window.confirm('Pulihkan daftar 15 mahasiswa resmi kelas MPI 1 dan 5 kelompok RPS ke susunan awal SIAKAD?')) {
      return;
    }
    setIsRestoringCanonical(true);
    setFeedbackMessage(null);
    try {
      const res = await restoreCanonicalStudentsApi();
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: 'Berhasil memulihkan 15 nama mahasiswa resmi & 5 kelompok RPS ke SIAKAD!',
        });
        await onRefreshData();
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || 'Gagal memulihkan nama mahasiswa.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Terjadi gangguan saat memulihkan data.' });
    } finally {
      setIsRestoringCanonical(false);
    }
  };

  // Parse Text / CSV file into table preview
  const handleParseText = (rawText: string) => {
    setUploadText(rawText);
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setParsedPreview([]);
      return;
    }

    // Try parsing as JSON first
    if (rawText.trim().startsWith('[') && rawText.trim().endsWith(']')) {
      try {
        const parsedJson = JSON.parse(rawText.trim());
        if (Array.isArray(parsedJson)) {
          setParsedPreview(parsedJson.slice(0, 50));
          return;
        }
      } catch (e) {
        // ignore and proceed to CSV/tab delimited
      }
    }

    // Header detection
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
    const hasHeader = /nama|nim|tempat|tanggal|alamat/i.test(firstLine);

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const parsed: any[] = [];

    dataLines.forEach((line, idx) => {
      // Split with quotes handling
      const cols = line.split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length >= 2) {
        // Attempt heuristics:
        // Col 1: NIM or No
        // Col 2: Nama
        // Col 3: Tempat Lahir
        // Col 4: Tanggal Lahir
        // Col 5: Alamat
        let nimCandidate = cols[0];
        let nameCandidate = cols[1];
        let birthPlace = cols[2] || '';
        let birthDate = cols[3] || '';
        let address = cols[4] || '';
        let gender = cols[5] || '';
        let phone = cols[6] || '';

        // If col 0 looks like an index (1, 2, 3), shift
        if (/^\d{1,3}$/.test(cols[0]) && cols.length >= 3) {
          nimCandidate = cols[1];
          nameCandidate = cols[2];
          birthPlace = cols[3] || '';
          birthDate = cols[4] || '';
          address = cols[5] || '';
          gender = cols[6] || '';
          phone = cols[7] || '';
        }

        if (nameCandidate) {
          parsed.push({
            nim: nimCandidate || `202601${String(idx + 1).padStart(2, '0')}`,
            name: nameCandidate.toUpperCase(),
            birthPlace,
            birthDate,
            address,
            gender: /perempuan|wanita|p/i.test(gender) ? 'Perempuan' : 'Laki-laki',
            phone,
            groupId: (idx % 5) + 1,
            rpsPart: `Part ${String(idx + 1).padStart(2, '0')}`,
            topic: 'Filsafat Ilmu MPI',
            meetingNumber: (idx % 16) + 1,
          });
        }
      }
    });

    setParsedPreview(parsed);
  };

  // Process Uploaded File (Supports PDF, DOCX, DOC, XLSX, CSV, TXT, JSON)
  const processUploadedFile = async (file: File) => {
    setUploadFileName(file.name);
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    setIsParsingDoc(true);
    setFeedbackMessage(null);

    // If PDF, Word, Excel, or binary document: process via server document extractor
    if (['pdf', 'docx', 'doc', 'xlsx', 'xls', 'rtf'].includes(ext)) {
      try {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const dataUrl = (evt.target?.result as string) || '';
          const base64 = dataUrl.split(',')[1] || '';
          const res = await uploadStudentDocumentApi({
            fileBase64: base64,
            fileName: file.name,
          });
          setIsParsingDoc(false);
          if (res.success && res.students && res.students.length > 0) {
            setParsedPreview(res.students);
            if (res.rawSnippet) {
              setUploadText(res.rawSnippet);
            }
            setFeedbackMessage({
              type: 'success',
              text: `Berhasil mengekstrak ${res.count} calon data mahasiswa dari dokumen ${file.name.toUpperCase()}! Silakan tinjau tabel pratinjau sebelum menyimpan.`,
            });
          } else {
            setFeedbackMessage({
              type: 'error',
              text: res.error || `Tidak ditemukan baris data mahasiswa di dalam dokumen ${file.name}. Pastikan file berisi daftar nama & NIM mahasiswa.`,
            });
          }
        };
        reader.onerror = () => {
          setIsParsingDoc(false);
          setFeedbackMessage({ type: 'error', text: `Gagal membaca file ${file.name}.` });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setIsParsingDoc(false);
        setFeedbackMessage({ type: 'error', text: `Terjadi kendala saat membaca file ${file.name}.` });
      }
      return;
    }

    // Otherwise, text-based files: CSV, TXT, JSON
    const reader = new FileReader();
    reader.onload = evt => {
      const text = (evt.target?.result as string) || '';
      setIsParsingDoc(false);
      handleParseText(text);
    };
    reader.onerror = () => {
      setIsParsingDoc(false);
      setFeedbackMessage({ type: 'error', text: `Gagal membaca teks file ${file.name}.` });
    };
    reader.readAsText(file);
  };

  // Handle File Input (.pdf, .docx, .doc, .xlsx, .csv, .txt, .json)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  // Drag & drop file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  // Submit Document Bulk Import
  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) {
      setFeedbackMessage({ type: 'error', text: 'Tidak ada data valid yang siap diimpor.' });
      return;
    }

    setIsUploading(true);
    setFeedbackMessage(null);

    try {
      const res = await bulkImportStudentsApi(parsedPreview, importMode);
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Berhasil mengimpor ${res.count || parsedPreview.length} data mahasiswa lengkap ke SIAKAD!`,
        });
        setUploadText('');
        setUploadFileName('');
        setParsedPreview([]);
        await onRefreshData();
        setActiveSubTab('daftar');
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Gagal mengimpor data.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Terjadi gangguan saat mengimpor.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['NIM', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Alamat', 'Jenis Kelamin', 'No HP', 'Kelompok', 'Bagian RPS'];
    const rows = (students || []).map(s => [
      `"${s.nim || ''}"`,
      `"${s.name || ''}"`,
      `"${s.birthPlace || ''}"`,
      `"${s.birthDate || ''}"`,
      `"${s.address || ''}"`,
      `"${s.gender || 'Laki-laki'}"`,
      `"${s.phone || ''}"`,
      `"Kelompok ${s.groupId || 1}"`,
      `"${s.rpsPart || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `biodata_mahasiswa_siakad_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load sample template into textarea
  const handleLoadSampleTemplate = () => {
    const sample = `NIM,Nama Lengkap,Tempat Lahir,Tanggal Lahir,Alamat,Jenis Kelamin,No HP
20260101,AHMAD FAUZI,Pasuruan,1998-05-14,Jl. Raya Bangil No. 12 Pasuruan,Laki-laki,081234567890
20260102,SITI AISYAH,Malang,1999-08-21,Jl. Ijen No. 45 Malang,Perempuan,081298765432
20260103,MUHAMMAD RIZAL,Surabaya,1997-12-05,Jl. Pemuda No. 88 Surabaya,Laki-laki,082156781234
20260104,NURUL HIDAYAH,Probolinggo,1999-03-17,Jl. Panglima Sudirman Kraksaan,Perempuan,085712348899
20260105,BAMBANG SETIAWAN,Sidoarjo,1998-11-29,Perum Graha Indah Blok C Sidoarjo,Laki-laki,081399887766`;
    handleParseText(sample);
    setUploadFileName('template_contoh_mahasiswa.csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-linear-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-emerald-200 border border-white/10">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Data Khusus Biodata Mahasiswa</h3>
                <span className="bg-emerald-500/30 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  {students?.length || 0} Mahasiswa
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Pencatatan lengkap Nama, Tempat Tanggal Lahir, Alamat, NIM, dan sinkronisasi kelompok
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveSubTab('daftar')}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeSubTab === 'daftar'
                  ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={16} />
              <span>Daftar Mahasiswa ({students?.length || 0})</span>
            </button>

            {isDosen && (
              <>
                <button
                  onClick={handleStartAdd}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeSubTab === 'input'
                      ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus size={16} />
                  <span>{editingStudentId ? 'Edit Biodata' : 'Input Manual'}</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('upload')}
                  className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                    activeSubTab === 'upload'
                      ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload size={16} />
                  <span>Upload dari Dokumen</span>
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            {isDosen && (
              <button
                id="btn-pulihkan-15-mahasiswa"
                onClick={handleRestoreCanonical}
                disabled={isRestoringCanonical}
                className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                title="Pulihkan 15 nama mahasiswa resmi MPI 1 dan 5 kelompok RPS ke susunan awal SIAKAD"
              >
                <RotateCcw size={13} className={isRestoringCanonical ? 'animate-spin' : 'text-amber-600'} />
                <span>{isRestoringCanonical ? 'Memulihkan...' : 'Pulihkan 15 Mahasiswa'}</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-2xs"
              title="Unduh data mahasiswa dalam format CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div
            className={`mx-5 mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between shrink-0 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackMessage.text}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-500 hover:text-slate-800">
              <X size={14} />
            </button>
          </div>
        )}

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: DAFTAR MAHASISWA & BIODATA */}
          {activeSubTab === 'daftar' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari berdasarkan nama, NIM, tempat lahir, atau alamat..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Filter Kelompok:</label>
                  <select
                    value={filterGroup}
                    onChange={e => setFilterGroup(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:outline-none"
                  >
                    <option value="all">Semua Kelompok</option>
                    <option value="1">Kelompok 1</option>
                    <option value="2">Kelompok 2</option>
                    <option value="3">Kelompok 3</option>
                    <option value="4">Kelompok 4</option>
                    <option value="5">Kelompok 5</option>
                  </select>
                </div>
              </div>

              {/* Table of Students with Full Biodata */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <th className="py-2.5 px-3 text-center w-10">No</th>
                        <th className="py-2.5 px-3">Nama & NIM</th>
                        <th className="py-2.5 px-3">Tempat & Tgl Lahir</th>
                        <th className="py-2.5 px-3">Alamat Domisili</th>
                        <th className="py-2.5 px-3 text-center">Kelompok / RPS</th>
                        <th className="py-2.5 px-3 text-center">Kontak</th>
                        <th className="py-2.5 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            Tidak ditemukan mahasiswa dengan filter pencarian ini.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((std, idx) => (
                          <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{std.name}</div>
                              <div className="text-[11px] font-mono text-emerald-700">{std.nim || '-'}</div>
                              <div className="text-[10px] text-slate-400">
                                {std.gender || 'Laki-laki'}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1 text-slate-800 font-medium">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span>{std.birthPlace || '-'}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <Calendar size={12} className="text-slate-400 shrink-0" />
                                <span>{std.birthDate || '-'}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 max-w-xs">
                              <div className="text-slate-700 line-clamp-2 leading-relaxed">
                                {std.address || <span className="text-slate-400 italic">Belum diisi</span>}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Kelompok {std.groupId}
                              </span>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                {std.rpsPart} • Pertemuan {std.meetingNumber}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {std.phone ? (
                                <a
                                  href={`https://wa.me/${std.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md"
                                >
                                  <Phone size={11} />
                                  <span>{std.phone}</span>
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {onSelectStudent && (
                                  <button
                                    onClick={() => {
                                      onSelectStudent(std);
                                      onClose();
                                    }}
                                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Pilih Mahasiswa Ini"
                                  >
                                    <UserCheck size={15} />
                                  </button>
                                )}

                                {isDosen && (
                                  <>
                                    <button
                                      onClick={() => handleStartEdit(std)}
                                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Edit Biodata Lengkap"
                                    >
                                      <Edit3 size={15} />
                                    </button>

                                    <button
                                      onClick={() => setDeletingStudent(std)}
                                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Hapus Mahasiswa"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INPUT MANUAL BIODATA */}
          {activeSubTab === 'input' && isDosen && (
            <div className="max-w-3xl mx-auto bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    {editingStudentId ? 'Perbarui Biodata Mahasiswa' : 'Tambah Mahasiswa Baru (Input Manual)'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Lengkapi seluruh kolom biodata utama untuk keperluan administrasi dan sinkronisasi RPS
                  </p>
                </div>
                {editingStudentId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Batal Edit (Ganti Tambah Baru)
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Lengkap */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Mahasiswa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: AHMAD FAUZI"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* NIM */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nomor Induk Mahasiswa (NIM) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 20260101"
                      value={formNim}
                      onChange={e => setFormNim(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Tempat Lahir */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tempat Lahir</label>
                    <input
                      type="text"
                      placeholder="Contoh: Pasuruan / Malang / Surabaya"
                      value={formBirthPlace}
                      onChange={e => setFormBirthPlace(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Tanggal Lahir */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={formBirthDate}
                      onChange={e => setFormBirthDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={formGender}
                      onChange={e => setFormGender(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  {/* No HP / WA */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">No HP / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Contoh: 081234567890"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alamat Lengkap Domisili</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Jl. Raya Bangil No. 12, RT 02 / RW 04, Kel. Kolursari, Kec. Bangil, Kab. Pasuruan"
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* RPS & Kelompok Association */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kelompok</label>
                    <select
                      value={formGroupId}
                      onChange={e => setFormGroupId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={1}>Kelompok 1</option>
                      <option value={2}>Kelompok 2</option>
                      <option value={3}>Kelompok 3</option>
                      <option value={4}>Kelompok 4</option>
                      <option value={5}>Kelompok 5</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Ubah Nama Kelompok <span className="text-[10px] text-emerald-600 font-normal">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={`Contoh: KELOMPOK ${formGroupId}`}
                      value={formGroupName}
                      onChange={e => setFormGroupName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white uppercase font-bold text-xs"
                      title="Ubah nama kelompok untuk kelompok ini"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kode Part RPS</label>
                    <input
                      type="text"
                      placeholder="Contoh: Part 01"
                      value={formRpsPart}
                      onChange={e => setFormRpsPart(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Pertemuan RPS</label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={formMeetingNumber}
                      onChange={e => setFormMeetingNumber(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Topik Kajian Presentasi RPS</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekonstruksi Paradigma Filsafat Pendidikan Islam"
                    value={formTopic}
                    onChange={e => setFormTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('daftar')}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all"
                  >
                    <Check size={16} />
                    <span>{isSubmitting ? 'Menyimpan...' : editingStudentId ? 'Simpan Perubahan Biodata' : 'Simpan Mahasiswa Baru'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: UPLOAD DARI DOKUMEN (EXCEL, CSV, DOCX, TXT) */}
          {activeSubTab === 'upload' && isDosen && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {/* Info card */}
              <div className="bg-linear-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Upload & Impor Dokumen Mahasiswa (PDF, Word, Excel, CSV)</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Unggah dokumen PDF (.pdf), Word (.docx, .doc), Excel (.xlsx, .csv), atau file TXT/JSON. Sistem cerdas otomatis mengekstrak kolom NIM, Nama, Tempat Lahir, Tanggal Lahir, dan Alamat.
                  </p>
                </div>
                <button
                  onClick={handleLoadSampleTemplate}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Sparkles size={14} />
                  <span>Isi Template Contoh</span>
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !isParsingDoc && fileInputRef.current?.click()}
                className={`border-2 border-dashed ${
                  isParsingDoc
                    ? 'border-emerald-500 bg-emerald-100/50 cursor-wait'
                    : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 cursor-pointer'
                } p-6 rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-2`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.json"
                  className="hidden"
                />
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
                  {isParsingDoc ? (
                    <Loader2 size={28} className="animate-spin text-emerald-700" />
                  ) : (
                    <FileSpreadsheet size={28} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    {isParsingDoc
                      ? 'Sedang membaca dan mengekstrak tabel mahasiswa dari dokumen...'
                      : uploadFileName
                      ? `File Terpilih: ${uploadFileName}`
                      : 'Klik untuk memilih file dokumen (PDF, DOCX, DOC, XLSX, CSV) atau seret ke sini'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">PDF (.pdf)</span>
                    <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[11px]">Word (.docx, .doc)</span>
                    <span className="bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded text-[11px]">Excel (.xlsx, .csv)</span>
                    <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">Teks (.txt) / JSON</span>
                  </p>
                </div>
              </div>

              {/* Raw Text Input Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Atau Tempel (Paste) Teks Dokumen / Tabel di Sini:
                </label>
                <textarea
                  rows={4}
                  value={uploadText}
                  onChange={e => handleParseText(e.target.value)}
                  placeholder={`Contoh format:\nNIM,Nama Lengkap,Tempat Lahir,Tanggal Lahir,Alamat,Jenis Kelamin\n20260101,AHMAD FAUZI,Pasuruan,1998-05-14,Jl. Raya Bangil No. 12 Pasuruan,Laki-laki`}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Empty state placeholder when no preview is loaded */}
              {parsedPreview.length === 0 && (
                <div className="p-5 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">Belum Ada Berkas / Tabel Dokumen Terbaca</h5>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                      Pilih file dokumen (PDF, Word, Excel, CSV) dari laptop Anda, tempelkan teks tabel data mahasiswa pada kotak di atas, atau klik tombol di bawah untuk mencoba template contoh langsung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSampleTemplate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Muat 5 Data Mahasiswa Contoh Otomatis</span>
                  </button>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">
                        Pratinjau Hasil Pembacaan Dokumen ({parsedPreview.length} Baris Data Terdeteksi)
                      </h5>
                      <p className="text-xs text-slate-500">
                        Periksa kembali data di bawah sebelum dieksekusi ke basis data SIAKAD
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <label className="font-semibold text-slate-600">Mode Impor:</label>
                      <select
                        value={importMode}
                        onChange={e => setImportMode(e.target.value as any)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 font-bold"
                      >
                        <option value="merge">Gabungkan (Merge dengan data lama)</option>
                        <option value="replace">Gantikan (Hapus lama & isi baru)</option>
                      </select>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-2 text-center w-8">No</th>
                          <th className="p-2">NIM</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Tempat Lahir</th>
                          <th className="p-2">Tgl Lahir</th>
                          <th className="p-2">Alamat</th>
                          <th className="p-2">Kelompok</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-bold">{i + 1}</td>
                            <td className="p-2 font-mono text-emerald-800 font-semibold">{item.nim}</td>
                            <td className="p-2 font-bold text-slate-900">{item.name}</td>
                            <td className="p-2 text-slate-700">{item.birthPlace || '-'}</td>
                            <td className="p-2 text-slate-700">{item.birthDate || '-'}</td>
                            <td className="p-2 text-slate-700 truncate max-w-xs">{item.address || '-'}</td>
                            <td className="p-2 text-indigo-700 font-bold">Kelompok {item.groupId || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedPreview([]);
                        setUploadText('');
                        setUploadFileName('');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Reset Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isUploading}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      <Check size={16} />
                      <span>{isUploading ? 'Memproses Impor...' : `Simpan ${parsedPreview.length} Mahasiswa ke SIAKAD`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Data mahasiswa tersimpan permanen dan otomatis diarsipkan saat pergantian semester.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Konfirmasi Hapus Mahasiswa</h4>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus mahasiswa dari basis data</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{deletingStudent.name}</div>
              <div className="text-slate-500 mt-0.5">NIM: {deletingStudent.nim} • Kelompok {deletingStudent.groupId}</div>
            </div>

            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus data mahasiswa ini beserta keanggotaan kelompoknya? Data yang diarsipkan di semester sebelumnya tidak akan terhapus.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStudent}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Mahasiswa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
