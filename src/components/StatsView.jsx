import { Flame, Trophy, Target } from 'lucide-react';
import { colorFor } from '../utils/colors';
import { currentStreak, longestStreak, completionRate } from '../utils/streak';
import { todayStr, frequencyLabel } from '../utils/dates';
import SparkTrail from './SparkTrail';
import EmptyState from './EmptyState';

export default function StatsView({ habits, onAdd, today = todayStr() }) {
  if (habits.length === 0) return <EmptyState onAdd={onAdd} />;

  return (
    <div className="px-5 pb-32 pt-2">
      <p className="font-display text-xl font-semibold mb-4">Your progress</p>
      <div className="flex flex-col gap-4">
        {habits.map((h) => {
          const color = colorFor(h.color);
          return (
            <div
              key={h.id}
              className="rounded-3xl bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.grad} flex items-center justify-center text-lg`}>
                  {h.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{h.name}</p>
                  <p className="text-xs text-dusk dark:text-white/45 truncate">{frequencyLabel(h.frequency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat icon={Flame} label="Current" value={currentStreak(h, today)} accent={color.text} />
                <Stat icon={Trophy} label="Longest" value={longestStreak(h, today)} accent={color.text} />
                <Stat icon={Target} label="Rate" value={`${completionRate(h, today)}%`} accent={color.text} />
              </div>

              <p className="text-[10px] uppercase tracking-widest text-dusk dark:text-white/35 mb-2">
                Last 28 days
              </p>
              <SparkTrail habit={h} colorMeta={color} days={28} size="lg" today={today} grid />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl bg-paper dark:bg-ink py-2.5 flex flex-col items-center gap-0.5">
      <Icon size={14} className={accent} />
      <p className="font-display text-base font-semibold leading-none">{value}</p>
      <p className="text-[10px] text-dusk dark:text-white/40">{label}</p>
    </div>
  );
}
