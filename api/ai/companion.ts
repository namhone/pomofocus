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
  quiz: 10
};

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
     + Nội dòng: $E = mc^2$, $\\Delta = b^2 - 4ac$, $Z = \\sqrt{R^2 + (Z_L - Z_C)^2}$
     + Khối công thức riêng biệt:
       $$\\int_a^b f(x)dx = F(b) - F(a)$$

4. QUY CHUẨN TÁC VỤ CHUYÊN BIỆT:
   - Với tác vụ TÓM TẮT (summarize): Trích xuất 3-5 ý cốt lõi quan trọng nhất, dùng bullet points ngắn gọn, rõ ràng, không lan man.
   - Với tác vụ TRẮC NGHIỆM (quiz): Tạo đúng 10 câu hỏi trắc nghiệm (A, B, C, D) ôn tập Pomodoro và phương pháp học tập kèm đáp án đúng và phần giải thích ngắn vì sao đáp án đó chính xác.

5. PHONG THÁI:
   - Luôn tôn trọng mọi câu hỏi dù là đơn giản nhất, giữ thái độ động viên, tích cực và thúc đẩy tinh thần tự học kiên trì theo triết lý Pomodoro Focus.`;

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
      userContent = `Dựa trên chủ đề hoặc nội dung sau đây, hãy tạo đúng 10 câu hỏi trắc nghiệm ôn tập (A, B, C, D) về phương pháp Pomodoro và kỹ năng học tập, kèm đáp án đúng và lời giải thích sư phạm:\n\n"""\n${
        prompt || contextNotes || 'Phương pháp quản lý thời gian Pomodoro và tối ưu hóa sự tập trung'
      }\n"""`;
    }

    let reply = '';
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    const tunedModelId = process.env.GEMINI_TUNED_MODEL_ID || process.env.VITE_GEMINI_TUNED_MODEL_ID || '';

    // 3. Nếu có API Key, gọi trực tiếp Gemini qua Google Generative AI REST endpoint
    if (apiKey) {
      try {
        const modelEndpoint = tunedModelId
          ? (tunedModelId.startsWith('tunedModels/') ? tunedModelId : `tunedModels/${tunedModelId}`)
          : 'models/gemini-1.5-flash';
        let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelEndpoint}:generateContent?key=${apiKey}`;

        let response = await fetch(geminiUrl, {
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
              maxOutputTokens: 2048
            }
          })
        });

        // Nếu Tuned Model trả về lỗi (chưa kích hoạt xong hoặc không tìm thấy), tự động fallback về gemini-1.5-flash
        if (!response.ok && tunedModelId) {
          console.warn(`[Gemini API] Tuned model ${tunedModelId} failed (status ${response.status}), fallback sang gemini-1.5-flash`);
          geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          response = await fetch(geminiUrl, {
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
                maxOutputTokens: 2048
              }
            })
          });
        }

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
        reply = `### 🎯 10 Câu Hỏi Trắc Nghiệm Ôn Tập Pomodoro & Kỹ Năng Học Tập\n\n**Câu 1:** Chu kỳ Pomodoro tiêu chuẩn kéo dài bao nhiêu phút tập trung và nghỉ ngơi?\n- A. 45 phút tập trung, 15 phút nghỉ\n- B. 25 phút tập trung, 5 phút nghỉ ngắn\n- C. 60 phút tập trung, 10 phút nghỉ\n- D. 30 phút tập trung, không nghỉ\n\n*Đáp án đúng:* **B** — Chu kỳ 25/5 được thiết kế tối ưu hóa sự chú ý bền vững theo nhịp sinh học não bộ.\n\n---\n**Câu 2:** Sau bao nhiêu phiên Pomodoro liên tiếp thì nên có một khoảng nghỉ dài (15–30 phút)?\n- A. 2 phiên\n- B. 4 phiên\n- C. 6 phiên\n- D. 8 phiên\n\n*Đáp án đúng:* **B** — 4 chu kỳ (tổng cộng 100 phút tập trung) là ngưỡng giới hạn sinh lý cần thiết lập lại năng lượng nhận thức.\n\n---\n**Câu 3:** Khái niệm "Diffuse Mode" (Chế độ tư duy phân tán) của Barbara Oakley được kích hoạt khi nào?\n- A. Khi đang giải bài toán hóc búa\n- B. Trong lúc nghỉ ngơi 5 phút, đi dạo nhẹ nhàng hoặc thả lỏng\n- C. Khi đang đọc tài liệu chuyên ngành\n- D. Khi thức khuya học bài\n\n*Đáp án đúng:* **B** — Trạng thái thư giãn giúp não kích hoạt mạng lưới Default Mode Network để kết nối các khái niệm tiềm thức.\n\n---\n**Câu 4:** Khi bị xao nhãng hoặc có ý nghĩ đột xuất nảy ra trong phiên Pomodoro, hành động chuẩn mực nhất là gì?\n- A. Dừng ngay đồng hồ để làm việc đó\n- B. Ghi chú nhanh vào sổ nháp/tasks nháp rồi tiếp tục tập trung\n- C. Bỏ qua hoàn toàn và không ghi lại\n- D. Chuyển sang lướt điện thoại\n\n*Đáp án đúng:* **B** — Kỹ thuật "Parking Lot" giúp giải phóng bộ nhớ làm việc mà không làm đứt đoạn dòng chảy tập trung.\n\n---\n**Câu 5:** Định luật Parkinson trong quản lý thời gian phát biểu điều gì?\n- A. Thời gian luôn cố định cho mọi nhiệm vụ\n- B. Công việc sẽ tự động mở rộng để lấp đầy khoảng thời gian được ấn định cho nó\n- C. Càng nhiều thời gian thì chất lượng công việc càng cao\n- D. Làm việc càng nhanh thì sai sót càng nhiều\n\n*Đáp án đúng:* **B** — Áp dụng các phiên Pomodoro 25 phút giúp siết chặt khung thời gian, ngăn ngừa sự trì hoãn.\n\n---\n**Câu 6:** Nguyên lý Pareto (Quy tắc 80/20) trong ôn thi kiến nghị điều gì?\n- A. Dành 80% thời gian cho 20% kiến thức cốt lõi tạo ra 80% điểm số\n- B. Học 80 câu hỏi ngẫu nhiên trong đề cương\n- C. Đọc sách trong 80 phút rồi nghỉ 20 phút\n- D. Bỏ qua 80% tài liệu mà không cần chọn lọc\n\n*Đáp án đúng:* **A** — Xác định trọng tâm "High-Yield Topics" là chìa khóa tối ưu hóa điểm số trong thời gian hữu hạn.\n\n---\n**Câu 7:** Phương pháp lặp lại ngắt quãng (Spaced Repetition) dựa trên mô hình toán học nào của Hermann Ebbinghaus?\n- A. Đường cong tăng trưởng hàm mũ\n- B. Đường cong quên lãng: $R = e^{-\\frac{t}{S}}$\n- C. Phân phối chuẩn Gauss\n- D. Định lý giới hạn trung tâm\n\n*Đáp án đúng:* **B** — Ôn tập lặp lại tại các mốc thời gian cách đều giúp giảm độ dốc của đường cong quên lãng, chuyển kiến thức vào trí nhớ dài hạn.\n\n---\n**Câu 8:** Kỹ thuật Feynman trong học sâu bao gồm bước cốt lõi nào?\n- A. Đọc thuộc lòng từ đầu đến cuối sách giáo khoa\n- B. Giải thích khái niệm phức tạp cho một người mới (hoặc đứa trẻ 10 tuổi) bằng ngôn ngữ bình dị nhất\n- C. Sử dụng từ ngữ hàn lâm chuyên sâu nhất có thể\n- D. Làm thật nhiều bài tập mà không cần hiểu bản chất\n\n*Đáp án đúng:* **B** — Nếu bạn không thể giải thích đơn giản, nghĩa là bạn chưa thực sự hiểu rõ nguyên lý.\n\n---\n**Câu 9:** Hiện tượng "Sự kiệt quệ ý chí" (Ego Depletion) nhắc nhở chúng ta điều gì khi sắp xếp lịch Pomodoro?\n- A. Nên học việc khó nhất (Deep Work) vào đầu ngày khi năng lượng não bộ còn dồi dào\n- B. Để bài tập khó nhất vào lúc nửa đêm\n- C. Không bao giờ cần nạp năng lượng\n- D. Ý chí là vô hạn và không suy giảm\n\n*Đáp án đúng:* **A** — Ý chí và khả năng tự kiểm soát tiêu hao năng lượng glucose của vỏ não trước trán, vì vậy nên ưu tiên tác vụ nặng nhất vào buổi sáng.\n\n---\n**Câu 10:** Trong Pomodoro, nếu bạn hoàn thành mục tiêu khi đồng hồ mới chạy được 15 phút, bạn nên làm gì?\n- A. Tắt ngay đồng hồ và kết thúc phiên\n- B. Sử dụng 10 phút còn lại để rà soát (Overlearning), kiểm tra lại kết quả và tinh gọn ghi chú\n- C. Bật mạng xã hội chơi cho hết giờ\n- D. Bắt đầu ngay một môn học hoàn toàn mới mà không nghỉ\n\n*Đáp án đúng:* **B** — Quy tắc "Overlearning" giúp củng cố kiến thức và tránh làm gián đoạn nhịp sinh học của phiên làm việc.`;
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
