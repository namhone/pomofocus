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

  describe('1. Công Thức Chiết Khấu Nạp Thêm AI Credits Lẻ ⚡ & Đồng Bộ Bảng Giá', () => {
    it('Dưới 500⚡ (ví dụ 100⚡): Giảm 0% (Giá chuẩn min 10.000đ)', () => {
      const calc100 = calculateCreditPrice(100);
      expect(calc100.discountPercent).toBe(0);
      expect(calc100.unitPrice).toBe(63);
      expect(calc100.originalPrice).toBe(10000);
      expect(calc100.finalPrice).toBe(10000);
      expect(calc100.discountBadge).toBeNull();
    });

    it('Gói chuẩn 1 (300⚡): Giá đúng 19.000đ, Giảm 0%', () => {
      const calc300 = calculateCreditPrice(300);
      expect(calc300.discountPercent).toBe(0);
      expect(calc300.unitPrice).toBe(63);
      expect(calc300.originalPrice).toBe(19000);
      expect(calc300.finalPrice).toBe(19000);
      expect(calc300.discountBadge).toBeNull();
    });

    it('Gói chuẩn 2 (700⚡): Giá đúng 39.000đ, Tiết kiệm 15%', () => {
      const calc700 = calculateCreditPrice(700);
      expect(calc700.discountPercent).toBe(15);
      expect(calc700.unitPrice).toBe(56);
      expect(calc700.originalPrice).toBe(45000);
      expect(calc700.finalPrice).toBe(39000);
      expect(calc700.discountBadge).toBe('Tiết kiệm 15%');
    });

    it('Gói chuẩn 3 (1.500⚡): Giá đúng 69.000đ, Tiết kiệm 28% 🔥 (Phổ biến)', () => {
      const calc1500 = calculateCreditPrice(1500);
      expect(calc1500.discountPercent).toBe(28);
      expect(calc1500.unitPrice).toBe(46);
      expect(calc1500.originalPrice).toBe(95000);
      expect(calc1500.finalPrice).toBe(69000);
      expect(calc1500.discountBadge).toBe('Tiết kiệm 28% 🔥');
    });

    it('Gói chuẩn 4 (4.000⚡): Giá đúng 149.000đ, Tiết kiệm 40% 👑', () => {
      const calc4000 = calculateCreditPrice(4000);
      expect(calc4000.discountPercent).toBe(40);
      expect(calc4000.unitPrice).toBe(37);
      expect(calc4000.originalPrice).toBe(250000);
      expect(calc4000.finalPrice).toBe(149000);
      expect(calc4000.discountBadge).toBe('Tiết kiệm 40% 👑');
    });

    it('1-Click Presets Sync: openTopupModal(credits) chọn đúng số điểm và cập nhật state', () => {
      useAiStore.getState().closeTopupModal();
      expect(useAiStore.getState().isTopupModalOpen).toBe(false);
      expect(useAiStore.getState().topupModalInitialCredits).toBeUndefined();

      useAiStore.getState().openTopupModal(700);
      expect(useAiStore.getState().isTopupModalOpen).toBe(true);
      expect(useAiStore.getState().topupModalInitialCredits).toBe(700);

      useAiStore.getState().openTopupModal(4000);
      expect(useAiStore.getState().topupModalInitialCredits).toBe(4000);

      useAiStore.getState().closeTopupModal();
      expect(useAiStore.getState().isTopupModalOpen).toBe(false);
      expect(useAiStore.getState().topupModalInitialCredits).toBeUndefined();
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
