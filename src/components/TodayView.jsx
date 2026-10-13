import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { isDue, isCompleted, todayStr } from '../utils/dates';
import { colorFor } from '../utils/colors';
import TodayRing from './TodayRing';
import HabitCard from './HabitCard';
import EmptyState from './EmptyState';
import Celebration from './Celebration';

export default function TodayView({ habits, onToggle, onEdit, onDelete, onAdd, today = todayStr() }) {
  const dueToday = habits.filter((h) => isDue(h, today));
  // Habits that repeat on other weekdays still have to be reachable. Filtering
  // them off the screen entirely made an edit look like an accidental delete.
  const restToday = habits.filter((h) => !isDue(h, today));
  const doneToday = dueToday.filter((h) => isCompleted(h, today));
  const allDone = dueToday.length > 0 && doneToday.length === dueToday.length;

  const [celebrating, setCelebrating] = useState(false);
  const wasAllDone = useRef(null);

  useEffect(() => {
    // First run just records the state — switching to this tab when the day is
    // already finished shouldn't set off the confetti again.
    if (wasAllDone.current === null) {
      wasAllDone.current = allDone;
      return undefined;
    }
    if (allDone && !wasAllDone.current) {
      wasAllDone.current = true;
      setCelebrating(true);
      const timer = setTimeout(() => setCelebrating(false), 1400);
      return () => clearTimeout(timer);
    }
    wasAllDone.current = allDone;
    return undefined;
  }, [allDone]);

  if (habits.length === 0) return <EmptyState onAdd={onAdd} />;

  const segments = dueToday.map((h) => ({
    done: isCompleted(h, today),
    stroke: colorFor(h.color).stroke,
  }));

  return (
    <div className="px-5 pb-32">
      <div className="relative flex flex-col items-center py-6">
        <AnimatePresence>{celebrating && <Celebration key="confetti" />}</AnimatePresence>
        <TodayRing segments={segments}>
          <div className="text-center">
            <p className="font-display text-3xl font-semibold leading-none">
              {doneToday.length}<span className="text-dusk dark:text-white/40">/{dueToday.length}</span>
            </p>
            <p className="text-[11px] uppercase tracking-wide text-dusk dark:text-white/40 mt-1">
              done today
            </p>
          </div>
        </TodayRing>

        <div className="h-6 mt-3 flex items-center">
          <AnimatePresence mode="wait">
            {allDone && (
              <motion.p
                key="alldone"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm font-semibold text-emerald-500 dark:text-emerald-400"
              >
                Day complete. Nice work 🎉
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {dueToday.length === 0 ? (
        <p className="text-center text-sm text-dusk dark:text-white/50 py-6">
          Nothing due today — enjoy the rest of it. 🌙
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {dueToday.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              today={today}
            />
          ))}
        </div>
      )}

      {restToday.length > 0 && (
        <>
          <p className="mt-8 mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-dusk dark:text-white/35">
            Not scheduled today
          </p>
          <div className="flex flex-col gap-3">
            {restToday.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                today={today}
                offSchedule
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
