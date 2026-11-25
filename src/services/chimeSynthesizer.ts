import { AudioContextManager } from './audioContextManager';
import { ChimeSoundType } from '../types/audio';

interface StoppableAudioNode {
  stop?: () => void;
  disconnect: () => void;
}

function safeExpRamp(param: AudioParam, target: number, endTime: number): void {
  const safeTarget = Math.max(0.0001, target);
  if (typeof param.exponentialRampToValueAtTime === 'function') {
    param.exponentialRampToValueAtTime(safeTarget, endTime);
  } else if (typeof param.linearRampToValueAtTime === 'function') {
    param.linearRampToValueAtTime(safeTarget, endTime);
  }
}

function applyAdsr(
  gainParam: AudioParam,
  startTime: number,
  attackSec: number,
  peakGain: number,
  endTime: number
): void {
  const safePeak = Math.max(0.0001, peakGain);
  gainParam.setValueAtTime(0.0001, startTime);
  gainParam.linearRampToValueAtTime(safePeak, startTime + Math.max(0.005, attackSec));
  safeExpRamp(gainParam, 0.0001, Math.max(startTime + attackSec + 0.01, endTime));
}

/**
 * ChimeSynthesizer - Tổng hợp chuông báo Pomodoro hoàn toàn bằng Web Audio API
 * Áp dụng đường bao ADSR mượt mà, lọc lowpass ấm áp, hòa âm tự nhiên (tổng peak <= 0.75)
 * và ngắt kết nối click-free (30ms linearRampToValueAtTime(0)).
 */
export class ChimeSynthesizer {
  private static instance: ChimeSynthesizer | null = null;
  private audioMgr: AudioContextManager;
  private chimeGeneration = 0;
  private currentChimeGain: GainNode | null = null;
  private currentChimeFilter: BiquadFilterNode | null = null;
  private currentActiveNodes: StoppableAudioNode[] = [];
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingCleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  private currentReleaseOneShot: (() => void) | null = null;

  public stopCurrentChime(): void {
    this.chimeGeneration += 1;

    if (this.currentTimeout !== null) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    const fadingGain = this.currentChimeGain;
    const fadingFilter = this.currentChimeFilter;
    const fadingNodes = this.currentActiveNodes;
    const releaseOneShot = this.currentReleaseOneShot;

    this.currentChimeGain = null;
    this.currentChimeFilter = null;
    this.currentActiveNodes = [];
    this.currentReleaseOneShot = null;

    if (!fadingGain && fadingNodes.length === 0 && !fadingFilter) {
      releaseOneShot?.();
      return;
    }

    const cleanupNodes = () => {
      for (const node of fadingNodes) {
        try {
          node.stop?.();
        } catch {}
        try {
          node.disconnect();
        } catch {}
      }
      try {
        fadingFilter?.disconnect();
      } catch {}
      try {
        fadingGain?.disconnect();
      } catch {}
      releaseOneShot?.();
    };

    try {
      const ctx = this.audioMgr.peekContext();
      if (fadingGain && ctx && ctx.state !== 'closed') {
        const now = ctx.currentTime;
        const currentVal = typeof fadingGain.gain.value === 'number' ? fadingGain.gain.value : 0;
        fadingGain.gain.cancelScheduledValues(now);
        fadingGain.gain.setValueAtTime(Math.max(0, currentVal), now);
        fadingGain.gain.linearRampToValueAtTime(0, now + 0.03);

        const cleanupTimer = setTimeout(() => {
          this.pendingCleanupTimers.delete(cleanupTimer);
          cleanupNodes();
        }, 35);
        this.pendingCleanupTimers.add(cleanupTimer);
        return;
      }
    } catch {}

    cleanupNodes();
  }

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
    this.stopCurrentChime();
    const gen = this.chimeGeneration;

    await this.audioMgr.ensureResumed({ preserveDeferredSuspend: true });
    if (gen !== this.chimeGeneration) return;

    const ctx = this.audioMgr.getContext();
    const masterGain = this.audioMgr.getMasterGain();
    if (!ctx || !masterGain || ctx.state === 'closed') return;

    let warmCutoffHz = 3600;
    let cleanupDelayMs = 3600;

    switch (type) {
      case 'tibetan_bowl':
        warmCutoffHz = 3200;
        cleanupDelayMs = 3600;
        break;
      case 'crystal_chime':
        warmCutoffHz = 4200;
        cleanupDelayMs = 2900;
        break;
      case 'digital_alarm':
        warmCutoffHz = 2400;
        cleanupDelayMs = 1000;
        break;
      case 'brass_bell':
        warmCutoffHz = 3400;
        cleanupDelayMs = 3200;
        break;
      case 'twinkle':
        warmCutoffHz = 4200;
        cleanupDelayMs = 1200;
        break;
      case 'playtime':
        warmCutoffHz = 4000;
        cleanupDelayMs = 1200;
        break;
      case 'scifi':
        warmCutoffHz = 3600;
        cleanupDelayMs = 1100;
        break;
      case 'slow_rise':
        warmCutoffHz = 3200;
        cleanupDelayMs = 1700;
        break;
      case 'rooster':
        warmCutoffHz = 2400;
        cleanupDelayMs = 1200;
        break;
      case 'bird':
        warmCutoffHz = 3800;
        cleanupDelayMs = 800;
        break;
      default:
        warmCutoffHz = 3200;
        cleanupDelayMs = 3600;
        break;
    }

    const releaseOneShot = this.audioMgr.beginOneShot(cleanupDelayMs + 500);
    this.currentReleaseOneShot = releaseOneShot;

    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.setValueAtTime(warmCutoffHz, ctx.currentTime);
    warmFilter.Q.setValueAtTime(0.7, ctx.currentTime);

    const chimeGain = ctx.createGain();
    const safeVol = Math.max(0, Math.min(1, volume));
    chimeGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    chimeGain.gain.linearRampToValueAtTime(Math.max(0.0001, safeVol), ctx.currentTime + 0.015);

    warmFilter.connect(chimeGain);
    chimeGain.connect(masterGain);

    const activeNodes: StoppableAudioNode[] = [];
    this.currentChimeGain = chimeGain;
    this.currentChimeFilter = warmFilter;
    this.currentActiveNodes = activeNodes;

    const now = ctx.currentTime + 0.02; // Bắt đầu sau 20ms tránh click/pop

    switch (type) {
      case 'tibetan_bowl':
        this.synthTibetanBowl(ctx, warmFilter, now, activeNodes);
        break;
      case 'crystal_chime':
        this.synthCrystalChime(ctx, warmFilter, now, activeNodes);
        break;
      case 'digital_alarm':
        this.synthDigitalAlarm(ctx, warmFilter, now, activeNodes);
        break;
      case 'brass_bell':
        this.synthBrassBell(ctx, warmFilter, now, activeNodes);
        break;
      case 'twinkle':
        this.synthTwinkle(ctx, warmFilter, now, activeNodes);
        break;
      case 'playtime':
        this.synthPlaytime(ctx, warmFilter, now, activeNodes);
        break;
      case 'scifi':
        this.synthSciFi(ctx, warmFilter, now, activeNodes);
        break;
      case 'slow_rise':
        this.synthSlowRise(ctx, warmFilter, now, activeNodes);
        break;
      case 'rooster':
        this.synthRooster(ctx, warmFilter, now, activeNodes);
        break;
      case 'bird':
        this.synthBird(ctx, warmFilter, now, activeNodes);
        break;
      default:
        this.synthTibetanBowl(ctx, warmFilter, now, activeNodes);
        break;
    }

    // Tự động dừng và ngắt kết nối toàn bộ node sau khi chuông ngân hoàn tất
    this.currentTimeout = setTimeout(() => {
      if (this.currentTimeout !== null) {
        this.currentTimeout = null;
      }
      for (const node of activeNodes) {
        try {
          node.stop?.();
        } catch {}
        try {
          node.disconnect();
        } catch {}
      }
      try {
        warmFilter.disconnect();
      } catch {}
      try {
        chimeGain.disconnect();
      } catch {}

      if (gen === this.chimeGeneration) {
        if (this.currentChimeGain === chimeGain) this.currentChimeGain = null;
        if (this.currentChimeFilter === warmFilter) this.currentChimeFilter = null;
        if (this.currentActiveNodes === activeNodes) this.currentActiveNodes = [];
        if (this.currentReleaseOneShot === releaseOneShot) this.currentReleaseOneShot = null;
      }
      releaseOneShot();
    }, cleanupDelayMs);
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
   * 1. Twinkle: Chuỗi nốt arpeggio sine ấm áp, trong trẻo (C6, E6, G6, B6, C7)
   */
  private synthTwinkle(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const notes = [1046.5, 1318.51, 1567.98, 1975.53, 2093.0];
    const decay = 0.35;

    notes.forEach((freq, idx) => {
      const noteTime = startTime + idx * 0.09;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      applyAdsr(noteGain.gain, noteTime, 0.018, 0.22, noteTime + decay);

      osc.connect(noteGain);
      noteGain.connect(destination);

      osc.start(noteTime);
      osc.stop(noteTime + decay + 0.05);

      activeNodes.push(osc, noteGain);
    });
  }

  /**
   * 2. Playtime: Hợp âm vui tươi êm dịu (G5, C6, E6, G6)
   */
  private synthPlaytime(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const notes = [
      { freq: 783.99, delay: 0.0, dur: 0.24 },
      { freq: 1046.5, delay: 0.1, dur: 0.24 },
      { freq: 1318.51, delay: 0.2, dur: 0.24 },
      { freq: 1567.98, delay: 0.3, dur: 0.62 },
    ];

    notes.forEach((n) => {
      const noteTime = startTime + n.delay;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, noteTime);

      applyAdsr(noteGain.gain, noteTime, 0.02, 0.24, noteTime + n.dur);

      osc.connect(noteGain);
      noteGain.connect(destination);

      osc.start(noteTime);
      osc.stop(noteTime + n.dur + 0.05);

      activeNodes.push(osc, noteGain);
    });
  }

  /**
   * 3. Sci-fi: Tần số quét không gian với LFO qua modGain (modulator -> modGain -> carrier.frequency)
   */
  private synthSciFi(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const voiceGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(440, startTime);
    safeExpRamp(carrier.frequency, 1320, startTime + 0.35);
    safeExpRamp(carrier.frequency, 660, startTime + 0.78);

    modulator.type = 'triangle';
    modulator.frequency.setValueAtTime(18, startTime);
    modGain.gain.setValueAtTime(90, startTime);
    modGain.gain.linearRampToValueAtTime(15, startTime + 0.78);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    applyAdsr(voiceGain.gain, startTime, 0.04, 0.38, startTime + 0.85);

    carrier.connect(voiceGain);
    voiceGain.connect(destination);

    modulator.start(startTime);
    carrier.start(startTime);

    modulator.stop(startTime + 0.9);
    carrier.stop(startTime + 0.9);

    activeNodes.push(modulator, modGain, carrier, voiceGain);
  }

  /**
   * 4. Slow Rise: Hợp âm sine ấm áp ngân vang chậm dần (C4, G4, C5, E5)
   */
  private synthSlowRise(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const chords = [261.63, 392.0, 523.25, 659.25];
    const duration = 1.4;

    chords.forEach((freq) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      applyAdsr(voiceGain.gain, startTime, 0.32, 0.16, startTime + duration);

      osc.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.08);

      activeNodes.push(osc, voiceGain);
    });
  }

  /**
   * 5. Rooster: Báo thức điệu gà gáy (giữ tương thích ngược)
   */
  private synthRooster(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const phrases = [
      { freq: 392.0, time: 0.0, dur: 0.12 },
      { freq: 523.25, time: 0.14, dur: 0.12 },
      { freq: 587.33, time: 0.28, dur: 0.12 },
      { freq: 783.99, time: 0.42, dur: 0.55, glideTo: 932.33 },
    ];

    phrases.forEach((p) => {
      const noteStart = startTime + p.time;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const voiceGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(p.freq, noteStart);
      if (p.glideTo) {
        safeExpRamp(osc.frequency, p.glideTo, noteStart + p.dur);
      }

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, noteStart);
      filter.Q.setValueAtTime(2.5, noteStart);

      applyAdsr(voiceGain.gain, noteStart, 0.025, 0.28, noteStart + p.dur);

      osc.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(noteStart);
      osc.stop(noteStart + p.dur + 0.05);

      activeNodes.push(osc, filter, voiceGain);
    });
  }

  /**
   * 6. Bird: Tiếng chim hót líu lo tự nhiên ở dải tần êm tai (1850-3350 Hz)
   */
  private synthBird(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const chirps = [
      { start: 0.0, f1: 1850, f2: 2950, f3: 2200, dur: 0.09 },
      { start: 0.11, f1: 2100, f2: 3200, f3: 2450, dur: 0.1 },
      { start: 0.28, f1: 2250, f2: 3350, f3: 2600, dur: 0.12 },
    ];

    chirps.forEach((c) => {
      const t = startTime + c.start;
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(c.f1, t);
      osc.frequency.linearRampToValueAtTime(c.f2, t + c.dur * 0.5);
      safeExpRamp(osc.frequency, c.f3, t + c.dur);

      applyAdsr(voiceGain.gain, t, 0.018, 0.26, t + c.dur);

      osc.connect(voiceGain);
      voiceGain.connect(destination);

      osc.start(t);
      osc.stop(t + c.dur + 0.03);

      activeNodes.push(osc, voiceGain);
    });
  }

  /**
   * 7. Tibetan Bowl: Chuông Tây Tạng trầm hùng ngân vang với detuned partials ấm áp
   */
  private synthTibetanBowl(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const harmonics = [
      { freq: 216, gain: 0.3, decay: 3.35 },
      { freq: 217.5, gain: 0.18, decay: 3.2 },
      { freq: 432, gain: 0.16, decay: 2.6 },
      { freq: 648, gain: 0.07, decay: 2.0 },
      { freq: 864, gain: 0.04, decay: 1.4 },
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, startTime);

      applyAdsr(gainNode.gain, startTime, 0.045, h.gain, startTime + h.decay);

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + h.decay + 0.05);

      activeNodes.push(osc, gainNode);
    });
  }

  /**
   * 8. Crystal Chime: Chuông pha lê trong vắt với sine partials chuẩn âm nhạc
   */
  private synthCrystalChime(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const tones = [
      { freq: 1046.5, gain: 0.32, decay: 2.6 },
      { freq: 1567.98, gain: 0.2, decay: 2.2 },
      { freq: 2093.0, gain: 0.13, decay: 1.75 },
      { freq: 2637.02, gain: 0.07, decay: 1.3 },
    ];

    tones.forEach((t) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, startTime);

      applyAdsr(gainNode.gain, startTime, 0.018, t.gain, startTime + t.decay);

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + t.decay + 0.05);

      activeNodes.push(osc, gainNode);
    });
  }

  /**
   * 9. Digital Alarm: Nhịp chuông đôi mềm mại (triangle + sine thay cho square gắt)
   */
  private synthDigitalAlarm(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const beeps = [
      { t: 0.0, freq: 880, dur: 0.09 },
      { t: 0.13, freq: 1318.51, dur: 0.11 },
      { t: 0.36, freq: 880, dur: 0.09 },
      { t: 0.49, freq: 1318.51, dur: 0.13 },
    ];

    beeps.forEach((b) => {
      const noteTime = startTime + b.t;

      const oscTri = ctx.createOscillator();
      const triGain = ctx.createGain();
      oscTri.type = 'triangle';
      oscTri.frequency.setValueAtTime(b.freq, noteTime);
      applyAdsr(triGain.gain, noteTime, 0.014, 0.32, noteTime + b.dur);
      oscTri.connect(triGain);
      triGain.connect(destination);
      oscTri.start(noteTime);
      oscTri.stop(noteTime + b.dur + 0.03);

      const oscSine = ctx.createOscillator();
      const sineGain = ctx.createGain();
      oscSine.type = 'sine';
      oscSine.frequency.setValueAtTime(b.freq, noteTime);
      applyAdsr(sineGain.gain, noteTime, 0.014, 0.16, noteTime + b.dur);
      oscSine.connect(sineGain);
      sineGain.connect(destination);
      oscSine.start(noteTime);
      oscSine.stop(noteTime + b.dur + 0.03);

      activeNodes.push(oscTri, triGain, oscSine, sineGain);
    });
  }

  /**
   * 10. Brass Bell: Chuông đồng ấm áp với detuned body harmonic
   */
  private synthBrassBell(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    activeNodes: StoppableAudioNode[]
  ): void {
    const harmonics = [
      { freq: 440, gain: 0.3, decay: 2.9 },
      { freq: 441.2, gain: 0.14, decay: 2.7 },
      { freq: 880, gain: 0.18, decay: 2.2 },
      { freq: 1320, gain: 0.1, decay: 1.6 },
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, startTime);

      applyAdsr(gainNode.gain, startTime, 0.025, h.gain, startTime + h.decay);

      osc.connect(gainNode);
      gainNode.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + h.decay + 0.05);

      activeNodes.push(osc, gainNode);
    });
  }
}
