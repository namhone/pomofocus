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
