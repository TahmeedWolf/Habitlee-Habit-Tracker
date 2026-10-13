# Habitlee — audit & fixes

Every item below was found by reading the shipped source, and every code
change is in this snapshot. Tests for the logic changes live in `tests/`
(`npm test`, 25 assertions, no dependencies).

---

## Blockers — the app could not have been published as-is

### 1. `targetSdkVersion 34` is rejected by Google Play
Since **31 August 2026**, new apps *and updates* must target Android 16
(API 36). The project was on 34, and Capacitor 6 does not support 36.

**Fixed:** upgraded to Capacitor 8 (`^8.5.0`) and updated the native project
to the values Capacitor 8 requires.

- `android/variables.gradle` → `minSdkVersion 24`, `compileSdkVersion 36`,
  `targetSdkVersion 36`, plus the matching AndroidX versions
- `android/build.gradle` → AGP `8.13.0`, google-services `4.4.4`
- `android/gradle/wrapper/gradle-wrapper.properties` → Gradle `8.14.3`
- `android/app/build.gradle` → `=` property-assignment syntax
- `AndroidManifest.xml` → `density` added to `configChanges` (Capacitor 8
  requirement; without it the WebView reloads on resize)

**You must run** `npm install && npx cap sync android` before the next build.
Requires Node 22+, JDK 21, Android Studio Otter (2025.2.1)+.

### 2. No release signing config
`android/app/build.gradle` had no `signingConfigs`, so `./gradlew
bundleRelease` produced an **unsigned** bundle that Play rejects; the only
path was the Android Studio wizard.

**Fixed:** release signing now reads `android/keystore.properties` (already
in `.gitignore`). Absent that file the build still works, just unsigned.
See GUIDE.md §4.1.

### 3. API 36 forces edge-to-edge, and the safe-area CSS was unreliable
`env(safe-area-inset-*)` returns **0** in Android WebView below version 140,
so on API 36 — where edge-to-edge cannot be turned off — the header would sit
under the status bar and the nav bar under the gesture bar.

**Fixed:** `src/index.css` defines `--safe-top/-bottom/-left/-right` from
Capacitor 8's injected `--safe-area-inset-*`, falling back to `env()`.
`Header`, `BottomNav` and `AddHabitModal` now use those variables, and
`capacitor.config.json` sets `SystemBars.insetsHandling: "css"`.

---

## Data-loss and crash bugs

### 4. A single bad read wiped every habit
`useHabits` seeded state from `load()`, whose `catch` returned `[]` — and the
persistence `useEffect` then ran on mount and wrote that `[]` straight back
over the real data. One `JSON.parse` hiccup or a momentarily blocked
`localStorage` and the user's entire history was gone.

**Fixed:**
- nothing is written until the user actually changes something (`dirty` ref),
  so simply opening the app can never overwrite storage
- unreadable raw data is copied to `habitlee:habits:v1:unreadable` instead of
  being discarded
- Settings shows a warning banner when the load failed

### 5. Importing any JSON array crashed the app
`replaceAll(parsed)` accepted anything array-shaped. A habit without
`completions` threw on `habit.completions[today]`; one without a valid
`createdAt` sent `longestStreak`/`completionRate` into a 3650-iteration loop
over `null` dates.

**Fixed:** new `src/utils/habits.js` normalises **every** habit entering
state — from storage, from an import, or from the add form. Invalid entries
are dropped, unknown colours fall back, non-date completion keys are
stripped, duplicate ids are re-issued, `createdAt` is pulled back to the
earliest logged day. `replaceAll` now returns `false` for a payload that
isn't a habit list, and Settings reports that instead of silently wiping.

### 6. `crypto.randomUUID` is missing on older WebViews
`addHabit` called it unguarded — on a device with an un-updated WebView,
adding a habit threw and the button did nothing.

**Fixed:** `newId()` falls back to a timestamp+random id.

### 7. `toDateStr` could throw and take down the render tree
`new Date(d - tzOffset).toISOString()` raises `RangeError` on an invalid
date. Every date helper now validates and returns `null` instead of throwing,
and every streak function tolerates malformed habits.

---

## Correctness bugs

### 8. "Today" froze — taps logged the wrong day
`todayStr()` was evaluated during render, and nothing re-rendered at
midnight. Leave the app open overnight (normal for a WebView Android keeps
alive for days) and the header, the ring, the streaks and — worst — the
completion you tapped all belonged to *yesterday*.

**Fixed:** `useToday()` holds the current day in state and re-syncs at
midnight, on `visibilitychange`, on `focus` and on Capacitor's `resume`
event. `today` is threaded down through `TodayView`, `HabitCard`,
`SparkTrail`, `StatsView` and `Header` instead of each computing its own.

### 9. One habit due today → the progress ring drew nothing
With a single segment, `arcPath` produced a 0°→360° arc whose start and end
points are identical. The SVG spec skips such an arc entirely, so users with
one habit saw only the empty grey track.

**Fixed:** a single segment renders as a `<circle>` (still animated via
`pathLength`). The inter-segment gap now scales with segment count too —
past ~51 habits the fixed 7° gap made every arc sweep negative.

### 10. `completionRate` punished you for the day not being over
Today counted as a missed due day from 00:00, so the rate visibly dropped
every morning and only recovered after checking in. `longestStreak` had the
same flaw and would reset the running streak on today's blank.

**Fixed:** today is only counted once it's complete — consistent with how
`currentStreak` already treated it.

---

## UX / platform bugs

### 11. Android back button quit the app instead of closing the sheet
With a modal or confirm dialog open, back exited to the launcher — losing
whatever was typed. This is one of the fastest ways to get 1-star reviews on
Play.

**Fixed:** `useBackDismiss` pushes a history entry per overlay and closes it
on `popstate`. Capacitor routes the system back press into WebView history,
so this needs no native plugin and behaves identically in a browser.

### 12. Modal and dialog exit animations never ran
`AnimatePresence` was *inside* `AddHabitModal` / `ConfirmDialog`. A component
that unmounts itself never gets to animate out, so both sheets vanished
instantly while animating in smoothly.

**Fixed:** `AnimatePresence` moved to the parents (`App`, `SettingsView`).

### 13. Export did nothing on the phone
`a.download` with a `blob:` URL is a no-op in an Android WebView — there is
no download manager attached to it. The button appeared to work and produced
no file. Import was also file-picker-only.

**Fixed:** on device the backup is copied to the clipboard (with an
`execCommand` fallback) and shown in a selectable field; the browser keeps
the real file download. Import gained a paste-JSON path alongside the file
picker, and both report success/failure.

### 14. Wrong-theme flash on every cold start
`.dark` was only applied in a `useEffect` after React mounted, so dark-mode
users saw a light frame first. `theme-color` was also hard-coded to the dark
background in both themes.

**Fixed:** an inline script in `index.html` applies the stored theme before
first paint, and `useTheme` keeps `theme-color`, `color-scheme` and (on
Capacitor 8) the native system-bar style in sync.

### 15. Smaller ones
- Scroll position carried across tab switches — now reset on change
- Three separate "edit" buttons on each card (emoji, title, pencil) — merged
  into one labelled control; the pencil is now decorative
- `[...prev, d].sort()` sorted weekday numbers lexicographically; now numeric
- Weekday/colour/emoji pickers had no `aria-pressed`; modals had no
  `role="dialog"` / `aria-modal`
- Haptic tick on check-in (`navigator.vibrate` + `VIBRATE` permission,
  silently ignored where unsupported)
- Modal used `88vh`, which ignores the Android URL/gesture inset — now `88dvh`
- App version in Settings is read from `package.json` at build time instead
  of being hard-coded, and shows the habit count

---

## Not changed (deliberately)

- **`localStorage` as the store.** It survives app restarts and updates. If
  you want it to survive "Clear cache", move to `@capacitor/preferences`
  (native SharedPreferences) — that's an async API, so `useHabits` would need
  a hydration state. Worth doing before you have real users.
- **`.idea/` and `local.properties` are in the zip.** `local.properties` is
  gitignored; `.idea/` is not — add it before pushing to GitHub.
- **`versionCode` left at 1.** Bump it by 1 for every Play upload, ever.

## Suggested next steps

1. `npm install && npm test && npm run cap:sync`, then run on your phone.
2. Add `android/keystore.properties`, build the AAB, start closed testing —
   the 12-testers-for-14-days clock is the long pole.
3. Reminders (`@capacitor/local-notifications`) is the single most requested
   habit-tracker feature and the most interesting thing you could add for a
   portfolio reviewer.

---

# Round 2 — on-device findings

Reported after running the debug build on a real phone.

### 16. The pencil on each card did nothing
When the three overlapping edit targets were merged in round 1, the pencil was
left as a decorative `<span>` — it looked tappable and wasn't.

**Fixed:** the pencil is a real button again, and it now sits in a dedicated
action row with a **delete** button beside it.

### 17. No delete on the card, so "clear all data" became the escape hatch
Deleting a single habit was only possible from inside the edit sheet. Anyone
who didn't find it reached for Settings → *Clear all habits* and lost
everything. That is a data-loss trap, not a discoverability nit.

**Fixed:** each card now has edit + delete buttons. To avoid crowding the top
row (emoji, name, streak, check-off target), they live on the second row,
right-aligned opposite the day strip:

```
[emoji]  Habit name                              (  ✓  )
         🔥 3 days
 ● ● ● ● ● ● ●                            [ ✎ ]  [ 🗑 ]
 S M T W T F S
```

Delete still routes through the confirm dialog, which now names the habit
("Delete "Morning run"?") so the two destructive actions can't be confused.

### 18. The day dots had no labels
A repeating schedule was unreadable — six grey dots and one orange one say
nothing about *which* days.

**Fixed:** `SparkTrail` renders one column per day, weekday letter under its
own dot so they always line up, with today's letter in the habit's colour.
The 28-day stats grid keeps labels off (too dense) but gained a "Last 28
days" caption.

### 19. The whole screen went blank after clearing data
Header and nav bar stayed, everything between them disappeared, and switching
tabs didn't bring it back.

**Cause:** `AnimatePresence mode="wait"` wrapped the tab container. In that
mode the incoming view only mounts after the outgoing one reports its exit
animation finished. The outgoing `TodayView` contained a `layout`-animated
list whose children were being removed at the same moment; when that exit
never completed, nothing was ever mounted in its place — a blank main region
between a working header and nav.

**Fixed:** the tab container is a plain keyed `motion.main` with an enter
animation only. No exit means nothing can hang. The redundant `layout` on the
list wrapper is gone too (cards keep their own). Overlays still use
`AnimatePresence` — they need the slide-out and have no layout animations
inside them.

**Also added:** an `ErrorBoundary` around the view area and the whole app. If
anything does throw during render you now get "Something broke", the error
message and a Reload button instead of an empty screen — and stored habits
are untouched.

### 20. Back-dismiss could pop history it didn't own
`useBackDismiss` popped an entry on cleanup unconditionally. If the top entry
was no longer the one it pushed, that navigated the WebView — with an empty
stack, straight out of the app.

**Fixed:** each overlay tags its history entry with a unique token and only
pops when that exact entry is still on top.

### 21. Header was cramped
"Good evening · Monday, September 7" wrapped mid-date under the app name.

**Fixed:** three short lines with room to breathe — `HABITLEE` as a small
letter-spaced eyebrow, the greeting as the display-font headline, the date
beneath it. Nothing wraps at 360dp.

---

# Round 3 — on-device findings

### 22. "Every day" habit looked like a Monday-only habit
The data was correct — `frequency` was stored as `'daily'` and `isDue` returned
true for every day. The **strip** was lying.

For a habit created today, the six previous days were being drawn in the
"scheduled but missed" style, because the strip only asked *is this day due?*
and never *did this habit exist yet?*. So day one of a daily habit rendered as
six grey misses and one orange dot — which reads exactly like "Mondays only".

**Fixed, two ways:**
1. `SparkTrail` now treats days before `createdAt` (and days the habit isn't
   scheduled on) as *nothing expected* — a faint dot, clearly not a miss.
   Missed days stay grey, today is a ring in the habit's own colour, done days
   are solid.
2. The dots are history and always will be, so the schedule is now stated in
   words on the card: `🔥 1 day · Every day`. `frequencyLabel()` renders
   `Every day`, `Weekdays`, `Weekends`, or `Mo We Fr`. It also appears under
   each habit in Stats, and live under the day picker in the add sheet
   (`Repeats: Mo We Fr`).

### 23. S/S and T/T were unreadable
Single-letter weekdays collide twice in seven days — the two worst cases being
Saturday/Sunday side by side and Tuesday/Thursday.

**Fixed:** two-letter labels everywhere a day has to be identified —
`Su Mo Tu We Th Fr Sa` — in the card strip and in the "Repeats on" picker.
`WEEKDAY_SHORT` is asserted duplicate-free in the tests. Columns narrowed to
20px with 4px gaps so the strip still fits beside the action buttons at 360dp.

### 24. Trash icon was neutral grey
Destructive actions read as destructive on every other Android app, and the
same icon inside the edit sheet was already red — inconsistent with itself.

**Fixed:** the card's trash is `rose-500` at rest (80% opacity so it doesn't
shout), going full red with a red wash on press. Edit stays neutral, so the
two are distinguishable at a glance and not just by icon shape.

---

# Round 4 — on-device findings

### 25. A daily habit still looked like a Monday-only habit
The stored data was right (`frequency: 'daily'`, and the card said *Every
day*). The round-3 strip was still wrong: it drew every day the habit hadn't
been completed on as a faint "nothing expected" pip — including the days it
*is* scheduled for. So a daily habit created today showed six near-invisible
dots and one ring, which reads as "Mondays only" no matter what the text says.

The underlying mistake was treating the strip as pure history. It has to
answer two questions at once — *which days does this repeat on* and *how have
I done* — so scheduled days now always render at full size in the habit's
colour, and only the **fill** carries history:

| dot | meaning |
| --- | --- |
| solid colour | done |
| bright ring | due today, not done yet |
| dim ring | scheduled, habit didn't exist yet |
| grey fill | scheduled and missed |
| small grey pip | not scheduled on this weekday |

A daily habit now shows seven full-size dots on day one. A `Mo We Fr` habit
shows three, with four small pips between them — the schedule is readable
straight off the strip, and the size difference does the work rather than an
opacity difference nobody can see on an OLED panel.

`ringStrong` (full-opacity ring) was added to the colour palette so today is
distinguishable from an untracked scheduled day at the same ring width.

### 26. Editing a habit's days made it disappear
Change a habit to Sundays on a Monday and it vanished from Today. Nothing was
lost — `TodayView` filtered on `isDue(habit, today)` — but there was no way to
tell that from the screen, and the obvious conclusion is that the edit deleted
it.

**Fixed:** habits that aren't due today now appear under a **Not scheduled
today** heading, dashed-bordered and dimmed, with edit, delete and the day
strip all still working. The progress ring and the *n/n done today* count
still only include what's actually due, so the number doesn't get inflated by
rest-day habits.

Their check button also still works — logging one anyway is harmless (streaks
only count scheduled days) and is better than making the control look broken.

---

# Round 5 — launch scope

Goal for this round: remove the things that would annoy a real user over time,
and add the two things that make a habit tracker stick. Everything else was
deliberately deferred so the app can ship.

## Stops users being annoyed

### 27. You can now fix a day you missed
Only today could be ticked. Miss one evening and the streak was gone for good,
with no way to correct it — and the day dots *looked* tappable, so people were
already trying.

Tapping any past scheduled day in the 7-day strip now toggles it, with the
same haptic feedback as ticking today. Days before the habit existed stay
read-only, so history can't be invented.

### 28. Tapping a habit ticks it
The name and emoji opened the edit sheet. Tapping the row is what people
actually reach for, so the row is now the tick target and editing lives on the
pencil. A completed habit's name is struck through.

### 29. Deleting is undoable
A 6-second **Undo** appears after any delete and restores the habit at its
original position with its full history.

### 30. Importing asks first
"Import backup" replaced every habit instantly with no warning — the same
data-loss trap as the old *Clear all* route. It now names the numbers before
doing anything: *"This backup has 4 habits. Your current 6 will be replaced."*
With no habits yet there's nothing to lose, so it skips straight through.

### 31. The keyboard no longer covers the Add form
The name field grabbed focus on open, hiding the colour, day picker and Save
button behind the keyboard every single time. It doesn't autofocus now.

### 32. Day-picker presets
The old *Clear all* link's only possible outcome was an unsaveable form with
zero days selected. Replaced with **Every day / Weekdays / Weekends** chips
above the individual day toggles.

## Makes users come back

### 33. Daily reminder
`@capacitor/local-notifications`, one repeating notification a day at a time
you pick in Settings, with a proper monochrome status-bar icon.

Deliberately **not** an exact alarm. Exact alarms need `USE_EXACT_ALARM`,
which Google Play only grants to clock and calendar apps, and
`SCHEDULE_EXACT_ALARM`, which is denied by default from Android 13. An
inexact daily nudge lands close enough and keeps the app free of restricted
permissions — one less thing for review to question. `POST_NOTIFICATIONS` is
requested at the moment you switch reminders on, not at launch.

### 34. Finishing the day feels like something
Ticking the last habit due today sets off a short confetti burst from the
progress ring plus a *"Day complete. Nice work"* line. It's non-blocking,
nothing to dismiss, and it doesn't re-fire when you switch back to the tab.

### 35. Streak milestones
Hitting 3, 7, 14, 30, 60, 100, 200 or 365 days shows a toast naming the habit.
Short list on purpose — a badge every day would mean nothing.

### 36. "0 days" became "Start today"
A flame next to a zero on a brand-new habit read as failure at the exact
moment encouragement was needed.

## Still deferred (post-launch, in rough order)
Reorder habits · pause/archive · per-habit detail screen with a real calendar ·
headline numbers on Stats · custom emoji · tablet layout · native storage
instead of browser storage · Stats grid aligned to weeks.

---

# Round 6

### 37. The reminder toggle looked broken
The switch is driven by the result of scheduling, so it only moves once the
notification is actually booked. Any failure left it sitting in the off
position with a one-line message that was easy to miss — indistinguishable
from a dead control.

Rewritten so failures are visible and actionable:
- **The real error is shown.** `Could not set the reminder: <message>` instead
  of a generic sentence, so whatever the device is objecting to is on screen.
- **Permission is checked before it's requested.** If Android has already
  denied notifications, re-requesting returns denied instantly with no dialog
  — which is exactly what "nothing happens when I tap it" looks like. That
  case now says to enable them in Settings › Apps › Habitlee › Notifications.
- **"Send a test notification"** fires one in about five seconds, so delivery
  can be checked without waiting until evening.
- **The switch shows a pending state** while the async work runs and can't be
  double-tapped.
- **On the web it's disabled** with "Only works in the installed Android app",
  rather than failing mysteriously.
- Dropped `repeats: true` from the schedule — with `on: { hour, minute }` the
  repeat is already implied, and passing both is a shape the plugin doesn't
  document.

**If it still won't turn on:** the most likely cause is that the native side
of the plugin isn't in the build. `npm install` then `npm run cap:sync` then a
fresh `assembleDebug` — installing the package alone isn't enough, the Android
project has to be synced before the plugin exists on the device.

### 38. Removed the Appearance section from Settings
The theme toggle in the header is on every screen and already shows the
current mode. Duplicating it in Settings added a row that granted no new
ability and made the screen look padded. Reminders now sit at the top of
Settings, which is what people are actually there for.

Restoring it is a six-line change if it ever proves necessary.

---

# Round 7 — the stuck reminder toggle

Three separate faults stacked into one symptom: tap the switch, it greys out,
and stays that way until the app is killed.

### 39. The error message had nowhere to appear
Round 6 replaced the whole Reminders block and, in doing so, deleted the
paragraph that displayed `reminderStatus`. Every failure — blocked
permissions, a missing plugin, anything — was being written to state that
nothing rendered. The switch refusing to move *was* the entire error report.

**Fixed:** the status line is back, with `role="status"` so it's announced
rather than just drawn.

### 40. A hung bridge call disabled the switch permanently
`busy` was cleared in a `finally`, which covers a promise that rejects — but
not one that never settles at all. If a native call went out and no callback
came back, `finally` never ran and the control stayed disabled for the rest of
the session. That is precisely "greyed out until I close the app".

**Fixed:** every native call is now raced against a deadline — 8 seconds for
normal calls, 90 for the permission dialog, which legitimately waits on the
user. Whatever happens, the promise settles, `busy` clears, and the reason
lands on screen.

### 41. Nothing checked whether the plugin was actually in the build
Installing the npm package does not put the plugin in the APK — the Android
project has to be synced first. Without that, the JavaScript half is present
and the native half isn't, and calls go nowhere.

**Fixed:** on load, `Capacitor.isPluginAvailable('LocalNotifications')` is
checked. If the native half is missing, the row says so up front and names the
commands to run, instead of offering a switch that cannot work.

### 42. `npm run apk:share` skipped the sync step
This is the root cause of #41 being reachable at all. `apk:share` ran
`gradlew assembleDebug` directly, so a build made that way used whatever web
assets and plugin registrations happened to be in the Android project from
last time. Install a plugin, run `apk:share`, and you get an APK that doesn't
contain it.

**Fixed:** `apk:share` now runs `cap:sync` first. `apk:share:fast` skips it for
when nothing has changed.

### 43. "Working" no longer looks like "broken"
A dimmed switch reads as a dead control. While a call is in flight the knob
pulses and the subtitle says *Working…*, and the switch reports `aria-busy`.

**On your device:** rebuild with `npm install`, then `npm run apk:share` (which
now syncs on its own). If the switch still won't turn on, the row or the line
beneath it will now name the reason — that text is the thing to go on.

---

# Round 8 — the reminder was never in the build

Round 7 added the diagnostics. This round found what they were pointing at, and
fixed four things plus a version mismatch.

### 44. The Android project had never been synced with the notification plugin

The web half of the app knew about notifications. The native half didn't. Four
generated files were still dated from before `@capacitor/local-notifications`
was installed:

| file | was | meaning |
| --- | --- | --- |
| `android/app/src/main/assets/capacitor.plugins.json` | `[]` | no plugin registered with the bridge |
| `android/capacitor.settings.gradle` | only `:capacitor-android` | plugin's Java never compiled |
| `android/app/capacitor.build.gradle` | empty `dependencies {}` | same |
| `android/app/src/main/assets/capacitor.config.json` | no `plugins` block | `smallIcon` / `iconColor` never applied |

Meanwhile `android/app/src/main/assets/public/` held a current build. So the
JavaScript was calling out to a native plugin that wasn't in the APK, which is
exactly what `Capacitor.isPluginAvailable('LocalNotifications')` was reporting.

**Fixed:** ran `npx cap sync android`. `capacitor.plugins.json` now registers
`com.capacitorjs.plugins.localnotifications.LocalNotificationsPlugin`.

**Note:** the sync also raised `capacitor.build.gradle` from
`JavaVersion.VERSION_17` to `JavaVersion.VERSION_21`. JDK 21 is now required to
build, not merely recommended.

### 45. `SCHEDULE_EXACT_ALARM` was getting into the APK anyway

The app deliberately uses inexact alarms so it carries no restricted
permissions. But `@capacitor/local-notifications` declares
`SCHEDULE_EXACT_ALARM` in its own manifest, and the manifest merger folds
library permissions into the app's whether you asked for them or not. The
release bundle would have shipped a restricted permission the code never uses —
something Play review asks about, and something the store listing flatly denied.

**Fixed:** `tools:node="remove"` on that permission in `AndroidManifest.xml`,
with `xmlns:tools` added to the root element.

`RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` and `POST_NOTIFICATIONS` still merge in
and are kept — the first restores the reminder after a reboot, the last is
required to post anything at all on Android 13+.

### 46. Nothing re-armed the reminder, so it silently stopped

The alarm was scheduled once, when the switch was flipped on. Android drops
scheduled alarms for plenty of reasons — force stop, app update, battery
optimiser, an aggressive OEM ROM. When that happened the switch still said ON
and Settings still said the reminder was set. Neither was true.

**Fixed:** `useReminder` re-arms once per launch when reminders are enabled and
the plugin is present. It runs silently on success. On failure — permission
revoked in Android settings, say — it turns the switch off and says why, so the
UI stops claiming something that isn't happening.

### 47. The nudge was the same sentence every night

`pickMessage()` chose one of four lines *at schedule time*, and
`schedule: { on: { hour, minute } }` repeats forever with whatever body it was
given. One string, every night, for as long as the reminder stayed on.

**Fixed:** free with #46 — the launch re-arm reschedules, which re-runs
`pickMessage()`.

### 48. Ticking an off-schedule habit did nothing at all

A Mo/We/Fr habit on a Tuesday sat under "Not scheduled today" and offered *Log
X anyway today*. Tapping it wrote a completion and filled the circle — then
every calculation ignored it, because they all gate on `isDue()`. Streak
unchanged, longest unchanged, rate unchanged, and the dot strip still drew a
grey pip for that day. The tick looked real and moved nothing, which reads as
the app losing data.

**Fixed:** off-schedule cards are no longer tickable. The row renders as plain
markup instead of a button, and the circle is replaced by *Not due today*. The
card still shows so it can be edited or deleted — the reason it's on screen at
all. Days the habit *is* due remain tappable in the strip, so a genuinely
missed day can still be filled in.

The alternative was to count bonus days toward the totals. Rejected: it means
choosing whether a bonus day extends a streak, and every answer to that is
either arbitrary or complicated.

### 49. Two different version numbers for the same build

`package.json` said `1.0.0`, `android/app/build.gradle` said `versionName "1.0"`.
The About screen reads the first (via `__APP_VERSION__`), Play would show the
second. Any bug report saying "I'm on 1.0" would have been ambiguous.

**Fixed:** `versionName = "1.0.0"`. Keep the two in step on every release.
`versionCode` still has to go up by one for every upload, forever.

---

# Round 9 — the reminder still failed, and the screenshots said why

Round 8 fixed the native half. On device the switch then failed with
*"Loading the notification plugin did not respond within 8s."*

Three things in those screenshots narrowed it down before touching any code:

- The subtitle read *"One nudge a day, around the time you choose."* — not
  *"Notifications aren't compiled into this build yet."* So
  `Capacitor.isPluginAvailable('LocalNotifications')` returned **true**. The
  native plugin was there. Round 8 had worked.
- The switch was live, not greyed. Same conclusion.
- The row said **"Export backup (copy JSON)"**, which only renders when
  `isNative` is true — and `isNative` came from `import('@capacitor/core')`.
  So *that* dynamic import resolved fine.

And the failure was a **timeout**, not an error. A missing or broken module
rejects immediately. Something was waiting forever.

### 50. Vite's modulepreload stalls behind Capacitor's local server

Dynamically imported chunks don't just get fetched. Vite wraps every one of
them in a preload helper, which is in the built bundle:

```js
m.rel = "modulepreload";
m.as  = "script";
m.crossOrigin = "";          // ← makes it a CORS request
m.href = u;
document.head.appendChild(m);
```

Capacitor serves the app from `https://localhost` through its own local
server, which sends no `Access-Control-Allow-Origin` header. The preload is a
CORS request against an origin that never answers one, and the module load
stalls behind it — no resolve, no reject.

That explains the split exactly. The built chunk graph was:

```js
__vite__mapDeps = ["./web-DbIM07VT.js", "./index-CKZhs57K.js"]
```

`@capacitor/core` (`index-CKZhs57K.js`) had **no** dependencies, so no preload
link was injected and it loaded normally — which is why `isNative` and the
plugin probe both worked. `@capacitor/local-notifications` declared two deps,
got preload links, and hung. The 8s deadline added in round 7 was the only
thing ending it, which is why the symptom was always a timeout.

**Fixed, two ways, because one alone would leave the trap set:**

1. `@capacitor/core` and `@capacitor/local-notifications` are now **static**
   imports in `useReminder.js`, `useTheme.js` and `SettingsView.jsx`. They ride
   in the main bundle the WebView already loads to render the app at all — if
   the app is on screen, the plugin is loaded. No runtime fetch, nothing to
   stall.
2. `build.modulePreload: false` in `vite.config.js`, so no preload link is
   generated for anything, ever. There is no network latency to hide inside a
   local bundle; the feature only had downside here.

Chunk count went from four to two. The one remaining dynamic import is inside
the plugin itself (`registerPlugin`'s web fallback), it now carries an empty
dependency array, and it never executes on Android.

**Knock-on simplifications:**

- `probeSupport()` and `loadPlugin()` are synchronous now.
- The 8s deadline is gone from the plugin lookup — there's nothing left to time
  out. Deadlines stay on the real native calls (`checkPermissions`,
  `requestPermissions`, `schedule`, `cancel`), where a hung bridge is still
  possible.
- `SettingsView` resolves `isNative` during the first render rather than in an
  effect, so the export row no longer flips from *".json"* to *"copy JSON"* a
  frame after the screen appears.
- `applyTheme`'s system-bar tint runs directly instead of inside a floating
  promise, so a dark/light switch updates the status bar on the same frame.

**On your device:** `npm install`, then `npm run apk:share`. Open Settings and
tap *Send a test notification* — it should now either arrive within about five
seconds or name a real reason. "Did not respond within 8s" should not appear
again; if it does, it is coming from a native call, not from loading the
plugin.

---

# Round 10 — the plugin was asking for a permission we deliberately removed

Round 9 fixed the plugin load. The failure then moved one step later:

> Could not set the reminder: Scheduling did not respond within 8s

and tapping either the switch or *Send a test notification* opened the system
**Alarms & reminders** screen, where the toggle was **greyed out and
ungrantable**.

### 51. `isExactNotification` defaults to `true`

From the plugin's own Android source (`LocalNotificationsPlugin.kt`):

```kotlin
if (honorExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms()) {
    startActivityForResult(
        call,
        Intent(ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + activity.packageName)),
        "exactAlarmScheduleCallback"
    )
    return
}
```

and from `LocalNotification.kt`:

```kotlin
var isExactNotification: Boolean = true
```

So on Android 12+, *every* `schedule()` call checks whether the app may set
exact alarms, and if it may not, opens the settings screen and parks the
pending call until the user returns. Our payload never set the flag, so it got
the default.

This collided head-on with round 8. Removing `SCHEDULE_EXACT_ALARM` from the
manifest with `tools:node="remove"` was correct — the app doesn't want exact
alarms. But an undeclared permission cannot be granted, so the screen the
plugin sent you to had a **permanently disabled toggle**. A dead end by
construction, and the `withTimeout` deadline fired at 8s while the call sat
parked on that screen.

Note this was always there. Rounds 7–9 were failing earlier in the sequence, so
the code never reached this line until now.

**Fixed:** both scheduled notifications now pass `isExactNotification: false`,
which is what the app wanted all along:

```js
schedule: { on: { hour, minute } },
isExactNotification: false,
```

The plugin skips the permission check entirely and schedules an inexact alarm
directly. No settings screen, no parked call, no timeout. Android batches the
delivery with other wakeups within a few minutes of the target time, which is
fine for a habit nudge and is why inexact was chosen in the first place.

`SCHEDULE_EXACT_ALARM` stays stripped from the manifest. With this flag set it
is never wanted, never requested, and never reached.

**The other two screenshots were both correct behaviour:** the *"Allow Habitlee
to send you notifications?"* dialog is the normal Android 13+
`POST_NOTIFICATIONS` prompt on a fresh install (an earlier install's grant does
not carry over), and *"Android is blocking notifications for Habitlee"* is what
the app correctly reports after *Don't allow*.

---

# Round 11 — it works, so make it worth opening

The daily reminder arrived on device. Round 10 was the last blocker.

### 52. Removed "Send a test notification"

It existed to diagnose a reminder that wouldn't fire. It fires. The row was
debugging scaffolding sitting in a shipping settings screen, so it's gone
along with `sendTest`, `TEST_ID` and the `BellRing` import.

**Trade-off, noted rather than hidden:** aggressive OEM battery managers
(Xiaomi, Oppo, Samsung) can kill scheduled alarms weeks later, and this row was
the fastest way for a user to check without waiting until evening. The launch
re-arm from round 46 covers the common case. If support requests ever start
mentioning silent reminders, this is the thing to put back.

### 53. The notification title was the app's own name

Android already prints **Habitlee: Habit Tracker** in the notification header.
Our title then printed **Habitlee** again, so the bold line — the part the eye
lands on — was spent repeating the app name, and the actual nudge sat in grey
secondary text.

**Fixed:** the title carries the hook, the body follows through. Eight pairs,
each title leading with a sparkle:

```js
{ title: '✨ Two minutes. That is it.', body: 'A small win now beats starting over tomorrow.' }
{ title: '✨ Your streak is still alive', body: 'One tick keeps it that way.' }
{ title: '✨ Today is not over yet',     body: 'There is still time to finish strong.' }
```

Both lines stay short: Android truncates a collapsed notification to roughly
one line each.

### 54. The nudge could repeat itself

Random picking with four messages meant the same line could land several nights
running, and a repeated notification is one people learn to swipe away without
reading. `pickMessage()` now refuses to return the message the previous
schedule used, and there are eight of them rather than four.

### 55. "Start today · E…" — the schedule label was being cut off

On a new habit the card read `Start today · E…`. The flame plus *Start today*
in a mono font ate enough width to truncate `Every day` to one letter.

The schedule in words is the part that has to survive — it's there because the
dots alone were misread three separate times in testing. *Start today* was the
expendable half: at zero streak it says nothing the ring above it doesn't
already say.

**Fixed:** the flame and streak count only render once a streak exists. A new
habit shows its schedule in full; an established one reads `5 days · Every day`,
which fits.

### Not a bug: the ~10 second delay

The reminder set for 02:40 arrived around 02:40:10. That is the inexact alarm
working as designed. Android holds inexact alarms and delivers them batched
with other pending wakeups, so a few seconds to a few minutes of drift is
normal and is the price of carrying no restricted permissions. Removing the
drift means `SCHEDULE_EXACT_ALARM`, the greyed-out settings screen from round
10, and a Play Console declaration — for a habit nudge, not a trade worth
making. The Settings line already says it can arrive a few minutes late.

---

# Round 12 — two things the screenshots disagreed with themselves about

### 56. An unscheduled "today" still got the today treatment

On the `art` card (Weekends), Thursday rendered as an enlarged pip with a bold
green `Th` beneath it — while the same card said *Not due today* a few
centimetres to the right. The dot strip and the card were telling opposite
stories.

`SparkTrail` was keying both the enlargement and the coloured label off
`isToday` alone, ignoring whether the habit was due:

```js
className={`${dot} rounded-full ${isToday ? 'scale-125' : ''} ...`}
isToday ? `${colorMeta.text} font-semibold` : ...
```

**Fixed:** a single `highlightToday = isToday && scheduled` now drives both. On
a day the habit isn't due, today's label keeps its dim unscheduled styling and
the pip stays pip-sized. The dot's own colour logic was already gated on
`scheduled`, so only the emphasis needed narrowing.

### 57. "8:00 PM" in the picker, "set for 20:00" in the line below it

The time is stored as 24-hour `HH:MM` because that is what `<input type="time">`
reads and writes. But the input *renders* in the device's locale, so on a
12-hour phone the picker said `8:00 PM` and the confirmation directly beneath
it said `20:00`. One value, two formats, one screen.

**Fixed:** a `formatTime()` helper runs the stored value through
`Intl.DateTimeFormat` with the default locale, which is the same locale the
picker follows — 12-hour on a 12-hour phone, 24-hour on a 24-hour one.

Hardcoding 12-hour would have fixed this screen and created the exact mirror of
the bug for anyone whose phone is set to 24-hour.

Malformed input falls back to the raw string rather than throwing, so a
corrupted stored value degrades to something readable instead of blanking the
row.
