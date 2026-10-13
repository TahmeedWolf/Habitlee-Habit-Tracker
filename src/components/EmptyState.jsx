import { Sparkles } from 'lucide-react';

export default function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-16">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-ember to-spark flex items-center justify-center mb-5 shadow-glow">
        <Sparkles size={28} className="text-ink" />
      </div>
      <p className="font-display text-xl font-semibold mb-1.5">Start your first tiny win</p>
      <p className="text-sm text-dusk dark:text-white/50 max-w-[26ch] mb-6">
        Small, repeatable actions compound. Add one habit you can actually keep tomorrow.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="px-5 py-2.5 rounded-full bg-ink dark:bg-paper text-paper dark:text-ink font-medium text-sm"
      >
        Add a habit
      </button>
    </div>
  );
}
