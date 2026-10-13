import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Both imports above are STATIC on purpose. They used to be dynamic
// (`await import(...)`), which made Vite emit them as separate chunks, and
// every chunk with dependencies got a <link rel="modulepreload" crossorigin>
// injected ahead of it. Capacitor serves the app from https://localhost via
// its own local server, which returns no CORS headers, so that preload never
// completed and the import behind it hung — no resolve, no reject, just the
// 8s deadline below firing every time.
//
// Static imports go into the main bundle that the WebView already loads to
// render the app at all. If the app is on screen, the plugin is loaded.
// `build.modulePreload: false` in vite.config.js closes the same hole for
// anything else.
//
// registerPlugin() only reaches for the plugin's web fallback off-device, so
// importing this on Android costs one already-loaded object, not a fetch.

const STORAGE_KEY = 'habitlee:reminder';
const REMINDER_ID = 1;

// A bridge call that never comes back used to leave the switch disabled until
// the app was killed. Nothing here is allowed to hang: every native call is
// raced against a deadline so the UI always recovers and always says why.
const CALL_TIMEOUT_MS = 8000;
const PROMPT_TIMEOUT_MS = 90000; // the permission dialog waits on the user

export const DEFAULT_REMINDER = { enabled: false, time: '20:00' };

// Android already prints "Habitlee: Habit Tracker" in the notification header,
// so a title of "Habitlee" burned the bold line on the app's own name and
// pushed the actual nudge into the grey text. The title is the hook now and
// the body follows through.
//
// Kept short: Android truncates a collapsed notification to roughly one line
// each. Every title leads with a sparkle so the row catches the eye in a
// crowded shade without looking like a game ad.
const MESSAGES = [
  { title: '✨ Two minutes. That is it.', body: 'A small win now beats starting over tomorrow.' },
  { title: '✨ Your streak is still alive', body: 'One tick keeps it that way.' },
  { title: '✨ Today is not over yet', body: 'There is still time to finish strong.' },
  { title: '✨ One tick. Done.', body: 'The hardest part is opening the app.' },
  { title: '✨ Future you says thanks', body: 'Small things, stacked daily, add up fast.' },
  { title: '✨ Do not break the chain', body: 'You have come too far to skip today.' },
  { title: '✨ Momentum is waiting', body: 'Show up once and the rest gets easier.' },
  { title: '✨ Quick win available', body: 'Tick one habit and call it a day.' },
];

// Avoids repeating the message the last schedule used. The nudge is rescheduled
// on every launch, so without this a run of identical nights was possible and
// a repeated notification is one people learn to ignore.
let lastMessageIndex = -1;
const pickMessage = () => {
  if (MESSAGES.length < 2) return MESSAGES[0];
  let i = lastMessageIndex;
  while (i === lastMessageIndex) i = Math.floor(Math.random() * MESSAGES.length);
  lastMessageIndex = i;
  return MESSAGES[i];
};

const SYNC_HINT = 'Rebuild with: npm install, then npm run cap:sync, then npm run apk:share.';

// The time is STORED as 24-hour "HH:MM" because that's what <input type="time">
// reads and writes, and it sorts and parses cleanly. But the input RENDERS in
// the device's locale — on a 12-hour phone the picker says "8:00 PM" while the
// confirmation underneath it said "set for 20:00". Same value, two formats, one
// screen.
//
// Formatting through Intl with the default locale matches whatever the picker
// is already showing: 12-hour here, 24-hour on a phone set that way. Hardcoding
// 12-hour would have fixed this screen and broken the mirror image of it.
function formatTime(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  try {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return hhmm;
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} did not respond within ${Math.round(ms / 1000)}s`)), ms);
    }),
  ]);
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER;
    const parsed = JSON.parse(raw);
    return {
      enabled: !!parsed.enabled,
      time: /^\d{2}:\d{2}$/.test(parsed.time) ? parsed.time : DEFAULT_REMINDER.time,
    };
  } catch {
    return DEFAULT_REMINDER;
  }
}

function loadPlugin() {
  if (!LocalNotifications) throw new Error('notification plugin missing from the bundle');
  return LocalNotifications;
}

// Capacitor knows whether a plugin's native half is actually compiled into
// this build. Asking it up front turns a mysterious hang into a clear message.
function probeSupport() {
  try {
    if (!Capacitor?.isNativePlatform?.()) {
      return { ok: false, reason: 'Reminders only work in the installed Android app.' };
    }
    if (!Capacitor.isPluginAvailable?.('LocalNotifications')) {
      return {
        ok: false,
        reason: `Notifications aren't compiled into this build yet. ${SYNC_HINT}`,
      };
    }
    return { ok: true, reason: null };
  } catch {
    return { ok: false, reason: 'Reminders are unavailable on this platform.' };
  }
}

const describe = (err) => (err?.message ? String(err.message) : String(err ?? 'unknown error'));

export function useReminder() {
  const [reminder, setReminder] = useState(readStored);
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);
  const [support, setSupport] = useState({ ok: null, reason: null }); // ok null = checking

  useEffect(() => {
    setSupport(probeSupport());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminder));
    } catch {
      // preference just won't persist
    }
  }, [reminder]);

  const ensurePermission = useCallback(async (plugin) => {
    let state = await withTimeout(plugin.checkPermissions(), CALL_TIMEOUT_MS, 'Permission check');
    if (state?.display !== 'granted') {
      state = await withTimeout(plugin.requestPermissions(), PROMPT_TIMEOUT_MS, 'Permission request');
    }
    return state?.display === 'granted';
  }, []);

  // One repeating daily notification. Deliberately NOT an exact alarm: those
  // need permissions Google Play only grants to clock and calendar apps.
  //
  // `silent` is for the re-arm on launch: it happens without the user asking,
  // so a success message would be noise. Failures still speak up — a reminder
  // that quietly stopped working is the whole problem this is fixing.
  const schedule = useCallback(async (time, { silent = false } = {}) => {
    let plugin;
    try {
      plugin = loadPlugin();
    } catch (err) {
      setStatus({ kind: 'error', text: `${describe(err)}. ${SYNC_HINT}` });
      return false;
    }

    try {
      const granted = await ensurePermission(plugin);
      if (!granted) {
        setStatus({
          kind: 'error',
          text: 'Android is blocking notifications for Habitlee. Turn them on in Settings › Apps › Habitlee › Notifications, then try again.',
        });
        return false;
      }

      const [hour, minute] = time.split(':').map(Number);
      await withTimeout(
        plugin.cancel({ notifications: [{ id: REMINDER_ID }] }),
        CALL_TIMEOUT_MS,
        'Clearing the old reminder',
      ).catch(() => {});

      const message = pickMessage();

      await withTimeout(
        plugin.schedule({
          notifications: [{
            id: REMINDER_ID,
            title: message.title,
            body: message.body,
            schedule: { on: { hour, minute } },
            // MUST stay false. The plugin defaults `isExactNotification` to
            // true, and on Android 12+ that makes every schedule() call open
            // the system "Alarms & reminders" screen when exact-alarm
            // permission is missing — parking the promise until the user comes
            // back. Since the app deliberately removes SCHEDULE_EXACT_ALARM
            // from the manifest, that screen's toggle is greyed out and the
            // permission can never be granted, so the trip is a dead end.
            //
            // Inexact is what a habit nudge wants anyway: Android batches it
            // with other wakeups within a few minutes of the target time.
            isExactNotification: false,
          }],
        }),
        CALL_TIMEOUT_MS,
        'Scheduling',
      );

      if (!silent) {
        setStatus({ kind: 'ok', text: `Daily reminder set for ${formatTime(time)}. It can arrive a few minutes late — that's normal.` });
      }
      return true;
    } catch (err) {
      setStatus({ kind: 'error', text: `Could not set the reminder: ${describe(err)}` });
      return false;
    }
  }, [ensurePermission]);

  // Re-arm on every launch. Two problems this solves:
  //
  //  1. Android drops scheduled alarms for all sorts of reasons — force stop,
  //     an app update, a battery optimiser, an aggressive OEM ROM. The switch
  //     kept saying ON while nothing was actually scheduled. Re-arming makes
  //     the stored preference true again instead of merely claimed.
  //  2. `schedule: { on: { hour, minute } }` repeats forever with whatever
  //     body string it was given once. Rescheduling here re-runs pickMessage()
  //     so the nudge isn't the same sentence every night for a year.
  //
  // Runs once per mount, and only when reminders are on and the plugin is
  // actually present. If it fails — permission revoked in Android settings,
  // say — the switch is turned off so the UI stops lying, and the error says
  // why.
  const rearmed = useRef(false);
  useEffect(() => {
    if (rearmed.current) return;
    if (support.ok !== true) return;      // still probing, or unsupported
    // Spent as soon as the probe settles, not only when it schedules —
    // otherwise flipping the switch on later would re-enter this and
    // schedule the same reminder twice.
    rearmed.current = true;
    if (!reminder.enabled) return;

    let cancelled = false;
    (async () => {
      const ok = await schedule(reminder.time, { silent: true });
      if (!ok && !cancelled) setReminder((r) => ({ ...r, enabled: false }));
    })();
    return () => { cancelled = true; };
  }, [support.ok, reminder.enabled, reminder.time, schedule]);

  const cancel = useCallback(async () => {
    try {
      const plugin = loadPlugin();
      await withTimeout(
        plugin.cancel({ notifications: [{ id: REMINDER_ID }] }),
        CALL_TIMEOUT_MS,
        'Cancelling',
      );
    } catch {
      // Turning reminders off always succeeds from the user's point of view —
      // worst case there's a stale scheduled notification we couldn't reach.
    }
  }, []);

  const toggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (reminder.enabled) {
        await cancel();
        setReminder((r) => ({ ...r, enabled: false }));
        setStatus({ kind: 'ok', text: 'Daily reminder turned off.' });
        return;
      }
      const ok = await schedule(reminder.time);
      if (ok) setReminder((r) => ({ ...r, enabled: true }));
    } catch (err) {
      setStatus({ kind: 'error', text: `Could not change the reminder: ${describe(err)}` });
    } finally {
      setBusy(false);
    }
  }, [busy, reminder.enabled, reminder.time, cancel, schedule]);

  const setTime = useCallback(async (time) => {
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    setReminder((r) => ({ ...r, time }));
    if (!reminder.enabled) return;
    setBusy(true);
    try {
      await schedule(time);
    } catch (err) {
      setStatus({ kind: 'error', text: `Could not move the reminder: ${describe(err)}` });
    } finally {
      setBusy(false);
    }
  }, [reminder.enabled, schedule]);

  return {
    reminder,
    status,
    busy,
    supported: support.ok,
    unsupportedReason: support.reason,
    toggle,
    setTime,
  };
}
