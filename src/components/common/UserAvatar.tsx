import React, { useState, useRef, useMemo } from 'react';
import {
  UserProfile,
  getEffectiveAvatarUrl,
  getAvatarDisplayName,
  generateInitialsAvatarSvg
} from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

export interface UserAvatarProps {
  user?: UserProfile | null;
  name?: string;
  avatarUrl?: string;
  size?: UserAvatarSize; // xs: 24, sm: 28, md: 36, lg: 48, xl: 64, or number
  className?: string;
  ring?: boolean | string;
  alt?: string;
  showStatusDot?: boolean;
  onClick?: () => void;
  testId?: string;
}

const SIZE_PRESETS: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', { px: number; tw: string }> = {
  xs: { px: 24, tw: 'w-6 h-6' },
  sm: { px: 28, tw: 'w-7 h-7' },
  md: { px: 36, tw: 'w-9 h-9' },
  lg: { px: 48, tw: 'w-12 h-12' },
  xl: { px: 64, tw: 'w-16 h-16' }
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  name,
  avatarUrl,
  size = 'md',
  className = '',
  ring = false,
  alt,
  showStatusDot = false,
  onClick,
  testId = 'user-avatar'
}) => {
  // Reactive subscription: if user prop is omitted, bind to store user
  const storeUser = useAuthStore((state) => state.user);
  const effectiveUser = user !== undefined ? user : (name !== undefined || avatarUrl !== undefined ? null : storeUser);

  const isGuest =
    !effectiveUser ||
    effectiveUser.id === 'guest' ||
    (effectiveUser as any).isGuest === true;

  // Resolve pixel size and tailwind dimension classes
  const { pxSize, sizeClasses, inlineStyle } = useMemo(() => {
    if (typeof size === 'number') {
      return {
        pxSize: size,
        sizeClasses: '',
        inlineStyle: { width: `${size}px`, height: `${size}px` }
      };
    }
    const preset = SIZE_PRESETS[size] || SIZE_PRESETS.md;
    return {
      pxSize: preset.px,
      sizeClasses: preset.tw,
      inlineStyle: undefined
    };
  }, [size]);

  // Peer props must never borrow the signed-in account's photo.
  const avatarUser = effectiveUser || { displayName: name, avatarUrl };
  const candidateUrl = getEffectiveAvatarUrl(avatarUser);
  const effectiveDisplayName = getAvatarDisplayName(name ? { ...avatarUser, displayName: name } : avatarUser);

  const fallbackSvg = useMemo(() => {
    if (isGuest && !name) {
      // Unauthenticated / Guest: bold 'K' over emerald gradient
      return generateInitialsAvatarSvg('Khách', pxSize, 'K', ['#3f3f46', '#3f3f46']);
    }
    return generateInitialsAvatarSvg(effectiveDisplayName || 'Khách', pxSize);
  }, [isGuest, name, effectiveDisplayName, pxSize]);

  // Error recovery: immediately fallback to SVG on broken/expired candidateUrl
  const [imgError, setImgError] = useState(false);
  const prevCandidateRef = useRef<string | null>(null);

  if (candidateUrl !== prevCandidateRef.current) {
    prevCandidateRef.current = candidateUrl;
    if (imgError) {
      setImgError(false);
    }
  }

  const activeSrc = (!candidateUrl || imgError) ? fallbackSvg : candidateUrl;

  // Ring classes
  const ringClasses = useMemo(() => {
    if (typeof ring === 'string') return ring;
    if (ring === true) return 'ring-2 ring-zinc-500/40';
    return '';
  }, [ring]);

  const interactiveClasses = onClick
    ? 'cursor-pointer active:scale-95 transition select-none'
    : 'select-none';

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={inlineStyle}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-zinc-900 ${sizeClasses} ${ringClasses} ${interactiveClasses} ${className}`}
    >
      <img
        src={activeSrc}
        alt={alt || effectiveDisplayName || (isGuest ? 'Khách' : 'User Avatar')}
        className="w-full h-full object-cover rounded-full pointer-events-none"
        onError={() => {
          setImgError(true);
        }}
        data-testid={`${testId}-img`}
      />

      {showStatusDot && (
        <span
          data-testid={`${testId}-status-dot`}
          className={`absolute bottom-0 right-0 rounded-full bg-zinc-700 ring-2 ring-zinc-950 pointer-events-none ${
            pxSize <= 28 ? 'w-2 h-2' : 'w-2.5 h-2.5'
          }`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
