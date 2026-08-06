import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A plain portal + backdrop instead of a dialog library — this app needs
// "close on Escape / backdrop click / X button" and nothing more exotic
// (no nested modals), so pulling in Radix/Headless UI for this would be the
// over-engineering the brief warns against. Focus management (trap + restore)
// is still handled by hand below, since that part is a real accessibility
// requirement, not an "exotic" one — a modal a keyboard user can Tab out of
// (into content hidden behind the backdrop) fails WCAG 2.4.3 in practice.
export function Modal({ open, onClose, title, children, className }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Remember what had focus before the modal opened so it can be restored
    // on close — otherwise focus silently drops to <body> and a keyboard/
    // screen-reader user loses their place in the page.
    triggerRef.current = document.activeElement;

    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();

    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-md',
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
