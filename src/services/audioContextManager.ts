const UNLOCK_EVENTS: ReadonlyArray<keyof WindowEventMap> = [
  'pointerdown',
  'touchstart',
  'touchend',
  'keydown',
  'click',
];

export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientBusGain: GainNode | null = null;
  private sfxBusGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isUserInteracted = false;
  private boundInteractionListeners = false;
  private interactionHandler: (() => void) | null = null;
  private isUnlocking = false;
  private currentVolume = 0.8;
  private isMuted = false;
  private oneShotSeq = 0;
  private activeOneShots = new Map<number, ReturnType<typeof setTimeout> | null>();
  private deferredSuspend = false;

  private constructor() {
    this.setupInteractionListeners();
  }

  public static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }

  private setupInteractionListeners(): void {
    if (typeof window === 'undefined' || this.boundInteractionListeners) return;
    this.boundInteractionListeners = true;

    const resumeOnInteraction = () => {
      if (this.isUnlocking) return;
      if (this.ctx?.state === 'running') {
        this.isUserInteracted = true;
        this.teardownInteractionListeners();
        return;
      }

      this.isUnlocking = true;
      this.ensureResumed()
        .then((ok) => {
          this.isUnlocking = false;
          if (ok && this.ctx?.state === 'running') {
            this.teardownInteractionListeners();
          }
        })
        .catch(() => {
          this.isUnlocking = false;
        });
    };

    this.interactionHandler = resumeOnInteraction;
    for (const evt of UNLOCK_EVENTS) {
      window.addEventListener(evt, resumeOnInteraction, { passive: true, capture: true });
    }
  }

  private teardownInteractionListeners(): void {
    if (typeof window !== 'undefined' && this.interactionHandler) {
      for (const evt of UNLOCK_EVENTS) {
        window.removeEventListener(evt, this.interactionHandler, { capture: true });
      }
    }
    this.interactionHandler = null;
    this.boundInteractionListeners = false;
  }

  /**
   * Khởi tạo AudioContext và Audio Graph với DynamicsCompressorNode
   * giúp kiểm soát dải động và giảm thiểu nguy cơ méo tiếng / clipping khi phối nhiều track.
   * Lưu ý: Không bảo đảm tuyệt đối 100% trong mọi trường hợp âm lượng hoặc tín hiệu cực đoan.
   */
  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API không được trình duyệt này hỗ trợ.');
        return null;
      }

      this.ctx = new AudioContextClass();

      // Master Gain Node - khôi phục âm lượng và mute đã lưu
      this.masterGain = this.ctx.createGain();
      const initialGain = this.isMuted ? 0 : this.currentVolume;
      this.masterGain.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      // Dedicated Ambient Bus Gain Node - kết nối vào Master Gain
      // Cho phép ducking riêng biệt nhạc nền mà không làm giảm âm lượng chuông báo
      this.ambientBusGain = this.ctx.createGain();
      this.ambientBusGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.ambientBusGain.connect(this.masterGain);

      // Dedicated SFX Bus Gain Node - kết nối vào Master Gain (không bị ảnh hưởng bởi ambient ducking)
      this.sfxBusGain = this.ctx.createGain();
      this.sfxBusGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.sfxBusGain.connect(this.masterGain);

      // Dynamics Compressor Node (-6dB threshold giúp nén dải động)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      // Kết nối Master -> Compressor -> Destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);
    }

    return this.ctx;
  }

  public peekContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterGain(): GainNode | null {
    this.getContext();
    return this.masterGain;
  }

  public getAmbientBusGain(): GainNode | null {
    this.getContext();
    return this.ambientBusGain;
  }

  public getSfxBusGain(): GainNode | null {
    this.getContext();
    return this.sfxBusGain;
  }

  /**
   * Đăng ký một âm thanh one-shot (chuông báo / SFX) đang phát để ngăn suspend() cắt ngang
   */
  public beginOneShot(maxDurationMs = 4500): () => void {
    const id = ++this.oneShotSeq;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (maxDurationMs > 0 && Number.isFinite(maxDurationMs)) {
      timer = setTimeout(() => {
        this.endOneShotById(id);
      }, maxDurationMs);
    }
    this.activeOneShots.set(id, timer);
    return () => this.endOneShotById(id);
  }

  public endOneShot(): void {
    if (this.activeOneShots.size === 0) return;
    const firstId = this.activeOneShots.keys().next().value;
    if (firstId !== undefined) {
      this.endOneShotById(firstId);
    }
  }

  private endOneShotById(id: number): void {
    if (!this.activeOneShots.has(id)) return;
    const timer = this.activeOneShots.get(id);
    if (timer) {
      clearTimeout(timer);
    }
    this.activeOneShots.delete(id);
    if (this.activeOneShots.size === 0 && this.deferredSuspend) {
      this.deferredSuspend = false;
      this.suspend().catch(() => {});
    }
  }

  public hasActiveOneShots(): boolean {
    return this.activeOneShots.size > 0;
  }

  public getActiveOneShotCount(): number {
    return this.activeOneShots.size;
  }

  public setMasterVolume(volume: number, isMuted: boolean): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.isMuted = isMuted;

    if (!this.masterGain || !this.ctx) return;
    const targetVal = this.isMuted ? 0 : this.currentVolume;
    this.masterGain.gain.setTargetAtTime(targetVal, this.ctx.currentTime, 0.03);
  }

  /**
   * Kích hoạt hoặc tiếp tục AudioContext khi có tương tác người dùng
   */
  public async ensureResumed(options?: { preserveDeferredSuspend?: boolean }): Promise<boolean> {
    if (!options?.preserveDeferredSuspend) {
      this.deferredSuspend = false;
    }
    const ctx = this.getContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        await ctx.resume();
        this.isUserInteracted = true;
        return true;
      } catch (err) {
        console.warn('Chưa thể kích hoạt AudioContext do Autoplay policy:', err);
        return false;
      }
    }

    this.isUserInteracted = true;
    return ctx.state === 'running';
  }

  /**
   * Tạm dừng AudioContext (giải phóng DAC âm thanh, ngắt tiêu thụ pin và CPU)
   */
  public async suspend(): Promise<void> {
    if (this.activeOneShots.size > 0) {
      this.deferredSuspend = true;
      return;
    }
    if (this.ctx && this.ctx.state === 'running' && typeof this.ctx.suspend === 'function') {
      try {
        await this.ctx.suspend();
      } catch (err) {
        console.debug('[AudioContextManager] suspend error:', err);
      }
    }
  }

  public isRunning(): boolean {
    return this.ctx ? this.ctx.state === 'running' : false;
  }

  public hasUserInteracted(): boolean {
    return this.isUserInteracted;
  }

  public close(): void {
    for (const timer of this.activeOneShots.values()) {
      if (timer) clearTimeout(timer);
    }
    this.activeOneShots.clear();
    this.deferredSuspend = false;
    this.isUnlocking = false;

    if (this.ctx && this.ctx.state !== 'closed') {
      if (typeof this.ctx.close === 'function') {
        this.ctx.close().catch(() => {});
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.ambientBusGain = null;
    this.sfxBusGain = null;
    this.compressor = null;
    this.isUserInteracted = false;

    this.teardownInteractionListeners();
    this.setupInteractionListeners();
  }
}
