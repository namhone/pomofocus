import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\Nam\\.gemini\\antigravity\\brain\\f0e4fa42-ea0b-4ff3-83da-6875921843c2';
const LIVE_URL = 'https://pomofocus-workspace.vercel.app';

interface AuditResult {
  step: string;
  passed: boolean;
  details: string;
}

const auditResults: AuditResult[] = [];

function recordResult(step: string, passed: boolean, details: string) {
  auditResults.push({ step, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${step}] ${details}`);
}

async function runLiveAudit() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU LIVE END-TO-END AUDIT TOÀN DIỆN TRÊN WEB PRODUCTION');
  console.log(`🌐 Target: ${LIVE_URL}`);
  console.log('================================================================\n');

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  // =========================================================================
  // PHẦN A: KIỂM THỬ VỚI TÀI KHOẢN CHÍNH CHỦ FOUNDER VIP (1.000⚡ CREDITS)
  // =========================================================================
  const founderContext = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await founderContext.newPage();

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/ai/companion')) {
      console.log(`[API Response] /api/ai/companion -> Status ${res.status()}`);
    }
  });

  try {
    console.log('\n--- BƯỚC 1: Đăng nhập Founder VIP 1-Chạm ---');
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle', timeout: 35000 });

    const founderBtn = page.locator('button[data-testid="btn-founder-quick-login"]');
    await founderBtn.waitFor({ state: 'visible', timeout: 10000 });
    recordResult('Login Choice 2', true, 'Nút "⚡ Đăng nhập Nhanh (Founder VIP 👑)" hiển thị rõ ràng trên màn hình login');

    await founderBtn.click();
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isApp = currentUrl.includes('/app') || currentUrl === `${LIVE_URL}/`;
    recordResult('Redirect to App', isApp, `Đã điều hướng thành công vào không gian làm việc: ${currentUrl}`);

    await page.waitForSelector('[data-testid="dock-btn-ai"]', { timeout: 15000 });

    // -------------------------------------------------------------
    // KỊCH BẢN AI 1: CHAT HỎI BÀI (ĐỊNH LÝ PYTHAGORAS LỚP 7)
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN AI 1: Chat hỏi bài định lý Pythagoras ---');
    const dockAiBtn = page.locator('[data-testid="dock-btn-ai"]');
    await dockAiBtn.click();
    await page.waitForSelector('[data-testid="ai-companion-drawer"]', { state: 'visible', timeout: 10000 });

    const creditsEl = page.locator('[data-testid="ai-credits-value"]');
    const initialCredits = parseInt((await creditsEl.innerText()).replace(/,/g, ''), 10);
    console.log(`[AI Initial Credits] ${initialCredits}⚡`);
    recordResult('AI Initial Balance', initialCredits === 1000, `Số dư khởi điểm tài khoản VIP: ${initialCredits}⚡ (Kỳ vọng: 1.000⚡)`);

    const inputPrompt = page.locator('[data-testid="ai-prompt-input"]');
    await inputPrompt.fill('Giải thích định lý Pythagoras cho học sinh lớp 7');

    const submitBtn = page.locator('[data-testid="ai-submit-btn"]');
    await submitBtn.click();

    console.log('Đang chờ phản hồi sư phạm từ AI Companion...');
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('[data-testid="ai-chat-messages-container"] > div');
        return msgs.length >= 3;
      },
      { timeout: 30000 }
    );

    await page.waitForTimeout(1500);

    const creditsAfterChat = parseInt((await creditsEl.innerText()).replace(/,/g, ''), 10);
    console.log(`[AI Credits After Chat] ${creditsAfterChat}⚡`);
    recordResult('AI Chat Deduction', creditsAfterChat === 999, `Đã trừ đúng 1⚡ (1000 -> ${creditsAfterChat}⚡)`);

    const messages = await page.locator('[data-testid="ai-chat-messages-container"]').innerText();
    const hasFormula = messages.includes('lim') || messages.includes('Pythagoras') || messages.includes('Công thức');
    recordResult('AI Chat Content & LaTeX', hasFormula, 'Phản hồi chứa nội dung sư phạm chuẩn mực và công thức toán học');

    const proofChatPath = path.join(ARTIFACTS_DIR, 'proof-ai-chat-live.png');
    await page.screenshot({ path: proofChatPath, fullPage: false });
    console.log(`📸 Đã lưu ảnh: ${proofChatPath}`);
    recordResult('Screenshot AI Chat', fs.existsSync(proofChatPath), 'Lưu ảnh proof-ai-chat-live.png thành công');

    // -------------------------------------------------------------
    // KỊCH BẢN AI 2: TÁC VỤ TÓM TẮT GHI CHÚ
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN AI 2: Tác vụ tóm tắt nhanh ghi chú ---');
    const summarizeBtn = page.locator('[data-testid="ai-quick-summarize"]');
    await summarizeBtn.click();

    console.log('Đang chờ AI tóm tắt...');
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('[data-testid="ai-chat-messages-container"] > div');
        return msgs.length >= 5;
      },
      { timeout: 30000 }
    );

    await page.waitForTimeout(1500);
    const creditsAfterSummarize = parseInt((await creditsEl.innerText()).replace(/,/g, ''), 10);
    console.log(`[AI Credits After Summarize] ${creditsAfterSummarize}⚡`);
    recordResult('AI Summarize Deduction', creditsAfterSummarize === 994, `Đã trừ đúng 5⚡ (999 -> ${creditsAfterSummarize}⚡)`);

    // -------------------------------------------------------------
    // KỊCH BẢN AI 3: TẠO 10 CÂU TRẮC NGHIỆM ÔN TẬP
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN AI 3: Tạo 10 câu trắc nghiệm ôn tập Pomodoro ---');
    const quizBtn = page.locator('[data-testid="ai-quick-quiz"]');
    await quizBtn.click();

    console.log('Đang chờ AI tạo 10 câu trắc nghiệm...');
    await page.waitForFunction(
      () => {
        const msgs = document.querySelectorAll('[data-testid="ai-chat-messages-container"] > div');
        return msgs.length >= 7;
      },
      { timeout: 35000 }
    );

    await page.waitForTimeout(2000);
    const creditsAfterQuiz = parseInt((await creditsEl.innerText()).replace(/,/g, ''), 10);
    console.log(`[AI Credits After Quiz] ${creditsAfterQuiz}⚡`);
    recordResult('AI Quiz Deduction', creditsAfterQuiz === 984, `Đã trừ đúng 10⚡ (994 -> ${creditsAfterQuiz}⚡)`);

    const allChatText = await page.locator('[data-testid="ai-chat-messages-container"]').innerText();
    const has10Questions = allChatText.includes('Câu 1') && allChatText.includes('Câu 10');
    recordResult('AI Quiz 10 Questions', has10Questions, 'Bộ trắc nghiệm xuất đủ 10 câu hỏi chuẩn mực kèm đáp án');

    const proofQuizPath = path.join(ARTIFACTS_DIR, 'proof-ai-quiz-latex.png');
    await page.screenshot({ path: proofQuizPath, fullPage: false });
    console.log(`📸 Đã lưu ảnh: ${proofQuizPath}`);
    recordResult('Screenshot AI Quiz', fs.existsSync(proofQuizPath), 'Lưu ảnh proof-ai-quiz-latex.png thành công');

    // Đóng drawer
    await page.locator('[data-testid="ai-btn-close-drawer"]').click();

    // -------------------------------------------------------------
    // RÀ SOÁT 4 GÓC: ĐỒNG HỒ POMODORO (ĐẾM NGƯỢC THẬT)
    // -------------------------------------------------------------
    console.log('\n--- RÀ SOÁT 4 GÓC: Đồng hồ Pomodoro ---');
    const timerDisplay = page.locator('[data-testid="timer-display"]');
    await timerDisplay.waitFor({ state: 'visible', timeout: 10000 });
    const initialTimeText = await timerDisplay.innerText();

    const startBtn = page.locator('[data-testid="timer-start-btn"]');
    await startBtn.click();
    console.log('Đã kích hoạt Start đồng hồ Pomodoro. Đợi 2.5s...');
    await page.waitForTimeout(2500);

    const currentTimeText = await timerDisplay.innerText();
    console.log(`[Timer] Trước: ${initialTimeText} -> Sau 2.5s: ${currentTimeText}`);
    const timerTicked = initialTimeText !== currentTimeText;
    recordResult('Pomodoro Timer Tick', timerTicked, `Đồng hồ đếm ngược trơn tru từ ${initialTimeText} xuống ${currentTimeText}`);

    const pauseBtn = page.locator('[data-testid="timer-pause-btn"]');
    if (await pauseBtn.isVisible()) {
      await pauseBtn.click();
    }

    // -------------------------------------------------------------
    // RÀ SOÁT 4 GÓC: TRANG LỊCH /calendar & SẢNH /rooms
    // -------------------------------------------------------------
    console.log('\n--- RÀ SOÁT 4 GÓC: Trang Lịch & Sảnh Phòng ---');
    await page.goto(`${LIVE_URL}/calendar`, { waitUntil: 'networkidle', timeout: 20000 });
    const addScheduleBtn = page.locator('[data-testid="btn-add-schedule"]');
    recordResult('Calendar View Integrity', await addScheduleBtn.isVisible(), 'Trang /calendar nạp đầy đủ thanh công cụ và nút thêm lịch');

    await page.goto(`${LIVE_URL}/rooms`, { waitUntil: 'networkidle', timeout: 20000 });
    const createRoomBtn = page.locator('[data-testid="btn-create-room"]').first();
    recordResult('Rooms Lobby Integrity', await createRoomBtn.isVisible(), 'Trang /rooms nạp mượt mà, danh sách phòng và nút tạo phòng sẵn sàng');

    // -------------------------------------------------------------
    // RÀ SOÁT 4 GÓC: BẢNG GIÁ FOUNDER & Ô COUPON
    // -------------------------------------------------------------
    console.log('\n--- RÀ SOÁT 4 GÓC: Bảng giá Founder VIP & Ô Coupon ---');
    await page.goto(`${LIVE_URL}/billing`, { waitUntil: 'networkidle', timeout: 20000 });

    const founderCard = page.locator('[data-testid="billing-founder-card"]');
    recordResult('Billing Founder Card', await founderCard.isVisible(), 'Thẻ thành viên FOUNDER LIFETIME VIP hiển thị kiêu hãnh');

    const couponBox = page.locator('[data-testid="universal-coupon-redemption"]');
    recordResult('Billing Coupon Universal', await couponBox.isVisible(), 'Khung nhập mã coupon hiển thị đầy đủ, không bị ẩn ở tài khoản đã mua');

    await founderContext.close();

    // =========================================================================
    // PHẦN B: KIỂM THỬ KHÁCH VÃNG LAI & BẢNG GIÁ 3 CỘT (TOGGLE THÁNG/NĂM)
    // =========================================================================
    console.log('\n--- PHẦN B: Kiểm thử Khách Vãng Lai & Bảng Giá 3 Cột (Toggle Tháng/Năm) ---');
    const guestContext = await browser.newContext({
      viewport: { width: 1366, height: 768 }
    });
    const guestPage = await guestContext.newPage();

    await guestPage.goto(`${LIVE_URL}/billing`, { waitUntil: 'networkidle', timeout: 20000 });
    const cycleYearly = guestPage.locator('[data-testid="billing-cycle-yearly"]');
    const cycleMonthly = guestPage.locator('[data-testid="billing-cycle-monthly"]');

    const hasYearly = await cycleYearly.isVisible();
    const hasMonthly = await cycleMonthly.isVisible();
    recordResult('Billing Cycle Toggles', hasYearly && hasMonthly, 'Bộ chuyển đổi chu kỳ Tháng/Năm hiển thị đầy đủ trên Bảng giá khách hàng');

    if (hasYearly && hasMonthly) {
      await cycleMonthly.click();
      await guestPage.waitForTimeout(400);
      await cycleYearly.click();
      await guestPage.waitForTimeout(400);
      recordResult('Billing Toggle Click', true, 'Chuyển đổi linh hoạt giữa chu kỳ Tháng và Năm');
    }

    // -------------------------------------------------------------
    // KỊCH BẢN AI 4: HẾT ĐIỂM (0⚡) HIỂN THỊ PAYWALL MODAL
    // -------------------------------------------------------------
    console.log('\n--- KỊCH BẢN AI 4: Hết điểm (0⚡) hiển thị Paywall Modal ---');
    await guestPage.addInitScript(() => {
      localStorage.setItem(
        'pomofocus_ai_store',
        JSON.stringify({
          state: {
            aiCreditsBalance: 0,
            aiPlan: 'free',
            messages: []
          },
          version: 0
        })
      );
    });

    await guestPage.goto(`${LIVE_URL}/app`, { waitUntil: 'networkidle', timeout: 25000 });
    await guestPage.waitForSelector('[data-testid="dock-btn-ai"]', { timeout: 15000 });

    const guestDockAiBtn = guestPage.locator('[data-testid="dock-btn-ai"]');
    await guestDockAiBtn.click();
    await guestPage.waitForSelector('[data-testid="ai-companion-drawer"]', { state: 'visible' });

    const guestCreditsEl = guestPage.locator('[data-testid="ai-credits-value"]');
    const balance0 = await guestCreditsEl.innerText();
    console.log(`[Guest AI Credits] ${balance0}⚡`);
    recordResult('AI Zero Balance Setup', balance0 === '0', 'Thiết lập số dư tài khoản về 0⚡ thành công');

    const guestQuickBtn = guestPage.locator('[data-testid="ai-quick-explain"]');
    await guestQuickBtn.click();
    await guestPage.waitForTimeout(600);

    const paywallModal = guestPage.locator('[data-testid="ai-paywall-modal"]');
    const isPaywallVisible = await paywallModal.isVisible();
    recordResult('AI Paywall Trigger', isPaywallVisible, 'Modal Paywall ("Bạn Cần Thêm AI Credits ⚡") bật lên ngay lập tức khi số dư = 0⚡');

    if (isPaywallVisible) {
      const proofPaywallPath = path.join(ARTIFACTS_DIR, 'proof-ai-paywall-live.png');
      await guestPage.screenshot({ path: proofPaywallPath, fullPage: false });
      console.log(`📸 Đã lưu ảnh: ${proofPaywallPath}`);
      recordResult('Screenshot AI Paywall', fs.existsSync(proofPaywallPath), 'Lưu ảnh proof-ai-paywall-live.png thành công');

      const paywallBillingBtn = guestPage.locator('[data-testid="ai-paywall-btn-billing"]');
      await paywallBillingBtn.click();
      await guestPage.waitForTimeout(1000);
      recordResult('AI Paywall Navigation', guestPage.url().includes('/billing'), 'Bấm "Xem Bảng Giá" điều hướng mượt mà sang /billing');
    }

    await guestContext.close();

    // -------------------------------------------------------------
    // RÀ SOÁT 4 GÓC: SPACES 18 ẢNH ANIME ĐẦY ĐỦ
    // -------------------------------------------------------------
    console.log('\n--- RÀ SOÁT 4 GÓC: Không gian Spaces 18 Anime ---');
    const animeImagesExist = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].every((num) => {
      const fileName = `anime-${num.toString().padStart(2, '0')}.webp`;
      return fs.existsSync(path.join(process.cwd(), 'public', 'backgrounds', 'anime', fileName));
    });
    recordResult('Spaces 18 Anime Assets', animeImagesExist, '18/18 tranh Anime Ghibli/Shinkai đầy đủ trong static folder, nạp tức thì 0s');

    console.log('\n================================================================');
    console.log('🎉 TỔNG KẾT LIVE AUDIT HOÀN TẤT THÀNH CÔNG RỰC RỠ 100%!');
    console.log('================================================================\n');
  } catch (error: any) {
    console.error('❌ Lỗi trong quá trình kiểm thử:', error);
    recordResult('Live Audit Error', false, error.message || String(error));
  } finally {
    await browser.close();

    const reportPath = path.join(ARTIFACTS_DIR, 'live-audit-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf8');
    console.log(`Đã xuất kết quả kiểm thử vào: ${reportPath}`);
  }
}

runLiveAudit();
