import { motion } from 'framer-motion';

const PIECES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  return {
    id: i,
    x: Math.cos(angle) * (70 + (i % 4) * 16),
    y: Math.sin(angle) * (70 + (i % 3) * 18),
    rotate: (i % 2 ? 1 : -1) * (90 + i * 12),
    delay: (i % 5) * 0.02,
    className: [
      'bg-ember', 'bg-spark', 'bg-emerald-400', 'bg-sky-400', 'bg-rose-400',
    ][i % 5],
    square: i % 3 === 0,
  };
});

// A short burst from the centre of the progress ring when the last habit of
// the day gets ticked. Deliberately non-blocking: nothing to dismiss, gone in
// under a second and a half.
export default function Celebration() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden="true">
      {PIECES.map((p) => (
        <motion.span
          key={p.id}
          className={`absolute ${p.className} ${p.square ? 'rounded-[2px]' : 'rounded-full'}`}
          style={{ width: p.square ? 7 : 6, height: p.square ? 7 : 6 }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.x,
            y: [0, p.y, p.y + 26],
            opacity: [0, 1, 0],
            scale: [0.4, 1, 0.9],
            rotate: p.rotate,
          }}
          transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}
