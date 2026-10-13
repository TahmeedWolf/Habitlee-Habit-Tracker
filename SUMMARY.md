# Habitlee — project handoff

Everything needed to pick this up in a fresh conversation. Written 8 September 2026.

---

## The goal

Ship **Habitlee: Habit Tracker** to the Google Play Store as fast as reasonably
possible, as a live project to show recruiters, companies and clients. It does
not need to be perfect — but it must not annoy people over time, because a
1-star review on a portfolio app is worse than no app.

Secondary goals: it should be fun to use, pull people back in, and encourage
them to stick with their habits. Ads are planned eventually, **not now**.

Guiding constraint used throughout: prefer the simple option. Every feature
added is a feature to maintain, and complexity now becomes bugs later.

---

## What the app is

An offline-first micro habit tracker. Create habits, pick which weekdays they
repeat on, tick them off, build streaks. All data stays on the device — no
account, no backend, no tracking, no network calls at all.

### Stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + Vite + Tailwind CSS |
| Motion | Framer Motion |
| Icons | lucide-react |
| Native shell | Capacitor 8 (Android) |
| Storage | browser `localStorage`, normalised on read/write |
| Notifications | `@capacitor/local-notifications` 8.x |
| Tests | `node:test`, zero dependencies |

Package name: `com.habitlee.habittracker` — **permanent once published.**

### Requirements to build

Node.js 22+, JDK 21, Android Studio Otter (2025.2.1)+. Targets Android 16
(API 36), which Google Play has required for new apps and updates since
31 August 2026.

### Commands

```bash
npm install
npm run dev          # browser preview
npm test             # 27 assertions on the date / streak / validation logic
npm run apk:share    # syncs, builds a debug APK, serves it over Wi-Fi as a QR code
npm run apk:share:fast   # same, skips the sync when nothing changed
npm run cap:sync     # build web assets + copy into the Android project
npm run cap:open     # open android/ in Android Studio
```

---

## Layout

```
src/
  App.jsx                  tab routing, modals, toasts, undo, milestone detection
  components/
    Header.jsx             eyebrow / greeting / date + theme toggle
    BottomNav.jsx          Today · Stats · (+) · Settings
    TodayView.jsx          ring, due list, "Not scheduled today" list, celebration
    HabitCard.jsx          row = tick, pencil = edit, red trash, 7-day strip
    SparkTrail.jsx         the day-dot strip (see "the strip" below)
    TodayRing.jsx          segmented progress ring
    StatsView.jsx          per-habit streaks, rate, 28-day grid
    SettingsView.jsx       reminders, backup/restore, clear all, about
    AddHabitModal.jsx      name, emoji, colour, day picker with presets
    ConfirmDialog.jsx      destructive confirmations
    Toast.jsx              undo + streak milestones
    Celebration.jsx        confetti burst on finishing the day
    EmptyState.jsx
    ErrorBoundary.jsx      "Something broke" + Reload instead of a blank screen
  hooks/
    useHabits.js           state + CRUD + safe persistence
    useTheme.js            dark/light, system bar colour
    useToday.js            keeps "today" correct across midnight and app resume
    useBackDismiss.js      Android back closes the top overlay
    useReminder.js         notification permission + daily schedule
  utils/
    dates.js               local-date helpers, isDue, frequencyLabel
    streak.js              current / longest streak, completion rate
    habits.js              validation + normalisation of every habit object
    colors.js              palette + emoji set
    haptics.js             vibration, no-op where unsupported
tests/                     unit tests for the logic above
android/                   Capacitor Android project (committed)
FIXES.md                   full changelog of all 43 fixes, with reasoning
GUIDE.md                   step-by-step Play Store walkthrough
```

---

## Decisions worth not re-litigating

**Capacitor over Expo/React Native.** The codebase already existed as a React
web app; wrapping it was hours of work versus a rewrite.

**localStorage, not a database.** No backend means no cost, no privacy policy
complexity, no accounts. Everything entering state is normalised first, so a
malformed value can't crash the app.

**Inexact notification alarms.** Exact alarms need `USE_EXACT_ALARM` (Play only
grants it to clock and calendar apps) or `SCHEDULE_EXACT_ALARM` (denied by
default from Android 13). A habit nudge a few minutes late is fine.

Note that choosing inexact scheduling in code is not enough on its own: the
notification plugin declares `SCHEDULE_EXACT_ALARM` in its own manifest and the
merger folds it into the app regardless. It is stripped explicitly with
`tools:node="remove"` in `AndroidManifest.xml`. Don't delete that line without
also filling in the Play Console exact-alarm declaration.

The permissions that do ship: `INTERNET` and `VIBRATE` from the app,
`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` and `WAKE_LOCK` merged in from
the notification plugin. None is restricted.

**The day strip answers two questions at once.** It shows *which days a habit
repeats on* and *how you've done*, so scheduled days always render full-size in
the habit's colour and only the fill changes:

| dot | meaning |
| --- | --- |
| solid colour | done |
| bright ring | due today, not done yet |
| dim ring | scheduled, habit didn't exist yet |
| grey fill | scheduled and missed |
| small grey pip | not scheduled that weekday |

Plus the schedule in words on the card (`Every day`, `Weekdays`, `Mo We Fr`),
because dots alone were misread three separate times during testing.

**Two-letter weekdays** (`Su Mo Tu We Th Fr Sa`). Single letters collide twice
in seven days.

**No exit animation on the tab container.** `AnimatePresence mode="wait"` there
could strand the whole screen blank if an exit never completed.

**Theme toggle lives only in the header.** It's on every screen and shows the
current mode; duplicating it in Settings added a row with no new ability.

---

## What was fixed (43 items, detail in FIXES.md)

Rough shape of it:

- **Would have blocked publishing** — targeted API 34 (Play requires 36), no
  release signing config, unreliable safe-area handling under forced
  edge-to-edge.
- **Data loss** — a single failed read wiped every habit; importing any JSON
  array crashed the app; import replaced everything with no confirmation; no
  undo after delete.
- **Wrong results** — "today" froze at whatever day the app opened, so taps
  logged the wrong date; an unfinished today counted as a miss against your
  rate and longest streak.
- **Visibly broken** — the progress ring drew nothing with exactly one habit;
  editing a habit's days made it vanish; the whole screen went blank after
  clearing data; the pencil icon did nothing; the reminder switch greyed out
  permanently.
- **Everyday friction** — couldn't tick a missed day, tapping a habit opened
  the editor instead of ticking it, the keyboard covered the Add form, Android
  back quit the app from an open sheet.
- **Retention** — daily reminder, confetti on finishing the day, streak
  milestone toasts.

---

## Known open items

**Reminder root cause found and fixed (round 8).** The committed `android/`
project had never been synced after `@capacitor/local-notifications` was
installed — `capacitor.plugins.json` was `[]`, so the plugin's native half was
not in any APK ever built. `npx cap sync android` fixed it. Still needs one
on-device confirmation that a scheduled reminder actually arrives.

The sync also raised `capacitor.build.gradle` to `JavaVersion.VERSION_21`, so
**JDK 21 is now required** to build.

**Deferred until after launch, in rough priority order:**

1. Reorder habits (stuck in creation order)
2. Pause / archive a habit — currently deleting is the only option
3. Per-habit detail screen with a real month calendar
4. Headline numbers on Stats (best streak overall, total completions)
5. Custom emoji instead of the fixed set of 16
6. Tablet / landscape layout — cards stretch edge to edge
7. Native storage (`@capacitor/preferences`) so "Clear storage" can't wipe data
8. Stats 28-day grid aligned to weeks instead of wrapping at screen width
9. A real file-based backup via the Android share sheet (currently clipboard)

**Not started:** ads. Deliberate — retention first, and adding them flips the
Play Console ads declaration and the data safety form.

---

## The path to launch

Feature work for v1 is done. What's left is packaging, not code. GUIDE.md has
the detailed version; this is the sequence:

1. **Keystore.** Generate it, back it up in two places. Create
   `android/keystore.properties` (gitignored) so Gradle can sign from the
   command line. Losing this file means never being able to update the app
   under the same listing.
2. **Privacy policy.** Required even with no data collection. A generated one
   hosted free on GitHub Pages is fine — say plainly that data stays on the
   device.
3. **Build the bundle.** `npm run cap:sync`, then `cd android && ./gradlew
   bundleRelease`. Bump `versionCode` by one for **every** upload, ever.
4. **Play Console.** $25 once, plus identity verification (can take days —
   start it early, it's the thing most likely to stall you).
5. **Store listing.** 512×512 icon, 1024×500 feature graphic, 2–8 phone
   screenshots (framed ones convert much better), short + full description.
   Forms: data safety (nothing collected), content rating, target audience
   18+, ads declaration **No**.
6. **Closed testing.** Personal accounts created after 13 November 2023 need
   **12 testers opted in continuously for 14 days** before applying for
   production access. Internal testing does not count. Recruit 15–18 for
   buffer. This is the long pole — start it before polishing anything else.
7. **Apply for production**, wait for review, then release.

While the 14-day clock runs, work the deferred list above and ship updates to
the closed track — that's also good material for the portfolio write-up.

---

## Working agreement

- Full-codebase audits with issues ranked by annoyance, rather than finding
  bugs one at a time in testing.
- Issues described in plain language, not jargon.
- Concise answers, no filler.
- Verify rather than guess — check the actual source, run the tests, look up
  current Play requirements instead of assuming.
