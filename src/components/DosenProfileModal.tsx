import React, { useState } from 'react';
import { X, Save, School, Award, User, Check, AlertCircle, Sparkles } from 'lucide-react';
import { DosenProfile } from '../types';
import { updateCourseProfileApi } from '../services/api';

interface DosenProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: DosenProfile;
  onProfileUpdated: (updatedProfile: DosenProfile) => void;
}

export const DosenProfileModal: React.FC<DosenProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) => {
  const [campusName, setCampusName] = useState(profile?.campusName || 'STAI Jarinabi');
  const [dosenName, setDosenName] = useState(profile?.dosenName || 'Risfa Tri Ulfa');
  const [dosenTitle, setDosenTitle] = useState(profile?.dosenTitle !== undefined ? profile.dosenTitle : 'S.Pd., M.Pd., Gr.');
  const [nip, setNip] = useState(profile?.nip || '198806282015032001');
  const [courseTitle, setCourseTitle] = useState(profile?.courseTitle || 'Filsafat Ilmu');
  const [courseCode, setCourseCode] = useState(profile?.courseCode || 'MPI-501');
  const [sks, setSks] = useState(profile?.sks || 3);
  const [semester, setSemester] = useState(profile?.semester || 'Semester Ganjil 2026/2027');
  const [studyProgram, setStudyProgram] = useState(profile?.studyProgram || 'Manajemen Pendidikan Islam (MPI 1)');
  const [description, setDescription] = useState(profile?.description || '');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Real-time preview of full lecturer name with title
  const fullDisplayName = dosenTitle ? `${dosenName.trim()}, ${dosenTitle.trim()}` : dosenName.trim();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusName.trim() || !dosenName.trim()) {
      setErrorMsg('Nama kampus dan nama dosen wajib diisi!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const updated: Partial<DosenProfile> = {
      campusName: campusName.trim(),
      dosenName: dosenName.trim(),
      dosenTitle: dosenTitle.trim(),
      name: fullDisplayName,
      nip: nip.trim(),
      courseTitle: courseTitle.trim(),
      courseCode: courseCode.trim(),
      sks: Number(sks) || 3,
      semester: semester.trim(),
      studyProgram: studyProgram.trim(),
      description: description.trim(),
    };

    try {
      const ok = await updateCourseProfileApi(updated);
      if (ok) {
        setSuccessMsg('Profil Dosen, Gelar, dan Kampus berhasil diperbarui!');
        setTimeout(() => {
          onProfileUpdated(updated as DosenProfile);
          onClose();
        }, 900);
      } else {
        setErrorMsg('Gagal menyimpan perubahan ke server. Pastikan Anda masuk sebagai Dosen.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <School className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Pengaturan Kampus & Gelar Dosen</h2>
              <p className="text-xs text-emerald-200">
                Ubah nama institusi kampus, gelar akademik, dan identitas dosen
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-sm text-slate-800">
          
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

          {/* Live Preview Banner */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pratinjau Tampilan Header & Dokumen:</span>
            </div>
            <div className="font-extrabold text-slate-900 text-sm">{fullDisplayName}</div>
            <div className="text-xs text-emerald-800 font-medium">
              Dosen Pengampu di <span className="font-bold underline">{campusName || 'STAI Jarinabi'}</span> • Prodi {studyProgram}
            </div>
          </div>

          {/* Kampus Input */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <School className="w-3.5 h-3.5 text-emerald-700" />
              <span>Nama Kampus / Perguruan Tinggi *</span>
            </label>
            <input
              type="text"
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
              placeholder="Contoh: STAI Jarinabi"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
            <p className="text-[11px] text-slate-500">
              Dapat diedit sewaktu-waktu sesuai nama kampus/sekolah tinggi Anda (default: STAI Jarinabi).
            </p>
          </div>

          {/* Dosen Name & Title Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Nama Dosen *</span>
              </label>
              <input
                type="text"
                value={dosenName}
                onChange={(e) => setDosenName(e.target.value)}
                placeholder="Risfa Tri Ulfa"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-700" />
                <span>Gelar Akademik & Profesi Dosen</span>
              </label>
              <input
                type="text"
                value={dosenTitle}
                onChange={(e) => setDosenTitle(e.target.value)}
                placeholder="S.Pd., M.Pd., Gr."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP / NIDN Dosen
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="198806282015032001"
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
          </div>

          {/* Mata Kuliah Aktif Info */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Identitas Mata Kuliah Aktif
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Kuliah
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="Filsafat Ilmu"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode / SKS
                </label>
                <div className="flex space-x-1">
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="MPI-501"
                    className="w-2/3 px-2 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={sks}
                    onChange={(e) => setSks(Number(e.target.value))}
                    className="w-1/3 px-2 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Menyimpan...' : 'Simpan Profil & Kampus'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
