import { create } from 'zustand';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  triggerInstall: () => Promise<boolean>;
  setInstalled: (installed: boolean) => void;
}

export const usePwaInstallStore = create<PwaInstallState>((set, get) => ({
  canInstall: false,
  isInstalled: false,
  deferredPrompt: null,

  setDeferredPrompt: (prompt) => {
    set({
      deferredPrompt: prompt,
      canInstall: Boolean(prompt),
    });
  },

  setInstalled: (installed) => {
    set({
      isInstalled: installed,
      canInstall: !installed && Boolean(get().deferredPrompt),
    });
  },

  triggerInstall: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        set({ canInstall: false, deferredPrompt: null, isInstalled: true });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Lỗi kích hoạt cài đặt PWA:', err);
      return false;
    }
  },
}));
