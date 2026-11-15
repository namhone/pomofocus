import { TimerPhase, TimerStatus } from '../types/timer';

/**
 * Synchronize timer status and metadata with OS MediaSession API.
 * Enables Android lock screen, notification shade, and Bluetooth earbud controls.
 */
export function syncMediaSession(
  phase: TimerPhase,
  status: TimerStatus,
  currentRound: number,
  roundsBeforeLongBreak: number,
  taskTitle?: string | null
): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  const phaseNames: Record<TimerPhase, string> = {
    pomodoro: 'Hiệp tập trung',
    short_break: 'Nghỉ ngắn',
    long_break: 'Nghỉ dài'
  };

  const title = taskTitle
    ? `${phaseNames[phase] || 'Pomodoro'}: ${taskTitle}`
    : `${phaseNames[phase] || 'Pomodoro'} (Hiệp ${currentRound}/${roundsBeforeLongBreak})`;

  try {
    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist: 'PomoFocus',
        album: 'Không Gian Học Tập Tập Trung',
        artwork: [
          { src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/logo.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/logo.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    } else {
      (navigator.mediaSession as any).metadata = {
        title,
        artist: 'PomoFocus',
        album: 'Không Gian Học Tập Tập Trung',
        artwork: [
          { src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml' },
          { src: '/logo.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/logo.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      };
    }

    navigator.mediaSession.playbackState =
      status === 'running' ? 'playing' : status === 'paused' ? 'paused' : 'none';
  } catch (err) {
    console.debug('[MediaSession] metadata update ignored/failed:', err);
  }
}

/**
 * Register OS media action handlers (Lock screen / Headset buttons)
 */
export function setupMediaSessionActionHandlers(actions: {
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onReset: () => void;
}): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  const handlers: Array<[MediaSessionAction, () => void]> = [
    ['play', actions.onPlay],
    ['pause', actions.onPause],
    ['nexttrack', actions.onSkip],
    ['stop', actions.onReset]
  ];

  handlers.forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // Ignore unsupported action types in legacy browsers
    }
  });
}
