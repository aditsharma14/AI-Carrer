import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

// Counts up from 0 to `value` once the card scrolls into view. Plain rAF
// loop driven by framer-motion's useInView — no separate animation library.
export function StatCard({ value, suffix = '', label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 900;
    const start = performance.now();

    let frame;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(progress * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-semibold tracking-tight text-slate-900">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}
