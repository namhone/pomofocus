import { AudioContextManager } from './audioContextManager';
import { AmbientTrackId } from '../types/audio';

interface ActiveTrackNodes {
  gainNode: GainNode;
  stopNodes: Array<{ stop: () => void; disconnect: () => void }>;
}

/**
 * AmbientSynthesizer - Bộ phát âm thanh môi trường và sóng nhịp hai tai (Binaural Beats)
 * Tổng hợp 100% bằng Web Audio API: 0 byte mạng, 100% offline, không rò rỉ bộ nhớ
 *
 * QUY ĐỊNH PHÁP LÝ & ĐẠO ĐỨC:
 * Các âm thanh sóng não Alpha/Beta/Gamma/Theta/Delta chỉ mang tính chất mô phỏng nhịp âm hai tai
 * hỗ trợ thư giãn và tập trung, KHÔNG PHẢI thiết bị y tế và không đưa ra bất kỳ cam kết trị liệu nào.
 */
export class AmbientSynthesizer {
  private static instance: AmbientSynthesizer | null = null;
  private audioMgr: AudioContextManager;
  private activeTracks = new Map<AmbientTrackId, ActiveTrackNodes>();
  private noiseBuffers = new Map<string, AudioBuffer>();
  private cachedCtx: AudioContext | null = null;
  private trackGenerations = new Map<AmbientTrackId, number>();
  private pendingStopTimers = new Map<AmbientTrackId, ReturnType<typeof setTimeout>>();
  private pendingStopCleanups = new Map<AmbientTrackId, () => void>();
  private bulkCleanupTimers = new Set<ReturnType<typeof setTimeout>>();

  private constructor() {
    this.audioMgr = AudioContextManager.getInstance();
  }

  public static getInstance(): AmbientSynthesizer {
    if (!AmbientSynthesizer.instance) {
      AmbientSynthesizer.instance = new AmbientSynthesizer();
    }
    return AmbientSynthesizer.instance;
  }

  private disposeTrackNodes(active: ActiveTrackNodes): void {
    active.stopNodes.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Ignore if already stopped
      }
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    });
    try {
      active.gainNode.disconnect();
    } catch {
      // Ignore
    }
  }

  private cancelPendingStop(id: AmbientTrackId, runCleanup = true): void {
    const timer = this.pendingStopTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.pendingStopTimers.delete(id);
    }
    const cleanup = this.pendingStopCleanups.get(id);
    if (cleanup) {
      this.pendingStopCleanups.delete(id);
      if (runCleanup) {
        cleanup();
      }
    }
  }

  private maybeSuspendIfIdle(): void {
    if (this.activeTracks.size === 0) {
      this.audioMgr.suspend().catch(() => {});
    }
  }

  /**
   * Phát một track âm thanh môi trường
   */
  public async playTrack(id: AmbientTrackId, volume = 0.5): Promise<void> {
    const gen = (this.trackGenerations.get(id) ?? 0) + 1;
    this.trackGenerations.set(id, gen);

    await this.audioMgr.ensureResumed();
    if (this.trackGenerations.get(id) !== gen) return;

    const ctx = this.audioMgr.getContext();
    const ambientBus = this.audioMgr.getAmbientBusGain() || this.audioMgr.getMasterGain();
    if (!ctx || !ambientBus || ctx.state === 'closed') return;

    // Dọn dẹp pending stop hoặc track cũ đang chạy cho cùng id mà không làm trôi generation mới
    this.cancelPendingStop(id, true);
    const prevActive = this.activeTracks.get(id);
    if (prevActive) {
      this.activeTracks.delete(id);
      this.disposeTrackNodes(prevActive);
    }

    const trackGain = ctx.createGain();
    const safeVol = Math.max(0, Math.min(1, volume));
    trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    trackGain.gain.linearRampToValueAtTime(Math.max(0.0001, safeVol), ctx.currentTime + 0.22); // Smooth 220ms fade-in
    trackGain.connect(ambientBus);

    const stopNodes: Array<{ stop: () => void; disconnect: () => void }> = [];

    if (id.startsWith('noise_')) {
      this.startNoiseTrack(ctx, id as 'noise_white' | 'noise_pink' | 'noise_brown' | 'noise_blue', trackGain, stopNodes);
    } else if (id.startsWith('binaural_')) {
      this.startBinauralTrack(ctx, id, trackGain, stopNodes);
    } else {
      this.startProceduralTrack(ctx, id, trackGain, stopNodes);
    }

    this.activeTracks.set(id, {
      gainNode: trackGain,
      stopNodes,
    });
  }

  /**
   * Dừng một track âm thanh
   */
  public stopTrack(id: AmbientTrackId): void {
    this.trackGenerations.set(id, (this.trackGenerations.get(id) ?? 0) + 1);
    this.cancelPendingStop(id, true);

    const active = this.activeTracks.get(id);
    if (!active) {
      this.maybeSuspendIfIdle();
      return;
    }

    this.activeTracks.delete(id);

    const ctx = this.audioMgr.peekContext();
    if (ctx && ctx.state !== 'closed') {
      const now = ctx.currentTime;
      active.gainNode.gain.cancelScheduledValues(now);
      active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
      active.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.18); // Smooth 180ms fade-out

      const disposeOnly = () => {
        this.pendingStopTimers.delete(id);
        this.pendingStopCleanups.delete(id);
        this.disposeTrackNodes(active);
      };
      this.pendingStopCleanups.set(id, disposeOnly);
      const timer = setTimeout(() => {
        disposeOnly();
        this.maybeSuspendIfIdle();
      }, 200);
      this.pendingStopTimers.set(id, timer);
    } else {
      this.disposeTrackNodes(active);
      this.maybeSuspendIfIdle();
    }
  }

  /**
   * Điều chỉnh âm lượng của một track đang chạy
   */
  public setTrackVolume(id: AmbientTrackId, volume: number): void {
    const active = this.activeTracks.get(id);
    if (!active) return;
    const ctx = this.audioMgr.peekContext();
    if (!ctx || ctx.state === 'closed') return;

    const safeVol = Math.max(0, Math.min(1, volume));
    const now = ctx.currentTime;
    active.gainNode.gain.cancelScheduledValues(now);
    active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
    active.gainNode.gain.setTargetAtTime(safeVol, now, 0.03);
  }

  /**
   * Dừng tất cả các track đang phát và tạm dừng AudioContext để giải phóng phần cứng
   */
  public stopAll(): void {
    const knownKeys = new Set<AmbientTrackId>([
      ...this.activeTracks.keys(),
      ...this.pendingStopTimers.keys(),
      ...this.trackGenerations.keys(),
    ]);
    for (const id of knownKeys) {
      this.trackGenerations.set(id, (this.trackGenerations.get(id) ?? 0) + 1);
      this.cancelPendingStop(id, true);
    }

    const entries = Array.from(this.activeTracks.values());
    this.activeTracks.clear();

    if (entries.length === 0) {
      this.maybeSuspendIfIdle();
      return;
    }

    const ctx = this.audioMgr.peekContext();
    if (ctx && ctx.state !== 'closed') {
      const now = ctx.currentTime;
      for (const active of entries) {
        try {
          active.gainNode.gain.cancelScheduledValues(now);
          active.gainNode.gain.setValueAtTime(active.gainNode.gain.value, now);
          active.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.15); // Smooth 150ms fade-out
        } catch {}
      }

      const bulkTimer = setTimeout(() => {
        this.bulkCleanupTimers.delete(bulkTimer);
        for (const active of entries) {
          this.disposeTrackNodes(active);
        }
        this.maybeSuspendIfIdle();
      }, 170);
      this.bulkCleanupTimers.add(bulkTimer);
    } else {
      for (const active of entries) {
        this.disposeTrackNodes(active);
      }
      this.maybeSuspendIfIdle();
    }
  }

  public isTrackPlaying(id: AmbientTrackId): boolean {
    return this.activeTracks.has(id);
  }

  // ==========================================
  // THUẬT TOÁN TẠO NOISE (WHITE / PINK / BROWN)
  // ==========================================

  private getNoiseBuffer(ctx: AudioContext, type: 'white' | 'pink' | 'brown' | 'blue'): AudioBuffer {
    if (this.cachedCtx !== ctx) {
      this.noiseBuffers.clear();
      this.cachedCtx = ctx;
    }
    const cached = this.noiseBuffers.get(type);
    if (cached) return cached;

    const duration = 5; // 5 giây buffer loop liên tục
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      // Paul Kellet filter (-3dB/octave)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      // Brownian noise: Random Walk (-6dB/octave)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain bù
      }
    } else if (type === 'blue') {
      // Blue noise: +3dB/octave differentiator filter
      let lastWhite = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (white - lastWhite) * 0.7;
        lastWhite = white;
      }
    }

    this.noiseBuffers.set(type, buffer);
    return buffer;
  }

  private startNoiseTrack(
    ctx: AudioContext,
    type: 'noise_white' | 'noise_pink' | 'noise_brown' | 'noise_blue',
    destination: GainNode,
    stopNodes: Array<{ stop: () => void; disconnect: () => void }>
  ): void {
    const rawType = type.replace('noise_', '') as 'white' | 'pink' | 'brown' | 'blue';
    const buffer = this.getNoiseBuffer(ctx, rawType);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    source.connect(destination);
    source.start();

    stopNodes.push({
      stop: () => source.stop(),
      disconnect: () => source.disconnect(),
    });
  }

  // ==========================================
  // THUẬT TOÁN TỔNG HỢP BINAURAL BEATS
  // ==========================================

  private startBinauralTrack(
    ctx: AudioContext,
    id: AmbientTrackId,
    destination: GainNode,
    stopNodes: Array<{ stop: () => void; disconnect: () => void }>
  ): void {
    const baseFreq = 216; // Tần số gốc A3 êm dịu (216Hz)
    let beatDelta = 10; // Mặc định Alpha 10Hz

    switch (id) {
      case 'binaural_delta':
        beatDelta = 2.5; // Delta: 0.5 - 4Hz (Ngủ sâu)
        break;
      case 'binaural_theta':
        beatDelta = 6.0; // Theta: 4 - 8Hz (Trực giác / Sáng tạo)
        break;
      case 'binaural_alpha':
        beatDelta = 10.0; // Alpha: 8 - 13Hz (Thư giãn / Tỉnh táo)
        break;
      case 'binaural_beta':
        beatDelta = 18.0; // Beta: 14 - 30Hz (Tư duy logic / Giải quyết vấn đề)
        break;
      case 'binaural_gamma':
        beatDelta = 40.0; // Gamma: 30 - 50Hz (Tập trung cao độ / Đột phá)
        break;
    }

    // 2 Oscillator riêng cho 2 tai (Stereo)
    const oscLeft = ctx.createOscillator();
    const oscRight = ctx.createOscillator();

    oscLeft.type = 'sine';
    oscRight.type = 'sine';

    oscLeft.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    oscRight.frequency.setValueAtTime(baseFreq + beatDelta, ctx.currentTime);

    // ChannelMergerNode: Kênh 0 = Trái, Kênh 1 = Phải
    const merger = ctx.createChannelMerger(2);

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);

    merger.connect(destination);

    oscLeft.start();
    oscRight.start();

    stopNodes.push({
      stop: () => {
        oscLeft.stop();
        oscRight.stop();
      },
      disconnect: () => {
        oscLeft.disconnect();
        oscRight.disconnect();
        merger.disconnect();
      },
    });
  }

  // ==========================================
  // THUẬT TOÁN TỔNG HỢP PROCEDURAL SOUNDS
  // ==========================================

  private startProceduralTrack(
    ctx: AudioContext,
    id: AmbientTrackId,
    destination: GainNode,
    stopNodes: Array<{ stop: () => void; disconnect: () => void }>
  ): void {
    if (id === 'rain') {
      // Mưa rào: Pink noise qua Lowpass filter 1000Hz + Highpass 150Hz
      const buffer = this.getNoiseBuffer(ctx, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1000, ctx.currentTime);

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(150, ctx.currentTime);

      source.connect(hp);
      hp.connect(lp);
      lp.connect(destination);
      source.start();

      stopNodes.push({
        stop: () => source.stop(),
        disconnect: () => {
          source.disconnect();
          hp.disconnect();
          lp.disconnect();
        },
      });
    } else if (id === 'ocean_waves') {
      // Sóng biển dạt dào: Pink noise qua Lowpass filter dao động chậm 0.12Hz (8.3s chu kỳ sóng)
      const buffer = this.getNoiseBuffer(ctx, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(450, ctx.currentTime);
      lp.Q.setValueAtTime(1.2, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // 0.12 Hz ~ 8s per wave
      lfoGain.gain.setValueAtTime(260, ctx.currentTime); // Dao động 190Hz - 710Hz

      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);

      source.connect(lp);
      lp.connect(destination);

      lfo.start();
      source.start();

      stopNodes.push({
        stop: () => {
          source.stop();
          lfo.stop();
        },
        disconnect: () => {
          source.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          lp.disconnect();
        },
      });
    } else if (id === 'stream') {
      // Tiếng suối: Pink noise qua Bandpass filter + LFO dao động nhẹ
      const buffer = this.getNoiseBuffer(ctx, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(650, ctx.currentTime);
      bp.Q.setValueAtTime(1.8, ctx.currentTime);

      // LFO tạo nhịp róc rách của nước
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.4, ctx.currentTime);
      lfoGain.gain.setValueAtTime(120, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(bp.frequency);

      source.connect(bp);
      bp.connect(destination);

      lfo.start();
      source.start();

      stopNodes.push({
        stop: () => {
          source.stop();
          lfo.stop();
        },
        disconnect: () => {
          source.disconnect();
          lfo.disconnect();
          lfoGain.disconnect();
          bp.disconnect();
        },
      });
    } else if (id === 'campfire') {
      // Lửa trại: Brown noise trầm + crackle bursts
      const buffer = this.getNoiseBuffer(ctx, 'brown');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(450, ctx.currentTime);

      source.connect(lp);
      lp.connect(destination);
      source.start();

      stopNodes.push({
        stop: () => source.stop(),
        disconnect: () => {
          source.disconnect();
          lp.disconnect();
        },
      });
    } else if (id === 'cafe') {
      // Quán cafe lofi: Brown + Pink noise hòa quyện ở dải trầm ấm
      const buffer = this.getNoiseBuffer(ctx, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, ctx.currentTime);

      source.connect(lp);
      lp.connect(destination);
      source.start();

      stopNodes.push({
        stop: () => source.stop(),
        disconnect: () => {
          source.disconnect();
          lp.disconnect();
        },
      });
    } else if (id === 'keyboard') {
      // Bàn phím cơ: Filtered noise pulses
      const buffer = this.getNoiseBuffer(ctx, 'white');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(2200, ctx.currentTime);
      bp.Q.setValueAtTime(4.0, ctx.currentTime);

      source.connect(bp);
      bp.connect(destination);
      source.start();

      stopNodes.push({
        stop: () => source.stop(),
        disconnect: () => {
          source.disconnect();
          bp.disconnect();
        },
      });
    } else {
      // Fallback procedural ambient sound
      const buffer = this.getNoiseBuffer(ctx, 'pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600, ctx.currentTime);

      source.connect(lp);
      lp.connect(destination);
      source.start();

      stopNodes.push({
        stop: () => source.stop(),
        disconnect: () => {
          source.disconnect();
          lp.disconnect();
        },
      });
    }
  }
}
