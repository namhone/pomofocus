import { useEffect, useRef } from 'react';

// Scoped to satellite dialogs: contain keyboard focus and restore the opener.
export function useSatelliteDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
    (controls()[0] || dialog).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key === 'Tab') {
        const items = controls();
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => { dialog.removeEventListener('keydown', handleKey); if (opener?.isConnected) opener.focus(); };
  }, [open]);
  return ref;
}
