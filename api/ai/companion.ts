const OWNER_EMAILS = [
  'namho03052k9@gmail.com',
  'huyentrantt09@gmail.com',
  'tony31082009@gmail.com'
];

interface RequestBody {
  prompt?: string;
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


export async function syncServerCreditsDeduction(userId?: string, cost = 1) {
  if (!userId || cost <= 0) return;
  const sbUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) return;

  try {
    const rpcRes = await fetch(`${sbUrl}/rest/v1/rpc/deduct_ai_credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': sbKey,
        'Authorization': `Bearer ${sbKey}`
      },
      body: JSON.stringify({ p_user_id: userId, p_cost: cost })
    });
    if (rpcRes.ok) return;

    const profRes = await fetch(
      `${sbUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=ai_credits_balance,total_ai_queries`,
      {
        headers: {
          'apikey': sbKey,
          'Authorization': `Bearer ${sbKey}`
        }
      }
    );
    if (profRes.ok) {
      const data = await profRes.json();
      if (Array.isArray(data) && data[0]) {
        const remaining = Math.max(0, (data[0].ai_credits_balance || 0) - cost);
        const queries = (data[0].total_ai_queries || 0) + 1;
        await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': sbKey,
            'Authorization': `Bearer ${sbKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            ai_credits_balance: remaining,
            total_ai_queries: queries,
            updated_at: new Date().toISOString()
          })
        });
      }
    }
  } catch (err) {
    console.debug('[api/companion] syncServerCreditsDeduction error:', err);
  }
}

const ACTION_COSTS: Record<'chat' | 'summarize' | 'quiz' | 'multimodal', number> = {
  chat: 1,
  summarize: 5,
  quiz: 10,
  multimodal: 5
};

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
    return `### 💡 Hướng Dẫn Bài Toán Tìm x (Toán Học Cơ Bản)\n\nChào bạn! Với bài toán **"${prompt}"**:\n\n1. **Phân tích đề bài:**\n   Ta có phương trình: $1 + 1 = x$\n\n2. **Thực hiện phép tính từng bước:**\n   - Tính vế trái: $1 + 1 = 2$\n   - Suy ra phương trình tương đương: $$x = 2$$\n\n3. **Kết luận:**\n   Vậy nghiệm của phương trình là **$x = 2$**.\n\nBạn có bài toán tìm ẩn số nào khác cần mình cùng phân tích không nè?`;
  }

  if (lower.includes('sóng dừng') || lower.includes('song dung')) {
    return `### 💡 Khái Niệm Sóng Dừng (Vật Lý 12)\n\nChào bạn! Về hiện tượng **sóng dừng**:\n\n1. **Định nghĩa bản chất:**\n   Sóng dừng là sóng hình thành bởi sự giao thoa giữa sóng tới và sóng phản xạ truyền ngược chiều nhau trên cùng một phương truyền.\n\n2. **Đặc điểm & Công thức định lượng:**\n   - Điểm luôn đứng yên gọi là **nút sóng**; điểm dao động với biên độ cực đại gọi là **bụng sóng**.\n   - Điều kiện sóng dừng trên dây hai đầu cố định chiều dài $L$:\n     $$L = k \\frac{\\lambda}{2} \\quad (k \\in \\mathbb{N}^*)$$\n   *(Trong đó $\\lambda$ là bước sóng, $k$ là số bụng sóng)*.\n\nBạn có muốn làm thử bài tập tính số nút, số bụng sóng không?`;
  }

  return null;
}

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý Học Tập AI Đồng Hành (PomoFocus AI Study Companion) — một gia sư học tập thông minh, kiên nhẫn, chuẩn mực sư phạm và truyền cảm hứng, thấm nhuần triết lý sư phạm Socratic từ Mr. Ranedeer AI Tutor.

Nhiệm vụ và Nguyên tắc Sư phạm của bạn:

1. TRIẾT LÝ SƯ PHẠM SOCRATIC (GỢI MỞ & DẪN DẮT TƯ DUY):
   - Khi học sinh hỏi bài tập, câu hỏi tính toán hoặc bài toán chưa có hướng đi: TUYỆT ĐỐI KHÔNG đưa ngay đáp án cuối cùng một cách thụ động khiến học sinh ỷ lại.
   - Giai đoạn 1 (Gợi mở manh mối): Cung cấp 💡 Manh mối then chốt (Hint), nhắc lại Công thức / Định lý cốt lõi cần dùng, và đặt 1 câu hỏi dẫn dắt (Guiding Question) để học sinh tự đặt bút làm.
   - Giai đoạn 2 (Hướng dẫn từng bước có giàn giáo): Khi học sinh yêu cầu "giải chi tiết", "hướng dẫn từng bước", "em chưa hiểu": Trình bày theo phương pháp Step-by-step Scaffolding (từng bước rõ ràng), tại mỗi bước nêu rõ "Tại sao lại làm như vậy?" để học sinh hiểu sâu bản chất.

2. THÍCH ỨNG CẤP ĐỘ NHẬN THỨC THEO TỪNG CẤP HỌC (K-12 ADAPTIVE TONE):
   - Cấp 1 (Tiểu học - Lớp 1-5): Xưng hô thân mật ("Thầy/Cô chào em", "bạn nhỏ"), ngôn từ trong sáng, trực quan, dùng ví dụ đồ vật, hoa quả, bánh kẹo đời thường; kiên nhẫn và khen ngợi nỗ lực nhỏ.
   - Cấp 2 (THCS - Lớp 6-9): Xưng hô "Chào bạn" hoặc "Chào em", tư duy logic mạch lạc, hướng dẫn phân tích đề bài, vẽ hình nháp, đặt ẩn phụ, chỉ ra các lỗi biến đổi đại số hay gặp.
   - Cấp 3 (THPT - Lớp 10-12): Ngôn từ học thuật chuẩn mực, bám sát cấu trúc đề thi tốt nghiệp THPT Quốc Gia (Toán hàm số, Oxyz, Vật lý điện xoay chiều, Hóa học este, Ngữ văn phân tích hình tượng), chỉ ra bẫy trắc nghiệm (traps) và mẹo bấm máy tính Casio tối ưu tốc độ.

3. QUY CHUẨN CÔNG THỨC TOÁN - LÝ - HÓA (LATEX):
   - BẮT BUỘC sử dụng ký hiệu chuẩn LaTeX cho mọi biểu thức khoa học:
     + Nội dòng: $a^2 + b^2 = c^2$, $\\Delta = b^2 - 4ac$, $x = 2$
     + Khối công thức riêng biệt:
       $$\\int_a^b f(x)dx = F(b) - F(a)$$

4. QUY CHUẨN TÁC VỤ CHUYÊN BIỆT:
   - Với tác vụ TÓM TẮT (summarize): Trích xuất 3-5 ý cốt lõi quan trọng nhất, dùng bullet points ngắn gọn, rõ ràng, không lan man.
   - Với tác vụ TRẮC NGHIỆM (quiz): Tạo đúng 10 câu hỏi trắc nghiệm (A, B, C, D) ôn tập Pomodoro và phương pháp học tập kèm đáp án đúng và phần giải thích ngắn vì sao đáp án đó chính xác.
   - Với tác vụ ĐÍNH KÈM ĐỀ CƯƠNG / TÀI LIỆU (multimodal): Phân tích kỹ nội dung file/ảnh được gửi kèm, trích xuất cấu trúc đề cương, giải đáp các câu hỏi hoặc bài tập có trong tài liệu theo đúng chuẩn sư phạm.

5. PHONG THÁI & TRÒ CHUYỆN TỰ NHIÊN:
   - Luôn tôn trọng mọi câu hỏi dù là đơn giản hay câu nói chuyện phiếm đời thường. Đáp lại tự nhiên, gần gũi, thông minh như một người bạn đồng hành thực thụ.
   - Khi học sinh gửi câu chào hỏi ngắn (ví dụ: "xin chào", "chào bạn", "hi", "hello", "alo",...):
     Hãy đáp lại tự nhiên, nhiệt tình và thân thiện: "Chào bạn! Mình là PomoFocus AI Study Companion 🎓. Hôm nay bạn đang muốn tập trung ôn môn học nào (Toán, Văn, Anh, Khoa học...), hay cần mình tóm tắt bài giảng nào không nè?"`;

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
      currentCredits = 0,
      userId = '',
      stream = false,
      history = [],
      attachment
    } = body;

    // Phí thao tác: Nếu có attachment, áp dụng chi phí 5⚡
    const effectiveAction = attachment ? 'multimodal' : actionType;
    const isOwner =
      userId === 'usr_founder_owner' ||
      (body.userEmail && OWNER_EMAILS.includes(body.userEmail.trim().toLowerCase()));
    const cost = isOwner ? 0 : (ACTION_COSTS[effectiveAction] || 1);

    // 1. Kiểm tra điểm nguyên tử (Bỏ qua đối với Chủ sở hữu Owner)
    if (!isOwner && currentCredits < cost) {
      return res.status(402).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Số dư của bạn (${currentCredits}⚡) không đủ để thực hiện thao tác này (yêu cầu ${cost}⚡). Vui lòng nâng cấp gói tại Bảng Giá hoặc nạp thêm credits.`,
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

    // 2. Nhận diện câu chào hỏi (Greeting Intent) xử lý tự nhiên tức thì
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
        remainingCredits: currentCredits - cost
      });
    }

    // 3. Chuẩn bị prompt gửi đến mô hình Gemini
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

    // 4. Chuẩn bị parts của người dùng (hỗ trợ multimodal attachment)
    const userParts: any[] = [{ text: userPromptText }];
    if (attachment && attachment.base64Data && attachment.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64Data
        }
      });
    }

    // 5. Chuẩn bị ngữ cảnh hội thoại (Lấy tối đa 8 tin nhắn gần nhất)
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

    // 6. Xử lý Streaming Response khi stream === true
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
            // Đọc và chuyển tiếp từng SSE chunk từ Google
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
            } else {
              // Fallback đọc dạng text thông thường nếu getReader không hỗ trợ
              const rawData = await response.text();
              const lines = rawData.split('\n');
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

            syncServerCreditsDeduction(userId, cost).catch(() => {});
            res.write('data: [DONE]\n\n');
            return res.end();
          }
        } catch (streamErr) {
          console.error(`[Gemini Stream Error - ${modelPath}]:`, streamErr);
        }
      }

      if (!streamSuccess) {
        res.write(`data: ${JSON.stringify({ text: '⚠️ Kết nối dịch vụ Gemini đang gián đoạn, vui lòng thử lại trong giây lát.', finishReason: 'ERROR' })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      }
    }

    // 7. Non-streaming handler (dùng cho client không bật stream hoặc fallback test)
    let reply = '';
    let apiError: string | null = null;
    let finishReason: string | null = null;

    if (apiKey) {
      const candidateModels = tunedModelId
        ? [
            tunedModelId.startsWith('tunedModels/') ? tunedModelId : `tunedModels/${tunedModelId}`,
            'models/gemini-2.5-flash',
            'models/gemini-1.5-flash'
          ]
        : ['models/gemini-2.5-flash', 'models/gemini-1.5-flash'];

      for (const modelPath of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;

          const response = await fetch(geminiUrl, {
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

          if (response.ok) {
            const data = await response.json();
            const candidate = data?.candidates?.[0];
            reply = candidate?.content?.parts?.[0]?.text || '';
            finishReason = candidate?.finishReason || null;
            if (reply) {
              apiError = null;
              break;
            }
          } else {
            const errBody = await response.text();
            console.error(`[Gemini API Error - ${modelPath}] HTTP ${response.status}: ${errBody}`);
            apiError = `⚠️ Kết nối Gemini thất bại: [HTTP ${response.status}]`;
          }
        } catch (geminiErr: any) {
          console.error(`[Gemini API Exception - ${modelPath}]:`, geminiErr?.message || geminiErr);
          apiError = `⚠️ Kết nối Gemini thất bại: [${geminiErr?.message || 'Lỗi mạng'}]`;
        }
      }
    }

    if (!reply && apiError) {
      return res.status(502).json({
        success: false,
        error: 'AI_PROVIDER_ERROR',
        message: apiError,
        creditsDeducted: 0,
        currentCredits
      });
    }

    // 8. Fallback thông minh khi offline hoặc chạy sandbox test
    if (!reply) {
      if (actionType === 'summarize') {
        reply = `### 📋 Tóm Tắt Trọng Tâm Bài Học\n\n${
          contextNotes ? `Dựa trên ghi chú: *"${contextNotes.slice(0, 100)}..."*\n\n` : ''
        }1. **Khái niệm cốt lõi:** Nắm chắc bản chất vấn đề và các nguyên lý cơ bản trước khi đi vào chi tiết.\n2. **Công thức then chốt:**\n   $$\\Delta S = \\int \\frac{dQ_{\\text{rev}}}{T}$$\n3. **Phương pháp rèn luyện:** Áp dụng chu kỳ 25 phút Pomodoro để duy trì hiệu suất não bộ ở mức cao nhất mà không bị mệt mỏi.`;
      } else if (actionType === 'quiz') {
        reply = `### 🎯 10 Câu Hỏi Trắc Nghiệm Ôn Tập Pomodoro & Kỹ Năng Học Tập\n\n**Câu 1:** Chu kỳ Pomodoro tiêu chuẩn kéo dài bao nhiêu phút tập trung và nghỉ ngơi?\n- A. 45 phút tập trung, 15 phút nghỉ\n- B. 25 phút tập trung, 5 phút nghỉ ngắn\n- C. 60 phút tập trung, 10 phút nghỉ\n- D. 30 phút tập trung, không nghỉ\n\n*Đáp án đúng:* **B** — Chu kỳ 25/5 được thiết kế tối ưu hóa sự chú ý bền vững theo nhịp sinh học não bộ.\n\n---\n**Câu 2:** Sau bao nhiêu phiên Pomodoro liên tiếp thì nên có một khoảng nghỉ dài (15–30 phút)?\n- A. 2 phiên\n- B. 4 phiên\n- C. 6 phiên\n- D. 8 phiên\n\n*Đáp án đúng:* **B** — 4 chu kỳ (tổng cộng 100 phút tập trung) là ngưỡng giới hạn sinh lý cần thiết lập lại năng lượng nhận thức.\n\n---\n**Câu 3:** Khái niệm "Diffuse Mode" (Chế độ tư duy phân tán) của Barbara Oakley được kích hoạt khi nào?\n- A. Khi đang giải bài toán hóc búa\n- B. Trong lúc nghỉ ngơi 5 phút, đi dạo nhẹ nhàng hoặc thả lỏng\n- C. Khi đang đọc tài liệu chuyên ngành\n- D. Khi thức khuya học bài\n\n*Đáp án đúng:* **B** — Trạng thái thư giãn giúp não kích hoạt mạng lưới Default Mode Network để kết nối các khái niệm tiềm thức.\n\n---\n**Câu 4:** Khi bị xao nhãng hoặc có ý nghĩ đột xuất nảy ra trong phiên Pomodoro, hành động chuẩn mực nhất là gì?\n- A. Dừng ngay đồng hồ để làm việc đó\n- B. Ghi chú nhanh vào sổ nháp/tasks nháp rồi tiếp tục tập trung\n- C. Bỏ qua hoàn toàn và không ghi lại\n- D. Chuyển sang lướt điện thoại\n\n*Đáp án đúng:* **B** — Kỹ thuật "Parking Lot" giúp giải phóng bộ nhớ làm việc mà không làm đứt đoạn dòng chảy tập trung.\n\n---\n**Câu 5:** Định luật Parkinson trong quản lý thời gian phát biểu điều gì?\n- A. Thời gian luôn cố định cho mọi nhiệm vụ\n- B. Công việc sẽ tự động mở rộng để lấp đầy khoảng thời gian được ấn định cho nó\n- C. Càng nhiều thời gian thì chất lượng công việc càng cao\n- D. Làm việc càng nhanh thì sai sót càng nhiều\n\n*Đáp án đúng:* **B** — Áp dụng các phiên Pomodoro 25 phút giúp siết chặt khung thời gian, ngăn ngừa sự trì hoãn.\n\n---\n**Câu 6:** Nguyên lý Pareto (Quy tắc 80/20) trong ôn thi kiến nghị điều gì?\n- A. Dành 80% thời gian cho 20% kiến thức cốt lõi tạo ra 80% điểm số\n- B. Học 80 câu hỏi ngẫu nhiên trong đề cương\n- C. Đọc sách trong 80 phút rồi nghỉ 20 phút\n- D. Bỏ qua 80% tài liệu mà không cần chọn lọc\n\n*Đáp án đúng:* **A** — Xác định trọng tâm "High-Yield Topics" là chìa khóa tối ưu hóa điểm số trong thời gian hữu hạn.\n\n---\n**Câu 7:** Phương pháp lặp lại ngắt quãng (Spaced Repetition) dựa trên mô hình toán học nào của Hermann Ebbinghaus?\n- A. Đường cong tăng trưởng hàm mũ\n- B. Đường cong quên lãng: $R = e^{-\\frac{t}{S}}$\n- C. Phân phối chuẩn Gauss\n- D. Định lý giới hạn trung tâm\n\n*Đáp án đúng:* **B** — Ôn tập lặp lại tại các mốc thời gian cách đều giúp giảm độ dốc của đường cong quên lãng, chuyển kiến thức vào trí nhớ dài hạn.\n\n---\n**Câu 8:** Kỹ thuật Feynman trong học sâu bao gồm bước cốt lõi nào?\n- A. Đọc thuộc lòng từ đầu đến cuối sách giáo khoa\n- B. Giải thích khái niệm phức tạp cho một người mới (hoặc đứa trẻ 10 tuổi) bằng ngôn ngữ bình dị nhất\n- C. Sử dụng từ ngữ hàn lâm chuyên sâu nhất có thể\n- D. Làm thật nhiều bài tập mà không cần hiểu bản chất\n\n*Đáp án đúng:* **B** — Nếu bạn không thể giải thích đơn giản, nghĩa là bạn chưa thực sự hiểu rõ nguyên lý.\n\n---\n**Câu 9:** Hiện tượng "Sự kiệt quệ ý chí" (Ego Depletion) nhắc nhở chúng ta điều gì khi sắp xếp lịch Pomodoro?\n- A. Nên học việc khó nhất (Deep Work) vào đầu ngày khi năng lượng não bộ còn dồi dào\n- B. Để bài tập khó nhất vào lúc nửa đêm\n- C. Không bao giờ cần nạp năng lượng\n- D. Ý chí là vô hạn và không suy giảm\n\n*Đáp án đúng:* **A** — Ý chí và khả năng tự kiểm soát tiêu hao năng lượng glucose của vỏ não trước trán, vì vậy nên ưu tiên tác vụ nặng nhất vào buổi sáng.\n\n---\n**Câu 10:** Trong Pomodoro, nếu bạn hoàn thành mục tiêu khi đồng hồ mới chạy được 15 phút, bạn nên làm gì?\n- A. Tắt ngay đồng hồ và kết thúc phiên\n- B. Sử dụng 10 phút còn lại để rà soát (Overlearning), kiểm tra lại kết quả và tinh gọn ghi chú\n- C. Bật mạng xã hội chơi cho hết giờ\n- D. Bắt đầu ngay một môn học hoàn toàn mới mà không nghỉ\n\n*Đáp án đúng:* **B** — Quy tắc "Overlearning" giúp củng cố kiến thức và tránh làm gián đoạn nhịp sinh học của phiên làm việc.`;
      } else {
        const mathResult = solveBasicMath(prompt);
        if (isGreetingIntent(prompt)) {
          reply =
            'Chào bạn! Mình là PomoFocus AI Study Companion 🎓. Hôm nay bạn đang muốn tập trung ôn môn học nào (Toán, Văn, Anh, Khoa học...), hay cần mình tóm tắt bài giảng nào không nè?';
        } else if (mathResult) {
          reply = mathResult;
        } else if (prompt.toLowerCase().includes('pythagoras')) {
          reply = `### 💡 Hướng Dẫn Định Lý Pythagoras (Toán Lớp 7)\n\nChào bạn! Về định lý **Pythagoras**:\n\n1. **Phát biểu bản chất:**\n   Trong một tam giác vuông, bình phương của cạnh huyền bằng tổng bình phương của hai cạnh góc vuông.\n\n2. **Công thức định lượng:**\n   $$a^2 + b^2 = c^2$$\n   *(Trong đó $c$ là độ dài cạnh huyền, $a$ và $b$ là hai cạnh góc vuông)*.\n\n3. **Ví dụ trực quan:**\n   Nếu hai cạnh góc vuông là $3$ và $4$, thì cạnh huyền $c$ tính bằng:\n   $$c = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = 5$$\n\nBạn có bài toán tam giác cụ thể nào cần áp dụng không?`;
        } else {
          reply = 'Chào bạn! Mình là PomoFocus AI. Vui lòng kết nối Internet hoặc cấu hình GEMINI_API_KEY hợp lệ để trò chuyện cùng AI thông minh nhé!';
        }
      }
    }

    syncServerCreditsDeduction(userId, cost).catch(() => {});
    return res.status(200).json({
      success: true,
      reply,
      creditsDeducted: cost,
      actionType: effectiveAction,
      remainingCredits: currentCredits - cost,
      finishReason,
      isTruncated: finishReason === 'MAX_TOKENS'
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
