import DOMPurify from 'dompurify';

const DEFAULT_ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'br', 'hr',
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'mark',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'a', 'img'
];

const DEFAULT_ALLOWED_ATTR = [
  'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style', 'width', 'height'
];

/**
 * Robust HTML sanitizer powered by DOMPurify
 * Strips XSS vectors (<script>, <img onerror>, javascript: URIs) while preserving rich-text formatting.
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  if (!dirty || typeof dirty !== 'string') return '';

  if (typeof window === 'undefined') {
    // Defensive SSR fallback
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript:\s*[^"'>\s]*/gi, '');
  }

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
    ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ...options
  };

  return String(DOMPurify.sanitize(dirty, config as any));
}

/**
 * SVG-specific sanitizer for QR codes and vector graphics
 */
export function sanitizeSvg(dirtySvg: string, options?: DOMPurify.Config): string {
  if (!dirtySvg || typeof dirtySvg !== 'string') return '';

  if (typeof window === 'undefined') {
    return dirtySvg
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  const config: DOMPurify.Config = {
    USE_PROFILES: { svg: true, svgFilters: true },
    ...options
  };

  return String(DOMPurify.sanitize(dirtySvg, config as any));
}
