import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import {
  Download, Upload, Trash2, Info, ClipboardPaste, AlertTriangle, Bell,
} from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { todayStr } from '../utils/dates';
import { useReminder } from '../hooks/useReminder';

const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '1.0.0';

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export default function SettingsView({
  habits, onReplaceAll, storageReadable = true, onToast,
}) {
  const fileInputRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // { data, count }
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'error', text }
  const [exportJson, setExportJson] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  // Resolved at first render instead of via an effect — it decides which
  // export path is offered, and a one-frame flip from ".json" to "copy JSON"
  // was visible on device.
  const [isNative] = useState(() => {
    try {
      return !!Capacitor?.isNativePlatform?.();
    } catch {
      return false;
    }
  });

  const {
    reminder, status: reminderStatus, busy: reminderBusy,
    supported: remindersSupported, unsupportedReason,
    toggle: toggleReminder, setTime,
  } = useReminder();

  function notify(kind, text) {
    if (onToast) onToast({ message: text });
    else setStatus({ kind, text });
  }

  async function handleExport() {
    const json = JSON.stringify(habits, null, 2);
    const filename = `habitlee-backup-${todayStr()}.json`;

    // Blob downloads via <a download> do nothing inside an Android WebView —
    // there's no download manager wired to blob: URLs. On device we put the
    // backup on the clipboard and also show it for manual copying.
    if (!isNative) {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus({ kind: 'ok', text: `Saved ${filename}` });
        return;
      } catch {
        // fall through to the clipboard path
      }
    }

    const copied = await copyText(json);
    setExportJson(json);
    setStatus({
      kind: copied ? 'ok' : 'error',
      text: copied
        ? 'Backup copied to your clipboard — paste it into any notes or files app.'
        : 'Could not reach the clipboard. Copy the text below manually.',
    });
  }

  // Importing overwrites everything, so it asks first whenever there is
  // something to lose.
  function requestImport(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      notify('error', 'That doesn\u2019t look like a valid Habitlee backup.');
      return;
    }
    if (!Array.isArray(parsed)) {
      notify('error', 'That doesn\u2019t look like a valid Habitlee backup.');
      return;
    }
    if (habits.length === 0) {
      applyImport(parsed);
      return;
    }
    setPendingImport({ data: parsed, count: parsed.length });
  }

  function applyImport(data) {
    const ok = onReplaceAll(data);
    setPendingImport(null);
    if (!ok) {
      notify('error', 'That doesn\u2019t look like a valid Habitlee backup.');
      return;
    }
    setPasteOpen(false);
    setPasteValue('');
    notify('ok', `Imported ${data.length} habit${data.length === 1 ? '' : 's'}.`);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => requestImport(String(reader.result ?? ''));
    reader.onerror = () => notify('error', 'Could not read that file.');
    reader.readAsText(file);
  }

  return (
    <div className="px-5 pb-32 pt-2">
      <p className="font-display text-xl font-semibold mb-4">Settings</p>

      {!storageReadable && (
        <div className="mb-6 rounded-3xl border border-amber-400/40 bg-amber-400/10 p-4 flex gap-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <p className="text-xs text-dusk dark:text-white/70">
            Saved habits could not be read on this device, so the app started
            empty. The unreadable data was kept aside rather than overwritten —
            nothing new is saved until you add or change a habit.
          </p>
        </div>
      )}

      <Section title="Reminders">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Bell size={17} className="text-dusk dark:text-white/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Daily reminder</p>
            <p className="text-xs text-dusk dark:text-white/45">
              {reminderBusy
                ? 'Working\u2026'
                : unsupportedReason || 'One nudge a day, around the time you choose.'}
            </p>
          </div>
          <Switch
            checked={reminder.enabled}
            onChange={toggleReminder}
            busy={reminderBusy}
            disabled={remindersSupported === false}
            label="Daily reminder"
          />
        </div>

        {reminder.enabled && (
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <label htmlFor="reminder-time" className="text-sm font-medium">Remind me at</label>
            <input
              id="reminder-time"
              type="time"
              value={reminder.time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl bg-paper dark:bg-ink border border-paper-line dark:border-ink-line px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ember/50"
            />
          </div>
        )}
      </Section>

      {/* This message block was dropped in a previous edit, which meant every
          reminder failure happened silently. Nothing about reminders should
          fail without saying so. */}
      {reminderStatus && (
        <p
          className={`-mt-4 mb-6 px-1 text-xs ${
            reminderStatus.kind === 'error' ? 'text-rose-500' : 'text-dusk dark:text-white/50'
          }`}
          role="status"
        >
          {reminderStatus.text}
        </p>
      )}

      <Section title="Your data">
        <Row icon={Download} label={isNative ? 'Export backup (copy JSON)' : 'Export backup (.json)'} onClick={handleExport} />
        <Row icon={Upload} label="Import backup from file" onClick={() => { setStatus(null); fileInputRef.current?.click(); }} />
        <Row icon={ClipboardPaste} label="Import backup from text" onClick={() => { setStatus(null); setPasteOpen((v) => !v); }} />
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileChange} />
        <Row icon={Trash2} label="Clear all habits" onClick={() => setConfirmClear(true)} danger />
      </Section>

      {status && (
        <p className={`-mt-4 mb-6 px-1 text-xs ${status.kind === 'error' ? 'text-rose-500' : 'text-dusk dark:text-white/50'}`}>
          {status.text}
        </p>
      )}

      {pasteOpen && (
        <div className="mb-6">
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="Paste the contents of a Habitlee backup here"
            rows={5}
            className="w-full rounded-2xl bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line px-4 py-3 text-xs font-mono outline-none focus:ring-2 focus:ring-ember/50"
          />
          <button
            type="button"
            disabled={!pasteValue.trim()}
            onClick={() => requestImport(pasteValue)}
            className="mt-2 w-full py-2.5 rounded-2xl bg-gradient-to-br from-ember to-spark text-ink font-semibold text-sm disabled:opacity-40"
          >
            Replace my habits with this backup
          </button>
        </div>
      )}

      {exportJson && (
        <div className="mb-6">
          <p className="text-xs font-medium text-dusk dark:text-white/50 mb-2">Your backup</p>
          <textarea
            readOnly
            value={exportJson}
            rows={6}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-2xl bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line px-4 py-3 text-xs font-mono outline-none"
          />
        </div>
      )}

      <Section title="About">
        <div className="px-4 py-3 flex gap-3 text-sm text-dusk dark:text-white/50">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>
            Habitlee keeps everything on this device only — no account, no
            ads, no tracking. Your habits never leave your phone unless you
            export them yourself.
          </p>
        </div>
        <p className="px-4 pb-3 text-xs text-dusk dark:text-white/30 font-mono">
          v{APP_VERSION} · {habits.length} habit{habits.length === 1 ? '' : 's'}
        </p>
      </Section>

      <AnimatePresence>
        {pendingImport && (
          <ConfirmDialog
            title="Replace all habits?"
            message={`This backup has ${pendingImport.count} habit${pendingImport.count === 1 ? '' : 's'}. Your current ${habits.length} will be replaced and their history removed.`}
            confirmLabel="Replace"
            danger
            onCancel={() => setPendingImport(null)}
            onConfirm={() => applyImport(pendingImport.data)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmClear && (
          <ConfirmDialog
            title="Clear all habits?"
            message="This deletes every habit and all of its history from this device. This can't be undone."
            confirmLabel="Clear everything"
            danger
            onCancel={() => setConfirmClear(false)}
            onConfirm={() => {
              onReplaceAll([]);
              setConfirmClear(false);
              notify('ok', 'All habits cleared.');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Switch({ checked, onChange, label, disabled, busy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={busy || undefined}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onChange}
      className={`shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${
        checked ? 'bg-ember' : 'bg-dusk/25 dark:bg-white/15'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      {/* Working state pulses instead of greying out — a dimmed control reads
          as permanently broken, which is exactly how a hung call looked. */}
      <span
        className={`block w-6 h-6 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        } ${busy ? 'animate-pulse' : ''}`}
      />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-dusk dark:text-white/40 uppercase tracking-wide mb-2 px-1">{title}</p>
      <div className="rounded-3xl bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line overflow-hidden divide-y divide-paper-line dark:divide-ink-line">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left ${
        danger ? 'text-rose-500' : ''
      }`}
    >
      <Icon size={17} className={danger ? 'text-rose-500' : 'text-dusk dark:text-white/50'} />
      {label}
    </button>
  );
}
