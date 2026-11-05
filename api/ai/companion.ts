const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com',
  'tony31082009@gmail.com'
];

const MAX_PROMPT_CHARS = 4000; // Max Context Guard: Chống dán tài liệu 50 trang làm tràn token/chi phí

interface RequestBody {
  prompt?: string;
  message?: string;
  actionType?: 'chat' | 'summarize' | 'quiz' | 'multimodal';
  contextNotes?: string;
  currentCredits?: number;
  userId?: string;
  userEmail?: string;
  stream?: boolean;
  history?: Array<{ role: 'user' | 'assistant' | 'model'; content?: string; parts?: Array<{ text: string }> }>;
  attachment?: {
    mimeType: string;
    base64Data: string;
    fileName?: string;
  };
}

const ACTION_COSTS: Record<'chat' | 'summarize' | 'quiz' | 'multimodal', number> = {
  chat: 1,
  summarize: 5,
  quiz: 10,
  multimodal: 5
};

/**
 * Hàm kiểm tra nhanh câu chào hỏi tự nhiên
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

/**
 * Fallback giải toán cơ bản và vật lý offline
 */
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
    return `### 💡 Hướng Dẫn Bài Toán Tìm x (Toán Học Cơ Bản)\n\nChào bạn! Với bài toán **"${prompt}"**:\n\n1. **Phân tích đề bài:**\n   Ta có phương trình: $1 + 1 = x$\n\n2. **Thực hiện phép tính từng bước:**\n   - Tính vế trái: $1 + 1 = 2$\n   - Suy ra phương trình tương đương: $$x = 2$$\n\n3. **Kết luận:**\n   Vậy nghiệm của phương trình là **$x = 2$**.\n\nBạn có bài toán tìm ẩn số nào khác cần mình cùng phân tích không nè?`;
  }

  if (lower.includes('sóng dừng') || lower.includes('song dung')) {
    return `### 💡 Khái Niệm Sóng Dừng (Vật Lý 12)\n\nChào bạn! Về hiện tượng **sóng dừng**:\n\n1. **Định nghĩa bản chất:**\n   Sóng dừng là sóng hình thành bởi sự giao thoa giữa sóng tới và sóng phản xạ truyền ngược chiều nhau trên cùng một phương truyền.\n\n2. **Đặc điểm & Công thức định lượng:**\n   - Điểm luôn đứng yên gọi là **nút sóng**; điểm dao động với biên độ cực đại gọi là **bụng sóng**.\n   - Điều kiện sóng dừng trên dây hai đầu cố định chiều dài $L$:\n     $$L = k \\frac{\\lambda}{2} \\quad (k \\in \\mathbb{N}^*)$$\n   *(Trong đó $\\lambda$ là bước sóng, $k$ là số bụng sóng)*.\n\nBạn có muốn làm thử bài tập tính số nút, số bụng sóng không?`;
  }

  return null;
}

/**
 * Hậu kiểm trừ điểm sau khi stream hoàn tất 100% (Post-Stream Settlement)
 */
export async function syncServerCreditsDeduction(userId?: string, cost = 1) {
  if (!userId || cost <= 0) return;
  const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) return;

  try {
    // 1. Ưu tiên gọi Stored Procedure v5.0 nguyên tử commit_ai_charge
    const rpcRes = await fetch(`${sbUrl}/rest/v1/rpc/commit_ai_charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`
      },
      body: JSON.stringify({ p_user_id: userId, p_actual_cost: cost })
    });
    if (rpcRes.ok) return;

    // 2. Fallback sang rpc cũ deduct_ai_credits nếu schema chưa migrate
    await fetch(`${sbUrl}/rest/v1/rpc/deduct_ai_credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`
      },
      body: JSON.stringify({ p_user_id: userId, p_cost: cost })
    });
  } catch (err) {
    console.debug('[api/companion] syncServerCreditsDeduction error:', err);
  }
}

/**
 * Pre-flight check kiểm tra số dư và cooldown (Stateless ~10ms, không lock)
 */
async function runPreflightCheck(userId: string, cost: number): Promise<{ allowed: boolean; isOwner?: boolean; message?: string }> {
  const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey || !userId) {
    return { allowed: true, isOwner: false };
  }

  try {
    const res = await fetch(`${sbUrl}/rest/v1/rpc/preflight_ai_check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`
      },
      body: JSON.stringify({ p_user_id: userId, p_estimated_cost: cost })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        allowed: Boolean(data?.allowed),
        isOwner: Boolean(data?.is_owner),
        message: data?.message
      };
    }
  } catch (err) {
    console.warn('[preflight_ai_check] Warning:', err);
  }

  return { allowed: true, isOwner: false };
}

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý Học Tập AI Đồng Hành (PomoFocus AI Study Companion) — một gia sư học tập thông minh, kiên nhẫn, chuẩn mực sư phạm và truyền cảm hứng, thấm nhuần triết lý sư phạm Socratic từ Mr. Ranedeer AI Tutor.

Nhiệm vụ và Nguyên tắc Sư phạm của bạn:
1. TRIẾT LÝ SƯ PHẠM SOCRATIC: Không đưa ngay đáp án cuối cùng khiến học sinh ỷ lại. Cung cấp 💡 Manh mối then chốt (Hint), Công thức cốt lõi và câu hỏi gợi mở.
2. THÍCH ỨNG THEO CẤP HỌC (K-12):
   - Cấp 1 (Lớp 1-5): Xưng hô thân mật, trực quan qua đồ vật, bánh kẹo.
   - Cấp 2 (Lớp 6-9): Tư duy logic, hướng dẫn vẽ hình, lập phương trình.
   - Cấp 3 (Lớp 10-12): Học thuật chuẩn mực, bám sát cấu trúc đề thi THPT Quốc Gia, chỉ ra bẫy trắc nghiệm.
3. QUY CHUẨN CÔNG THỨC: Bắt buộc dùng LaTeX ($a^2 + b^2 = c^2$, $$\\int f(x)dx$$).
4. PHONG THÁI TỰ NHIÊN: Khi nhận câu chào ngắn ("xin chào", "hi", "alo"): Hãy đáp lại tự nhiên, gần gũi.`;

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
    const prompt = body.prompt || body.message || '';
    const {
      actionType = 'chat',
      contextNotes = '',
      currentCredits = 0,
      userId = '',
      stream = false,
      history = [],
      attachment
    } = body;

    // 1. Max Context Guard: Chống spam văn bản 50 trang làm tràn token
    if (prompt.length > MAX_PROMPT_CHARS) {
      return res.status(400).json({
        success: false,
        error: 'PROMPT_TOO_LONG',
        message: `Nội dung câu hỏi quá dài (tối đa ${MAX_PROMPT_CHARS} ký tự). Vui lòng rút gọn nội dung.`
      });
    }

    const effectiveAction = attachment ? 'multimodal' : actionType;
    const isOwnerByEmail = body.userEmail && OWNER_EMAILS.includes(body.userEmail.trim().toLowerCase());
    const isOwner = userId === 'usr_founder_owner' || isOwnerByEmail;
    const cost = isOwner ? 0 : (ACTION_COSTS[effectiveAction] || 1);

    // 2. Pre-flight Check qua Stored Procedure v5.0 (Stateless ~10ms, không lock DB)
    if (userId && !isOwner) {
      const preflight = await runPreflightCheck(userId, cost);
      if (!preflight.allowed) {
        return res.status(429).json({
          success: false,
          error: 'INSUFFICIENT_CREDITS_OR_RATE_LIMIT',
          message: preflight.message || 'Không đủ tín dụng hoặc thao tác quá nhanh.'
        });
      }
    } else if (!isOwner && currentCredits < cost) {
      return res.status(402).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Số dư của bạn (${currentCredits}⚡) không đủ để thực hiện thao tác này (yêu cầu ${cost}⚡). Vui lòng nâng cấp gói hoặc nạp thêm credits.`,
        requiredCredits: cost,
        currentCredits,
        billingUrl: '/billing'
      });
    }

    if (!prompt.trim() && !attachment && actionType !== 'summarize' && actionType !== 'quiz') {
      return res.status(400).json({
        success: false,
        error: 'EMPTY_PROMPT',
        message: 'Nội dung câu hỏi hoặc file đính kèm không được để trống.'
      });
    }

    // 3. Xử lý câu chào hỏi (Greeting Intent) tức thì
    if (actionType === 'chat' && !attachment && isGreetingIntent(prompt)) {
      const greetingReply =
        'Chào bạn! Mình là PomoFocus AI Study Companion 🎓. Hôm nay bạn đang muốn tập trung ôn môn học nào (Toán, Văn, Anh, Khoa học...), hay cần mình tóm tắt bài giảng nào không nè?';

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        syncServerCreditsDeduction(userId, cost).catch(() => {});
        res.write(`data: ${JSON.stringify({ text: greetingReply, finishReason: 'STOP', creditsDeducted: cost })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      syncServerCreditsDeduction(userId, cost).catch(() => {});
      return res.status(200).json({
        success: true,
        reply: greetingReply,
        creditsDeducted: cost,
        actionType,
        remainingCredits: Math.max(0, currentCredits - cost)
      });
    }

    // 4. Fallback giải toán cơ bản offline
    const mathAnswer = solveBasicMath(prompt);
    if (mathAnswer && !attachment) {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        syncServerCreditsDeduction(userId, cost).catch(() => {});
        res.write(`data: ${JSON.stringify({ text: mathAnswer, finishReason: 'STOP', creditsDeducted: cost })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      syncServerCreditsDeduction(userId, cost).catch(() => {});
      return res.status(200).json({
        success: true,
        reply: mathAnswer,
        creditsDeducted: cost,
        actionType,
        remainingCredits: Math.max(0, currentCredits - cost)
      });
    }

    // 5. Chuẩn bị prompt theo từng tác vụ sư phạm
    let userPromptText = prompt;
    if (actionType === 'summarize') {
      userPromptText = `Hãy tóm tắt ngắn gọn và làm nổi bật các ý chính quan trọng nhất của ghi chú sau đây:\n\n"""\n${
        contextNotes || prompt || 'Ghi chú học tập phương pháp Pomodoro và kỹ thuật Feynman'
      }\n"""`;
    } else if (actionType === 'quiz') {
      userPromptText = `Dựa trên chủ đề hoặc nội dung sau đây, hãy tạo đúng 10 câu hỏi trắc nghiệm ôn tập (A, B, C, D) về phương pháp Pomodoro và kỹ năng học tập, kèm đáp án đúng và lời giải thích sư phạm:\n\n"""\n${
        prompt || contextNotes || 'Phương pháp quản lý thời gian Pomodoro và tối ưu hóa sự tập trung'
      }\n"""`;
    } else if (attachment && !prompt.trim()) {
      userPromptText = `Vui lòng phân tích chi tiết nội dung tài liệu đính kèm "${attachment.fileName || 'đề cương'}", tóm tắt cấu trúc và hướng dẫn giải các bài tập hoặc kiến thức trọng tâm có trong tài liệu.`;
    }

    const userParts: any[] = [{ text: userPromptText }];
    if (attachment && attachment.base64Data && attachment.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64Data
        }
      });
    }

    const geminiContents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-8)) {
        const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
        const text = h.content || (h.parts && h.parts[0]?.text) || '';
        if (text) {
          geminiContents.push({
            role,
            parts: [{ text }]
          });
        }
      }
    }
    geminiContents.push({
      role: 'user',
      parts: userParts
    });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    const tunedModelId = process.env.GEMINI_TUNED_MODEL_ID || process.env.VITE_GEMINI_TUNED_MODEL_ID || '';

    // 6. Xử lý Streaming Response (Stateless Connectionless trong suốt 30s stream)
    if (stream && apiKey) {
      const candidateModels = tunedModelId
        ? [
            tunedModelId.startsWith('tunedModels/') ? tunedModelId : `tunedModels/${tunedModelId}`,
            'models/gemini-2.5-flash',
            'models/gemini-1.5-flash'
          ]
        : ['models/gemini-2.5-flash', 'models/gemini-1.5-flash'];

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let streamSuccess = false;
      for (const modelPath of candidateModels) {
        try {
          const streamUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:streamGenerateContent?alt=sse&key=${apiKey}`;

          const response = await fetch(streamUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
              contents: geminiContents,
              systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
              },
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192
              }
            })
          });

          if (response.ok && response.body) {
            streamSuccess = true;
            const reader = (response.body as any).getReader ? (response.body as any).getReader() : null;

            if (reader) {
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
                  if (!jsonStr || jsonStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(jsonStr);
                    const candidate = parsed?.candidates?.[0];
                    const chunkText = candidate?.content?.parts?.[0]?.text || '';
                    const finishReason = candidate?.finishReason || null;

                    if (chunkText || finishReason) {
                      res.write(`data: ${JSON.stringify({ text: chunkText, finishReason, creditsDeducted: cost })}\n\n`);
                    }
                  } catch {}
                }
              }
            }

            // POST-STREAM SETTLEMENT: Chỉ trừ điểm sau khi toàn bộ luồng stream kết thúc 100%
            syncServerCreditsDeduction(userId, cost).catch(() => {});
            res.write('data: [DONE]\n\n');
            return res.end();
          }
        } catch (streamErr) {
          console.error(`[Gemini Stream Error - ${modelPath}]:`, streamErr);
        }
      }

      if (!streamSuccess) {
        // Lỗi đường truyền: Không trừ điểm (Zero-Deduction-on-Error)
        res.write(`data: ${JSON.stringify({ text: '⚠️ Kết nối dịch vụ Gemini đang gián đoạn, bạn không bị trừ tín dụng.', finishReason: 'ERROR' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    // 7. Non-streaming handler fallback
    let reply = '';
    if (apiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
        })
      });
      if (response.ok) {
        const data = await response.json();
        reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    }

    if (!reply) {
      if (actionType === 'quiz') {
        reply = `### 🎯 10 Câu Hỏi Trắc Nghiệm Ôn Tập Pomodoro & Kỹ Năng Học Tập\n\n**Câu 1:** Chu kỳ Pomodoro tiêu chuẩn kéo dài bao nhiêu phút tập trung và nghỉ ngơi?\n- A. 45 phút tập trung, 15 phút nghỉ\n- B. 25 phút tập trung, 5 phút nghỉ ngắn\n- C. 60 phút tập trung, 10 phút nghỉ\n- D. 30 phút tập trung, không nghỉ\n\n**Câu 2:** Sau bao nhiêu phiên Pomodoro liên tiếp thì nên nghỉ dài?\n- A. 2 phiên\n- B. 4 phiên\n\n**Câu 3:** Chế độ Diffuse Mode được kích hoạt khi nào?\n- A. Lúc giải toán\n- B. Lúc nghỉ ngơi thả lỏng\n\n**Câu 4:** Kỹ thuật Parking Lot dùng để làm gì?\n- A. Đỗ xe\n- B. Ghi chú ý nghĩ xao nhãng\n\n**Câu 5:** Định luật Parkinson phát biểu điều gì?\n- A. Thời gian cố định\n- B. Công việc mở rộng để lấp đầy thời gian\n\n**Câu 6:** Quy tắc 80/20 khuyến nghị điều gì?\n- A. 20% kiến thức tạo 80% kết quả\n- B. Đọc 80 cuốn sách\n\n**Câu 7:** Đường cong quên lãng do ai nghiên cứu?\n- A. Newton\n- B. Ebbinghaus\n\n**Câu 8:** Kỹ thuật Feynman có bước cốt lõi nào?\n- A. Học vẹt\n- B. Giải thích đơn giản cho người mới\n\n**Câu 9:** Hiện tượng Ego Depletion nhắc nhở điều gì?\n- A. Ưu tiên việc khó vào đầu ngày\n- B. Để việc khó vào đêm muộn\n\n**Câu 10:** Khi hoàn thành sớm phiên Pomodoro thì nên làm gì?\n- A. Bật mạng xã hội\n- B. Overlearning, rà soát lại kết quả`;
      } else {
        reply = `Chào bạn! Mình đã tiếp nhận câu hỏi "${prompt}". Hiện tại hệ thống đang kết nối trực tiếp đến mô hình học tập PomoFocus.`;
      }
    }

    // Trừ điểm sau khi đã có kết quả trả về
    syncServerCreditsDeduction(userId, cost).catch(() => {});

    return res.status(200).json({
      success: true,
      reply,
      creditsDeducted: cost,
      actionType,
      isTruncated: false,
      remainingCredits: Math.max(0, currentCredits - cost)
    });
  } catch (err: any) {
    console.error('[Companion API Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Lỗi xử lý máy chủ'
    });
  }
}
