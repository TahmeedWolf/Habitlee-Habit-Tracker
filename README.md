# Habitlee: Habit Tracker

A micro-habit tracker built with React, Tailwind CSS, and Framer Motion, packaged for Android with Capacitor 8. All data is stored locally on-device (`localStorage`) — no backend, no accounts, no ads.

## Quick start

```bash
npm install
npm run dev     # web preview
npm test        # unit tests for the date/streak/normalisation logic
```

Open the printed `localhost` URL. The app is mobile-first — use your browser's device toolbar (e.g. Chrome DevTools → toggle device toolbar) to preview it at phone width.

Requires **Node.js 22+**. Android builds additionally need **JDK 21** and **Android Studio Otter (2025.2.1)+**.

## Project structure

```
src/
  App.jsx                  # tab routing + modal orchestration
  components/               # all UI pieces (see file names)
  hooks/useHabits.js         # localStorage-backed habit state + CRUD
  hooks/useTheme.js          # dark/light mode persistence + system bar colour
  hooks/useToday.js          # keeps "today" correct across midnight / app resume
  hooks/useBackDismiss.js    # Android back button closes the top overlay
  utils/dates.js             # local-date helpers, due-day logic
  utils/streak.js            # current/longest streak + completion rate math
  utils/habits.js            # validation + normalisation of every habit object
  utils/colors.js            # habit color palette + emoji set
  utils/haptics.js           # vibration feedback (no-op where unsupported)
tests/                      # node:test unit tests, zero dependencies
scripts/
  share-apk.js              # builds a debug APK + serves it via QR code
                             # (run: npm run apk:share)
```

## Android

```bash
npm run cap:sync    # build web assets + copy into the native project
npm run cap:open    # open android/ in Android Studio
```

Targets Android 16 (API 36), the level Google Play requires for new apps and updates as of 31 August 2026.

See `GUIDE.md` for the full path from here to a signed app installed on your phone and live on the Play Store.
