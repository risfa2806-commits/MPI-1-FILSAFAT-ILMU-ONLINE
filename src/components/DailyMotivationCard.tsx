import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Quote,
  RefreshCw,
  Copy,
  Check,
  Send,
  Calendar,
  BookOpen,
  Award,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react';
import { Student } from '../types';

export interface EducationalQuote {
  id: number;
  figure: string;
  title: string;
  epoch: string;
  quote: string;
  reflection: string;
  category: 'Pendidikan' | 'Akhlak & Karakter' | 'Ketekunan Belajar' | 'Nalar Kritis' | 'Ilmu & Amal';
  badgeColor: string;
}

export const EDUCATIONAL_QUOTES: EducationalQuote[] = [
  {
    id: 1,
    figure: 'Ki Hajar Dewantara',
    title: 'Bapak Pendidikan Nasional Indonesia',
    epoch: 'Yogyakarta (1889 - 1959)',
    quote: 'Lawan sastra nata, lawan budi pinter. Dengan ilmu pengetahuan kita menuju ketertiban dunia, dengan kehalusan budi kita mencapai kecerdasan sejati.',
    reflection: 'Pendidikan bukan semata mengejar nilai kognitif, melainkan menumbuhkan keluhuran budi pekerti dan keteladanan nyata di tengah masyarakat.',
    category: 'Pendidikan',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 2,
    figure: 'KH. Hasyim Asy\'ari',
    title: 'Pendiri Nahdlatul Ulama & Mahaguru Pesantren',
    epoch: 'Jombang (1871 - 1947)',
    quote: 'Keberkahan ilmu tidak diukur dari seberapa banyak hafalannya, melainkan seberapa dalam ketawadhuannya dan seberapa besar manfaatnya bagi sesama.',
    reflection: 'Setiap lembar tugas dan mata kuliah yang dipelajari adalah amanah suci untuk mengangkat harkat umat dengan akhlakul karimah.',
    category: 'Akhlak & Karakter',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  {
    id: 3,
    figure: 'KH. Ahmad Dahlan',
    title: 'Pendiri Muhammadiyah & Pembaharu Pendidikan',
    epoch: 'Yogyakarta (1868 - 1923)',
    quote: 'Kasih sayang dan ilmu adalah dua sayap utama yang menerbangkan insan menuju kemuliaan hidup lahiriah dan batiniah di hadapan Sang Khalik.',
    reflection: 'Jadikan proses perkuliahan sebagai ibadah dan ladang amal jariyah yang memberi dampak kemaslahatan nyata.',
    category: 'Ilmu & Amal',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  {
    id: 4,
    figure: 'Imam Al-Ghazali',
    title: 'Hujjatul Islam & Filosof Pendidikan Islam',
    epoch: 'Thos, Persia (1058 - 1111 M)',
    quote: 'Ilmu tanpa amal adalah kegilaan, dan amal tanpa ilmu adalah kesia-siaan. Sungguh orang berilmu yang mengamalkan ilmunya laksana matahari yang menerangi sekelilingnya.',
    reflection: 'Pemikiran kritis dalam filsafat ilmu harus berujung pada aksi nyata dan perbaikan tata kelola kehidupan bermasyarakat.',
    category: 'Ilmu & Amal',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 5,
    figure: 'Ibnu Khaldun',
    title: 'Bapak Sosiologi, Sejarah & Epistemologi Peradaban',
    epoch: 'Tunisia (1332 - 1406 M)',
    quote: 'Puncak dari kecerdasan akal budi adalah kemampuan memahami kaidah sebab-akibat realitas, lalu membimbing manusia menuju peradaban yang makmur dan adil.',
    reflection: 'Melalui kajian ontologi dan epistemologi, mahasiswa terlatih untuk melihat akar persoalan manajemen secara holistik.',
    category: 'Nalar Kritis',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  {
    id: 6,
    figure: 'Buya Hamka (Prof. Dr. Abdul Malik Karim Amrullah)',
    title: 'Ulama, Sastrawan & Tokoh Pendidik Nusantara',
    epoch: 'Sumatera Barat (1908 - 1981)',
    quote: 'Kecantikan yang abadi terletak pada keindahan adab dan ketinggian ilmu seseorang, bukan pada apa yang ada di wajah atau pakaiannya.',
    reflection: 'Teguhkan niat belajar setiap hari, karena setiap usaha memahami materi perkuliahan adalah investasi masa depan yang kekal.',
    category: 'Akhlak & Karakter',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  {
    id: 7,
    figure: 'Prof. Dr. Ing. B.J. Habibie',
    title: 'Ilmuwan Dunia & Presiden RI ke-3',
    epoch: 'Parepare (1936 - 2019)',
    quote: 'Jadilah mata air yang jernih, yang memberikan kehidupan bagi siapa pun di sekitarmu di mana pun engkau berada.',
    reflection: 'Kuasai ilmu setinggi langit dengan tetap membumi, berintegritas, dan berkontribusi nyata bagi kemajuan bangsa.',
    category: 'Ketekunan Belajar',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  {
    id: 8,
    figure: 'R.A. Kartini',
    title: 'Pelopor Pendidikan & Emansipasi Cendekia',
    epoch: 'Jepara (1879 - 1904)',
    quote: 'Tiada awan di langit yang tetap selamanya; tiada mungkin mendung terus-menerus. Habis gelap terbitlah terang. Teruslah melangkah menjemput cita-cita.',
    reflection: 'Kesulitan dalam mengerjakan tugas dan menyusun karya tulis ilmiah adalah anak tangga yang mengantarkanmu menuju kedewasaan berpikir.',
    category: 'Ketekunan Belajar',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  {
    id: 9,
    figure: 'Imam Asy-Syafi\'i',
    title: 'Mujtahid Besar & Pelopor Epistemologi Hukum Islam',
    epoch: 'Gaza / Mesir (767 - 820 M)',
    quote: 'Barang siapa tidak pernah merasakan pahitnya belajar barang sejenak, ia akan menelan hinanya kebodohan sepanjang hidupnya.',
    reflection: 'Rasa lelah dalam membaca referensi dan menyusun analisis kritis hari ini akan menjadi kebanggaan ilmu di masa depan.',
    category: 'Ketekunan Belajar',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    id: 10,
    figure: 'Prof. Dr. M. Quraish Shihab',
    title: 'Pakar Tafsir Al-Qur\'an & Cendekiawan Muslim',
    epoch: 'Indonesia (1944 - sekarang)',
    quote: 'Orang yang benar-benar berilmu tidak pernah merasa paling pintar. Semakin luas pengetahuannya, semakin ia merasa kecil di hadapan kebesaran ilmu Ilahi.',
    reflection: 'Rendah hati, terbuka terhadap koreksi dosen, dan senantiasa bersemangat menimba ilmu pengetahuan baru.',
    category: 'Pendidikan',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  {
    id: 11,
    figure: 'Paulo Freire',
    title: 'Filosof Pendidikan Kritis Dunia',
    epoch: 'Brasil (1921 - 1997)',
    quote: 'Pendidikan tidak mengubah dunia secara langsung. Pendidikan mengubah manusia, dan manusialah yang kelak akan mengubah dunia.',
    reflection: 'Jadilah insan pembelajar yang aktif berdialog di kelas perkuliahan, berani bertanya, dan peka terhadap realitas sosial.',
    category: 'Nalar Kritis',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  },
  {
    id: 12,
    figure: 'Dewi Sartika',
    title: 'Pahlawan Nasional & Pionir Sekolah Keutamaan',
    epoch: 'Bandung (1884 - 1947)',
    quote: 'Kunci keselamatan dan kehormatan hidup adalah kemandirian akal budi serta kemauan tak kenal lelah untuk terus belajar.',
    reflection: 'Disiplin mengumpulkan tugas tepat waktu dan tekun menghadiri perkuliahan adalah wujud komitmen akademis sejati.',
    category: 'Ketekunan Belajar',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
];

interface DailyMotivationCardProps {
  currentStudent?: Student | null;
  onOpenMessageModal: () => void;
  onOpenStudentSelect?: () => void;
}

export const DailyMotivationCard: React.FC<DailyMotivationCardProps> = ({
  currentStudent,
  onOpenMessageModal,
  onOpenStudentSelect,
}) => {
  // Compute daily quote based on local calendar date
  const getTodayQuoteIndex = (): number => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.abs(dayOfYear) % EDUCATIONAL_QUOTES.length;
  };

  const [currentIndex, setCurrentIndex] = useState<number>(getTodayQuoteIndex);
  const [copied, setCopied] = useState<boolean>(false);
  const [greetingTime, setGreetingTime] = useState<string>('Pagi');

  // Greeting time calculation
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) setGreetingTime('Pagi');
    else if (hour >= 11 && hour < 15) setGreetingTime('Siang');
    else if (hour >= 15 && hour < 18) setGreetingTime('Sore');
    else setGreetingTime('Malam');
  }, []);

  const currentQuote = EDUCATIONAL_QUOTES[currentIndex] || EDUCATIONAL_QUOTES[0];

  const handleNextQuote = () => {
    setCurrentIndex((prev) => (prev + 1) % EDUCATIONAL_QUOTES.length);
  };

  const handleCopyQuote = async () => {
    const textToCopy = `"${currentQuote.quote}" — ${currentQuote.figure} (${currentQuote.title})`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const formattedDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl mb-6 transition-all">
      {/* Subtle geometric islamic decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-400/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="relative p-5 sm:p-6 lg:p-7">
        
        {/* Top Header Row: Welcoming Greeting & Date Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-5">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-md font-bold flex-shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Kutipan Cendekia & Motivasi Harian
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
                Selamat {greetingTime}, {currentStudent ? (
                  <span className="text-amber-300 font-extrabold underline decoration-amber-400/50 underline-offset-4">
                    {currentStudent.name}
                  </span>
                ) : (
                  <span className="text-emerald-200">Mahasiswa Cendekia!</span>
                )}
              </h2>
              {currentStudent ? (
                <div className="text-[11px] text-emerald-200/90 mt-0.5 flex items-center gap-1.5 font-mono">
                  <span>NIM: {currentStudent.nim}</span>
                  <span>•</span>
                  <span>Kelompok {currentStudent.groupId}</span>
                  <span>•</span>
                  <span className="truncate max-w-[200px] sm:max-w-none text-white/90 font-sans">{currentStudent.topic}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                  <span>Pilih akun mahasiswa Anda untuk presensi dan pengumpulan tugas</span>
                  {onOpenStudentSelect && (
                    <button
                      onClick={onOpenStudentSelect}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold text-xs transition-colors"
                    >
                      Pilih Nama Saya
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Date & Refresh Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] text-emerald-200 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{formattedDate}</span>
            </div>
            <button
              onClick={handleNextQuote}
              title="Lihat kutipan tokoh pendidikan lainnya"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-700/60 hover:bg-emerald-600/80 border border-emerald-400/30 text-white text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden sm:inline">Ganti Motivasi</span>
            </button>
          </div>

        </div>

        {/* Main Quote Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-start gap-3">
              <Quote className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400/50 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <blockquote className="text-base sm:text-lg lg:text-xl font-serif italic text-white/95 leading-relaxed">
                  "{currentQuote.quote}"
                </blockquote>

                {/* Educational Reflection */}
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pl-1 border-l-2 border-amber-400/60">
                  <span className="font-semibold text-amber-300">Pesan Hikmah: </span>
                  {currentQuote.reflection}
                </p>

                {/* Figure Credentials */}
                <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                  <span className="font-bold text-amber-300 text-sm">{currentQuote.figure}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-slate-300 font-medium">{currentQuote.title}</span>
                  <span className="text-white/40">•</span>
                  <span className="text-emerald-300/80 text-[11px] italic">({currentQuote.epoch})</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/10 text-emerald-200 border border-white/10">
                    {currentQuote.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Box: Send Message to Lecturer & Copy Quote */}
          <div className="lg:col-span-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-4 flex flex-col justify-between space-y-3.5">
            
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-amber-400" />
                  Layanan Mahasiswa ke Dosen
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-200 mt-1.5 leading-relaxed">
                Sudah mengunggah tugas makalah, UTS, atau UAS? Beri tahu Dosen secara langsung agar berkas Anda segera diperiksa dan dinilai.
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={onOpenMessageModal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Beri Tahu Dosen Pengumpulan Tugas</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyQuote}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors border border-white/10"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300 font-semibold">Kutipan Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Salin Kutipan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Micro Footer Note: Explicit requirement "aplikasi ini dibuat oleh Risfa Tri Ulfa, S.Pd., M.Pd., Gr" */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-emerald-200/80">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Kutipan diperbarui otomatis setiap hari sesuai kalender akademik perkuliahan.</span>
          </div>
          <div className="text-emerald-200 font-medium tracking-wide">
            Aplikasi ini dibuat oleh <strong className="text-white font-semibold">Risfa Tri Ulfa, S.Pd., M.Pd., Gr.</strong>
          </div>
        </div>

      </div>
    </div>
  );
};
