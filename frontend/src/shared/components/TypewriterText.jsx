import { useEffect, useState } from 'react';

// Client-side progressive reveal of a fully-received AI response. This is a
// deliberate stand-in for real token streaming — the backend has no SSE
// endpoint yet (see MockInterviewSessionPage.jsx's own comment on why), so
// there's nothing to actually stream. When that endpoint exists, swapping
// this for real streaming only means feeding characters in as they arrive
// instead of all at once — the reveal UI itself doesn't need to change.
export function TypewriterText({ text, active = true, speed = 12 }) {
  // Starts at 0 via initial state rather than an effect-driven reset — each
  // message gets its own fresh TypewriterText instance (parent keys by
  // message index), so there's never a case where the same instance needs to
  // replay from 0 for new text; mount-time initial state already covers it.
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      // Functional update inside the timer callback, not a direct call in
      // the effect body — this is the pattern React's docs recommend for
      // "subscribe to an external clock and sync state from it".
      setVisibleChars((count) => {
        if (count >= text.length) {
          clearInterval(interval);
          return count;
        }
        return count + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [text, active, speed]);

  return <>{active ? text.slice(0, visibleChars) : text}</>;
}
