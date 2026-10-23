export class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isUserInteracted = false;
  private boundInteractionListeners = false;
  private currentVolume = 0.8;
  private isMuted = false;

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

    const resumeOnInteraction = async () => {
      const ok = await this.ensureResumed().catch(() => false);
      if (ok && typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', resumeOnInteraction);
        window.removeEventListener('keydown', resumeOnInteraction);
        this.boundInteractionListeners = false;
      }
    };

    window.addEventListener('pointerdown', resumeOnInteraction, { passive: true });
    window.addEventListener('keydown', resumeOnInteraction, { passive: true });
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

  public getMasterGain(): GainNode | null {
    this.getContext();
    return this.masterGain;
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
  public async ensureResumed(): Promise<boolean> {
    const ctx = this.getContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
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

  public isRunning(): boolean {
    return this.ctx ? this.ctx.state === 'running' : false;
  }

  public hasUserInteracted(): boolean {
    return this.isUserInteracted;
  }

  public close(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.masterGain = null;
      this.compressor = null;
      this.isUserInteracted = false;
    }
  }
}
