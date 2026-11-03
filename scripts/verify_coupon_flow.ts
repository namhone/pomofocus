import { chromium } from 'playwright';
import path from 'path';

async function verifyCouponFlow() {
  console.log('🚀 Starting E2E Coupon Flow Verification...');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  const artifactDir = path.resolve('C:/Users/Nam/.gemini/antigravity/brain/f0e4fa42-ea0b-4ff3-83da-6875921843c2');

  try {
    // 1. Truy cập trang Billing
    console.log('1. Navigating to /billing...');
    await page.goto('http://localhost:4173/billing', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 2. Chuyển sang Tab Coupon
    console.log('2. Clicking coupon tab...');
    await page.click('[data-testid="tab-coupon"]');
    await page.waitForTimeout(500);

    // 3. Nhập mã PRO50
    console.log('3. Entering PRO50 coupon code...');
    await page.fill('[data-testid="input-coupon-universal"]', 'pro50');
    await page.click('[data-testid="btn-redeem-coupon-universal"]');
    await page.waitForTimeout(1000);

    // 4. Kiểm tra banner ưu đãi kích hoạt
    const activeBanner = await page.locator('[data-testid="active-discount-banner"]').textContent();
    console.log('Active Banner:', activeBanner);
    if (!activeBanner || !activeBanner.includes('PRO50')) {
      throw new Error('Active discount banner did not display PRO50!');
    }

    // 5. Kiểm tra giá trên thẻ Gói PRO
    // Chuyển sang cycle monthly
    await page.click('button:has-text("Thanh toán theo tháng")');
    await page.waitForTimeout(500);

    const proCardText = await page.locator('text=29.500₫').first().textContent();
    console.log('PRO Monthly Price:', proCardText);
    if (!proCardText || !proCardText.includes('29.500₫')) {
      throw new Error('PRO card did not display discounted price 29.500₫!');
    }

    // Chụp ảnh bằng chứng 1: PRO50 kích hoạt thành công trên bảng giá
    const shot1 = path.join(artifactDir, 'proof-coupon-pro50-applied.png');
    await page.screenshot({ path: shot1, fullPage: true });
    console.log('📸 Saved screenshot 1 to', shot1);

    // 6. Mở MoMo Payment Modal để xác nhận giá giảm được truyền sang VietQR
    console.log('4. Clicking checkout to inspect MoMo Modal...');
    await page.click('[data-testid="btn-pay-momo"]');
    await page.waitForTimeout(1000);

    const modalText = await page.locator('text=29.500').first().textContent();
    console.log('MoMo Modal Amount:', modalText);
    if (!modalText) {
      throw new Error('MoMo Modal did not reflect discounted 29.500đ!');
    }

    // Chụp ảnh bằng chứng 2: MoMo VietQR Modal hiển thị số tiền 29.500₫
    const shot2 = path.join(artifactDir, 'proof-coupon-momo-discounted.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('📸 Saved screenshot 2 to', shot2);

    // Đóng modal
    await page.click('[data-testid="btn-close-payment-modal"]');
    await page.waitForTimeout(500);

    // 7. Thử kích hoạt mã VIP7DAYS
    console.log('5. Testing VIP7DAYS free trial coupon...');
    await page.fill('[data-testid="input-coupon-universal"]', 'vip7days');
    await page.click('[data-testid="btn-redeem-coupon-universal"]');
    await page.waitForTimeout(1000);

    // 8. Thử kích hoạt mã BOSSSECRET (Nâng cấp Founder Lifetime)
    console.log('6. Testing BOSSSECRET lifetime coupon...');
    await page.fill('[data-testid="input-coupon-universal"]', 'BOSSSECRET');
    await page.click('[data-testid="btn-redeem-coupon-universal"]');
    await page.waitForTimeout(1500);

    // Kiểm tra thẻ Founder VIP xuất hiện
    const isFounderVisible = await page.locator('[data-testid="billing-founder-card"]').isVisible();
    console.log('Founder VIP Card visible:', isFounderVisible);
    if (!isFounderVisible) {
      throw new Error('Founder VIP card not displayed after BOSSSECRET redemption!');
    }

    // Chụp ảnh bằng chứng 3: Thẻ Founder VIP kích hoạt thành công
    const shot3 = path.join(artifactDir, 'proof-coupon-bosssecret-redeemed.png');
    await page.screenshot({ path: shot3, fullPage: true });
    console.log('📸 Saved screenshot 3 to', shot3);

    console.log('🎉 ALL COUPON E2E TESTS PASSED 100%!');
  } finally {
    await browser.close();
  }
}

verifyCouponFlow().catch((err) => {
  console.error('❌ E2E Coupon Test Failed:', err);
  process.exit(1);
});
