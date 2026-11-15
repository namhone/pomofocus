/**
 * Safe Fetch & JSON Parser Utility
 * Shields the application against WiFi Captive Portals, HTML error pages, and malformed JSON.
 */

import { updateClockOffsetFromResponse } from './clockSync';

export interface SafeJsonResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  isCaptivePortal?: boolean;
}

export interface SafeParseJsonOptions<T> {
  fallback?: T;
  endpointName?: string;
}

/**
 * Safely parses JSON from a Response object, verifying Content-Type header.
 * Prevents Uncaught SyntaxError: Unexpected token '<' when public WiFi redirects to HTML login pages.
 * 
 * If a fallback is provided (either via options.fallback or directly as fallbackValue),
 * errors will return the fallback. Otherwise, a descriptive Error is thrown.
 */
export async function safeParseJson<T = any>(
  res: Response,
  optionsOrFallback?: SafeParseJsonOptions<T> | T
): Promise<T> {
  let fallback: T | undefined;
  let endpointName = 'API';

  if (
    optionsOrFallback &&
    typeof optionsOrFallback === 'object' &&
    ('fallback' in (optionsOrFallback as any) || 'endpointName' in (optionsOrFallback as any))
  ) {
    fallback = (optionsOrFallback as SafeParseJsonOptions<T>).fallback;
    endpointName = (optionsOrFallback as SafeParseJsonOptions<T>).endpointName || 'API';
  } else if (optionsOrFallback !== undefined) {
    fallback = optionsOrFallback as T;
  }

  if (!res) {
    if (fallback !== undefined) return fallback;
    throw new Error(`[safeParseJson] ${endpointName}: Phản hồi mạng không tồn tại (null response).`);
  }

  updateClockOffsetFromResponse(res);

  const contentType = (res.headers?.get ? res.headers.get('content-type') || '' : '').toLowerCase();

  // Check if server returned HTML instead of JSON (Captive Portal / Gateway login / Cloudflare HTML)
  if (contentType.includes('text/html')) {
    if (fallback !== undefined) return fallback;
    throw new Error(`[safeParseJson] ${endpointName}: Phát hiện mạng WiFi yêu cầu đăng nhập (Captive Portal) hoặc máy chủ trả về trang HTML thay vì JSON.`);
  }

  if (!contentType.includes('application/json') && !contentType.includes('+json') && contentType !== '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`[safeParseJson] ${endpointName}: Phản hồi máy chủ không phải JSON (Content-Type: ${contentType}).`);
  }

  try {
    let data: T;
    if (typeof (res as any).text === 'function') {
      const text = await res.text();
      if (!text || text.trim() === '') {
        if (fallback !== undefined) return fallback;
        return {} as T;
      }
      data = JSON.parse(text) as T;
    } else if (typeof (res as any).json === 'function') {
      data = await (res as any).json();
    } else {
      if (fallback !== undefined) return fallback;
      throw new Error(`[safeParseJson] ${endpointName}: Response lacks text() or json() method.`);
    }
    return data;
  } catch (err: any) {
    if (fallback !== undefined) return fallback;
    throw new Error(`[safeParseJson] ${endpointName}: Không thể giải mã dữ liệu JSON (${err?.message || 'SyntaxError'}).`);
  }
}

/**
 * Alternative variant returning a result wrapper { ok, data, error, isCaptivePortal }
 */
export async function safeParseJsonResult<T = any>(
  res: Response,
  fallbackValue: T | null = null
): Promise<SafeJsonResult<T>> {
  if (!res) {
    return {
      ok: false,
      data: fallbackValue,
      error: 'Phản hồi mạng không tồn tại (null response).',
    };
  }

  updateClockOffsetFromResponse(res);

  const contentType = (res.headers?.get ? res.headers.get('content-type') || '' : '').toLowerCase();

  if (contentType.includes('text/html')) {
    return {
      ok: false,
      data: fallbackValue,
      error: 'Mạng hiện tại yêu cầu xác thực WiFi (Captive Portal) hoặc máy chủ không trả về JSON.',
      isCaptivePortal: true,
    };
  }

  if (!contentType.includes('application/json') && !contentType.includes('+json') && contentType !== '') {
    return {
      ok: false,
      data: fallbackValue,
      error: `Phản hồi máy chủ không phải JSON (Content-Type: ${contentType}).`,
    };
  }

  try {
    let data: T;
    if (typeof (res as any).text === 'function') {
      const text = await res.text();
      if (!text || text.trim() === '') {
        return { ok: true, data: fallbackValue };
      }
      data = JSON.parse(text) as T;
    } else if (typeof (res as any).json === 'function') {
      data = await (res as any).json();
    } else {
      return {
        ok: false,
        data: fallbackValue,
        error: 'Response lacks text() or json() method.',
      };
    }
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      data: fallbackValue,
      error: err?.message || 'Dữ liệu phản hồi không đúng chuẩn JSON.',
    };
  }
}
