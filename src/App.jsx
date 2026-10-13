import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHabits } from './hooks/useHabits';
import { currentStreak } from './utils/streak';
import { isCompleted } from './utils/dates';
import { useTheme } from './hooks/useTheme';
import { useToday } from './hooks/useToday';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TodayView from './components/TodayView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import AddHabitModal from './components/AddHabitModal';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import Toast from './components/Toast';

// Streak lengths worth calling out. Kept short on purpose — a badge for every
// single day would stop meaning anything.
const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];
const TOAST_MS = 6000;

export default function App() {
  const {
    habits, storageReadable, addHabit, updateHabit,
    deleteHabit, restoreHabit, toggleCompletion, replaceAll,
  } = useHabits();
  const { theme, toggleTheme } = useTheme();
  const today = useToday();

  const [tab, setTab] = useState('today');
  const [modalHabit, setModalHabit] = useState(undefined); // undefined = closed, null = new, object = editing
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const modalOpen = modalHabit !== undefined;

  const pendingHabit = habits.find((h) => h.id === pendingDeleteId) || null;

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((next) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ ...next, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Ticking a habit is also the moment to notice a streak milestone. The new
  // streak is computed from what the habit is about to become, so the toast
  // fires on the same tap rather than one tap late.
  function handleToggle(id, dateStr) {
    const habit = habits.find((h) => h.id === id);
    toggleCompletion(id, dateStr);
    if (!habit || isCompleted(habit, dateStr)) return;

    const after = { ...habit, completions: { ...habit.completions, [dateStr]: true } };
    const streak = currentStreak(after, today);
    if (MILESTONES.includes(streak)) {
      showToast({ message: `${streak}-day streak · ${habit.name} 🔥` });
    }
  }

  // Each tab is its own scroll context; without this you land halfway down
  // Settings after scrolling the habit list.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  function openAdd() {
    setModalHabit(null);
  }

  function openEdit(habit) {
    setModalHabit(habit);
  }

  function closeModal() {
    setModalHabit(undefined);
  }

  function handleSave(data) {
    if (modalHabit) updateHabit(modalHabit.id, data);
    else addHabit(data);
    closeModal();
  }

  function requestDelete(id) {
    setPendingDeleteId(id);
  }

  function confirmDelete() {
    const index = habits.findIndex((h) => h.id === pendingDeleteId);
    const removed = index >= 0 ? habits[index] : null;

    deleteHabit(pendingDeleteId);
    setPendingDeleteId(null);
    if (modalOpen) closeModal();

    if (removed) {
      showToast({
        message: `Deleted "${removed.name}"`,
        actionLabel: 'Undo',
        onAction: () => {
          restoreHabit(removed, index);
          dismissToast();
        },
      });
    }
  }

  return (
    <div className="min-h-full">
      <Header theme={theme} onToggleTheme={toggleTheme} today={today} />

      {/* Views are keyed so each one animates in on switch. There is no exit
          animation and no AnimatePresence here on purpose: an interrupted
          exit could leave the whole screen blank with only the header and
          nav bar rendered. */}
      <ErrorBoundary key={`boundary-${tab}`}>
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'today' && (
            <TodayView
              habits={habits}
              onToggle={handleToggle}
              onEdit={openEdit}
              onDelete={requestDelete}
              onAdd={openAdd}
              today={today}
            />
          )}
          {tab === 'stats' && <StatsView habits={habits} onAdd={openAdd} today={today} />}
          {tab === 'settings' && (
            <SettingsView
              habits={habits}
              onReplaceAll={replaceAll}
              storageReadable={storageReadable}
              onToast={showToast}
            />
          )}
        </motion.main>
      </ErrorBoundary>

      <BottomNav active={tab} onChange={setTab} onAdd={openAdd} />

      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
            onDismiss={dismissToast}
          />
        )}
      </AnimatePresence>

      {/* AnimatePresence has to live here, not inside the overlays: a component
          that unmounts itself never gets to run its own exit animation. */}
      <AnimatePresence>
        {modalOpen && (
          <AddHabitModal
            key={modalHabit ? `edit-${modalHabit.id}` : 'new'}
            habit={modalHabit}
            onClose={closeModal}
            onSave={handleSave}
            onDelete={requestDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteId && (
          <ConfirmDialog
            title={pendingHabit ? `Delete "${pendingHabit.name}"?` : 'Delete this habit?'}
            message="Its full history will be removed. This can't be undone."
            confirmLabel="Delete"
            danger
            onCancel={() => setPendingDeleteId(null)}
            onConfirm={confirmDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
