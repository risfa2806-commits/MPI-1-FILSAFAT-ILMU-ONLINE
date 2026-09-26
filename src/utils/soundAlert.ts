// Audio alert chime using Web Audio API
class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    try {
      const stored = localStorage.getItem('siakad_online_sound_enabled');
      this.soundEnabled = stored !== 'false';
    } catch {
      this.soundEnabled = true;
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('siakad_online_sound_enabled', enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
      return null;
    }
  }

  /**
   * Play an elegant, warm 2-tone chime when a student comes online
   * Tone 1: E5 (659.25Hz), Tone 2: A5 (880Hz)
   */
  public playOnlineChime(studentName?: string): void {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.36);

      // Note 2: A5 (880 Hz) - slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);

      gain2.gain.setValueAtTime(0.001, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.66);

      if (studentName) {
        console.log(`[AUDIO ALERT] Mahasiswa aktif online: ${studentName}`);
      }
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  /**
   * Play an uplifting 3-tone celebration chime when a task is submitted
   * C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
   */
  public playSubmissionChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.36);
      });
    } catch (e) {
      console.warn('Submission chime error:', e);
    }
  }

  /**
   * Play an attention-grabbing gentle double-ping chime for deadline warnings
   */
  public playDeadlineWarningChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [880, 784].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        gain.gain.setValueAtTime(0.001, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.31);
      });
    } catch (e) {
      console.warn('Deadline warning chime error:', e);
    }
  }

  /**
   * Unlock AudioContext on user gesture
   */
  public enableAudio(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('Could not enable audio:', e);
    }
  }

  /**
   * Test chime for manual user preview
   */
  public testSound(): void {
    this.playOnlineChime('Test Keaktifan Online');
  }
}

export const audioAlert = new AudioAlertService();
export const soundAlert = audioAlert;
export default soundAlert;
