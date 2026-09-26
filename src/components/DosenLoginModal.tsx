import React, { useState } from 'react';
import { checkDosenLogin } from '../services/api';
import { ShieldCheck, Eye, EyeOff, Lock, X, AlertCircle } from 'lucide-react';

interface DosenLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const DosenLoginModal: React.FC<DosenLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await checkDosenLogin(password);
      if (res.success) {
        setPassword('');
        onLoginSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || 'Password Dosen salah! Silakan periksa kembali.');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Autentikasi Portal Dosen</h3>
              <p className="text-xs text-slate-500">Khusus Dosen Pengampu Mata Kuliah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          Area ini dilindungi dengan kata sandi agar mahasiswa tidak dapat mengubah absensi atau menghapus data tugas. Password dirahasiakan dan tidak terlihat oleh publik.
        </p>

        {errorMsg && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi / Password Dosen:
            </label>
            <div className="relative">
              <input
                id="input-password-dosen"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                autoFocus
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wider"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>*Khusus Dosen Pengampu Mata Kuliah</span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-colors shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <ShieldCheck size={15} />
              <span>{isLoading ? 'Memeriksa...' : 'Masuk Portal Dosen'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
