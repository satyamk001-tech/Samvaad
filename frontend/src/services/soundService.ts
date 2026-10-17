/**
 * Samvaad Telephony & WebRTC Audio Synthesizer
 * Generates authentic incoming ringtones and outgoing ringback tones using the Web Audio API.
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private incomingInterval: any = null;
  private outgoingInterval: any = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGains: GainNode[] = [];

  private getContext(): AudioContext | null {
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch (e) {
      console.warn('AudioContext not available:', e);
      return null;
    }
  }

  /**
   * Starts playing the incoming call ringtone (melodic chime loop)
   */
  public startIncomingRingtone(): void {
    this.stopIncomingRingtone();
    this.stopOutgoingRingback();

    const ctx = this.getContext();
    if (!ctx) return;

    // Play initial burst immediately
    this.playIncomingChimePhrase(ctx);

    // Repeat every 3 seconds
    this.incomingInterval = setInterval(() => {
      const activeCtx = this.getContext();
      if (activeCtx) {
        this.playIncomingChimePhrase(activeCtx);
      }
    }, 3000);
  }

  /**
   * Stops the incoming call ringtone
   */
  public stopIncomingRingtone(): void {
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    this.cleanupActiveNodes();
  }

  /**
   * Starts playing the outgoing ringback tone ("tuuuut... tuuuut...")
   */
  public startOutgoingRingback(): void {
    this.stopOutgoingRingback();
    this.stopIncomingRingtone();

    const ctx = this.getContext();
    if (!ctx) return;

    // Play initial burst immediately
    this.playOutgoingRingbackBurst(ctx);

    // Repeat cadence: 1.2s tone + 2.0s silence = 3.2s cycle
    this.outgoingInterval = setInterval(() => {
      const activeCtx = this.getContext();
      if (activeCtx) {
        this.playOutgoingRingbackBurst(activeCtx);
      }
    }, 3200);
  }

  /**
   * Stops the outgoing ringback tone
   */
  public stopOutgoingRingback(): void {
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
    this.cleanupActiveNodes();
  }

  /**
   * Plays a 3-beep call ended/rejected cadence
   */
  public playCallEndedTone(): void {
    this.stopIncomingRingtone();
    this.stopOutgoingRingback();

    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now + i * 0.25);

      gain.gain.setValueAtTime(0, now + i * 0.25);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.18);
    }
  }

  /**
   * Synthesizes a melodious 4-note smartphone chime phrase
   */
  private playIncomingChimePhrase(ctx: AudioContext): void {
    const now = ctx.currentTime;
    // Pleasant melodic notes: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.14 },
      { freq: 659.25, time: 0.16, dur: 0.14 },
      { freq: 783.99, time: 0.32, dur: 0.14 },
      { freq: 1046.50, time: 0.48, dur: 0.35 },
      // Second decorative motif
      { freq: 659.25, time: 0.95, dur: 0.14 },
      { freq: 783.99, time: 1.11, dur: 0.14 },
      { freq: 1046.50, time: 1.27, dur: 0.14 },
      { freq: 1318.51, time: 1.43, dur: 0.45 },
    ];

    notes.forEach((n) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        // Soft bell-like decay envelope
        gain.gain.setValueAtTime(0, now + n.time);
        gain.gain.linearRampToValueAtTime(0.25, now + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.05);

        this.activeOscillators.push(osc);
        this.activeGains.push(gain);
      } catch (e) {
        console.warn('Error playing incoming chime note:', e);
      }
    });
  }

  /**
   * Synthesizes a dual-tone PBX telephone ringback burst (440Hz + 480Hz)
   */
  private playOutgoingRingbackBurst(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const duration = 1.2;

    [440, 480].forEach((freq) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Smooth fade-in & fade-out to prevent audio pops
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
        gain.gain.setValueAtTime(0.12, now + duration - 0.06);
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration + 0.05);

        this.activeOscillators.push(osc);
        this.activeGains.push(gain);
      } catch (e) {
        console.warn('Error playing outgoing burst:', e);
      }
    });
  }

  private cleanupActiveNodes(): void {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeGains.forEach((g) => {
      try {
        g.disconnect();
      } catch {
        // already disconnected
      }
    });
    this.activeOscillators = [];
    this.activeGains = [];
  }
}

export const soundService = new SoundService();
