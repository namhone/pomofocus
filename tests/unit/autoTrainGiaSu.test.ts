import { describe, it, expect, vi } from 'vitest';
import {
  TRAINING_DATASET,
  runAutoTuningPipeline,
  persistTunedModelId
} from '../../scripts/autoTrainGiaSu';
import aiCompanionHandler from '../../api/ai/companion';
import * as fs from 'fs';
import * as path from 'path';

describe('PomoFocus K-12 AI Companion — Automated Fine-Tuning Pipeline Unit Tests', () => {
  it('1. Đảm bảo đúng 75 cặp câu hỏi - câu trả lời chất lượng cao (15 Cấp 1, 20 Cấp 2, 25 Cấp 3, 15 Tóm tắt)', () => {
    expect(TRAINING_DATASET).toBeDefined();
    expect(TRAINING_DATASET.length).toBe(75);

    const counts = {
      cap_1: 0,
      cap_2: 0,
      cap_3: 0,
      summary: 0
    };

    for (const item of TRAINING_DATASET) {
      expect(item.textInput.trim().length).toBeGreaterThan(10);
      expect(item.output.trim().length).toBeGreaterThan(20);
      expect(item.gradeLevel).toBeTruthy();
      expect(item.subject).toBeTruthy();
      counts[item.category]++;
    }

    expect(counts.cap_1).toBe(15);
    expect(counts.cap_2).toBe(20);
    expect(counts.cap_3).toBe(25);
    expect(counts.summary).toBe(15);
  });

  it('2. Chứa các chuyên đề thi THPT & Chuyển cấp lấy cảm hứng từ VNHSGE (Hàm số, Điện xoay chiều, Este, Phân tích hình tượng)', () => {
    // 1. Toán hàm số
    const hamSo = TRAINING_DATASET.find((it) => it.textInput.includes('cực đại') || it.textInput.includes('giá trị lớn nhất'));
    expect(hamSo).toBeDefined();

    // 2. Vật lý điện xoay chiều
    const dienXoayChieu = TRAINING_DATASET.find((it) => it.textInput.includes('RLC') || it.textInput.includes('cộng hưởng'));
    expect(dienXoayChieu).toBeDefined();

    // 3. Hóa học este
    const este = TRAINING_DATASET.find((it) => it.textInput.includes('este') || it.textInput.includes('chất béo'));
    expect(este).toBeDefined();

    // 4. Ngữ văn phân tích hình tượng
    const vanHoc = TRAINING_DATASET.find((it) => it.textInput.includes('Tây Tiến') || it.textInput.includes('Vợ nhặt') || it.textInput.includes('Chiếc lược ngà'));
    expect(vanHoc).toBeDefined();
  });

  it('3. Các câu hỏi Toán, Lý, Hóa đều chứa định dạng ký hiệu chuẩn LaTeX ($...$ hoặc $$...$$)', () => {
    const mathPhysicsItems = TRAINING_DATASET.filter((it) =>
      ['Toán học', 'Giải tích', 'Đại số', 'Vật lý', 'Hình học Oxyz'].includes(it.subject)
    );

    expect(mathPhysicsItems.length).toBeGreaterThanOrEqual(20);
    for (const item of mathPhysicsItems) {
      const hasLatex = item.output.includes('$');
      expect(hasLatex).toBe(true);
    }
  });

  it('4. Hàm runAutoTuningPipeline chạy chế độ dryRun trả về kết quả thành công và thống kê chuẩn xác', async () => {
    const result = await runAutoTuningPipeline({ dryRun: true });

    expect(result.success).toBe(true);
    expect(result.datasetCount).toBe(75);
    expect(result.categories.cap_1).toBe(15);
    expect(result.categories.cap_2).toBe(20);
    expect(result.categories.cap_3).toBe(25);
    expect(result.categories.summary).toBe(15);
    expect(result.status).toBe('ACTIVE_SIMULATED');
    expect(result.modelId).toContain('tunedModels/');
  });

  it('5. Hàm persistTunedModelId tự động lưu hoặc cập nhật GEMINI_TUNED_MODEL_ID', () => {
    const envPath = path.resolve(process.cwd(), '.env');
    const originalEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : null;

    try {
      const testModelId = 'tunedModels/test-k12-pomofocus-model-1234';
      persistTunedModelId(testModelId);

      const updated = fs.readFileSync(envPath, 'utf-8');
      expect(updated).toContain(`GEMINI_TUNED_MODEL_ID="${testModelId}"`);
    } finally {
      if (originalEnv !== null) {
        fs.writeFileSync(envPath, originalEnv, 'utf-8');
      } else if (fs.existsSync(envPath)) {
        fs.unlinkSync(envPath);
      }
    }
  });

  it('6. API companion hỗ trợ biến môi trường GEMINI_TUNED_MODEL_ID và tự động fallback nếu cần', async () => {
    process.env.GEMINI_TUNED_MODEL_ID = 'tunedModels/pomofocus-gia-su-k12-v1';

    const req: any = {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Giải thích định lý Pythagoras cho học sinh lớp 7',
        actionType: 'chat',
        currentCredits: 20
      })
    };

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

    await aiCompanionHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.data.success).toBe(true);
    expect(res.data.reply).toBeTruthy();

    delete process.env.GEMINI_TUNED_MODEL_ID;
  });
});
