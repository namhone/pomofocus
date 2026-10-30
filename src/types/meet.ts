/**
 * POMOFOCUS MEET — CORE INTERFACES & REPOSITORY CONTRACT
 * ==============================================================================
 * Chuẩn hóa kiểu dữ liệu cho toàn bộ tầng UI, Zustand Store và Adapters.
 */

export interface StudyRoom {
  id: string;
  hostUserId: string;
  title: string;
  status: 'active' | 'closed';
  capacityLimit: number;
  createdAt: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'host' | 'member';
  status: 'active' | 'left' | 'revoked';
  joinedAt: string;
  lastSeenAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderUserId: string;
  clientMessageId: string;
  content: string;
  createdAt: string;
}

export interface InviteTokenResult {
  rawToken: string;
  expiresAt: string;
  tokenType: 'single_use' | 'multi_use';
}

export interface JoinRoomResult {
  success: boolean;
  roomId: string;
  role: 'host' | 'member';
  status: 'active';
  isReconnect: boolean;
}

// Interface Repository trừu tượng
export interface IMeetRepository {
  createRoom(title: string, capacityLimit?: number): Promise<StudyRoom>;
  createInviteToken(
    roomId: string,
    tokenType: 'single_use' | 'multi_use',
    maxUses?: number,
    durationHours?: number
  ): Promise<InviteTokenResult>;
  joinRoom(roomId: string, rawToken: string): Promise<JoinRoomResult>;
  sendMessage(roomId: string, clientMessageId: string, content: string): Promise<RoomMessage>;
  kickMember(roomId: string, targetUserId: string): Promise<void>;
  closeRoom(roomId: string): Promise<void>;
}

export interface PresenceState {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  timerMode: 'focus' | 'short_break' | 'long_break' | 'idle';
  timerRemainingSeconds: number;
}

export interface RealtimeCallbacks {
  onNewMessage: (message: RoomMessage) => void;
  onPresenceSync: (members: PresenceState[]) => void;
  onMemberRevoked: (targetUserId: string) => void;
  onRoomClosed: () => void;
}
