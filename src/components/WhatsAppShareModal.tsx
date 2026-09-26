import React, { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, ExternalLink, X, QrCode } from 'lucide-react';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;
  const messageText = `*PORTAL SIAKAD KULIAH ONLINE FILSAFAT ILMU (MPI 1)*\n\nAssalamu'alaikum wr. wb. Rekan-rekan Mahasiswa MPI 1, berikut tautan resmi website perkuliahan online Mata Kuliah Filsafat Ilmu (16 Pertemuan):\n\n🌐 *Link Website:* ${currentUrl}\n\n📌 *Fitur Lengkap Mahasiswa:*\n1. Cek Jadwal RPS 16 Pertemuan (Sabtu, 12 September 2026 s/d 26 Desember 2026)\n2. Upload Tugas Mandiri Makalah & Presentasi PPT (File / Link Canva)\n3. Pengumpulan Proyek Video Edukasi AI (5 Kelompok)\n4. Presensi Kehadiran Real-time & Rekapitulasi Nilai SIAKAD\n\n_Bisa dibuka langsung melalui HP (Smartphone) dan Laptop. Terima kasih._`;

  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = currentUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Bagikan Link ke WhatsApp</h3>
              <p className="text-xs text-slate-500">Kirim ke Grup Mahasiswa MPI 1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Kirim link website perkuliahan online ini ke grup WhatsApp mahasiswa MPI 1 agar rekan-rekan mahasiswa dapat langsung membuka tugas, mengunggah file PPT/Canva, dan mengakses absensi di smartphone atau laptop.
        </p>

        {/* URL Box */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="bg-transparent text-xs text-slate-700 font-medium w-full focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Tersalin' : 'Salin URL'}</span>
          </button>
        </div>

        {/* Message Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Teks Pengumuman Siap Kirim:</span>
            <button
              onClick={handleCopyFullMessage}
              className="text-[11px] text-emerald-700 hover:underline font-semibold"
            >
              Salin Format Teks
            </button>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700 font-mono whitespace-pre-line max-h-36 overflow-y-auto leading-relaxed">
            {messageText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tutup
          </button>

          <a
            href={waShareUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
          >
            <MessageCircle size={16} />
            <span>Buka & Kirim Langsung ke WhatsApp</span>
            <ExternalLink size={13} />
          </a>
        </div>

      </div>
    </div>
  );
};
