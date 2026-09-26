// Web Audio API Engine for Cartoon Sound FX & Relaxing Study Music
// 100% self-contained, no external MP3 dependencies, works flawlessly offline and in iframes.

export type MusicTrackId =
  | 'arabic-energetic'
  | 'pop-energetic'
  | 'english-acoustic'
  | 'lofi-calm'
  | 'nature-pond'
  | 'zen-chimes';

export interface MusicTrackInfo {
  id: MusicTrackId;
  title: string;
  genre: string;
  bpm: number;
  mood: string;
  description: string;
  icon: string;
  tags: string[];
}

export const AVAILABLE_MUSIC_TRACKS: MusicTrackInfo[] = [
  {
    id: 'arabic-energetic',
    title: 'Instrumen Arab Bersemangat (Oud & Darbuka)',
    genre: 'Tradisional Timur Tengah / Maqam Hijaz',
    bpm: 106,
    mood: 'Bersemangat & Menginspirasi',
    description: 'Petikan Oud autentik dan ritme tabuhan Darbuka energik untuk membangkitkan semangat belajar & berpikir kritis.',
    icon: '🕌',
    tags: ['Arab', 'Oud', 'Darbuka', 'Semangat', 'Islami', 'Kreatif', 'Upbeat'],
  },
  {
    id: 'pop-energetic',
    title: 'Pop Ceria Semangat (Bright Study Pop)',
    genre: 'Modern Upbeat Pop',
    bpm: 116,
    mood: 'Ceria, Positif & Energik',
    description: 'Harmoni synth pop ceria dengan ketukan upbeat yang menyegarkan pikiran dan mengusir kejenuhan.',
    icon: '⚡',
    tags: ['Pop', 'Ceria', 'Semangat', 'Energetik', 'Motivasi', 'Bitz'],
  },
  {
    id: 'english-acoustic',
    title: 'English Acoustic Lounge (Oxford Study Beats)',
    genre: 'Inggris Akustik & Lo-Fi Chill',
    bpm: 82,
    mood: 'Elegan, Hangat & Fokus',
    description: 'Arpeggio gitar akustik khas Inggris dipadukan kehangatan vinyl untuk perenungan akademis mendalam.',
    icon: '🇬🇧',
    tags: ['Inggris', 'English', 'Akustik', 'Gitar', 'Fokus', 'Chill', 'Lo-Fi'],
  },
  {
    id: 'lofi-calm',
    title: 'Lofi Santai Belajar (Serenity Chords)',
    genre: 'Lo-Fi Hip-Hop / Chillhop',
    bpm: 60,
    mood: 'Tenang & Damai',
    description: 'Akord hangat bernuansa senja untuk menjaga konsentrasi tinggi saat membaca dan menjawab soal.',
    icon: '🎧',
    tags: ['Lofi', 'Santai', 'Tenang', 'Belajar', 'Mellow'],
  },
  {
    id: 'nature-pond',
    title: 'Kolam Katak Damai (Water Lily Kalimba)',
    genre: 'Nature Ambient / Kalimba',
    bpm: 54,
    mood: 'Asri & Menyejukkan',
    description: 'Petikan kalimba jernih berpadu gemericik air alami yang meredakan stres dan ketegangan ujian.',
    icon: '🐸',
    tags: ['Alam', 'Kalimba', 'Air', 'Kodok', 'Relaksasi'],
  },
  {
    id: 'zen-chimes',
    title: 'Zen Chime Hutan Bambu (Singing Bowl)',
    genre: 'Meditatif Oriental / Tibet',
    bpm: 48,
    mood: 'Meditatif & Hening',
    description: 'Dentingan genta hening dan singing bowl tibet untuk mencapai ketenangan batin mutlak.',
    icon: '🎋',
    tags: ['Zen', 'Bambu', 'Genta', 'Meditasi', 'Hening'],
  },
];

class CartoonAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled: boolean = true;
  private musicEnabled: boolean = true;
  private musicVolume: number = 0.35;
  private activeMusicTrack: MusicTrackId = 'arabic-energetic';
  private musicInterval: any = null;
  private isPlayingMusic: boolean = false;
  private musicMasterGain: GainNode | null = null;
  private customAudioElement: HTMLAudioElement | null = null;
  private isCustomAudioPlaying: boolean = false;

  // Initialize AudioContext on first user interaction
  public resumeAudioContext(): AudioContext | null {
    return this.getContext();
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // --- Configuration ---
  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicMasterGain && this.ctx) {
      this.musicMasterGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getIsPlayingMusic(): boolean {
    return this.isPlayingMusic;
  }

  public getActiveTrack(): MusicTrackId {
    return this.activeMusicTrack;
  }

  public getIsCustomAudioPlaying(): boolean {
    return this.isCustomAudioPlaying;
  }

  // Play custom audio file or URL
  public playCustomAudio(url: string) {
    this.stopMusic();
    try {
      if (!this.customAudioElement) {
        this.customAudioElement = new Audio();
        this.customAudioElement.loop = true;
        this.customAudioElement.onended = () => {
          this.isCustomAudioPlaying = false;
        };
      }
      this.customAudioElement.src = url;
      this.customAudioElement.volume = this.musicVolume;
      this.customAudioElement.play().then(() => {
        this.isCustomAudioPlaying = true;
        this.isPlayingMusic = true;
      }).catch(err => {
        console.warn('Cannot play custom audio:', err);
      });
    } catch (e) {
      console.warn('Custom audio error:', e);
    }
  }

  public stopCustomAudio() {
    if (this.customAudioElement) {
      try {
        this.customAudioElement.pause();
        this.customAudioElement.currentTime = 0;
      } catch {}
    }
    this.isCustomAudioPlaying = false;
  }

  // --- CARTOON SOUND EFFECTS ---

  // 1. Balloon Pop (Tembak Balon)
  public playBalloonPop() {
    this.playPop();
  }

  public playPop() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Noise burst for the pop snap
      const bufferSize = ctx.sampleRate * 0.06;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.06);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // Low pop resonance body
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.09);

      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('Audio pop error:', e);
    }
  }

  public playRibbit() {
    this.playFrogCroak();
  }

  // 2. Frog Jump & Croak (Lompat & Tangkap Kodok)
  public playFrogJump() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Spring boing jump
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.32);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);

      // Cute frog croak "ribbit/kwoak"
      setTimeout(() => {
        this.playFrogCroak();
      }, 150);
    } catch (e) {
      console.warn('Audio jump error:', e);
    }
  }

  // 3. Cute Frog Croak ("Kwoak-kwoak!")
  public playFrogCroak() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.09].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 0 ? 110 : 135, now + offset);
        osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 160 : 95, now + offset + 0.08);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, now + offset);
        filter.Q.setValueAtTime(3.5, now + offset);

        gain.gain.setValueAtTime(0.28, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch (e) {
      console.warn('Audio croak error:', e);
    }
  }

  // 4. Cartoon Boing / Spring
  public playBoing() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.35);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn('Audio boing error:', e);
    }
  }

  // 5. Correct Answer Chime (Sparkling major arpeggio)
  public playCorrectChime() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const noteTime = now + idx * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(noteTime);
        osc.stop(noteTime + 0.38);
      });
    } catch (e) {
      console.warn('Audio correct chime error:', e);
    }
  }

  // 6. Funny Cartoon Wrong Sound ("Womp-womp boing")
  public playWrongBoing() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.45);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.48);
    } catch (e) {
      console.warn('Audio wrong error:', e);
    }
  }

  // 7. Victory Cheering Fanfare
  public playCheer() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chords = [
        [523.25, 659.25, 783.99], // C
        [587.33, 739.99, 880.0],  // D
        [659.25, 830.61, 987.77], // E
        [783.99, 987.77, 1174.66, 1567.98], // G fanfare climax
      ];

      chords.forEach((chord, chordIdx) => {
        const time = now + chordIdx * 0.14;
        const dur = chordIdx === 3 ? 0.8 : 0.16;

        chord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);

          gain.gain.setValueAtTime(0.2, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + dur + 0.05);
        });
      });
    } catch (e) {
      console.warn('Audio cheer error:', e);
    }
  }

  // 8. Letter / Woodblock Click (Teka-Teki Silang typing)
  public playLetterClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio click error:', e);
    }
  }

  // 9. Water Splash (Kodok nyebur ke air kolam)
  public playSplash() {
    if (!this.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
    } catch (e) {
      console.warn('Audio splash error:', e);
    }
  }

  // --- RELAXING STUDY BACKGROUND MUSIC ENGINE ---
  // High-fidelity Web Audio synthesis: Arab Oud & Darbuka, Pop Upbeat, English Acoustic, Lofi, Pond & Zen

  public toggleMusic(_track?: MusicTrackId) {
    this.stopMusic();
    this.stopCustomAudio();
    return false;
  }

  public startMusic(_track: MusicTrackId = 'arabic-energetic') {
    // Lagu instrumen dinonaktifkan sesuai permintaan pengguna
    this.stopMusic();
    this.stopCustomAudio();
    this.isPlayingMusic = false;
    return;
  }

  public stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.musicMasterGain && this.ctx) {
      try {
        this.musicMasterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      } catch {}
    }
  }
}

export const cartoonAudio = new CartoonAudioEngine();
