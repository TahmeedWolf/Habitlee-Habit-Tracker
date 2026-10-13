import { ListChecks, BarChart3, Settings as SettingsIcon, Plus } from 'lucide-react';

const TABS = [
  { id: 'today', label: 'Today', icon: ListChecks },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function BottomNav({ active, onChange, onAdd }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-5 flex justify-center z-30"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
    >
      <div className="flex items-center gap-1 bg-paper-card/90 dark:bg-ink-card/90 backdrop-blur-lg border border-paper-line dark:border-ink-line rounded-full shadow-lg shadow-black/5 px-2 py-2">
        {TABS.slice(0, 2).map((tab) => (
          <TabButton key={tab.id} tab={tab} active={active === tab.id} onClick={() => onChange(tab.id)} />
        ))}

        <button
          type="button"
          onClick={onAdd}
          aria-label="Add habit"
          className="mx-1 w-12 h-12 rounded-full bg-gradient-to-br from-ember to-spark text-ink flex items-center justify-center shadow-glow active:scale-95 transition-transform"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>

        {TABS.slice(2).map((tab) => (
          <TabButton key={tab.id} tab={tab} active={active === tab.id} onClick={() => onChange(tab.id)} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({ tab, active, onClick }) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-full transition-colors ${
        active ? 'bg-ember/15 text-ember' : 'text-dusk dark:text-white/50'
      }`}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </button>
  );
}
