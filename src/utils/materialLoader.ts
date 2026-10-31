/**
 * Dynamic Client-Side Document & PDF/Word Utilities
 * Nạp động các thư viện xử lý tài liệu khi người dùng tải file lên
 * Chạy 100% trên trình duyệt (client-side), không truyền dữ liệu ra ngoài.
 */

declare global {
  interface Window {
    pdfjsLib?: any;
    mammoth?: any;
  }
}

// 1. Nạp pdf.js từ CDN ổn định của Mozilla / Cloudflare
export async function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('pdfjsLib không khởi tạo được'));
      }
    };
    script.onerror = () => reject(new Error('Không thể tải thư viện PDF.js từ CDN'));
    document.head.appendChild(script);
  });
}

// 2. Nạp mammoth.js để đọc file Word (.docx)
export async function loadMammoth(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (window.mammoth) return window.mammoth;

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mammoth) {
        resolve(window.mammoth);
      } else {
        reject(new Error('mammoth không khởi tạo được'));
      }
    };
    script.onerror = () => reject(new Error('Không thể tải thư viện Mammoth từ CDN'));
    document.head.appendChild(script);
  });
}

// 3. Render một trang PDF lên Canvas đích
export async function renderPdfPageToCanvas(
  pdfDoc: any,
  pageNumber: number,
  targetCanvas: HTMLCanvasElement
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1 });

  // Tính scale vừa vặn khung hiển thị (tối đa width 1200)
  const maxW = 1200;
  const scale = Math.min(2.0, maxW / unscaledViewport.width);
  const viewport = page.getViewport({ scale });

  targetCanvas.width = viewport.width;
  targetCanvas.height = viewport.height;

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được context 2D');

  await page.render({
    canvasContext: ctx,
    viewport
  }).promise;

  return { width: viewport.width, height: viewport.height };
}

// 3b. Render chế độ Quyển Sách mở 2 trang song song (Book Spread View)
export async function renderPdfBookSpreadToCanvas(
  pdfDoc: any,
  leftPageNum: number,
  rightPageNum: number,
  targetCanvas: HTMLCanvasElement
): Promise<{ width: number; height: number; leftWidth: number }> {
  // 1. Render Trang Trái
  const leftPage = await pdfDoc.getPage(leftPageNum);
  const leftUnscaled = leftPage.getViewport({ scale: 1 });
  const maxSpreadW = 1600;
  const singleMaxW = maxSpreadW / 2;
  const scaleLeft = Math.min(2.0, singleMaxW / leftUnscaled.width);
  const leftViewport = leftPage.getViewport({ scale: scaleLeft });

  const canvasLeft = document.createElement('canvas');
  canvasLeft.width = leftViewport.width;
  canvasLeft.height = leftViewport.height;
  const ctxLeft = canvasLeft.getContext('2d');
  if (ctxLeft) {
    await leftPage.render({ canvasContext: ctxLeft, viewport: leftViewport }).promise;
  }

  // 2. Render Trang Phải (nếu có trong tổng số trang)
  let canvasRight: HTMLCanvasElement | null = null;
  if (rightPageNum <= pdfDoc.numPages) {
    const rightPage = await pdfDoc.getPage(rightPageNum);
    const rightUnscaled = rightPage.getViewport({ scale: 1 });
    const scaleRight = Math.min(2.0, singleMaxW / rightUnscaled.width);
    const rightViewport = rightPage.getViewport({ scale: scaleRight });

    canvasRight = document.createElement('canvas');
    canvasRight.width = rightViewport.width;
    canvasRight.height = rightViewport.height;
    const ctxRight = canvasRight.getContext('2d');
    if (ctxRight) {
      await rightPage.render({ canvasContext: ctxRight, viewport: rightViewport }).promise;
    }
  }

  const totalW = canvasLeft.width + (canvasRight ? canvasRight.width : canvasLeft.width);
  const totalH = Math.max(canvasLeft.height, canvasRight ? canvasRight.height : canvasLeft.height);

  targetCanvas.width = totalW;
  targetCanvas.height = totalH;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('Không lấy được context 2D');

  // Vẽ nền trang
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, totalW, totalH);

  // Vẽ Trang Trái
  ctx.drawImage(canvasLeft, 0, 0);

  // Vẽ Trang Phải (nếu trang cuối là số lẻ thì để trang phải màu giấy trắng có watermark nhẹ)
  const spineX = canvasLeft.width;
  if (canvasRight) {
    ctx.drawImage(canvasRight, spineX, 0);
  } else {
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(spineX, 0, canvasLeft.width, canvasLeft.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('(Hết trang tài liệu)', spineX + canvasLeft.width / 2, canvasLeft.height / 2);
    ctx.textAlign = 'start';
  }

  // Hiệu ứng Đổ bóng gáy sách (Spine Shadow Gradient)
  const spineShadowW = 32;
  const grad = ctx.createLinearGradient(spineX - spineShadowW, 0, spineX + spineShadowW, 0);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.44, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(0.56, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(spineX - spineShadowW, 0, spineShadowW * 2, totalH);

  // Đường chỉ gáy sách mảnh
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(spineX, 0);
  ctx.lineTo(spineX, totalH);
  ctx.stroke();

  return { width: totalW, height: totalH, leftWidth: canvasLeft.width };
}

// 4. Trích xuất toàn bộ văn bản từ PDF thành đề cương chữ
export async function extractTextFromPdf(pdfDoc: any): Promise<string> {
  const pagesText: string[] = [];
  const numPages = pdfDoc.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map((item: any) => item.str);
    pagesText.push(`### [Trang ${i}]\n` + pageStrings.join(' '));
  }

  return pagesText.join('\n\n');
}

// 5. Đọc file Word (.docx) chuyển thành HTML và Plaintext
export async function parseDocxFile(file: File): Promise<{ html: string; rawText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const mammoth = await loadMammoth();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    return {
      html: result.value,
      rawText: rawResult.value
    };
  } catch (err) {
    console.warn('Lỗi đọc bằng mammoth, sử dụng fallback plain text:', err);
    // Fallback: Đọc text cơ bản nếu không tải được mammoth
    const text = await file.text();
    return {
      html: `<p>${text.slice(0, 5000)}</p>`,
      rawText: text.slice(0, 5000)
    };
  }
}
