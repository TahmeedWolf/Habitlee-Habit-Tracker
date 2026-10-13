import { motion } from 'framer-motion';
import { useBackDismiss } from '../hooks/useBackDismiss';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  useBackDismiss(true, onCancel);

  return (
    <motion.div
      className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="w-full max-w-xs bg-paper dark:bg-ink-card rounded-3xl p-5"
      >
        <p className="font-display text-lg font-semibold mb-1.5">{title}</p>
        <p className="text-sm text-dusk dark:text-white/60 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-paper-card dark:bg-ink border border-paper-line dark:border-ink-line text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
              danger ? 'bg-rose-500 text-white' : 'bg-ink dark:bg-paper text-paper dark:text-ink'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
