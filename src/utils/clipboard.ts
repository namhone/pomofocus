/**
 * Safe clipboard copy utility with multi-tier fallback:
 * 1. Native Capacitor Clipboard plugin (if available at runtime)
 * 2. Modern navigator.clipboard.writeText
 * 3. Legacy textarea + document.execCommand('copy') fallback (works even when document loses focus or permissions are restricted in WebView)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== 'string') {
    text = String(text ?? '');
  }

  // 1. Try Capacitor native Clipboard plugin if available on window
  try {
    const capacitorClipboard = (window as any)?.Capacitor?.Plugins?.Clipboard;
    if (capacitorClipboard?.write) {
      await capacitorClipboard.write({ string: text });
      return true;
    }
  } catch {}

  // 2. Try standard navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Continue to fallback if clipboard writeText fails (e.g. not focused in WebView)
    }
  }

  // 3. Fallback: Hidden textarea with document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Prevent scrolling to bottom of page in iOS/Android
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return true;
      }
    } catch (fallbackErr) {
      console.warn('[Clipboard] Fallback execCommand failed:', fallbackErr);
    }
  }

  return false;
}

export default copyToClipboard;
