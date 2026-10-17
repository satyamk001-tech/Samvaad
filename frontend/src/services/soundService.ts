/**
 * Samvaad Telephony & WebRTC Audio Synthesizer
 * Generates authentic incoming chime ringtones and dual-pulse outgoing ringback tones ("ring-ring... ring-ring...")
 * using the Web Audio API with dedicated master gain stages for instant, click-free silence.
 */
class SoundService {
  private ctx: AudioContext | null = null;
  private incomingInterval: any = null;
  private outgoingInterval: any = null;
  private incomingMasterGain: GainNode | null = null;
  private outgoingMasterGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];

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

    // Dedicated master gain stage for incoming chimes
    this.incomingMasterGain = ctx.createGain();
    this.incomingMasterGain.gain.setValueAtTime(1, ctx.currentTime);
    this.incomingMasterGain.connect(ctx.destination);

    // Play initial phrase immediately
    this.playIncomingChimePhrase(ctx, this.incomingMasterGain);

    // Repeat every 3.0 seconds
    this.incomingInterval = setInterval(() => {
      const activeCtx = this.getContext();
      if (activeCtx && this.incomingMasterGain) {
        this.playIncomingChimePhrase(activeCtx, this.incomingMasterGain);
      }
    }, 3000);
  }

  /**
   * Stops the incoming call ringtone immediately
   */
  public stopIncomingRingtone(): void {
    if (this.incomingInterval) {
      clearInterval(this.incomingInterval);
      this.incomingInterval = null;
    }
    if (this.incomingMasterGain) {
      try {
        if (this.ctx) {
          this.incomingMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        this.incomingMasterGain.disconnect();
      } catch {}
      this.incomingMasterGain = null;
    }
    this.cleanupActiveNodes();
  }

  /**
   * Starts playing the outgoing ringback tone: authentic double-ring ("ring-ring... ring-ring...")
   */
  public startOutgoingRingback(): void {
    this.stopOutgoingRingback();
    this.stopIncomingRingtone();

    const ctx = this.getContext();
    if (!ctx) return;

    // Dedicated master gain stage for outgoing ringback
    this.outgoingMasterGain = ctx.createGain();
    this.outgoingMasterGain.gain.setValueAtTime(1, ctx.currentTime);
    this.outgoingMasterGain.connect(ctx.destination);

    // Play initial double-pulse burst immediately
    this.playOutgoingRingbackBurst(ctx, this.outgoingMasterGain);

    // Repeat cadence: 0.4s pulse + 0.2s pause + 0.4s pulse + 2.0s silence = 3.0s cycle
    this.outgoingInterval = setInterval(() => {
      const activeCtx = this.getContext();
      if (activeCtx && this.outgoingMasterGain) {
        this.playOutgoingRingbackBurst(activeCtx, this.outgoingMasterGain);
      }
    }, 3000);
  }

  /**
   * Stops the outgoing ringback tone immediately
   */
  public stopOutgoingRingback(): void {
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
    if (this.outgoingMasterGain) {
      try {
        if (this.ctx) {
          this.outgoingMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        }
        this.outgoingMasterGain.disconnect();
      } catch {}
      this.outgoingMasterGain = null;
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
      osc.frequency.setValueAtTime(480, now + i * 0.22);

      gain.gain.setValueAtTime(0, now + i * 0.22);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.16);
    }
  }

  /**
   * Synthesizes a melodious 4-note smartphone chime phrase
   */
  private playIncomingChimePhrase(ctx: AudioContext, masterGain: GainNode): void {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.14 },
      { freq: 659.25, time: 0.16, dur: 0.14 },
      { freq: 783.99, time: 0.32, dur: 0.14 },
      { freq: 1046.50, time: 0.48, dur: 0.35 },
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

        gain.gain.setValueAtTime(0, now + n.time);
        gain.gain.linearRampToValueAtTime(0.25, now + n.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur + 0.05);

        this.activeOscillators.push(osc);
      } catch (e) {
        console.warn('Error playing incoming chime note:', e);
      }
    });
  }

  /**
   * Synthesizes authentic double-pulse ringback burst ("ring-ring")
   * Pulse 1: 0.0s - 0.4s
   * Pause:   0.4s - 0.6s
   * Pulse 2: 0.6s - 1.0s
   */
  private playOutgoingRingbackBurst(ctx: AudioContext, masterGain: GainNode): void {
    const now = ctx.currentTime;
    const pulses = [
      { start: 0.0, dur: 0.4 },
      { start: 0.6, dur: 0.4 },
    ];

    pulses.forEach((pulse) => {
      [440, 480].forEach((freq) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + pulse.start);

          const startTime = now + pulse.start;
          const stopTime = startTime + pulse.dur;

          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
          gain.gain.setValueAtTime(0.12, stopTime - 0.04);
          gain.gain.linearRampToValueAtTime(0.0001, stopTime);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(startTime);
          osc.stop(stopTime + 0.02);

          this.activeOscillators.push(osc);
        } catch (e) {
          console.warn('Error playing outgoing pulse:', e);
        }
      });
    });
  }

  private cleanupActiveNodes(): void {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
  }
}

export const soundService = new SoundService();
