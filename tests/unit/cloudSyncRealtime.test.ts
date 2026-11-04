import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiChatService } from '../../src/services/aiChatService';
import { ProfileService } from '../../src/services/profileService';
import { useAiStore } from '../../src/stores/useAiStore';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { supabase } from '../../src/lib/supabase';

describe('Supabase Cloud Persistence & Multi-Device Sync Specification', () => {
  const mockUserId = 'usr_founder_vip_namho';
  const mockEmail = 'namho03052k9@gmail.com';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Tạo và tải danh sách phiên chat (ai_conversations) từ Supabase Cloud', async () => {
    const conv = await AiChatService.createConversation(mockUserId, 'Ôn tập Vật Lý');
    expect(conv).toBeDefined();
    expect(conv.user_id).toBe(mockUserId);
    expect(conv.title).toBe('Ôn tập Vật Lý');

    const convs = await AiChatService.fetchConversations(mockUserId);
    expect(Array.isArray(convs)).toBe(true);
  });

  it('2. Lưu và nạp tin nhắn (ai_messages) với user_id thật của người dùng', async () => {
    const convId = 'conv_test_123';
    const savedMsg = await AiChatService.saveMessage({
      id: 'msg_1',
      conversation_id: convId,
      user_id: mockUserId,
      role: 'user',
      content: 'Giải thích định luật Ohm',
      credits_used: 1
    });

    expect(savedMsg).toBeDefined();
    expect(savedMsg?.user_id).toBe(mockUserId);
    expect(savedMsg?.content).toBe('Giải thích định luật Ohm');

    const assistantMsg = await AiChatService.saveMessage({
      id: 'msg_2',
      conversation_id: convId,
      user_id: mockUserId,
      role: 'assistant',
      content: 'Định luật Ohm: I = U / R',
      credits_used: 1
    });

    expect(assistantMsg?.role).toBe('assistant');
  });

  it('3. initConversation tự động kéo toàn bộ danh sách phiên và tin nhắn từ Supabase', async () => {
    await useAiStore.getState().initConversation(mockUserId);
    const state = useAiStore.getState();
    expect(state.activeConversationId).toBeDefined();
    expect(Array.isArray(state.messages)).toBe(true);
  });

  it('4. Đồng bộ số dư tia chớp ⚡ từ Supabase Cloud (Single Source of Truth)', async () => {
    vi.spyOn(ProfileService, 'fetchProfile').mockResolvedValue({
      id: mockUserId,
      email: mockEmail,
      full_name: 'Nam Hồ',
      role: 'founder',
      plan: 'lifetime',
      ai_credits_balance: 1000,
      avatar_url: 'https://lh3.googleusercontent.com/a/test-avatar'
    } as any);

    const cloudProf = await ProfileService.ensureProfileForUser({
      id: mockUserId,
      email: mockEmail,
      displayName: 'Nam Hồ'
    });

    expect(cloudProf).toBeDefined();
    expect(cloudProf.role).toBe('founder');
    expect(cloudProf.plan).toBe('lifetime');
    expect(cloudProf.ai_credits_balance).toBeGreaterThanOrEqual(1000);

    // Kéo từ Cloud về Auth store
    await useAuthStore.getState().loadUserFromCloud(mockUserId);
    const authUser = useAuthStore.getState().user;
    expect(authUser?.displayName).toBe('Nam Hồ');
    expect(authUser?.badge).toBe('Founder VIP 👑');
    expect(authUser?.credits).toBeGreaterThanOrEqual(1000);
    expect(useAiStore.getState().aiCreditsBalance).toBeGreaterThanOrEqual(1000);
  });

  it('5. deductCredits trừ trực tiếp trên Supabase và đồng bộ cả 2 Store', async () => {
    const initialCredits = useAiStore.getState().aiCreditsBalance;
    const ok = useAiStore.getState().deductCredits(1);
    expect(ok).toBe(true);
    expect(useAiStore.getState().aiCreditsBalance).toBe(initialCredits - 1);
    expect(useAuthStore.getState().credits).toBe(initialCredits - 1);
  });

  it('6. createNewSession tạo cuộc trò chuyện mới trên Supabase và đặt làm active', async () => {
    await useAiStore.getState().createNewSession();
    const currentId = useAiStore.getState().currentSessionId;
    expect(currentId).toBeDefined();
    expect(useAiStore.getState().activeConversationId).toBe(currentId);
    expect(useAiStore.getState().messages.length).toBe(1);
    expect(useAiStore.getState().messages[0].role).toBe('assistant');
  });
});
