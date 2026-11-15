import React, { useState, useRef, useMemo } from 'react';
import {
  UserProfile,
  isValidAvatarUrl,
  isCustomAvatarUrl,
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
  const effectiveUser = user !== undefined ? user : storeUser;

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

  // 1. Priority 1 (Custom uploaded avatar)
  const customCandidate = useMemo(() => {
    if (effectiveUser?.customAvatarUrl && isValidAvatarUrl(effectiveUser.customAvatarUrl)) {
      return effectiveUser.customAvatarUrl;
    }
    const userAny = effectiveUser as any;
    if (userAny?.custom_avatar_url && isValidAvatarUrl(userAny.custom_avatar_url)) {
      return userAny.custom_avatar_url;
    }
    if (effectiveUser?.avatarUrl && isCustomAvatarUrl(effectiveUser.avatarUrl)) {
      return effectiveUser.avatarUrl;
    }
    if (avatarUrl && isCustomAvatarUrl(avatarUrl)) {
      return avatarUrl;
    }
    return null;
  }, [effectiveUser, avatarUrl]);

  // 2. Priority 2 (Google OAuth photo or general valid avatarUrl)
  const oauthCandidate = useMemo(() => {
    if (effectiveUser?.avatarUrl && isValidAvatarUrl(effectiveUser.avatarUrl)) {
      return effectiveUser.avatarUrl;
    }
    const userAny = effectiveUser as any;
    if (userAny?.user_metadata?.avatar_url && isValidAvatarUrl(userAny.user_metadata.avatar_url)) {
      return userAny.user_metadata.avatar_url;
    }
    if (userAny?.user_metadata?.picture && isValidAvatarUrl(userAny.user_metadata.picture)) {
      return userAny.user_metadata.picture;
    }
    if (userAny?.picture && isValidAvatarUrl(userAny.picture)) {
      return userAny.picture;
    }
    if (avatarUrl && isValidAvatarUrl(avatarUrl)) {
      return avatarUrl;
    }
    return null;
  }, [effectiveUser, avatarUrl]);

  const candidateUrl = customCandidate || oauthCandidate;

  // 3. Priority 3 (SVG Initials fallback)
  const effectiveDisplayName = useMemo(() => {
    if (name) return name;
    if (effectiveUser?.displayName) return effectiveUser.displayName;
    const userAny = effectiveUser as any;
    if (userAny?.name) return userAny.name;
    if (effectiveUser?.email) return effectiveUser.email.split('@')[0];
    return '';
  }, [name, effectiveUser]);

  const fallbackSvg = useMemo(() => {
    if (isGuest && !name) {
      // Unauthenticated / Guest: bold 'K' over emerald gradient
      return generateInitialsAvatarSvg('Khách', pxSize, 'K', ['#10b981', '#047857']);
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
    if (ring === true) return 'ring-2 ring-emerald-500/40';
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
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-zinc-950 pointer-events-none ${
            pxSize <= 28 ? 'w-2 h-2' : 'w-2.5 h-2.5'
          }`}
        />
      )}
    </div>
  );
};

export default UserAvatar;
