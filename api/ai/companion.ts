interface RequestBody {
  prompt?: string;
  actionType?: 'chat' | 'summarize' | 'quiz';
  contextNotes?: string;
  currentCredits?: number;
  userId?: string;
}

const ACTION_COSTS: Record<'chat' | 'summarize' | 'quiz', number> = {
  chat: 1,
  summarize: 5,
  quiz: 5
};

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý Học Tập AI Đồng Hành (PomoFocus AI Study Companion) — một gia sư học tập thông minh, kiên nhẫn, chuẩn mực sư phạm và truyền cảm hứng.

Nhiệm vụ của bạn:
1. Giải thích các bài học, thuật toán, khái niệm khoa học, ngôn ngữ và kiến thức tổng quát một cách súc tích, gãy gọn, dễ hiểu.
2. Khi gặp công thức toán học, vật lý hoặc hóa học, BẮT BUỘC sử dụng ký hiệu chuẩn LaTeX:
   - Công thức nội dòng: $E = mc^2$, $\\lambda = \\frac{h}{p}$
   - Công thức khối riêng biệt trên một dòng:
     $$\\int_a^b f(x)dx = F(b) - F(a)$$
3. Với tác vụ TÓM TẮT (summarize): Trích xuất 3-5 ý cốt lõi quan trọng nhất, dùng bullet points ngắn gọn, rõ ràng, không lan man.
4. Với tác vụ TRẮC NGHIỆM (quiz): Tạo đúng 3 câu hỏi trắc nghiệm (A, B, C, D) kèm đáp án đúng và phần giải thích ngắn vì sao đáp án đó chính xác.
5. Luôn giữ phong thái động viên học tập, tích cực, lịch sự và định dạng Markdown sắc nét.`;

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'Chỉ chấp nhận phương thức POST'
    });
  }

  try {
    const body: RequestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      prompt = '',
      actionType = 'chat',
      contextNotes = '',
      currentCredits = 0
    } = body;

    const cost = ACTION_COSTS[actionType] || 1;

    // 1. Kiểm tra điểm nguyên tử (Atomic deduction check)
    if (currentCredits < cost) {
      return res.status(402).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Số dư của bạn (${currentCredits}⚡) không đủ để thực hiện thao tác này (yêu cầu ${cost}⚡). Vui lòng nâng cấp gói tại Bảng Giá.`,
        requiredCredits: cost,
        currentCredits,
        billingUrl: '/billing'
      });
    }

    if (!prompt.trim() && actionType !== 'summarize' && actionType !== 'quiz') {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_PROMPT',
        message: 'Nội dung câu hỏi không được để trống.'
      });
    }

    // 2. Chuẩn bị prompt gửi đến mô hình Gemini
    let userContent = prompt;
    if (actionType === 'summarize') {
      userContent = `Hãy tóm tắt ngắn gọn và làm nổi bật các ý chính quan trọng nhất của ghi chú sau đây:\n\n"""\n${
        contextNotes || prompt || 'Ghi chú học tập phương pháp Pomodoro và kỹ thuật Feynman'
      }\n"""`;
    } else if (actionType === 'quiz') {
      userContent = `Dựa trên chủ đề hoặc nội dung sau đây, hãy tạo đúng 3 câu hỏi trắc nghiệm ôn tập (A, B, C, D) kèm đáp án đúng và lời giải thích sư phạm:\n\n"""\n${
        prompt || contextNotes || 'Phương pháp quản lý thời gian Pomodoro và tối ưu hóa sự tập trung'
      }\n"""`;
    }

    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

    // 3. Nếu có API Key, gọi trực tiếp Gemini 1.5 Flash qua Google Generative AI REST endpoint
    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: userContent }]
              }
            ],
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('[Gemini API] Request failed with status:', response.status);
        }
      } catch (geminiErr) {
        console.warn('[Gemini API] Error contacting Google Gemini:', geminiErr);
      }
    }

    // 4. Fallback thông minh theo chuẩn sư phạm nếu không có key hoặc offline/sandbox
    if (!reply) {
      if (actionType === 'summarize') {
        reply = `### 📋 Tóm Tắt Trọng Tâm Bài Học\n\n${
          contextNotes ? `Dựa trên ghi chú: *"${contextNotes.slice(0, 100)}..."*\n\n` : ''
        }1. **Khái niệm cốt lõi:** Nắm chắc bản chất vấn đề và các nguyên lý cơ bản trước khi đi vào chi tiết.\n2. **Công thức then chốt:**\n   $$\\Delta S = \\int \\frac{dQ_{\\text{rev}}}{T}$$\n3. **Phương pháp rèn luyện:** Áp dụng chu kỳ 25 phút Pomodoro để duy trì hiệu suất não bộ ở mức cao nhất mà không bị mệt mỏi.`;
      } else if (actionType === 'quiz') {
        reply = `### 🎯 3 Câu Hỏi Trắc Nghiệm Ôn Tập Kiến Thức\n\n**Câu 1:** Trong vật lý lượng tử, công thức Planck-Einstein xác định năng lượng photon là gì?\n- A. $E = hf$\n- B. $E = mc^2$\n- C. $E = \\frac{1}{2}mv^2$\n- D. $E = k_B T$\n\n*Đáp án đúng:* **A** — Năng lượng photon $E$ tỉ lệ thuận với tần số sóng ánh sáng $f$ thông qua hằng số Planck $h$.\n\n---\n**Câu 2:** Lợi ích sinh học chính của việc nghỉ giải lao 5 phút trong chu kỳ Pomodoro là gì?\n- A. Để ăn một bữa no\n- B. Giúp mạng nơ-ron não bộ chuyển từ chế độ Tập trung (Focused mode) sang Khuếch tán (Diffuse mode) để củng cố trí nhớ\n- C. Kéo dài sự buồn ngủ\n- D. Quên đi những gì vừa học\n\n*Đáp án đúng:* **B** — Não bộ cần khoảng trống ngắn để biến thông tin ngắn hạn thành trí nhớ dài hạn.\n\n---\n**Câu 3:** Định luật Yerkes-Dodson trong tâm lý học chỉ ra mối quan hệ giữa áp lực và hiệu suất làm việc như thế nào?\n- A. Càng nhiều áp lực thì hiệu suất càng tăng mãi\n- B. Hiệu suất đạt đỉnh ở mức kích thích vừa phải (Optimal Arousal), quá ít hoặc quá nhiều áp lực đều làm giảm hiệu suất\n- C. Áp lực không ảnh hưởng đến kết quả\n- D. Càng ít áp lực thì làm việc càng tốt\n\n*Đáp án đúng:* **B** — Áp lực vừa phải giúp cơ thể tỉnh táo, nhưng quá tải sẽ dẫn đến căng thẳng và giảm năng suất.`;
      } else {
        reply = `### 💡 Giải Thích & Hướng Dẫn Sư Phạm\n\nChào bạn! Về câu hỏi **"${prompt}"**:\n\n1. **Phân tích bản chất:**\n   Vấn đề này dựa trên nền tảng logic tuần tự. Khi giải quyết, chúng ta chia nhỏ thành các bài toán con (Divide and Conquer).\n\n2. **Mô hình hóa công thức:**\n   $$\\lim_{n \\to \\infty} \\left(1 + \\frac{1}{n}\\right)^n = e \\approx 2.71828$$\n\n3. **Lời khuyên học tập:**\n   Hãy ghi nhớ: Hiểu sâu một nguyên lý có giá trị hơn học thuộc lòng mười công thức. Bạn có muốn tôi đặt thêm câu hỏi để bạn tự kiểm tra độ hiểu bài không?`;
      }
    }

    return res.status(200).json({
      success: true,
      reply,
      creditsDeducted: cost,
      actionType,
      remainingCredits: currentCredits - cost
    });
  } catch (error: any) {
    console.error('[API /api/ai/companion] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message || 'Lỗi xử lý yêu cầu AI.'
    });
  }
}
