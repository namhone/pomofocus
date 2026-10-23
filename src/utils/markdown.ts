/**
 * Safe Markdown Parser & Sanitizer
 * Đảm bảo 100% an toàn chống tấn công XSS (Cross-Site Scripting)
 * bằng cách escape toàn bộ thẻ HTML trước khi chuyển đổi cú pháp Markdown.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Chỉ cho phép URL bắt đầu bằng http://, https://, hoặc đường dẫn nội bộ /
  // Chặn tuyệt đối javascript:, data:, vbscript:
  if (/^(https?:\/\/|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return '#unsafe-link';
}

export function renderSafeMarkdown(markdown: string): string {
  if (!markdown) return '';

  // 1. Escape toàn bộ HTML thô ngay từ đầu để triệt tiêu mọi thẻ độc hại
  const escaped = escapeHtml(markdown);

  const lines = escaped.split('\n');
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Xử lý Code Block (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlLines.push(
          `<pre class="bg-slate-950/80 p-3 rounded-xl border border-white/10 text-xs overflow-x-auto text-emerald-400 font-mono my-2"><code>${codeBlockBuffer.join(
            '\n'
          )}</code></pre>`
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        if (inList) {
          htmlLines.push('</ul>');
          inList = false;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Xử lý Unordered Lists & Task Lists
    if (/^[-*]\s+\[([ xX])\]\s+(.*)/.test(line)) {
      if (!inList) {
        htmlLines.push('<ul class="space-y-1 my-2">');
        inList = true;
      }
      const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const itemText = parseInlineMarkdown(match[2]);
        htmlLines.push(
          `<li class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" disabled ${
            isChecked ? 'checked' : ''
          } class="rounded border-slate-700 bg-slate-800 text-indigo-500"/><span class="${
            isChecked ? 'line-through text-slate-500' : ''
          }">${itemText}</span></li>`
        );
      }
      continue;
    } else if (/^[-*]\s+(.*)/.test(line)) {
      if (!inList) {
        htmlLines.push('<ul class="list-disc list-inside space-y-1 my-2 text-xs text-slate-300">');
        inList = true;
      }
      const match = line.match(/^[-*]\s+(.*)/);
      if (match) {
        htmlLines.push(`<li>${parseInlineMarkdown(match[1])}</li>`);
      }
      continue;
    } else {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
    }

    // Xử lý Headers
    if (line.startsWith('### ')) {
      htmlLines.push(
        `<h3 class="text-sm font-bold text-slate-200 mt-3 mb-1">${parseInlineMarkdown(
          line.substring(4)
        )}</h3>`
      );
    } else if (line.startsWith('## ')) {
      htmlLines.push(
        `<h2 class="text-base font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-white/10">${parseInlineMarkdown(
          line.substring(3)
        )}</h2>`
      );
    } else if (line.startsWith('# ')) {
      htmlLines.push(
        `<h1 class="text-lg font-extrabold text-white mt-4 mb-2 pb-1 border-b border-white/20">${parseInlineMarkdown(
          line.substring(2)
        )}</h1>`
      );
    } else if (line.startsWith('&gt; ')) {
      // Blockquote
      htmlLines.push(
        `<blockquote class="border-l-2 border-indigo-500 pl-3 my-2 text-xs text-slate-400 italic">${parseInlineMarkdown(
          line.substring(5)
        )}</blockquote>`
      );
    } else if (line.trim() === '---') {
      // Horizontal Rule
      htmlLines.push('<hr class="my-3 border-white/10"/>');
    } else if (line.trim() === '') {
      htmlLines.push('<div class="h-2"></div>');
    } else {
      // Đoạn văn thông thường
      htmlLines.push(
        `<p class="text-xs text-slate-300 leading-relaxed my-1">${parseInlineMarkdown(line)}</p>`
      );
    }
  }

  if (inList) {
    htmlLines.push('</ul>');
  }

  if (inCodeBlock && codeBlockBuffer.length > 0) {
    htmlLines.push(
      `<pre class="bg-slate-950/80 p-3 rounded-xl border border-white/10 text-xs overflow-x-auto text-emerald-400 font-mono my-2"><code>${codeBlockBuffer.join(
        '\n'
      )}</code></pre>`
    );
  }

  return htmlLines.join('\n');
}

/**
 * Xử lý các thành phần inline: Bold, Italic, Inline Code, Links
 */
function parseInlineMarkdown(text: string): string {
  let result = text;

  // Inline Code: `code`
  result = result.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-amber-300 font-mono">$1</code>'
  );

  // Bold: **text** hoặc __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  result = result.replace(/__([^_]+)__/g, '<strong class="font-bold text-white">$1</strong>');

  // Italic: *text* hoặc _text_
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em class="italic text-slate-200">$1</em>');

  // Links: [text](url) với url được sanitize nghiêm ngặt
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, rawUrl) => {
    const cleanUrl = sanitizeUrl(rawUrl);
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">${linkText}</a>`;
  });

  return result;
}
