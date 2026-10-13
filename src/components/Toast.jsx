import { motion } from 'framer-motion';

// One-at-a-time message bar that floats above the nav. Used for Undo after a
// delete and for streak milestones — both need to be noticed without
// interrupting what you're doing.
export default function Toast({ message, actionLabel, onAction, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      className="fixed left-0 right-0 z-40 px-5 flex justify-center pointer-events-none"
      style={{ bottom: 'calc(var(--safe-bottom) + 104px)' }}
      role="status"
    >
      <div className="pointer-events-auto flex items-center gap-3 max-w-md w-full bg-ink dark:bg-ink-card text-paper border border-white/10 rounded-2xl shadow-lg px-4 py-3">
        <p className="flex-1 text-sm truncate">{message}</p>
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 text-sm font-semibold text-ember px-2 py-1 -mr-1 active:opacity-70"
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 text-white/40 text-lg leading-none px-1 active:opacity-70"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
}
