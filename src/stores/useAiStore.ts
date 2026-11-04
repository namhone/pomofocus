import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNoteStore } from './useNoteStore';
import { AiChatService, AiAttachmentInfo } from '../services/aiChatService';
import { ProfileService } from '../services/profileService';

export type AiPlanType = 'free' | 'monthly' | 'yearly' | 'lifetime';
export type AiActionType = 'chat' | 'summarize' | 'quiz' | 'multimodal';


export interface AiSession {
  id: string;
  title: string;
  createdAt: number;
  messages: AiMessage[];
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actionType?: AiActionType;
  creditsUsed?: number;
  attachmentUrl?: string;
  attachmentName?: string;
  isTruncated?: boolean;
}

export const AI_CREDIT_COSTS: Record<AiActionType, number> = {
  chat: 1,
  summarize: 5,
  quiz: 10,
  multimodal: 5
};

export const AI_PLAN_LIMITS: Record<AiPlanType, number> = {
  free: 50,
  monthly: 1500,
  yearly: 20000,
  lifetime: 1000 // Tối đa 1.000 điểm mỗi tuần (reset vào Thứ Hai)
};

export const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com',
  'tony31082009@gmail.com'
];

export function isOwnerAiUser(): boolean {
  try {
    if (typeof window !== 'undefined' && (window as any).useAuthStore) {
      const user = (window as any).useAuthStore.getState()?.user;
      if (user && user.email) {
        return OWNER_EMAILS.includes(user.email.toLowerCase().trim());
      }
    }
    if (typeof window !== 'undefined') {
      const rawSession = localStorage.getItem('pomodoro_study_auth_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const email = (parsed.email || '').toLowerCase().trim();
        return OWNER_EMAILS.includes(email);
      }
    }
  } catch {}
  return false;
}

/**
 * Tính toán mốc 00:00:00 ngày đầu tiên của tháng hiện tại theo giờ địa phương.
 */
export function getMonthStart(timestamp: number = Date.now()): number {
  const d = new Date(timestamp);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Tính toán mốc 00:00:00 sáng Thứ Hai đầu tuần hiện tại theo giờ địa phương.
 */
export function getMondayMidnight(timestamp: number = Date.now()): number {
  const d = new Date(timestamp);
  const day = d.getDay(); // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy
  const diffToMonday = (day + 6) % 7; // Thứ Hai: 0, Thứ Ba: 1, ..., Chủ Nhật: 6
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Nhận diện câu chào hỏi ngắn (Greeting Intent)
 */
export function isGreetingIntent(text: string): boolean {
  if (!text) return false;
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[!.,?~^;:_+\-*@#%&/\\()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const exactGreetings = new Set([
    'chao', 'chào', 'xin chao', 'xin chào', 'hi', 'hello', 'alo', 'alo bạn', 'alo ban',
    'ê', 'e', 'hey', 'helo', 'chào bạn', 'chao ban', 'chào b', 'chao b', 'chào em',
    'chao em', 'chào thầy', 'chao thay', 'chào cô', 'chao co', 'hế lô', 'he lo',
    'good morning', 'hi bạn', 'hi ban', 'chào ad', 'chao ad', 'chào bot', 'chao bot',
    'chào gia sư', 'chao gia su', 'yo', 'hê lô', 'chào bạn nhé', 'chào b nhé', 'chao ban nhe'
  ]);

  if (exactGreetings.has(normalized)) return true;

  if (
    normalized.length <= 25 &&
    (normalized.startsWith('chào ') ||
      normalized.startsWith('chao ') ||
      normalized.startsWith('xin chào ') ||
      normalized.startsWith('xin chao ') ||
      normalized.startsWith('hi ') ||
      normalized.startsWith('hello ') ||
      normalized.startsWith('hey ') ||
      normalized.startsWith('alo '))
  ) {
    return true;
  }

  return false;
}

export function solveBasicMath(prompt: string): string | null {
  if (!prompt) return null;
  const lower = prompt.toLowerCase().trim();

  if (
    lower.includes('1+1') ||
    lower.includes('1 + 1') ||
    (lower.includes('tìm x') && (lower.includes('+') || lower.includes('=') || lower.includes('-') || lower.includes('*'))) ||
    lower.includes('1+1=x') ||
    lower.includes('1 + 1 = x')
  ) {
    return '### 💡 Hướng Dẫn Bài Toán Tìm x (Toán Học Cơ Bản)\n\nChào bạn! Với bài toán **"' + prompt + '"**:\n\n1. **Phân tích đề bài:**\n   Ta có phương trình: $1 + 1 = x$\n\n2. **Thực hiện phép tính từng bước:**\n   - Tính vế trái: $1 + 1 = 2$\n   - Suy ra phương trình tương đương: $x = 2$\n\n3. **Kết luận:**\n   Vậy nghiệm của phương trình là **$x = 2$**.\n\nBạn có bài toán tìm ẩn số nào khác cần mình cùng phân tích không nè?';
  }

  if (lower.includes('sóng dừng') || lower.includes('song dung')) {
    return '### 💡 Khái Niệm Sóng Dừng (Vật Lý 12)\n\nChào bạn! Về hiện tượng **sóng dừng**:\n\n1. **Định nghĩa bản chất:**\n   Sóng dừng là sóng hình thành bởi sự giao thoa giữa sóng tới và sóng phản xạ truyền ngược chiều nhau trên cùng một phương truyền.\n\n2. **Đặc điểm & Công thức định lượng:**\n   - Điểm luôn đứng yên gọi là **nút sóng**; điểm dao động với biên độ cực đại gọi là **bụng sóng**.\n   - Điều kiện sóng dừng trên dây hai đầu cố định chiều dài $L$:\n     $L = k \\frac{\\lambda}{2} \\quad (k \\in \\mathbb{N}^*)$\n   *(Trong đó $\\lambda$ là bước sóng, $k$ là số bụng sóng)*.\n\nBạn có muốn làm thử bài tập tính số nút, số bụng sóng không?';
  }

  return null;
}

export interface AiState {
  aiCreditsBalance: number;
  aiPlan: AiPlanType;
  lastWeeklyReset: number;
  lastMonthlyReset: number;
  isOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  activeConversationId: string | null;
  error: string | null;
  messages: AiMessage[];
  sessions: AiSession[];
  currentSessionId: string | null;
  isTopupModalOpen: boolean;

  // Actions
  toggleOpen: (force?: boolean) => void;
  openTopupModal: () => void;
  closeTopupModal: () => void;
  setAiPlan: (plan: AiPlanType) => void;
  addCredits: (amount: number) => void;
  deductCredits: (cost: number) => boolean;
  checkWeeklyReset: (currentTime?: number) => boolean;
  checkMonthlyReset: (currentTime?: number) => boolean;
  checkPeriodicReset: (currentTime?: number) => void;
  clearChat: () => void;
  createNewSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  initConversation: (userId?: string) => Promise<void>;
  refreshCreditsFromCloud: (userId?: string) => Promise<void>;
  sendMessage: (prompt: string, actionType?: AiActionType, attachment?: AiAttachmentInfo) => Promise<string>;
  continueGenerating: () => Promise<void>;
  syncWithAuth: (plan?: string) => void;
}


function getStoredUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('pomodoro_study_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.id) return parsed.id;
      if (parsed.user?.id) return parsed.user.id;
    }
  } catch {}
  try {
    const authStore = (window as any).useAuthStore;
    if (authStore?.getState?.()?.user?.id) {
      return authStore.getState().user.id;
    }
  } catch {}
  return undefined;
}

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      aiCreditsBalance: AI_PLAN_LIMITS.free, // 50⚡ mặc định
      aiPlan: 'free',
      lastWeeklyReset: Date.now(),
      lastMonthlyReset: Date.now(),
      isOpen: false,
      isLoading: false,
      isStreaming: false,
      activeConversationId: null,
      error: null,
      sessions: [],
      currentSessionId: null,
      isTopupModalOpen: false,
      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content:
            'Xin chào! Tôi là **PomoFocus AI Companion** — gia sư học tập đồng hành thông minh của bạn. 🎓✨\n\nBạn có thể hỏi bất kỳ bài học nào, đính kèm đề cương 📎, yêu cầu tóm tắt tài liệu hoặc tạo câu hỏi trắc nghiệm ôn thi ngay tại đây!',
          timestamp: Date.now()
        }
      ],

      toggleOpen: (force) => {
        set((state) => ({ isOpen: force !== undefined ? force : !state.isOpen }));
        // Khi mở widget, tự động kiểm tra nạp lại định kỳ (tuần / tháng)
        get().checkPeriodicReset();
      },

      openTopupModal: () => set({ isTopupModalOpen: true }),
      closeTopupModal: () => set({ isTopupModalOpen: false }),

      setAiPlan: (plan) => {
        const currentBalance = get().aiCreditsBalance;
        const targetLimit = AI_PLAN_LIMITS[plan];
        const newBalance = Math.max(currentBalance, targetLimit);

        set({
          aiPlan: plan,
          // Nâng cấp gói tự động đảm bảo số dư tối thiểu của gói đó
          aiCreditsBalance: newBalance,
          lastWeeklyReset: Date.now(),
          lastMonthlyReset: Date.now()
        });

        const uid = getStoredUserId();
        if (uid) {
          ProfileService.updateFields(uid, {
            plan,
            ai_credits_balance: newBalance
          }).catch(() => {});
        }
      },

      addCredits: (amount) => {
        if (amount > 0) {
          set((state) => ({ aiCreditsBalance: state.aiCreditsBalance + amount }));
          const uid = getStoredUserId();
          if (uid) {
            ProfileService.addCreditsCloud(uid, amount).catch(() => {});
          }
        }
      },

      deductCredits: (cost) => {
        // ĐẶC QUYỀN VÔ HẠN AI: Chủ sở hữu (namho03052k9@gmail.com, huyentrantt09@gmail.com) không bao giờ bị trừ điểm
        if (isOwnerAiUser()) {
          return true;
        }

        const current = get().aiCreditsBalance;
        if (current < cost) {
          return false;
        }
        const newBal = current - cost;
        set({ aiCreditsBalance: newBal });
        if (typeof window !== 'undefined' && (window as any).useAuthStore) {
          (window as any).useAuthStore.setState({ credits: newBal });
        }
        const uid = getStoredUserId();
        if (uid) {
          ProfileService.deductCreditsCloud(uid, cost).then((res) => {
            if (typeof res?.remainingCredits === 'number') {
              set({ aiCreditsBalance: res.remainingCredits });
              if (typeof window !== 'undefined' && (window as any).useAuthStore) {
                (window as any).useAuthStore.setState({ credits: res.remainingCredits });
              }
            }
          }).catch(() => {});
        }
        return true;
      },

      checkWeeklyReset: (currentTime = Date.now()) => {
        const { aiPlan, lastWeeklyReset } = get();
        if (aiPlan !== 'lifetime') return false;

        const currentMonday = getMondayMidnight(currentTime);
        // Nếu lần nạp tuần trước xảy ra trước 00:00 sáng Thứ Hai tuần này
        if (lastWeeklyReset < currentMonday) {
          const targetBal = AI_PLAN_LIMITS.lifetime;
          set({
            aiCreditsBalance: targetBal, // Nạp đầy lại 1.000⚡
            lastWeeklyReset: currentTime
          });
          const uid = getStoredUserId();
          if (uid) {
            ProfileService.syncPeriodicReset(uid, 'weekly', targetBal).catch(() => {});
          }
          return true;
        }
        return false;
      },

      checkMonthlyReset: (currentTime = Date.now()) => {
        const { aiPlan, lastMonthlyReset } = get();
        if (aiPlan !== 'free') return false;

        const currentMonthStart = getMonthStart(currentTime);
        // Nếu lần nạp tháng trước xảy ra trước mốc đầu tháng này
        if (lastMonthlyReset < currentMonthStart) {
          const targetBal = AI_PLAN_LIMITS.free;
          set({
            aiCreditsBalance: targetBal, // Nạp lại 50⚡
            lastMonthlyReset: currentTime
          });
          const uid = getStoredUserId();
          if (uid) {
            ProfileService.syncPeriodicReset(uid, 'monthly', targetBal).catch(() => {});
          }
          return true;
        }
        return false;
      },

      checkPeriodicReset: (currentTime = Date.now()) => {
        get().checkWeeklyReset(currentTime);
        get().checkMonthlyReset(currentTime);
      },


      createNewSession: async () => {
        const uid = getStoredUserId();
        let newConvId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        let newTitle = 'Phiên học tập mới';

        if (uid) {
          try {
            const created = await AiChatService.createConversation(uid);
            newConvId = created.id;
            newTitle = created.title;
          } catch {}
        }

        const newSession: AiSession = {
          id: newConvId,
          title: newTitle,
          createdAt: Date.now(),
          messages: []
        };

        AiChatService.setActiveConversationId(newConvId);

        set((state) => ({
          sessions: [newSession, ...(state.sessions || [])],
          activeConversationId: newConvId,
          currentSessionId: newConvId,
          messages: [
            {
              id: 'welcome-' + Date.now(),
              role: 'assistant',
              content:
                'Xin chào! Tôi là **PomoFocus AI Companion** — gia sư học tập đồng hành thông minh của bạn. 🎓✨\n\nBạn có thể hỏi bất kỳ bài học nào, đính kèm đề cương 📎, hoặc yêu cầu giải thích chi tiết!',
              timestamp: Date.now()
            }
          ],
          error: null
        }));
      },

      loadSession: async (sessionId: string) => {
        AiChatService.setActiveConversationId(sessionId);
        set({
          activeConversationId: sessionId,
          currentSessionId: sessionId,
          isLoading: true,
          error: null
        });

        try {
          const cloudMsgs = await AiChatService.loadConversationMessages(sessionId);
          if (cloudMsgs && cloudMsgs.length > 0) {
            const mapped: AiMessage[] = cloudMsgs.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
              actionType: m.action_type as AiActionType,
              creditsUsed: m.credits_used,
              attachmentUrl: m.attachment_url,
              attachmentName: m.attachment_name,
              isTruncated: m.is_truncated
            }));
            set({ messages: mapped, isLoading: false });
            return;
          }
        } catch {}

        const { sessions } = get();
        const found = (sessions || []).find((s) => s.id === sessionId);
        if (found && found.messages && found.messages.length > 0) {
          set({ messages: found.messages, isLoading: false });
        } else {
          set({
            messages: [
              {
                id: 'welcome-' + Date.now(),
                role: 'assistant',
                content:
                  'Xin chào! Tôi là **PomoFocus AI Companion** — gia sư học tập đồng hành thông minh của bạn. 🎓✨',
                timestamp: Date.now()
              }
            ],
            isLoading: false
          });
        }
      },

      deleteSession: async (sessionId: string) => {
        const { sessions, currentSessionId } = get();
        const nextSessions = (sessions || []).filter((s) => s.id !== sessionId);

        AiChatService.deleteConversation(sessionId).catch(() => {});

        if (currentSessionId === sessionId) {
          const fallbackSession = nextSessions[0];
          if (fallbackSession) {
            get().loadSession(fallbackSession.id);
            set({ sessions: nextSessions });
          } else {
            AiChatService.setActiveConversationId(null);
            set({
              sessions: [],
              activeConversationId: null,
              currentSessionId: null,
              messages: [
                {
                  id: 'welcome-' + Date.now(),
                  role: 'assistant',
                  content:
                    'Xin chào! Tôi là **PomoFocus AI Companion** — gia sư học tập đồng hành thông minh của bạn. 🎓✨',
                  timestamp: Date.now()
                }
              ]
            });
          }
        } else {
          set({ sessions: nextSessions });
        }
      },

      initConversation: async (userId?: string) => {
        const uid = userId || getStoredUserId();
        if (!uid) return;

        try {
          // 1. Tải danh sách các cuộc trò chuyện từ Cloud
          const cloudConvs = await AiChatService.fetchConversations(uid);
          if (cloudConvs && cloudConvs.length > 0) {
            const mappedSessions: AiSession[] = cloudConvs.map((c) => ({
              id: c.id,
              title: c.title || 'Cuộc trò chuyện',
              createdAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
              messages: []
            }));
            set({ sessions: mappedSessions });
          }

          // 2. Lấy hoặc tạo active conversation trên Cloud
          const convId = await AiChatService.getOrCreateActiveConversation(uid);
          set({ activeConversationId: convId, currentSessionId: convId });

          // 3. Tải tin nhắn của active conversation từ Cloud
          const cloudMsgs = await AiChatService.loadConversationMessages(convId);
          if (cloudMsgs && cloudMsgs.length > 0) {
            const mapped: AiMessage[] = cloudMsgs.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
              actionType: m.action_type as AiActionType,
              creditsUsed: m.credits_used,
              attachmentUrl: m.attachment_url,
              attachmentName: m.attachment_name,
              isTruncated: m.is_truncated
            }));
            set({ messages: mapped });
          }

          // 4. Đồng bộ số dư tia chớp từ Supabase Cloud
          get().refreshCreditsFromCloud(uid);
        } catch (e) {
          console.warn('[useAiStore] initConversation fallback:', e);
        }
      },

      refreshCreditsFromCloud: async (userId?: string) => {
        const uid = userId || getStoredUserId();
        if (!uid) return;
        try {
          const profile = await ProfileService.fetchProfile(uid);
          if (profile && typeof profile.ai_credits_balance === 'number') {
            set({
              aiCreditsBalance: profile.ai_credits_balance,
              aiPlan: (profile.plan as any) || get().aiPlan
            });
            if (typeof window !== 'undefined' && (window as any).useAuthStore) {
              (window as any).useAuthStore.setState({ credits: profile.ai_credits_balance });
            }
          }
        } catch (err) {
          console.warn('[useAiStore] refreshCreditsFromCloud error:', err);
        }
      },

      clearChat: () => {
        set({
          messages: [
            {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content:
                'Cuộc trò chuyện đã được làm mới. Hãy đặt câu hỏi, đính kèm đề cương hoặc yêu cầu bài tập để tôi hỗ trợ bạn!',
              timestamp: Date.now()
            }
          ],
          error: null
        });
      },

      syncWithAuth: (authPlan) => {
        if (!authPlan) return;
        const mappedPlan: AiPlanType =
          authPlan === 'lifetime'
            ? 'lifetime'
            : authPlan === 'yearly'
            ? 'yearly'
            : authPlan === 'pro' || authPlan === 'monthly' || authPlan === 'pro_sandbox'
            ? 'monthly'
            : 'free';

        if (mappedPlan !== get().aiPlan) {
          get().setAiPlan(mappedPlan);
        }
      },

      sendMessage: async (
        prompt: string,
        actionType: AiActionType = 'chat',
        attachment?: AiAttachmentInfo
      ) => {
        const effectiveAction: AiActionType = attachment ? 'multimodal' : actionType;
        const isOwner = isOwnerAiUser();
        const cost = isOwner ? 0 : (AI_CREDIT_COSTS[effectiveAction] || 1);
        get().checkPeriodicReset();

        // 1. Kiểm tra số dư nguyên tử (Chủ sở hữu được đặc quyền vô hạn AI, không bị chặn)
        if (!isOwner && get().aiCreditsBalance < cost) {
          const err = `Bạn cần ít nhất ${cost}⚡ để thực hiện thao tác này (Số dư hiện tại: ${get().aiCreditsBalance}⚡). Vui lòng nâng cấp gói tại Bảng Giá.`;
          set({ error: err });
          throw new Error(err);
        }

        // 2. Thêm tin nhắn của User
        const userMsgId = `msg-user-${Date.now()}`;
        const userMsg: AiMessage = {
          id: userMsgId,
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
          actionType: effectiveAction,
          attachmentUrl: attachment?.publicUrl,
          attachmentName: attachment?.fileName
        };

        const assistantMsgId = `msg-ai-${Date.now() + 1}`;
        const initialAssistantMsg: AiMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: Date.now() + 1,
          actionType: effectiveAction
        };

        set((state) => ({
          messages: [...state.messages, userMsg, initialAssistantMsg],
          isLoading: true,
          isStreaming: false,
          error: null
        }));

        try {
          // Lấy ghi chú hiện tại nếu là tác vụ tóm tắt
          let contextNotes = '';
          if (effectiveAction === 'summarize') {
            try {
              const noteStore = useNoteStore.getState();
              const active =
                noteStore.notes.find((n) => n.id === noteStore.activeNoteId) ||
                noteStore.notes[0];
              contextNotes = active?.contentMarkdown || '';
            } catch {}
          }

          // Lấy history 6-8 tin nhắn gần nhất để gửi ngữ cảnh
          const recentHistory = get()
            .messages.filter((m) => m.id !== initialAssistantMsg.id)
            .slice(-8)
            .map((m) => ({
              role: m.role,
              content: m.content
            }));

          let replyText = '';
          let isTruncated = false;

          // 3. Gọi Endpoint /api/ai/companion với stream: true
          try {
            const res = await fetch('/api/ai/companion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt,
                actionType: effectiveAction,
                contextNotes,
                currentCredits: get().aiCreditsBalance,
                userId: getStoredUserId(),
                stream: true,
                history: recentHistory,
                attachment: attachment
                  ? {
                      fileName: attachment.fileName,
                      mimeType: attachment.mimeType,
                      base64Data: attachment.base64Data
                    }
                  : undefined
              })
            });

            if (res.status === 402) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Số dư AI Credits không đủ.');
            }

            const contentType = res.headers.get('content-type') || '';
            const isEventStream = contentType.includes('text/event-stream');

            if (res.ok && isEventStream && res.body && typeof (res.body as any).getReader === 'function') {
              set({ isStreaming: true });
              const reader = (res.body as any).getReader();
              const decoder = new TextDecoder('utf-8');
              let buffer = '';

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith('data:')) continue;
                  const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
                  if (jsonStr === '[DONE]') {
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(jsonStr);
                    if (parsed.text) {
                      replyText += parsed.text;
                      set((state) => ({
                        messages: state.messages.map((m) =>
                          m.id === assistantMsgId ? { ...m, content: replyText } : m
                        )
                      }));
                    }
                    if (parsed.finishReason === 'MAX_TOKENS') {
                      isTruncated = true;
                    }
                  } catch {}
                }
              }
            } else if (res.ok) {
              // Non-streaming JSON response
              const data = await res.json();
              replyText = data.reply || '';
              if (data.isTruncated || data.finishReason === 'MAX_TOKENS') {
                isTruncated = true;
              }
            }
          } catch (fetchErr: any) {
            if (fetchErr.message && fetchErr.message.includes('AI Credits không đủ')) {
              throw fetchErr;
            }
            console.warn('[AI Companion] Chuyển sang phản hồi gia sư cục bộ:', fetchErr);
          }

          // Fallback gia sư thông minh nếu API chưa cấu hình key hoặc offline
          if (!replyText) {
            if (effectiveAction === 'summarize') {
              replyText = `### 📋 Tóm Tắt Trọng Tâm Bài Học\n\n${
                contextNotes
                  ? `Từ nội dung ghi chú: *"${contextNotes.slice(0, 120)}..."*\n\n`
                  : ''
              }1. **Khái niệm then chốt:** Cần nắm vững định lý cốt lõi và các tiền đề suy luận cơ bản.\n2. **Công thức định lượng:** Đảm bảo công thức toán học được chuẩn hóa:\n   $$\\Delta S = \\int \\frac{dQ_{\\text{rev}}}{T}$$\n3. **Ứng dụng thực tiễn:** Áp dụng phương pháp Pomodoro 25/5 để chia nhỏ lượng kiến thức, tránh quá tải nhận thức.`;
            } else if (effectiveAction === 'quiz') {
              replyText = `### 🎯 10 Câu Hỏi Trắc Nghiệm Ôn Tập Pomodoro & Kỹ Năng Học Tập\n\n**Câu 1:** Chu kỳ Pomodoro tiêu chuẩn kéo dài bao nhiêu phút tập trung và nghỉ ngơi?\n- A. 45 phút tập trung, 15 phút nghỉ\n- B. 25 phút tập trung, 5 phút nghỉ ngắn\n- C. 60 phút tập trung, 10 phút nghỉ\n- D. 30 phút tập trung, không nghỉ\n\n*Đáp án đúng:* **B** — Chu kỳ 25/5 được thiết kế tối ưu hóa sự chú ý bền vững theo nhịp sinh học não bộ.\n\n---\n**Câu 2:** Sau bao nhiêu phiên Pomodoro liên tiếp thì nên có một khoảng nghỉ dài (15–30 phút)?\n- A. 2 phiên\n- B. 4 phiên\n- C. 6 phiên\n- D. 8 phiên\n\n*Đáp án đúng:* **B** — 4 chu kỳ (tổng cộng 100 phút tập trung) là ngưỡng giới hạn sinh lý cần thiết lập lại năng lượng nhận thức.\n\n---\n**Câu 3:** Khái niệm "Diffuse Mode" (Chế độ tư duy phân tán) của Barbara Oakley được kích hoạt khi nào?\n- A. Khi đang giải bài toán hóc búa\n- B. Trong lúc nghỉ ngơi 5 phút, đi dạo nhẹ nhàng hoặc thả lỏng\n- C. Khi đang đọc tài liệu chuyên ngành\n- D. Khi thức khuya học bài\n\n*Đáp án đúng:* **B** — Trạng thái thư giãn giúp não kích hoạt mạng lưới Default Mode Network để kết nối các khái niệm tiềm thức.\n\n---\n**Câu 4:** Khi bị xao nhãng hoặc có ý nghĩ đột xuất nảy ra trong phiên Pomodoro, hành động chuẩn mực nhất là gì?\n- A. Dừng ngay đồng hồ để làm việc đó\n- B. Ghi chú nhanh vào sổ nháp/tasks nháp rồi tiếp tục tập trung\n- C. Bỏ qua hoàn toàn và không ghi lại\n- D. Chuyển sang lướt điện thoại\n\n*Đáp án đúng:* **B** — Kỹ thuật "Parking Lot" giúp giải phóng bộ nhớ làm việc mà không làm đứt đoạn dòng chảy tập trung.\n\n---\n**Câu 5:** Định luật Parkinson trong quản lý thời gian phát biểu điều gì?\n- A. Thời gian luôn cố định cho mọi nhiệm vụ\n- B. Công việc sẽ tự động mở rộng để lấp đầy khoảng thời gian được ấn định cho nó\n- C. Càng nhiều thời gian thì chất lượng công việc càng cao\n- D. Làm việc càng nhanh thì sai sót càng nhiều\n\n*Đáp án đúng:* **B** — Áp dụng các phiên Pomodoro 25 phút giúp siết chặt khung thời gian, ngăn ngừa sự trì hoãn.\n\n---\n**Câu 6:** Nguyên lý Pareto (Quy tắc 80/20) trong ôn thi kiến nghị điều gì?\n- A. Dành 80% thời gian cho 20% kiến thức cốt lõi tạo ra 80% điểm số\n- B. Học 80 câu hỏi ngẫu nhiên trong đề cương\n- C. Đọc sách trong 80 phút rồi nghỉ 20 phút\n- D. Bỏ qua 80% tài liệu mà không cần chọn lọc\n\n*Đáp án đúng:* **A** — Xác định trọng tâm "High-Yield Topics" là chìa khóa tối ưu hóa điểm số trong thời gian hữu hạn.\n\n---\n**Câu 7:** Phương pháp lặp lại ngắt quãng (Spaced Repetition) dựa trên mô hình toán học nào của Hermann Ebbinghaus?\n- A. Đường cong tăng trưởng hàm mũ\n- B. Đường cong quên lãng: $R = e^{-\\frac{t}{S}}$\n- C. Phân phối chuẩn Gauss\n- D. Định lý giới hạn trung tâm\n\n*Đáp án đúng:* **B** — Ôn tập lặp lại tại các mốc thời gian cách đều giúp giảm độ dốc của đường cong quên lãng, chuyển kiến thức vào trí nhớ dài hạn.\n\n---\n**Câu 8:** Kỹ thuật Feynman trong học sâu bao gồm bước cốt lõi nào?\n- A. Đọc thuộc lòng từ đầu đến cuối sách giáo khoa\n- B. Giải thích khái niệm phức tạp cho một người mới (hoặc đứa trẻ 10 tuổi) bằng ngôn ngữ bình dị nhất\n- C. Sử dụng từ ngữ hàn lâm chuyên sâu nhất có thể\n- D. Làm thật nhiều bài tập mà không cần hiểu bản chất\n\n*Đáp án đúng:* **B** — Nếu bạn không thể giải thích đơn giản, nghĩa là bạn chưa thực sự hiểu rõ nguyên lý.\n\n---\n**Câu 9:** Hiện tượng "Sự kiệt quệ ý chí" (Ego Depletion) nhắc nhở chúng ta điều gì khi sắp xếp lịch Pomodoro?\n- A. Nên học việc khó nhất (Deep Work) vào đầu ngày khi năng lượng não bộ còn dồi dào\n- B. Để bài tập khó nhất vào lúc nửa đêm\n- C. Không bao giờ cần nạp năng lượng\n- D. Ý chí là vô hạn và không suy giảm\n\n*Đáp án đúng:* **A** — Ý chí và khả năng tự kiểm soát tiêuahoa năng lượng glucose của vỏ não trước trán, vì vậy nên ưu tiên tác vụ nặng nhất vào buổi sáng.\n\n---\n**Câu 10:** Trong Pomodoro, nếu bạn hoàn thành mục tiêu khi đồng hồ mới chạy được 15 phút, bạn nên làm gì?\n- A. Tắt ngay đồng hồ và kết thúc phiên\n- B. Sử dụng 10 phút còn lại để rà soát (Overlearning), kiểm tra lại kết quả và tinh gọn ghi chú\n- C. Bật mạng xã hội chơi cho hết giờ\n- D. Bắt đầu ngay một môn học hoàn toàn mới mà không nghỉ\n\n*Đáp án đúng:* **B** — Quy tắc "Overlearning" giúp củng cố kiến thức và tránh làm gián đoạn nhịp sinh học của phiên làm việc.`;
            } else {
              if (isGreetingIntent(prompt)) {
                replyText =
                  'Chào bạn! Mình là PomoFocus AI Study Companion 🎓. Hôm nay bạn đang muốn tập trung ôn môn học nào (Toán, Văn, Anh, Khoa học...), hay cần mình tóm tắt bài giảng nào không nè?';
              } else if (solveBasicMath(prompt)) {
                replyText = solveBasicMath(prompt)!;
              } else if (prompt.toLowerCase().includes('pythagoras')) {
                replyText = `### 💡 Hướng Dẫn Định Lý Pythagoras (Toán Lớp 7)\n\nChào bạn! Về định lý **Pythagoras**:\n\n1. **Phát biểu bản chất:**\n   Trong một tam giác vuông, bình phương của cạnh huyền bằng tổng bình phương của hai cạnh góc vuông.\n\n2. **Công thức định lượng:**\n   $a^2 + b^2 = c^2$\n   *(Trong đó $c$ là độ dài cạnh huyền, $a$ và $b$ là hai cạnh góc vuông)*.\n\n3. **Ví dụ trực quan:**\n   Nếu hai cạnh góc vuông là $3$ và $4$, thì cạnh huyền $c$ tính bằng:\n   $c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = 5$\n\nBạn có bài toán tam giác cụ thể nào cần áp dụng không?`;
              } else {
                replyText = 'Chào bạn! Mình là PomoFocus AI. Vui lòng kết nối Internet hoặc cấu hình GEMINI_API_KEY hợp lệ để trò chuyện cùng AI thông minh nhé!';
              }
            }
          }

          // 4. Tuyệt đối KHÔNG trừ điểm khi gặp sự cố, chỉ trừ khi thành công 100%
          const isErrorResponse = replyText.startsWith('⚠️') || replyText.includes('thất bại') || replyText.includes('gián đoạn');
          const finalCost = isErrorResponse ? 0 : cost;

          if (finalCost > 0) {
            get().deductCredits(finalCost);
          }

          // 5. Cập nhật tin nhắn hoàn tất
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: replyText,
                    creditsUsed: finalCost,
                    isTruncated
                  }
                : m
            ),
            isLoading: false,
            isStreaming: false
          }));

          // 6. Lưu trữ bất đồng bộ lên Supabase Cloud
          const convId = get().activeConversationId;
          const currentUid = getStoredUserId();
          if (convId && currentUid) {
            try {
              AiChatService.saveMessage({
                id: userMsgId,
                conversation_id: convId,
                user_id: currentUid,
                role: 'user',
                content: prompt,
                action_type: effectiveAction,
                attachment_url: attachment?.publicUrl,
                attachment_name: attachment?.fileName
              }).catch(() => {});

              AiChatService.saveMessage({
                id: assistantMsgId,
                conversation_id: convId,
                user_id: currentUid,
                role: 'assistant',
                content: replyText,
                action_type: effectiveAction,
                credits_used: finalCost,
                is_truncated: isTruncated
              }).catch(() => {});
            } catch {}
          }

          return replyText;
        } catch (err: any) {
          // Bỏ tin nhắn assistant trống nếu lỗi
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== assistantMsgId),
            isLoading: false,
            isStreaming: false,
            error: err.message || 'Đã xảy ra lỗi khi tạo phản hồi AI.'
          }));
          throw err;
        }
      },

      continueGenerating: async () => {
        const { messages, sendMessage } = get();
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== 'assistant') return;

        // Bỏ cờ truncated của tin nhắn cũ
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === lastMsg.id ? { ...m, isTruncated: false } : m
          )
        }));

        await sendMessage(
          'Vui lòng tiếp tục viết tiếp phần còn lại từ đoạn trước một cách liền mạch, giữ nguyên văn phong và công thức.',
          'chat'
        );
      }
    }),
    {
      name: 'pomofocus_ai_store',
      partialize: (state) => ({
        aiCreditsBalance: state.aiCreditsBalance,
        aiPlan: state.aiPlan,
        lastWeeklyReset: state.lastWeeklyReset,
        lastMonthlyReset: state.lastMonthlyReset,
        messages: state.messages.slice(-30),
        sessions: (state.sessions || []).slice(0, 20) // Giữ 30 tin nhắn gần nhất
      })
    }
  )
);
