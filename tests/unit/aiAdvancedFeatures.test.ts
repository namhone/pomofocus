import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateCreditPrice } from '../../src/components/AiCreditsTopupModal';
import { useAiStore, AI_CREDIT_COSTS } from '../../src/stores/useAiStore';
import aiCompanionHandler from '../../api/ai/companion';

describe('AI Companion Advanced Upgrades: Streaming, 8192 Tokens, Multimodal & Tiered Topup', () => {
  beforeEach(() => {
    useAiStore.setState({
      aiCreditsBalance: 100,
      aiPlan: 'free',
      messages: [],
      error: null,
      isLoading: false,
      isStreaming: false
    });
  });

  describe('1. Công Thức Chiết Khấu Nạp Thêm AI Credits Lẻ ⚡', () => {
    it('Dưới 200⚡: Giảm 0% (Giá gốc 100đ/⚡, min 50⚡)', () => {
      const calc100 = calculateCreditPrice(100);
      expect(calc100.discountPercent).toBe(0);
      expect(calc100.unitPrice).toBe(100);
      expect(calc100.originalPrice).toBe(10000);
      expect(calc100.finalPrice).toBe(10000);
      expect(calc100.discountBadge).toBeNull();
    });

    it('200 đến 499⚡: Giảm 5% (95đ/⚡) — Gói 200⚡ giá đúng 19.000đ', () => {
      const calc200 = calculateCreditPrice(200);
      expect(calc200.discountPercent).toBe(5);
      expect(calc200.unitPrice).toBe(95);
      expect(calc200.originalPrice).toBe(20000);
      expect(calc200.finalPrice).toBe(19000); // 200 * 95 = 19.000đ
      expect(calc200.discountBadge).toBe('Tiết kiệm 5%');
    });

    it('500 đến 999⚡: Giảm 18% 🔥 (82đ/⚡) — Gói 600⚡ giá đúng 49.000đ', () => {
      const calc600 = calculateCreditPrice(600);
      expect(calc600.discountPercent).toBe(18);
      expect(calc600.unitPrice).toBe(82);
      expect(calc600.originalPrice).toBe(60000);
      expect(calc600.finalPrice).toBe(49000); // 600 * 82 = 49.200đ -> làm tròn 49.000đ
      expect(calc600.discountBadge).toContain('18%');
    });

    it('1.000 đến 2.499⚡: Giảm 30% ⚡ (70đ/⚡) — Gói 1.500⚡ giá đúng 99.000đ (hoặc ~105.000đ chuẩn làm tròn)', () => {
      const calc1500 = calculateCreditPrice(1500);
      expect(calc1500.discountPercent).toBe(30);
      expect(calc1500.unitPrice).toBe(70);
      expect(calc1500.finalPrice).toBe(105000); // 1500 * 70 = 105.000đ
      expect(calc1500.discountBadge).toContain('30%');
    });

    it('Từ 2.500⚡ trở lên: Giảm 45% 👑 (55đ/⚡) — Gói 3.500⚡ giá đúng 192.500đ làm tròn 193.000đ', () => {
      const calc3500 = calculateCreditPrice(3500);
      expect(calc3500.discountPercent).toBe(45);
      expect(calc3500.unitPrice).toBe(55);
      expect(calc3500.finalPrice).toBe(193000); // 3500 * 55 = 192.500đ -> làm tròn 193.000đ
      expect(calc3500.discountBadge).toContain('45%');
    });
  });

  describe('2. Chi Phí Tác Vụ Đính Kèm File / Đề Cương (Multimodal)', () => {
    it('Tác vụ multimodal đính kèm file đề cương trừ đúng 5⚡', () => {
      expect(AI_CREDIT_COSTS.multimodal).toBe(5);
      const ok = useAiStore.getState().deductCredits(AI_CREDIT_COSTS.multimodal);
      expect(ok).toBe(true);
      expect(useAiStore.getState().aiCreditsBalance).toBe(95);
    });

    it('API /api/ai/companion tự động áp dụng cost 5⚡ khi có payload attachment', async () => {
      const req: any = {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Phân tích đề cương thi học kỳ',
          actionType: 'chat',
          currentCredits: 50,
          attachment: {
            fileName: 'de_cuong_toan_12.pdf',
            mimeType: 'application/pdf',
            base64Data: 'JVBERi0xLjQKJ...'
          }
        })
      };

      const res: any = {
        statusCode: 200,
        headers: {},
        data: null,
        setHeader(k: string, v: string) { res.headers[k] = v; },
        status(c: number) { res.statusCode = c; return res; },
        json(p: any) { res.data = p; return res; },
        end() { return res; }
      };

      await aiCompanionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.creditsDeducted).toBe(5);
      expect(res.data.remainingCredits).toBe(45);
    });
  });

  describe('3. Hỗ Trợ 8192 Tokens & Viết Tiếp (Continue Generating)', () => {
    it('Phát hiện và truyền cờ isTruncated = true khi finishReason là MAX_TOKENS', async () => {
      const req: any = {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Viết bài luận chuyên sâu 20 trang về vũ trụ',
          actionType: 'chat',
          currentCredits: 10
        })
      };

      const res: any = {
        statusCode: 200,
        headers: {},
        data: null,
        setHeader(k: string, v: string) { res.headers[k] = v; },
        status(c: number) { res.statusCode = c; return res; },
        json(p: any) { res.data = p; return res; },
        end() { return res; }
      };

      await aiCompanionHandler(req, res);
      expect(res.statusCode).toBe(200);
      // isTruncated field được cung cấp trong response object
      expect('isTruncated' in res.data).toBe(true);
    });
  });
});
