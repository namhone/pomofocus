import { AudioContextManager } from './audioContextManager';
import { ChimeSoundType } from '../types/audio';

/**
 * ChimeSynthesizer - Tổng hợp chuông báo Pomodoro hoàn toàn bằng Web Audio API
 * Đảm bảo 100% không phụ thuộc file mạng ngoài, 0 latency, 0 chi phí lưu trữ
 */
export class ChimeSynthesizer {
  private static instance: ChimeSynthesizer | null = null;
  private audioMgr: AudioContextManager;

  private constructor() {
    this.audioMgr = AudioContextManager.getInstance();
  }

  public static getInstance(): ChimeSynthesizer {
    if (!ChimeSynthesizer.instance) {
      ChimeSynthesizer.instance = new ChimeSynthesizer();
    }
    return ChimeSynthesizer.instance;
  }

  /**
   * Phát chuông báo kết thúc hiệp
   * @param type Loại chuông cần phát
   * @param volume Âm lượng chuông (0..1), mặc định 0.8
   */
  public async playChime(type: ChimeSoundType, volume = 0.8): Promise<void> {
    await this.audioMgr.ensureResumed();
    const ctx = this.audioMgr.getContext();
    const masterGain = this.audioMgr.getMasterGain();
    if (!ctx || !masterGain) return;

    // Gain riêng cho chuông
    const chimeGain = ctx.createGain();
    const safeVol = Math.max(0, Math.min(1, volume));
    chimeGain.gain.setValueAtTime(safeVol, ctx.currentTime);
    chimeGain.connect(masterGain);

    const now = ctx.currentTime + 0.02; // Bắt đầu sau 20ms tránh click/pop

    switch (type) {
      case 'twinkle':
        this.synthTwinkle(ctx, chimeGain, now);
        break;
      case 'playtime':
        this.synthPlaytime(ctx, chimeGain, now);
        break;
      case 'scifi':
        this.synthSciFi(ctx, chimeGain, now);
        break;
      case 'slow_rise':
        this.synthSlowRise(ctx, chimeGain, now);
        break;
      case 'rooster':
        this.synthRooster(ctx, chimeGain, now);
        break;
      case 'bird':
        this.synthBird(ctx, chimeGain, now);
        break;
      default:
        this.synthTwinkle(ctx, chimeGain, now);
        break;
    }

    // Tự động ngắt kết nối chimeGain sau khi chuông hoàn tất (tối đa 2.0s) để tránh tích lũy AudioNode
    setTimeout(() => {
      try {
        chimeGain.disconnect();
      } catch {
        // Bỏ qua nếu đã ngắt kết nối
      }
    }, 2000);
  }

  /**
   * Nghe thử chuông
   */
  public async previewChime(type: ChimeSoundType, volume = 0.8): Promise<void> {
    return this.playChime(type, volume);
  }

  // ==========================================
  // THUẬT TOÁN TỔNG HỢP ÂM SẮC (ALGORITHMS)
  // ==========================================

  /**
   * 1. Twinkle: Chuỗi nốt cao arpeggio lấp lánh (C6, E6, G6, B6, C7)
   */
  private synthTwinkle(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const notes = [1046.5, 1318.51, 1567.98, 1975.53, 2093.0]; // C6, E6, G6, B6, C7
    const noteDuration = 0.12;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      // Envelope: Fast attack, exponential decay
      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.exponentialRampToValueAtTime(0.4, noteTime + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDuration + 0.2);

      osc.connect(noteGain);
      noteGain.connect(destination);

      osc.start(noteTime);
      osc.stop(noteTime + noteDuration + 0.25);
    });
  }

  /**
   * 2. Playtime: Hợp âm vui nhộn, trong sáng (G5, C6, E6, G6)
   */
  private synthPlaytime(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const notes = [
      { freq: 783.99, delay: 0.0, dur: 0.18 },  // G5
      { freq: 1046.5, delay: 0.1, dur: 0.18 },  // C6
      { freq: 1318.51, delay: 0.2, dur: 0.18 }, // E6
      { freq: 1567.98, delay: 0.3, dur: 0.6 },  // G6 ngân dài
    ];

    notes.forEach((n) => {
      const noteTime = startTime + n.delay;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, noteTime);

      noteGain.gain.setValueAtTime(0.0001, noteTime);
      noteGain.gain.exponentialRampToValueAtTime(0.45, noteTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + n.dur);

      osc.connect(noteGain);
      noteGain.connect(destination);

      osc.start(noteTime);
      osc.stop(noteTime + n.dur + 0.05);
    });
  }

  /**
   * 3. Sci-fi: Tần số quét không gian kết hợp điều biến LFO
   */
  private synthSciFi(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const voiceGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(400, startTime);
    carrier.frequency.exponentialRampToValueAtTime(1600, startTime + 0.35);
    carrier.frequency.exponentialRampToValueAtTime(800, startTime + 0.7);

    // LFO Modulator tạo hiệu ứng tương lai
    modulator.type = 'sawtooth';
    modulator.frequency.setValueAtTime(32, startTime);
    modGain.gain.setValueAtTime(120, startTime);
    modGain.gain.linearRampToValueAtTime(20, startTime + 0.7);

    modulator.connect(carrier.frequency);

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.05);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.75);

    carrier.connect(voiceGain);
    voiceGain.connect(destination);

    modulator.start(startTime);
    carrier.start(startTime);

    modulator.stop(startTime + 0.8);
    carrier.stop(startTime + 0.8);
  }

  /**
   * 4. Slow Rise: Hợp âm ấm áp ngân vang chậm dần (C4, G4, C5, E5)
   */
  private synthSlowRise(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const chords = [261.63, 392.0, 523.25, 659.25]; // C4, G4, C5, E5
    const duration = 1.3;

    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Attack êm 0.3s, ngân 0.5s, decay mượt mà
      voiceGain.gain.setValueAtTime(0.0001, startTime);
      voiceGain.gain.linearRampToValueAtTime(0.2, startTime + 0.3);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.1);
    });
  }

  /**
   * 5. Rooster: Báo thức vui nhộn điệu gà gáy (G4 -> C5 -> D5 -> G5 luyến vút)
   */
  private synthRooster(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const phrases = [
      { freq: 392.0, time: 0.0, dur: 0.12 },   // G4
      { freq: 523.25, time: 0.14, dur: 0.12 }, // C5
      { freq: 587.33, time: 0.28, dur: 0.12 }, // D5
      { freq: 783.99, time: 0.42, dur: 0.55, glideTo: 932.33 }, // G5 luyến lên Bb5
    ];

    phrases.forEach((p) => {
      const noteStart = startTime + p.time;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const voiceGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(p.freq, noteStart);
      if (p.glideTo) {
        osc.frequency.exponentialRampToValueAtTime(p.glideTo, noteStart + p.dur);
      }

      // Filter tạo chất giọng kèn / gà gáy
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, noteStart);
      filter.Q.setValueAtTime(3, noteStart);

      voiceGain.gain.setValueAtTime(0.0001, noteStart);
      voiceGain.gain.exponentialRampToValueAtTime(0.35, noteStart + 0.03);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + p.dur);

      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(noteStart);
      osc.stop(noteStart + p.dur + 0.05);
    });
  }

  /**
   * 6. Bird: Tiếng chim hót líu lo tự nhiên với 2 cụm chirp tần số cao
   */
  private synthBird(ctx: AudioContext, destination: GainNode, startTime: number): void {
    const chirps = [
      { start: 0.0, f1: 2800, f2: 4400, f3: 3100, dur: 0.08 },
      { start: 0.1, f1: 3000, f2: 4600, f3: 3300, dur: 0.09 },
      { start: 0.28, f1: 3300, f2: 5200, f3: 3800, dur: 0.12 },
    ];

    chirps.forEach((c) => {
      const t = startTime + c.start;
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(c.f1, t);
      osc.frequency.linearRampToValueAtTime(c.f2, t + c.dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(c.f3, t + c.dur);

      voiceGain.gain.setValueAtTime(0.0001, t);
      voiceGain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, t + c.dur);

      osc.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(t);
      osc.stop(t + c.dur + 0.02);
    });
  }
}
