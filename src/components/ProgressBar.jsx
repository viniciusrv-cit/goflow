import { useState, useEffect } from 'react';

// Fake non-linear progress: fast start, decelerates near estimated end
export default function ProgressBar({ estimatedMs, startedAt }) {
  const [pct, setPct] = useState(2);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (estimatedMs) {
        // Non-linear: sqrt curve, caps at 92%
        const raw = Math.min(Math.sqrt(elapsed / estimatedMs), 1) * 92;
        setPct(Math.max(raw, 2));
      } else {
        // Indeterminate: slow crawl
        setPct(p => Math.min(p + 0.3, 75));
      }
    }, 200);
    return () => clearInterval(interval);
  }, [startedAt, estimatedMs]);

  return (
    <div className="progress-bar-track">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
