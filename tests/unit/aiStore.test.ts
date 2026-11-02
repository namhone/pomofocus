import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useAiStore,
  AI_CREDIT_COSTS,
  AI_PLAN_LIMITS,
  getMondayMidnight,
  getMonthStart
} from '../../src/stores/useAiStore';
import aiCompanionHandler from '../../api/ai/companion';

describe('AI Study Companion & Wallet Credits Specification', () => {
  beforeEach(() => {
    // Reset state về giá trị mặc định ban đầu
    useAiStore.setState({
      aiCreditsBalance: 50,
      aiPlan: 'free',
      lastWeeklyReset: Date.now(),
      lastMonthlyReset: Date.now(),
      isOpen: false,
      isLoading: false,
      error: null,
      messages: []
    });
  });

  describe('1. Khởi tạo Ví Điểm AI & Trừ Điểm Nguyên Tử (Atomic Deduction)', () => {
    it('Mặc định tài khoản Free có 50⚡ credits ban đầu', () => {
      const state = useAiStore.getState();
      expect(state.aiCreditsBalance).toBe(50);
      expect(state.aiPlan).toBe('free');
    });

    it('Trừ đúng 1⚡ cho tác vụ Hỏi bài / Chat giải thích', () => {
      const ok = useAiStore.getState().deductCredits(AI_CREDIT_COSTS.chat);
      expect(ok).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(49);
    });

    it('Trừ đúng 5⚡ cho tác vụ Tóm tắt ghi chú và 10⚡ cho Tạo 10 câu trắc nghiệm', () => {
      const ok1 = useAiStore.getState().deductCredits(AI_CREDIT_COSTS.summarize);
      expect(ok1).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(45);

      const ok2 = useAiStore.getState().deductCredits(AI_CREDIT_COSTS.quiz);
      expect(ok2).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(35);
    });

    it('Ngăn chặn trừ điểm âm: Nếu số dư < chi phí, từ chối giao dịch nguyên tử', () => {
      useAiStore.setState({ aiCreditsBalance: 8 });

      // Cố gắng trừ 10⚡ cho quiz khi chỉ còn 8⚡
      const ok = useAiStore.getState().deductCredits(AI_CREDIT_COSTS.quiz);
      expect(ok).toBe(false);
      // Số dư phải giữ nguyên 8⚡, không bị trừ âm
      expect(useAiStore.getState().aiCreditsBalance).toBe(8);
    });

    it('Nạp thêm điểm thủ công (addCredits) cộng dồn chính xác', () => {
      useAiStore.getState().addCredits(100);
      expect(useAiStore.getState().aiCreditsBalance).toBe(150);
    });
  });

  describe('2. Phân Cấp Gói Dịch Vụ & Mức Trần Credits', () => {
    it('Nâng cấp lên gói Tháng (monthly) cấp ít nhất 1.500⚡', () => {
      useAiStore.getState().setAiPlan('monthly');
      const state = useAiStore.getState();
      expect(state.aiPlan).toBe('monthly');
      expect(state.aiCreditsBalance).toBeGreaterThanOrEqual(AI_PLAN_LIMITS.monthly);
      expect(state.aiCreditsBalance).toBe(1500);
    });

    it('Nâng cấp lên gói Năm (yearly) cấp ít nhất 20.000⚡', () => {
      useAiStore.getState().setAiPlan('yearly');
      const state = useAiStore.getState();
      expect(state.aiPlan).toBe('yearly');
      expect(state.aiCreditsBalance).toBe(20000);
    });

    it('Nâng cấp lên gói Trọn Đời (lifetime) cấp 1.000⚡/tuần', () => {
      useAiStore.getState().setAiPlan('lifetime');
      const state = useAiStore.getState();
      expect(state.aiPlan).toBe('lifetime');
      expect(state.aiCreditsBalance).toBe(1000);
    });
  });

  describe('3. Cơ Chế Reset Tuần Cho Gói Trọn Đời (Lifetime Founder)', () => {
    it('Hàm getMondayMidnight xác định chính xác 00:00:00 sáng Thứ Hai', () => {
      // Giả sử mốc thời gian là Thứ Tư 14:30:00 ngày 04/11/2026
      const wednesday = new Date('2026-11-04T14:30:00Z');
      const mondayMidnight = getMondayMidnight(wednesday.getTime());
      const mondayDate = new Date(mondayMidnight);

      expect(mondayDate.getDay()).toBe(1); // 1 = Thứ Hai
      expect(mondayDate.getHours()).toBe(0);
      expect(mondayDate.getMinutes()).toBe(0);
      expect(mondayDate.getSeconds()).toBe(0);
    });

    it('Nạp đầy lại 1.000⚡ khi đã bước qua 00:00 Thứ Hai đầu tuần', () => {
      // Thiết lập gói Lifetime, số dư đã dùng còn 200⚡
      // Lần nạp trước là Thứ Sáu tuần trước (ví dụ 30/10/2026)
      const fridayLastWeek = new Date('2026-10-30T10:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'lifetime',
        aiCreditsBalance: 200,
        lastWeeklyReset: fridayLastWeek
      });

      // Thời điểm hiện tại là Thứ Hai tuần sau lúc 08:00 sáng (02/11/2026)
      const mondayThisWeek = new Date('2026-11-02T08:00:00').getTime();

      const wasReset = useAiStore.getState().checkWeeklyReset(mondayThisWeek);

      expect(wasReset).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(1000); // Đã nạp đầy 1.000⚡
      expect(useAiStore.getState().lastWeeklyReset).toBe(mondayThisWeek);
    });

    it('KHÔNG nạp lại nếu vẫn ở trong cùng tuần (giữa tuần)', () => {
      // Lần nạp là Thứ Hai tuần này lúc 01:00 sáng
      const mondayMorning = new Date('2026-11-02T01:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'lifetime',
        aiCreditsBalance: 850,
        lastWeeklyReset: mondayMorning
      });

      // Thời điểm hiện tại là Thứ Năm tuần này lúc 15:00 chiều
      const thursdayAfternoon = new Date('2026-11-05T15:00:00').getTime();

      const wasReset = useAiStore.getState().checkWeeklyReset(thursdayAfternoon);

      expect(wasReset).toBe(false);
      // Số dư không bị nạp đè, giữ nguyên 850⚡
      expect(useAiStore.getState().aiCreditsBalance).toBe(850);
    });

    it('Tài khoản Free hoặc Monthly KHÔNG bị tự động reset về 1000 vào Thứ Hai', () => {
      const pastTime = new Date('2026-10-25T10:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'free',
        aiCreditsBalance: 25,
        lastWeeklyReset: pastTime
      });

      const mondayTime = new Date('2026-11-02T08:00:00').getTime();
      const wasReset = useAiStore.getState().checkWeeklyReset(mondayTime);

      expect(wasReset).toBe(false);
      expect(useAiStore.getState().aiCreditsBalance).toBe(25);
    });
  });

  describe('3B. Cơ Chế Reset Hàng Tháng Cho Tài Khoản Free (Monthly Free Reset)', () => {
    it('Hàm getMonthStart xác định chính xác 00:00:00 ngày 1 đầu tháng', () => {
      const midMonth = new Date('2026-11-18T16:45:00Z').getTime();
      const monthStart = getMonthStart(midMonth);
      const startDate = new Date(monthStart);

      expect(startDate.getDate()).toBe(1);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);
    });

    it('Tự động nạp lại 50⚡ cho tài khoản Free khi bước sang tháng mới', () => {
      // Tháng 10 dùng hết còn 5⚡
      const octoberDate = new Date('2026-10-15T10:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'free',
        aiCreditsBalance: 5,
        lastMonthlyReset: octoberDate
      });

      // Thời điểm hiện tại là ngày 02 Tháng 11
      const novemberDate = new Date('2026-11-02T09:00:00').getTime();
      const wasReset = useAiStore.getState().checkMonthlyReset(novemberDate);

      expect(wasReset).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(50);
      expect(useAiStore.getState().lastMonthlyReset).toBe(novemberDate);
    });

    it('KHÔNG nạp lại cho Free nếu vẫn đang trong cùng tháng', () => {
      const novFirst = new Date('2026-11-01T08:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'free',
        aiCreditsBalance: 32,
        lastMonthlyReset: novFirst
      });

      const novFifteenth = new Date('2026-11-15T14:00:00').getTime();
      const wasReset = useAiStore.getState().checkMonthlyReset(novFifteenth);

      expect(wasReset).toBe(false);
      expect(useAiStore.getState().aiCreditsBalance).toBe(32);
    });

    it('Tài khoản PRO (Monthly/Yearly/Lifetime) KHÔNG bị reset về 50 bởi checkMonthlyReset', () => {
      const octDate = new Date('2026-10-10T10:00:00').getTime();
      useAiStore.setState({
        aiPlan: 'monthly',
        aiCreditsBalance: 1200,
        lastMonthlyReset: octDate
      });

      const novDate = new Date('2026-11-02T10:00:00').getTime();
      const wasReset = useAiStore.getState().checkMonthlyReset(novDate);

      expect(wasReset).toBe(false);
      expect(useAiStore.getState().aiCreditsBalance).toBe(1200);
    });
  });

  describe('4. Kiểm thử Endpoint API /api/ai/companion.ts', () => {
    function createMockRes() {
      const res: any = {
        statusCode: 200,
        headers: {},
        data: null,
        setHeader(k: string, v: string) {
          res.headers[k] = v;
        },
        status(code: number) {
          res.statusCode = code;
          return res;
        },
        json(payload: any) {
          res.data = payload;
          return res;
        },
        end() {
          return res;
        }
      };
      return res;
    }

    it('Từ chối với mã 402 INSUFFICIENT_CREDITS khi số dư <= 0 hoặc không đủ', async () => {
      const req: any = {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Giải thích định lý Pythagoras',
          actionType: 'chat',
          currentCredits: 0
        })
      };
      const res = createMockRes();

      await aiCompanionHandler(req, res);

      expect(res.statusCode).toBe(402);
      expect(res.data.success).toBe(false);
      expect(res.data.error).toBe('INSUFFICIENT_CREDITS');
      expect(res.data.billingUrl).toBe('/billing');
    });

    it('Xử lý thành công câu hỏi chat khi đủ credits, định dạng công thức LaTeX', async () => {
      const req: any = {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Khái niệm sóng dừng trong vật lý là gì?',
          actionType: 'chat',
          currentCredits: 50
        })
      };
      const res = createMockRes();

      await aiCompanionHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.creditsDeducted).toBe(1);
      expect(res.data.remainingCredits).toBe(49);
      expect(res.data.reply).toContain('$'); // Chứa công thức LaTeX
    });

    it('Xử lý thành công tác vụ tạo 10 câu hỏi trắc nghiệm ôn tập Pomodoro (quiz) tiêu hao 10⚡', async () => {
      const req: any = {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Tạo 10 câu trắc nghiệm về Pomodoro và Deep Work',
          actionType: 'quiz',
          currentCredits: 20
        })
      };
      const res = createMockRes();

      await aiCompanionHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.creditsDeducted).toBe(10);
      expect(res.data.remainingCredits).toBe(10);
      expect(res.data.reply).toContain('Câu 1:');
      expect(res.data.reply).toContain('Câu 5:');
      expect(res.data.reply).toContain('Câu 10:');
    });
  });
});
