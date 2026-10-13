import { motion } from 'framer-motion';

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

// segments: [{ done: boolean, stroke: 'stroke-orange-400' }]
export default function TodayRing({ segments, size = 176, children }) {
  const list = Array.isArray(segments) ? segments : [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const n = Math.max(list.length, 1);
  const sweep = 360 / n;
  // Gap has to shrink with the segment count, otherwise a long habit list
  // produces arcs with a negative sweep that render backwards.
  const gap = list.length <= 1 ? 0 : Math.min(7, sweep * 0.35);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={r}
          className="stroke-dusk/20 dark:stroke-white/10"
          strokeWidth="10" fill="none"
        />

        {/* A single segment is a full circle. An SVG arc whose start and end
            points are identical draws nothing at all, so it gets its own
            element instead of a 0°→360° arc. */}
        {list.length === 1 && (
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, opacity: list[0].done ? 1 : 0.22 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={list[0].stroke}
          />
        )}

        {list.length > 1 && list.map((seg, i) => {
          const start = i * sweep + gap / 2;
          const end = (i + 1) * sweep - gap / 2;
          return (
            <motion.path
              key={i}
              d={arcPath(cx, cy, r, start, end)}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, opacity: seg.done ? 1 : 0.22 }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: 'easeOut' }}
              className={seg.stroke}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
