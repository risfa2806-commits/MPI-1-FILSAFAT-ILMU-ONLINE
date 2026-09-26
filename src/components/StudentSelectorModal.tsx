import React, { useState } from 'react';
import { Student } from '../types';
import { isStudentOnline, formatActiveTime } from '../services/api';
import { X, Search, Check, Plus, UserPlus } from 'lucide-react';

interface StudentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  currentStudentId: string | null;
  onSelectStudent: (student: Student) => void;
  onAddNewStudent: (newStudent: {
    name: string;
    nim: string;
    rpsPart: string;
    topic: string;
    meetingNumber: number;
    groupId: number;
    gender?: 'Laki-laki' | 'Perempuan';
    phone?: string;
    address?: string;
  }) => Promise<void>;
  isDosen?: boolean;
  initialAddMode?: boolean;
}

export const StudentSelectorModal: React.FC<StudentSelectorModalProps> = ({
  isOpen,
  onClose,
  students = [],
  currentStudentId,
  onSelectStudent,
  onAddNewStudent,
  isDosen = false,
  initialAddMode = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(initialAddMode);
  
  // Add student form state
  const [name, setName] = useState('');
  const [nim, setNim] = useState('');
  const [rpsPart, setRpsPart] = useState('');
  const [topic, setTopic] = useState('');
  const [meetingNumber, setMeetingNumber] = useState(15);
  const [groupId, setGroupId] = useState(1);
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && initialAddMode) {
      setShowAddForm(true);
    }
  }, [isOpen, initialAddMode]);

  if (!isOpen) return null;

  const filteredStudents = (students || []).filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rpsPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nim.includes(searchTerm)
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setAddFeedback(null);
    try {
      await onAddNewStudent({
        name: name.trim().toUpperCase(),
        nim: nim.trim() || `202601${(students?.length || 0) + 1}`,
        rpsPart: rpsPart.trim() || `Part ${String((students?.length || 0) + 1).padStart(2, '0')}`,
        topic: topic.trim() || 'Studi Kasus Filsafat Ilmu MPI',
        meetingNumber: Number(meetingNumber) || 15,
        groupId: Number(groupId) || 1,
        gender,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      setAddFeedback(`Mahasiswa ${name.trim().toUpperCase()} berhasil ditambahkan ke SIAKAD!`);
      setName('');
      setNim('');
      setRpsPart('');
      setTopic('');
      setPhone('');
      setAddress('');
      setTimeout(() => {
        setAddFeedback(null);
        setShowAddForm(false);
      }, 1500);
    } catch {
      setAddFeedback('Terjadi kendala saat menyimpan data mahasiswa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base sm:text-lg">Pilih Profil Mahasiswa</h3>
            <p className="text-xs text-slate-300">
              Pilih nama Anda untuk absensi otomatis, status online, dan upload tugas RPS
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama mahasiswa atau Part RPS..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {isDosen && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors whitespace-nowrap"
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              <span>{showAddForm ? 'Batal Tambah' : 'Tambah Mahasiswa'}</span>
            </button>
          )}
        </div>

        {/* Add Student Form (Dosen only) */}
        {isDosen && showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-4 bg-emerald-50/60 border-b border-emerald-200 text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <UserPlus size={16} />
              <span>Tambah Mahasiswa Baru ke SIAKAD</span>
            </div>
            {addFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <Check size={14} className="text-emerald-700" />
                <span>{addFeedback}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nama Lengkap Mahasiswa *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AHMAD FAUZI"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">NIM Mahasiswa</label>
                <input
                  type="text"
                  placeholder="Contoh: 20260116"
                  value={nim}
                  onChange={e => setNim(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Jenis Kelamin</label>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kode Part RPS & Pertemuan</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    placeholder="Contoh: Part 16"
                    value={rpsPart}
                    onChange={e => setRpsPart(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                  />
                  <select
                    value={meetingNumber}
                    onChange={e => setMeetingNumber(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded border border-slate-300 bg-white text-xs"
                  >
                    {Array.from({ length: 15 }).map((_, i) => (
                      <option key={i + 2} value={i + 2}>Ptm #{i + 2}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Kelompok Video</label>
                <select
                  value={groupId}
                  onChange={e => setGroupId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value={1}>Kelompok 1</option>
                  <option value={2}>Kelompok 2</option>
                  <option value={3}>Kelompok 3</option>
                  <option value={4}>Kelompok 4</option>
                  <option value={5}>Kelompok 5</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Alamat Asal Mahasiswa</label>
              <input
                type="text"
                placeholder="Contoh: Pasuruan, Jawa Timur"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white mb-2"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Topik / Judul Presentasi RPS</label>
              <input
                type="text"
                placeholder="Contoh: Rekonstruksi Paradigma Filsafat Pendidikan Islam"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-emerald-700 text-white rounded font-semibold hover:bg-emerald-800 disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Mahasiswa'}
              </button>
            </div>
          </form>
        )}

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {(filteredStudents?.length || 0) === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs sm:text-sm">
              Tidak ditemukan mahasiswa dengan kata kunci tersebut.
            </div>
          ) : (
            filteredStudents.map((std, idx) => {
              const isSelected = std.id === currentStudentId;
              const online = isStudentOnline(std.lastActive);

              return (
                <div
                  key={std.id}
                  onClick={() => {
                    onSelectStudent(std);
                    onClose();
                  }}
                  className={`py-3 px-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </div>
                      {online ? (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-400 animate-pulse" />
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-slate-300 border-2 border-white" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {std.name}
                        </span>
                        {online && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-emerald-800">{std.rpsPart}</span> • Pertemuan {std.meetingNumber} • Kelompok {std.groupId}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs sm:max-w-md">
                        {std.topic}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Status: {formatActiveTime(std.lastActive)}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        <Check size={14} /> Aktif
                      </span>
                    ) : (
                      <button className="text-xs font-semibold text-slate-600 hover:text-emerald-700 border border-slate-200 px-2.5 py-1 rounded-lg hover:border-emerald-300 transition-colors">
                        Pilih
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Saat memilih nama, portal akan otomatis mencatat kehadiran & aktivitas online Anda.
        </div>

      </div>
    </div>
  );
};
