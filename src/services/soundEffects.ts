import { AudioContextManager } from './audioContextManager';
import { useAudioStore } from '../stores/useAudioStore';

type SfxCueId =
  | 'click'
  | 'timer_start'
  | 'timer_pause'
  | 'timer_complete'
  | 'peer_join'
  | 'task_complete';

interface ActiveCueState {
  gain: GainNode;
  filter: BiquadFilterNode;
  nodes: Array<{ stop?: () => void; disconnect: () => void }>;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  releaseOneShot: () => void;
}

const DEBOUNCE_MS: Record<SfxCueId, number> = {
  click: 70,
  timer_start: 80,
  timer_pause: 80,
  task_complete: 150,
  timer_complete: 300,
  peer_join: 300,
};

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
  gainParam.linearRampToValueAtTime(safePeak, startTime + Math.max(0.004, attackSec));
  safeExpRamp(gainParam, 0.0001, Math.max(startTime + attackSec + 0.008, endTime));
}

/**
 * SoundEffectsService - Tổng hợp hiệu ứng âm thanh UI / Timer / Peer Join chuẩn Zen
 * Sử dụng chung AudioContextManager (sfxBusGain), có debounce, mutex chuyển pha,
 * ADSR mượt mà và lọc thông thấp để tránh rè/lách tách trên loa laptop & Android.
 */
export class SoundEffectsService {
  private static instance: SoundEffectsService | null = null;
  private audioMgr = AudioContextManager.getInstance();
  private lastPlayedAt = new Map<SfxCueId, number>();
  private activeCue: ActiveCueState | null = null;
  private pendingFadeTimers = new Map<ReturnType<typeof setTimeout>, () => void>();

  private constructor() {}

  public static getInstance(): SoundEffectsService {
    if (!SoundEffectsService.instance) {
      SoundEffectsService.instance = new SoundEffectsService();
    }
    return SoundEffectsService.instance;
  }

  private stopActiveCue(immediate = false): void {
    const cue = this.activeCue;
    if (!cue) return;
    this.activeCue = null;

    if (cue.cleanupTimer !== null) {
      clearTimeout(cue.cleanupTimer);
      cue.cleanupTimer = null;
    }

    const finalize = () => {
      for (const n of cue.nodes) {
        try {
          n.stop?.();
        } catch {}
        try {
          n.disconnect();
        } catch {}
      }
      try {
        cue.filter.disconnect();
      } catch {}
      try {
        cue.gain.disconnect();
      } catch {}
      cue.releaseOneShot();
    };

    if (!immediate) {
      try {
        const ctx = this.audioMgr.peekContext();
        if (ctx && ctx.state !== 'closed') {
          const now = ctx.currentTime;
          const currentVal = typeof cue.gain.gain.value === 'number' ? cue.gain.gain.value : 0;
          cue.gain.gain.cancelScheduledValues(now);
          cue.gain.gain.setValueAtTime(Math.max(0, currentVal), now);
          cue.gain.gain.linearRampToValueAtTime(0, now + 0.02);

          const fadeTimer = setTimeout(() => {
            this.pendingFadeTimers.delete(fadeTimer);
            finalize();
          }, 25);
          this.pendingFadeTimers.set(fadeTimer, finalize);
          return;
        }
      } catch {}
    }

    finalize();
  }

  public stop(): void {
    this.stopActiveCue(true);
    for (const [timer, finalize] of Array.from(this.pendingFadeTimers.entries())) {
      clearTimeout(timer);
      this.pendingFadeTimers.delete(timer);
      finalize();
    }
    this.lastPlayedAt.clear();
  }

  private playCue(cueId: SfxCueId): void {
    try {
      if (typeof window === 'undefined') return;

      const settings = useAudioStore.getState().settings;
      if (settings.isMuted || settings.masterVolume <= 0) return;

      const nowMs = Date.now();
      const minIntervalMs = DEBOUNCE_MS[cueId];
      const prevAt = this.lastPlayedAt.get(cueId);
      if (prevAt !== undefined && nowMs >= prevAt && nowMs - prevAt < minIntervalMs) return;
      this.lastPlayedAt.set(cueId, nowMs);

      const ctx = this.audioMgr.getContext();
      const dest = this.audioMgr.getSfxBusGain() || this.audioMgr.getMasterGain();
      if (!ctx || !dest || ctx.state === 'closed') return;

      if (ctx.state === 'suspended') {
        this.audioMgr.ensureResumed({ preserveDeferredSuspend: true }).catch(() => false);
      }

      if (cueId !== 'click') {
        this.stopActiveCue();
      }

      const config = this.getCueSpec(cueId);
      const releaseOneShot = this.audioMgr.beginOneShot(config.totalDurationMs + 150);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(config.cutoffHz, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      const cueGain = ctx.createGain();
      cueGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      cueGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.008);

      filter.connect(cueGain);
      cueGain.connect(dest);

      const nodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
      const startTime = ctx.currentTime + 0.006;

      this.synthesizeCue(ctx, filter, cueId, startTime, nodes);

      const cueState: ActiveCueState = {
        gain: cueGain,
        filter,
        nodes,
        cleanupTimer: null,
        releaseOneShot,
      };

      if (cueId !== 'click') {
        this.activeCue = cueState;
      }

      cueState.cleanupTimer = setTimeout(() => {
        cueState.cleanupTimer = null;
        if (this.activeCue === cueState) {
          this.activeCue = null;
        }
        for (const n of nodes) {
          try {
            n.stop?.();
          } catch {}
          try {
            n.disconnect();
          } catch {}
        }
        try {
          filter.disconnect();
        } catch {}
        try {
          cueGain.disconnect();
        } catch {}
        releaseOneShot();
      }, config.totalDurationMs + 40);
    } catch {
      // No-throw guarantee for jsdom / SSR / restricted environments
    }
  }

  private getCueSpec(cueId: SfxCueId): { cutoffHz: number; totalDurationMs: number } {
    switch (cueId) {
      case 'click':
        return { cutoffHz: 2400, totalDurationMs: 45 };
      case 'timer_start':
        return { cutoffHz: 3200, totalDurationMs: 420 };
      case 'timer_pause':
        return { cutoffHz: 2600, totalDurationMs: 340 };
      case 'timer_complete':
        return { cutoffHz: 3400, totalDurationMs: 720 };
      case 'peer_join':
        return { cutoffHz: 3000, totalDurationMs: 520 };
      case 'task_complete':
        return { cutoffHz: 3600, totalDurationMs: 480 };
    }
  }

  private synthesizeCue(
    ctx: AudioContext,
    dest: AudioNode,
    cueId: SfxCueId,
    startTime: number,
    nodes: Array<{ stop?: () => void; disconnect: () => void }>
  ): void {
    if (cueId === 'click') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, startTime);
      safeExpRamp(osc.frequency, 320, startTime + 0.036);

      applyAdsr(g.gain, startTime, 0.005, 0.14, startTime + 0.038);

      osc.connect(g);
      g.connect(dest);
      osc.start(startTime);
      osc.stop(startTime + 0.045);
      nodes.push(osc, g);
      return;
    }

    if (cueId === 'timer_start') {
      const notes = [
        { freq: 523.25, type: 'sine' as OscillatorType, delay: 0.0, dur: 0.18, peak: 0.24 },
        { freq: 783.99, type: 'triangle' as OscillatorType, delay: 0.08, dur: 0.32, peak: 0.28 },
      ];
      this.scheduleNotes(ctx, dest, startTime, notes, 0.015, nodes);
      return;
    }

    if (cueId === 'timer_pause') {
      const notes = [
        { freq: 392.0, type: 'sine' as OscillatorType, delay: 0.0, dur: 0.16, peak: 0.2 },
        { freq: 293.66, type: 'sine' as OscillatorType, delay: 0.09, dur: 0.24, peak: 0.18 },
      ];
      this.scheduleNotes(ctx, dest, startTime, notes, 0.015, nodes);
      return;
    }

    if (cueId === 'timer_complete') {
      const notes = [
        { freq: 523.25, type: 'sine' as OscillatorType, delay: 0.0, dur: 0.38, peak: 0.22 },
        { freq: 659.25, type: 'sine' as OscillatorType, delay: 0.11, dur: 0.42, peak: 0.2 },
        { freq: 783.99, type: 'sine' as OscillatorType, delay: 0.22, dur: 0.48, peak: 0.22 },
      ];
      this.scheduleNotes(ctx, dest, startTime, notes, 0.02, nodes);
      return;
    }

    if (cueId === 'peer_join') {
      const notes = [
        { freq: 659.25, type: 'sine' as OscillatorType, delay: 0.0, dur: 0.24, peak: 0.18 },
        { freq: 880.0, type: 'sine' as OscillatorType, delay: 0.11, dur: 0.38, peak: 0.16 },
      ];
      this.scheduleNotes(ctx, dest, startTime, notes, 0.018, nodes);
      return;
    }

    if (cueId === 'task_complete') {
      const notes = [
        { freq: 783.99, type: 'sine' as OscillatorType, delay: 0.0, dur: 0.18, peak: 0.2 },
        { freq: 987.77, type: 'sine' as OscillatorType, delay: 0.08, dur: 0.22, peak: 0.18 },
        { freq: 1174.66, type: 'sine' as OscillatorType, delay: 0.16, dur: 0.3, peak: 0.22 },
      ];
      this.scheduleNotes(ctx, dest, startTime, notes, 0.014, nodes);
    }
  }

  private scheduleNotes(
    ctx: AudioContext,
    dest: AudioNode,
    baseTime: number,
    notes: Array<{ freq: number; type: OscillatorType; delay: number; dur: number; peak: number }>,
    attackSec: number,
    nodes: Array<{ stop?: () => void; disconnect: () => void }>
  ): void {
    for (const n of notes) {
      const t = baseTime + n.delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.freq, t);

      applyAdsr(g.gain, t, attackSec, n.peak, t + n.dur);

      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + n.dur + 0.03);
      nodes.push(osc, g);
    }
  }

  public playClick(): void {
    this.playCue('click');
  }

  public playTimerStart(): void {
    this.playCue('timer_start');
  }

  public playTimerPause(): void {
    this.playCue('timer_pause');
  }

  public playTimerComplete(): void {
    this.playCue('timer_complete');
  }

  public playPeerJoin(): void {
    this.playCue('peer_join');
  }

  public playTaskComplete(): void {
    this.playCue('task_complete');
  }
}

export const soundEffects = SoundEffectsService.getInstance();
