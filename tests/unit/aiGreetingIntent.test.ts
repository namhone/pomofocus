import { describe, it, expect } from 'vitest';
import { isGreetingIntent } from '../../src/stores/useAiStore';
import { isGreetingIntent as isApiGreetingIntent } from '../../api/ai/companion';

describe('AI Companion Greeting Intent Detection', () => {
  const commonGreetings = [
    'xin chào',
    'chào bạn',
    'chào bạn!',
    'hi',
    'hello',
    'alo',
    'ê',
    'chào',
    'hey',
    'helo',
    'chào b',
    'chào em',
    'chào thầy',
    'chào cô',
    'hế lô',
    'hi bạn',
    'chào bạn nhé'
  ];

  it('phải nhận diện chính xác tất cả các biến thể câu chào hỏi phổ biến', () => {
    for (const g of commonGreetings) {
      expect(isGreetingIntent(g)).toBe(true);
      expect(isApiGreetingIntent(g)).toBe(true);
    }
  });

  it('không được nhầm lẫn câu hỏi học tập với câu chào hỏi', () => {
    const studyQuestions = [
      'Giải thích định lý Pythagoras cho học sinh lớp 7',
      'Công thức tính gia tốc hướng tâm là gì?',
      'Tóm tắt bài thơ Đất Nước của Nguyễn Khoa Điềm',
      'Cách giải phương trình bậc hai $ax^2 + bx + c = 0$',
      'Tạo 10 câu trắc nghiệm ôn tập Pomodoro'
    ];

    for (const q of studyQuestions) {
      expect(isGreetingIntent(q)).toBe(false);
      expect(isApiGreetingIntent(q)).toBe(false);
    }
  });
});
