import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Play,
  Pause,
  Sparkles,
  Search,
  Upload,
  Radio,
  ExternalLink,
  ChevronRight,
  Flame,
  RotateCcw,
  Check,
  Disc,
  Headphones,
  Sliders,
  X,
} from 'lucide-react';
import { cartoonAudio, MusicTrackId, AVAILABLE_MUSIC_TRACKS, MusicTrackInfo } from '../../utils/cartoonAudio';

interface CartoonMusicPlayerProps {
  initialMusicEnabled?: boolean;
  initialSfxEnabled?: boolean;
  initialTrack?: MusicTrackId;
  className?: string;
  isCompact?: boolean;
}

export const CartoonMusicPlayer: React.FC<CartoonMusicPlayerProps> = ({
  initialMusicEnabled = true,
  initialSfxEnabled = true,
  initialTrack = 'arabic-energetic',
  className = '',
  isCompact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(initialSfxEnabled);
  const [volume, setVolume] = useState<number>(40);
  const [track, setTrack] = useState<MusicTrackId>(initialTrack);
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  
  // Custom Music / Student Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenreTab, setSelectedGenreTab] = useState<'all' | 'arab' | 'pop' | 'inggris' | 'santai' | 'custom'>('all');
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [customAudioName, setCustomAudioName] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    cartoonAudio.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  useEffect(() => {
    cartoonAudio.setMusicVolume(volume / 100);
  }, [volume]);

  // Sync state with audio engine
  useEffect(() => {
    setIsPlaying(cartoonAudio.getIsPlayingMusic());
  }, []);

  const handleToggleMusic = () => {
    if (isPlaying) {
      if (isCustomMode) {
        cartoonAudio.stopCustomAudio();
      } else {
        cartoonAudio.stopMusic();
      }
      setIsPlaying(false);
    } else {
      if (isCustomMode && customAudioUrl) {
        cartoonAudio.playCustomAudio(customAudioUrl);
        setIsPlaying(true);
      } else {
        cartoonAudio.startMusic(track);
        setIsPlaying(true);
      }
    }
  };

  const handleTrackChange = (newTrack: MusicTrackId) => {
    setIsCustomMode(false);
    setTrack(newTrack);
    cartoonAudio.startMusic(newTrack);
    setIsPlaying(true);
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    cartoonAudio.setSfxEnabled(next);
    if (next) {
      cartoonAudio.playBoing();
    }
  };

  // Handle local file upload by student
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    setCustomAudioUrl(fileUrl);
    setCustomAudioName(file.name);
    setIsCustomMode(true);
    cartoonAudio.playCustomAudio(fileUrl);
    setIsPlaying(true);
    setShowLibraryModal(false);
  };

  // Handle custom streaming URL
  const handleApplyCustomUrl = () => {
    if (!customAudioUrl.trim()) return;
    setIsCustomMode(true);
    setCustomAudioName(customAudioUrl.split('/').pop() || 'Lagu Kustom Mahasiswa');
    cartoonAudio.playCustomAudio(customAudioUrl.trim());
    setIsPlaying(true);
    setShowLibraryModal(false);
  };

  const currentTrackInfo = AVAILABLE_MUSIC_TRACKS.find(t => t.id === track);

  // Filter tracks
  const filteredTracks = AVAILABLE_MUSIC_TRACKS.filter(t => {
    const matchQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.genre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchQuery) return false;

    if (selectedGenreTab === 'arab') return t.id === 'arabic-energetic';
    if (selectedGenreTab === 'pop') return t.id === 'pop-energetic';
    if (selectedGenreTab === 'inggris') return t.id === 'english-acoustic';
    if (selectedGenreTab === 'santai') return ['lofi-calm', 'nature-pond', 'zen-chimes'].includes(t.id);
    return true;
  });

  if (isCompact) {
    return (
      <div className={`flex items-center gap-1.5 bg-amber-50/95 border border-amber-200 rounded-xl px-2.5 py-1.5 shadow-xs ${className}`}>
        {/* Toggle Music */}
        <button
          type="button"
          onClick={handleToggleMusic}
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all ${
            isPlaying
              ? 'bg-amber-600 text-white shadow-xs animate-pulse'
              : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
          title={isPlaying ? 'Jeda Musik Belajar' : 'Putar Musik Belajar'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span className="truncate max-w-[85px] sm:max-w-[120px]">
            {isPlaying ? (isCustomMode ? customAudioName : currentTrackInfo?.title || 'Musik Aktif') : 'Musik Belajar'}
          </span>
        </button>

        {/* Quick Open Library / Search */}
        <button
          type="button"
          onClick={() => setShowLibraryModal(true)}
          className="p-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold"
          title="Cari & Pilih Lagu (Arab, Pop, Inggris, Kustom)"
        >
          <Search size={13} />
        </button>

        {/* Toggle SFX */}
        <button
          type="button"
          onClick={handleToggleSfx}
          className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
            sfxEnabled ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-200 text-slate-400'
          }`}
          title={sfxEnabled ? 'Suara Lucu Aktif' : 'Suara Dimatikan'}
        >
          {sfxEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-linear-to-r from-amber-50 via-orange-50/80 to-emerald-50/80 border border-amber-200 rounded-2xl p-3 sm:p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title and Mascot Note */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-xs transition-all ${
            isPlaying ? 'bg-amber-600 text-white shadow-amber-300' : 'bg-amber-200 text-amber-900'
          }`}>
            {isPlaying ? (
              <div className="flex items-end gap-0.5 h-5 px-1">
                <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite_100ms] h-3" />
                <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite_300ms] h-5" />
                <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite_200ms] h-4" />
                <span className="w-1 bg-white rounded-full animate-[bounce_0.8s_infinite_400ms] h-2" />
              </div>
            ) : (
              <Music size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-amber-950">
                Lagu Instrumen Belajar & Kuis
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {isCustomMode ? 'Lagu Pilihan Sendiri' : currentTrackInfo?.mood || 'Fokus Semangat'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-900/80 line-clamp-1">
              {isCustomMode
                ? `Memutar audio kustom: ${customAudioName || 'Berkas Mahasiswa'}`
                : `${currentTrackInfo?.icon} ${currentTrackInfo?.title} (${currentTrackInfo?.genre})`}
            </p>
          </div>
        </div>

        {/* Controls: Play, Track Selector, Search/Library Modal, Volume, SFX */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Track Selector Dropdown */}
          <select
            value={isCustomMode ? 'custom' : track}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setShowLibraryModal(true);
              } else {
                handleTrackChange(e.target.value as MusicTrackId);
              }
            }}
            className="text-xs font-bold bg-white border border-amber-300 text-amber-950 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs max-w-[190px] sm:max-w-[220px] truncate"
          >
            <option value="arabic-energetic">🕌 Arab Bersemangat (Oud & Darbuka)</option>
            <option value="pop-energetic">⚡ Pop Ceria Semangat (Bright Pop)</option>
            <option value="english-acoustic">🇬🇧 English Acoustic Lounge (Oxford Beats)</option>
            <option value="lofi-calm">🎵 Lofi Santai Belajar (Chords)</option>
            <option value="nature-pond">🐸 Kolam Katak Damai (Kalimba)</option>
            <option value="zen-chimes">🎋 Zen Bambu Tibet (Singing Bowl)</option>
            {isCustomMode && <option value="custom">🎵 {customAudioName || 'Lagu Kustom Sendiri'}</option>}
          </select>

          {/* Button: Cari / Pilih Lagu Sendiri */}
          <button
            type="button"
            id="btn-search-music"
            onClick={() => setShowLibraryModal(true)}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-xs transition-colors"
            title="Buka Koleksi Musik & Cari Lagu Sendiri"
          >
            <Search size={13} />
            <span className="hidden sm:inline">Cari Lagu</span>
          </button>

          {/* Play/Pause Button */}
          <button
            type="button"
            id="btn-toggle-quiz-music"
            onClick={handleToggleMusic}
            className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 ${
              isPlaying
                ? 'bg-amber-600 text-white ring-2 ring-amber-400 shadow-md'
                : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause size={14} />
                <span>Jeda</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Putar</span>
              </>
            )}
          </button>

          {/* Volume Control Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="p-1.5 rounded-xl bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 shadow-xs transition-colors"
              title="Atur Volume Musik"
            >
              <Volume2 size={15} />
            </button>
            {showVolumeSlider && (
              <div className="absolute right-0 bottom-full mb-2 bg-white border border-amber-200 rounded-xl p-3 shadow-xl z-40 w-44 flex flex-col gap-2">
                <div className="flex justify-between text-xs font-bold text-amber-950">
                  <span>Volume Instrumen</span>
                  <span>{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-2 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>
            )}
          </div>

          {/* SFX Toggle */}
          <button
            type="button"
            onClick={handleToggleSfx}
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all border ${
              sfxEnabled
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}
            title="Efek Suara Game Lucu (Pop, Boing, Ribbit, Cheer)"
          >
            <Sparkles size={13} className={sfxEnabled ? 'text-amber-500 animate-spin' : ''} />
            <span>{sfxEnabled ? 'SFX ON' : 'SFX OFF'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PENCARIAN & KOLEKSI MUSIK INSTRUMEN                                  */}
      {/* ========================================================================= */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-linear-to-r from-amber-600 via-amber-700 to-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                  <Headphones size={22} className="text-amber-200" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Koleksi Musik Instrumen & Pencarian Mandiri</h3>
                  <p className="text-xs text-amber-100">
                    Pilih instrumen penambah semangat (Arab, Pop, Inggris) atau cari & putar musik sendiri.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search & Filter Tabs */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari lagu instrumen (contoh: Arab, Oud, Pop, Semangat, Inggris, Akustik, Tenang)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Genre Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('all')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors ${
                    selectedGenreTab === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Semua ({AVAILABLE_MUSIC_TRACKS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('arab')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
                    selectedGenreTab === 'arab' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>🕌</span>
                  <span>Arab Bersemangat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('pop')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
                    selectedGenreTab === 'pop' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>⚡</span>
                  <span>Pop Ceria</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('inggris')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
                    selectedGenreTab === 'inggris' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>Inggris Akustik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('santai')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
                    selectedGenreTab === 'santai' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  <span>🎧</span>
                  <span>Lofi & Zen Damai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGenreTab('custom')}
                  className={`px-3 py-1.5 rounded-lg shrink-0 transition-colors flex items-center gap-1 ${
                    selectedGenreTab === 'custom' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
                  }`}
                >
                  <Upload size={12} />
                  <span>Cari / Unggah Sendiri</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Track List or Custom Form */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {selectedGenreTab === 'custom' ? (
                <div className="space-y-4 bg-indigo-50/50 p-4 sm:p-5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Radio size={18} className="text-indigo-600" />
                    <h4 className="font-bold text-sm text-indigo-950">
                      Putar Musik Pilihan Pelajar Sendiri
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-800 leading-relaxed">
                    Mahasiswa dapat memutar musik belajar dari berkas lokal di komputer/HP atau menggunakan tautan streaming audio MP3 langsung.
                  </p>

                  {/* Option A: Upload Local File */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Upload size={14} className="text-indigo-600" />
                      <span>Opsi 1: Pilih File Audio dari Perangkat (.mp3 / .wav / .ogg)</span>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                  </div>

                  {/* Option B: Enter Audio URL */}
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-200 space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ExternalLink size={14} className="text-indigo-600" />
                      <span>Opsi 2: Masukkan URL Tautan Audio Streaming MP3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={customAudioUrl}
                        onChange={(e) => setCustomAudioUrl(e.target.value)}
                        placeholder="https://example.com/musik-belajar-semangat.mp3"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomUrl}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                      >
                        Putar Tautan
                      </button>
                    </div>
                  </div>

                  {isCustomMode && (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div className="text-xs text-emerald-900 font-semibold">
                        Sedang Aktif: <strong>{customAudioName}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          cartoonAudio.stopCustomAudio();
                          handleTrackChange('arabic-energetic');
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:underline"
                      >
                        Kembalikan ke Instrumen Bawaan
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredTracks.map((item) => {
                    const isCurrent = !isCustomMode && track === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-200'
                            : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                            isCurrent ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.icon}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                {item.title}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {item.bpm} BPM • {item.mood}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {item.tags.map((tg) => (
                                <span key={tg} className="text-[10px] text-amber-800 bg-amber-100/60 px-1.5 py-0.2 rounded font-medium">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          {isCurrent ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleToggleMusic();
                              }}
                              className="px-3.5 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
                              <span>{isPlaying ? 'Jeda Lagu' : 'Lanjutkan'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleTrackChange(item.id);
                                setShowLibraryModal(false);
                              }}
                              className="px-3.5 py-2 bg-white hover:bg-amber-500 hover:text-white border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Play size={13} />
                              <span>Pilih & Putar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredTracks.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <p className="text-xs font-medium">Tidak ada lagu yang cocok dengan pencarian "{searchQuery}".</p>
                      <button
                        onClick={() => setSelectedGenreTab('custom')}
                        className="mt-2 text-xs font-bold text-amber-600 hover:underline inline-block"
                      >
                        Atau unggah / putar lagu sendiri?
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Sintesis Web Audio 100% Offline & Bebas Kuota</span>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
