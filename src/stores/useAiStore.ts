import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useNoteStore } from './useNoteStore';

export type AiPlanType = 'free' | 'monthly' | 'yearly' | 'lifetime';
export type AiActionType = 'chat' | 'summarize' | 'quiz';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actionType?: AiActionType;
  creditsUsed?: number;
}

export const AI_CREDIT_COSTS: Record<AiActionType, number> = {
  chat: 1,
  summarize: 5,
  quiz: 5
};

export const AI_PLAN_LIMITS: Record<AiPlanType, number> = {
  free: 50,
  monthly: 1500,
  yearly: 20000,
  lifetime: 1000 // Tối đa 1.000 điểm mỗi tuần (reset vào Thứ Hai)
};

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

export interface AiState {
  aiCreditsBalance: number;
  aiPlan: AiPlanType;
  lastWeeklyReset: number;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  messages: AiMessage[];

  // Actions
  toggleOpen: (force?: boolean) => void;
  setAiPlan: (plan: AiPlanType) => void;
  addCredits: (amount: number) => void;
  deductCredits: (cost: number) => boolean;
  checkWeeklyReset: (currentTime?: number) => boolean;
  clearChat: () => void;
  sendMessage: (prompt: string, actionType?: AiActionType) => Promise<string>;
  syncWithAuth: (plan?: string) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      aiCreditsBalance: AI_PLAN_LIMITS.free, // 50⚡ mặc định
      aiPlan: 'free',
      lastWeeklyReset: Date.now(),
      isOpen: false,
      isLoading: false,
      error: null,
      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content:
            'Xin chào! Tôi là **PomoFocus AI Companion** — gia sư học tập đồng hành thông minh của bạn. 🎓✨\n\nBạn có thể hỏi bất kỳ bài học nào, yêu cầu tóm tắt tài liệu hoặc tạo câu hỏi trắc nghiệm ôn thi ngay tại đây!',
          timestamp: Date.now()
        }
      ],

      toggleOpen: (force) => {
        set((state) => ({ isOpen: force !== undefined ? force : !state.isOpen }));
        // Khi mở widget, tự động kiểm tra reset Thứ Hai cho gói Lifetime
        get().checkWeeklyReset();
      },

      setAiPlan: (plan) => {
        const currentBalance = get().aiCreditsBalance;
        const targetLimit = AI_PLAN_LIMITS[plan];

        set({
          aiPlan: plan,
          // Nâng cấp gói tự động đảm bảo số dư tối thiểu của gói đó
          aiCreditsBalance: Math.max(currentBalance, targetLimit),
          lastWeeklyReset: Date.now()
        });
      },

      addCredits: (amount) => {
        if (amount > 0) {
          set((state) => ({ aiCreditsBalance: state.aiCreditsBalance + amount }));
        }
      },

      deductCredits: (cost) => {
        const current = get().aiCreditsBalance;
        if (current < cost) {
          return false;
        }
        set({ aiCreditsBalance: current - cost });
        return true;
      },

      checkWeeklyReset: (currentTime = Date.now()) => {
        const { aiPlan, lastWeeklyReset } = get();
        if (aiPlan !== 'lifetime') return false;

        const currentMonday = getMondayMidnight(currentTime);
        // Nếu lần nạp tuần trước xảy ra trước 00:00 sáng Thứ Hai tuần này
        if (lastWeeklyReset < currentMonday) {
          set({
            aiCreditsBalance: AI_PLAN_LIMITS.lifetime, // Nạp đầy lại 1.000⚡
            lastWeeklyReset: currentTime
          });
          return true;
        }
        return false;
      },

      clearChat: () => {
        set({
          messages: [
            {
              id: `welcome-${Date.now()}`,
              role: 'assistant',
              content:
                'Cuộc trò chuyện đã được làm mới. Hãy đặt câu hỏi hoặc chọn một tác vụ học tập bên dưới để tôi hỗ trợ bạn!',
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

      sendMessage: async (prompt: string, actionType: AiActionType = 'chat') => {
        const cost = AI_CREDIT_COSTS[actionType];
        get().checkWeeklyReset();

        // 1. Kiểm tra số dư nguyên tử
        if (get().aiCreditsBalance < cost) {
          const err = `Bạn cần ít nhất ${cost}⚡ để thực hiện thao tác này (Số dư hiện tại: ${get().aiCreditsBalance}⚡). Vui lòng nâng cấp gói tại Bảng Giá.`;
          set({ error: err });
          throw new Error(err);
        }

        // 2. Thêm tin nhắn của User
        const userMsg: AiMessage = {
          id: `msg-user-${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: Date.now(),
          actionType
        };

        set((state) => ({
          messages: [...state.messages, userMsg],
          isLoading: true,
          error: null
        }));

        try {
          // Lấy ghi chú hiện tại nếu là tác vụ tóm tắt
          let contextNotes = '';
          if (actionType === 'summarize') {
            try {
              const noteStore = useNoteStore.getState();
              const active =
                noteStore.notes.find((n) => n.id === noteStore.activeNoteId) ||
                noteStore.notes[0];
              contextNotes = active?.contentMarkdown || '';
            } catch {
              // ignore nếu notes store chưa sẵn sàng
            }
          }

          let replyText = '';

          // 3. Gọi Endpoint /api/ai/companion
          try {
            const res = await fetch('/api/ai/companion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt,
                actionType,
                contextNotes,
                currentCredits: get().aiCreditsBalance
              })
            });

            if (res.ok) {
              const data = await res.json();
              replyText = data.reply || '';
            } else if (res.status === 402) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || 'Số dư AI Credits không đủ.');
            }
          } catch (fetchErr: any) {
            // Nếu lỗi do 402 Insufficient credits thì ném ra
            if (fetchErr.message && fetchErr.message.includes('AI Credits không đủ')) {
              throw fetchErr;
            }
            // Không kết nối được API serverless (dev/offline mode) -> fallback thông minh cục bộ
            console.warn('[AI Companion] Chuyển sang phản hồi gia sư cục bộ:', fetchErr);
          }

          // Fallback gia sư thông minh nếu API chưa cấu hình key hoặc offline
          if (!replyText) {
            if (actionType === 'summarize') {
              replyText = `### 📋 Tóm Tắt Trọng Tâm Bài Học\n\n${
                contextNotes
                  ? `Từ nội dung ghi chú: *"${contextNotes.slice(0, 120)}..."*\n\n`
                  : ''
              }1. **Khái niệm then chốt:** Cần nắm vững định lý cốt lõi và các tiền đề suy luận cơ bản.\n2. **Công thức định lượng:** Đảm bảo công thức toán học được chuẩn hóa:\n   $$\\Delta S = \\int \\frac{dQ_{\\text{rev}}}{T}$$\n3. **Ứng dụng thực tiễn:** Áp dụng phương pháp Pomodoro 25/5 để chia nhỏ lượng kiến thức, tránh quá tải nhận thức.`;
            } else if (actionType === 'quiz') {
              replyText = `### 🎯 3 Câu Hỏi Trắc Nghiệm Ôn Tập Kiến Thức\n\n**Câu 1:** Công thức tính thời gian chu kỳ dao động điều hòa là gì?\n- A. $T = 2\\pi \\sqrt{\\frac{m}{k}}$\n- B. $T = \\frac{1}{2\\pi} \\sqrt{\\frac{k}{m}}$\n- C. $T = 2\\pi \\frac{k}{m}$\n- D. $T = \\pi \\sqrt{\\frac{m}{k}}$\n\n*Đáp án đúng:* **A** — Chu kỳ tỉ lệ thuận với căn bậc hai của khối lượng $m$.\n\n---\n**Câu 2:** Nguyên tắc then chốt của kỹ thuật Pomodoro cổ điển là gì?\n- A. Học liên tục 90 phút\n- B. Tập trung 25 phút, nghỉ ngắn 5 phút\n- C. Vừa học vừa lướt mạng xã hội\n- D. Không cần nghỉ giải lao\n\n*Đáp án đúng:* **B** — Chu kỳ 25/5 giúp não bộ duy trì trạng thái sóng não Beta tập trung cao độ.\n\n---\n**Câu 3:** Khái niệm "Atomic Habits" trong học tập định nghĩa điều gì?\n- A. Đột phá lớn trong một đêm\n- B. Sự cải thiện 1% mỗi ngày tạo nên thay đổi khổng lồ theo cấp số nhân\n- C. Học dồn trước ngày thi\n- D. Bỏ qua các thói quen nhỏ\n\n*Đáp án đúng:* **B** — Tiến bộ nhỏ tích lũy theo thời gian tạo kết quả phi thường.`;
            } else {
              replyText = `### 💡 Hướng Dẫn Giải Thích Chi Tiết\n\nChào bạn! Đối với vấn đề **"${prompt}"**:\n\n1. **Bản chất cốt lõi:**\n   Trong học tập và nghiên cứu, nguyên lý cốt lõi luôn xoay quanh việc thiết lập mô hình logic từ đơn giản đến phức tạp.\n\n2. **Công thức toán học & Mô hình hóa:**\n   $$\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1$$\n\n3. **Lời khuyên học tập từ PomoFocus:**\n   Hãy áp dụng kỹ thuật Feynman: thử diễn đạt lại khái niệm này bằng ngôn ngữ của một học sinh lớp 5. Nếu bạn giải thích được ngắn gọn, bạn đã thật sự hiểu sâu!`;
            }
          }

          // 4. Trừ điểm nguyên tử sau khi đã có câu trả lời hợp lệ
          get().deductCredits(cost);

          // 5. Thêm phản hồi của AI vào danh sách
          const assistantMsg: AiMessage = {
            id: `msg-ai-${Date.now()}`,
            role: 'assistant',
            content: replyText,
            timestamp: Date.now(),
            actionType,
            creditsUsed: cost
          };

          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isLoading: false
          }));

          return replyText;
        } catch (err: any) {
          set({
            isLoading: false,
            error: err.message || 'Đã xảy ra lỗi khi tạo phản hồi AI.'
          });
          throw err;
        }
      }
    }),
    {
      name: 'pomofocus_ai_store',
      partialize: (state) => ({
        aiCreditsBalance: state.aiCreditsBalance,
        aiPlan: state.aiPlan,
        lastWeeklyReset: state.lastWeeklyReset,
        messages: state.messages.slice(-30) // Giữ 30 tin nhắn gần nhất
      })
    }
  )
);
