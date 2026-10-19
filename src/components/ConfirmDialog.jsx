import { useBackDismiss } from '../hooks/useBackDismiss';

// 1.0.3: plain elements + one CSS animation, no Framer Motion.
//
// On Android the Framer Motion version of this dialog flickered twice: the
// screen behind flashed un-dimmed for a frame as it opened, and the dialog
// flashed back for a frame after it closed. Both are "end of animation"
// frames, where the animation hands over to the final style.
//
// So, nothing hands over any more:
// - the dim + blur backdrop appears instantly (no opacity animation on an
//   element that carries a backdrop-filter);
// - only the card animates in, using a CSS keyframe with fill-mode "both",
//   so its final state is held by the animation itself;
// - closing removes it immediately (no exit animation to finish).
export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) {
  useBackDismiss(true, onCancel);

  return (
    <div
      className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center px-6"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="habitlee-pop-in w-full max-w-xs bg-paper dark:bg-ink-card rounded-3xl p-5"
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
      </div>
    </div>
  );
}
