# Habitlee: Habit Tracker — From Code to Play Store

This is the full path: run the app locally → install it on your own phone →
publish it on the Play Store. Built with React + Tailwind (your stack) and
wrapped into a real Android app with **Capacitor**, which takes a web app and
ships it as a native Android `.aab`/`.apk` — no need to learn Kotlin/Java or
React Native.

Total realistic timeline: **~3 weeks**, mostly because Google enforces a
mandatory 14-day closed-testing period (Phase 7) before any new personal
account can publish to production — there's no way to skip this.

---

## Phase 0 — Install the tools (one-time)

> Capacitor 8 (what this project is on) requires **Node.js 22+**, **JDK 21**
> and **Android Studio Otter (2025.2.1) or newer**. Older versions fail with
> confusing Gradle errors rather than a clear message.


Since you've got Android Studio installed, use it for the native Android
side (it bundles the Android SDK and a JDK, so there's nothing else to
install). Keep using VS Code for everything in `src/` — editing React,
Tailwind, and your habit logic. You'll only switch to Android Studio for
building, running on a device, and signing.

| Tool | Why | Get it |
|---|---|---|
| **Node.js 18+** | Runs the React build | https://nodejs.org (LTS) |
| **Android Studio** | Builds/signs the Android app, runs emulator | already installed ✅ |
| **A physical Android phone + USB cable** (optional but recommended) | Test on real hardware | — |

If you haven't already, open Android Studio once and let its setup wizard
finish downloading the SDK (default options are fine) — More Actions → SDK
Manager will confirm what's installed.

---

## Phase 1 — Run the app locally

1. Unzip the project I gave you, e.g. to `~/habitlee-habit-tracker`.
2. Open a terminal in that folder and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the `http://localhost:5173` URL it prints. In Chrome, open DevTools
   (F12) → toggle device toolbar (Ctrl/Cmd+Shift+M) → pick a phone preset, to
   preview it at the right size.

You now have a working habit tracker with add/edit/delete habits, daily
check-offs, streaks, a stats view, dark mode, and JSON export/import — all
persisted in the browser's `localStorage`. Play with it before moving on.

**Where things live**, if you want to change anything:
- App name shown in the UI: `src/components/Header.jsx (`Habitlee`)
- Colors/fonts: `tailwind.config.js`
- Habit logic (streaks, due-days): `src/utils/streak.js`, `src/utils/dates.js`
- Everything else: one file per UI piece in `src/components/`

---

## Phase 2 — Turn it into an Android project

```bash
npm run build          # produces dist/ — the production web build
npx cap add android     # creates an android/ folder — the native project
npx cap sync android     # copies dist/ into the native project
```

`capacitor.config.json` already has your app's identity set:
```json
{
  "appId": "com.habitlee.habittracker",
  "appName": "Habitlee: Habit Tracker"
}
```
`appId` is your app's permanent package name (like a domain, reversed). If
you want to use your own reverse-domain (e.g. `com.yourname.habitlee`),
change it **now**, before your first Play Store upload — it cannot be
changed later without publishing as a brand-new app.

### Target Android API level (already set — don't lower it)
Google Play requires **new apps and every app update to target Android 16
(API level 36)** since 31 August 2026. Anything lower is rejected at upload.
`android/variables.gradle` in this project is already set to it:

```gradle
minSdkVersion = 24
compileSdkVersion = 36
targetSdkVersion = 36
```

API 36 also means **edge-to-edge is mandatory** — the app draws behind the
status and navigation bars and cannot opt out. The layout handles this with
the `--safe-top` / `--safe-bottom` CSS variables in `src/index.css`, which
read Capacitor 8's injected `--safe-area-inset-*` values and fall back to
`env(safe-area-inset-*)` on the web. Check the current requirement at
[Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)
before each yearly deadline.

### Generate the app icon and splash screen
I included a source icon at `public/icon-source.svg` (ember-on-ink, matches
the app's identity). Use it directly — `@capacitor/assets` accepts SVGs:

```bash
mkdir assets
cp public/icon-source.svg assets/icon.svg
cp public/icon-source.svg assets/splash.svg
npm install -D @capacitor/assets
npx @capacitor/assets generate --android
```

This writes every required launcher-icon size and splash screen straight
into `android/app/src/main/res/`. Re-run it any time you change the artwork.

---

## Phase 3 — Install it on your own phone

### Option A — QR code, no cable (recommended)
I added a script that builds a debug APK, serves that one file on your home
Wi-Fi, and prints a scannable QR code right in the terminal.

1. First time only: `npm install` (pulls in the `qrcode-terminal` package
   the script uses).
2. Make sure you've run Phase 2 once (`npx cap add android`) so an
   `android/` folder exists.
3. Run:
   ```bash
   npm run apk:share
   ```
   This builds the APK with Gradle, starts a tiny local server, and prints
   a QR code in the terminal.
4. On your phone — **on the same Wi-Fi network as your computer** — open
   the camera app and scan the QR code on screen. Tap the notification that
   pops up, which opens the download link in your browser.
5. Once it downloads, tap the file to install. Android will likely ask you
   to allow "install unknown apps" for your browser the first time — allow
   it, then continue the install.
6. Back in the terminal, press `Ctrl+C` to stop sharing once you're done.

Already built the APK via Android Studio's **Build → Build Bundle(s) /
APK(s) → Build APK(s)** menu instead? Skip the rebuild and just serve it:
```bash
npm run apk:share -- --skip-build
```

Whenever you change the web code, rebuild before sharing again:
```bash
npm run build && npx cap sync android && npm run apk:share
```

> This opens an unauthenticated download on your Wi-Fi network for as long
> as the script runs — fine at home, avoid running it on public/work Wi-Fi.

### Option B — USB cable, via Android Studio
1. On your phone: Settings → About phone → tap "Build number" 7 times to
   unlock Developer Options → Settings → Developer Options → enable
   **USB debugging**.
2. Plug the phone into your computer, accept the "Allow USB debugging?"
   prompt on the phone.
3. From your project's terminal:
   ```bash
   npx cap open android
   ```
   This opens the `android/` folder in Android Studio. Wait for it to
   finish "Gradle sync" (progress bar at the bottom).
4. Pick your phone from the device dropdown, click the green ▶ Run button.

### Option C — Emulator (no physical phone at all)
In Android Studio: Tools → Device Manager → Create Device → pick a phone →
pick a system image (download one if prompted) → Finish. Select it in the
device dropdown and hit ▶ Run.

> **Common gotcha:** a blank white screen on device almost always means
> `vite.config.js` is missing `base: './'` (already set in this project) or
> you forgot to run `npx cap sync android` after a fresh `npm run build`.

---

## Phase 4 — Prepare a release build

The debug APK from Phase 3 is perfect for installing on your own phone, but
the Play Store won't accept it — it needs a **signed release build**
instead, in a different format (`.aab`, not `.apk`).

### 4.1 Generate a signing key (do this once, ever)
In Android Studio: **Build → Generate Signed Bundle / APK → Android App
Bundle → Next → Create new...** This opens a form — fill it in:
- Key store path: choose a location *outside* your project folder, e.g.
  `~/keystores/habitlee-release.keystore`
- Set a keystore password and a key password
- Alias: `habitlee`
- Validity: 25+ years
- Fill in the certificate fields (name/org/country — anything reasonable)

Click OK. **Back up that `.keystore` file and both passwords somewhere
safe** — a password manager and a second location (cloud drive). If you
lose this file, you can never publish an update to this app again under
the same listing; you'd have to publish it as a new app from scratch.

Then create `android/keystore.properties` so Gradle can sign release builds
from the command line (this file is gitignored — it never leaves your
machine):

```properties
storeFile=/absolute/path/to/habitlee-release.keystore
storePassword=your-keystore-password
keyAlias=habitlee
keyPassword=your-key-password
```

`android/app/build.gradle` picks it up automatically. If the file is absent
the project still builds — release output is just left unsigned.

### 4.2 Set a version for this release
Open `android/app/build.gradle` (in Android Studio's Project panel, or in
VS Code — plain text file either way), find `defaultConfig`:
```gradle
defaultConfig {
    applicationId "com.habitlee.habittracker"
    versionCode 1        // increment by 1 on every Play Store upload, ever
    versionName "1.0.0"  // human-readable, bump however you like
}
```

### 4.3 Build and sign the App Bundle (.aab)
Google Play requires the **Android App Bundle** format (not a raw `.apk`).

Command line (uses `android/keystore.properties` from 4.1):
```bash
npm run cap:sync            # rebuild web assets into the native project
cd android
./gradlew bundleRelease      # gradlew.bat on Windows
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

Or from Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** → Next
3. Point it at the keystore you created in 4.1, enter both passwords, pick
   the `habitlee` key alias → Next (Android Studio remembers this keystore
   for next time, so future releases are faster)
4. Destination folder: leave default → Build variant: **release** → Finish

Output: `android/app/release/app-release.aab`

Either file is what you upload to Play Console.

---

## Phase 5 — Create your Play Console account

1. Go to https://play.google.com/console/signup
2. Choose **Personal account** (not Organization — that needs a D-U-N-S
   business number, overkill for this).
3. Pay the **one-time $25 USD registration fee** (no recurring cost, ever,
   no matter how many apps you publish).
4. Complete identity verification — you'll be asked to upload a government
   ID. This can take a few hours to 2 business days to clear.

---

## Phase 6 — Write your store listing

You'll need, in Play Console under your app → **Store presence → Main store
listing**:

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, 32-bit with alpha |
| Feature graphic | 1024×500 PNG/JPG |
| Phone screenshots | 2–8 images, PNG/JPG, each side 320–3840px |
| Short description | ≤80 characters |
| Full description | ≤4000 characters |

For the **app icon** and a clean **feature graphic**, export
`public/icon-source.svg` at the required sizes (any free SVG-to-PNG
converter, or open it in a browser and screenshot/crop). For **screenshots**,
run the app on your phone or emulator (Phase 3) and use the device's own
screenshot function on the Today, Stats, and Settings views.

**Suggested copy** (edit freely):
- *Short description:* "Tiny daily habits, tracked simply. No ads, no account."
- *Category:* Health & Fitness (or Productivity — either fits)
- *Full description:* lead with what it does in plain terms (track small
  daily habits, see streaks, no ads/tracking/account needed), then list 3–4
  concrete features (daily check-offs, streaks, weekly/monthly view, light
  & dark mode, offline-first).

### Required: a privacy policy URL
Play Console requires a privacy policy link for every app, even one that
collects nothing. Easiest free option — GitHub Pages:
1. Create a public GitHub repo (e.g. `habitlee-privacy`).
2. Add an `index.html` with a short policy. Since this app makes no network
   requests and stores everything only in the device's local storage, your
   policy can honestly say so:

   > Habitlee: Habit Tracker does not collect, store, or transmit any
   > personal data to any server. All habit data you enter is stored only
   > on your own device's local storage and is never sent anywhere. The app
   > contains no ads, analytics, or third-party trackers. Uninstalling the
   > app deletes all of its data.

3. Settings → Pages → enable, branch `main`, folder `/ (root)`. Your URL
   will be `https://yourusername.github.io/habitlee-privacy/`.
4. Paste that URL into Play Console's privacy policy field.

### Other required Dashboard sections
Play Console's app Dashboard shows a checklist of required tasks before you
can release — work through each:
- **App content** → Privacy policy (the URL above), Ads (declare **No ads**
  — true for this app), Content rating questionnaire (answer honestly; a
  habit tracker will land in "Everyone"), Target audience (set an
  appropriate age range), Data safety (declare **no data collected**, which
  is accurate here since everything stays in `localStorage`).
- **Store settings** → app category, contact email.

---

## Phase 7 — Required closed testing (new personal accounts)

As of 2026, Google requires any **new personal developer account** to run a
closed test with **at least 12 opted-in testers, active continuously for 14
days**, before it will grant production access — this applies regardless of
app quality and cannot be skipped. Plan for this time up front.

1. In Play Console: your app → **Testing → Closed testing** → create a
   track (e.g. "Closed testing") → upload your `app-release.aab`.
2. Add testers by email (friends, family, classmates — anyone with a Google
   account) or a Google Group. You need 12 distinct people.
3. Play Console gives you an opt-in URL — send it to your testers. They
   open it, tap "Become a tester," then install the app via the Play Store
   link it provides.
4. Testers need to **opt in**; once opted in they count toward your 14 days
   even if they later uninstall. Encourage them to actually open the app at
   least once.
5. After 14 consecutive days with 12+ opted-in testers, the Dashboard will
   show you're eligible to **apply for production access** — do that, answer
   the short questionnaire about your app and testing process.

---

## Phase 8 — Publish to production

Once production access is granted:
1. **Production** track → Create new release.
2. Upload the same (or a newer) signed `.aab`.
3. Add release notes (e.g. "Initial release.").
4. Review the rollout summary → **Start rollout to Production**.
5. Google reviews the submission — typically within a week, sometimes
   faster, sometimes longer for a first app. You'll get an email either way.

Once approved, your app is live at
`https://play.google.com/store/apps/details?id=com.habitlee.habittracker`
(use your actual `appId`).

---

## Updating the app later

```bash
npm run build
npx cap sync android
```
Then bump `versionCode` (always +1) and `versionName` in
`android/app/build.gradle`, re-run **Build → Generate Signed Bundle / APK**
(Phase 4.3, same keystore — Android Studio remembers it), and upload the
new `.aab` to the Production track as a new release. No
re-testing period is required for updates — the 12-tester/14-day rule only
gates your *first* production release.

---

## For your resume

Worth having ready alongside the Play Store link:
- A public GitHub repo with this code and a clean `README.md` (one's
  already included) — concrete proof of the work, not just a link.
- A short write-up of the stack: *React, Tailwind CSS, Framer Motion,
  Capacitor (native Android wrapper), local-first data persistence, custom
  streak-calculation logic.*
- 2–3 screenshots in the repo's README — recruiters skim, they don't always
  install.

---

## Troubleshooting quick reference

| Symptom | Fix |
|---|---|
| Blank white screen on device | Confirm `vite.config.js` has `base: './'`; re-run `npm run build && npx cap sync android` |
| Tailwind classes missing after build | Check `tailwind.config.js` `content` paths include `src/**/*.{js,jsx}` |
| "Cannot find module" errors after `npm install` | Delete `node_modules` and `package-lock.json`, re-run `npm install` |
| Gradle sync fails in Android Studio | File → Invalidate Caches / Restart |
| Phone doesn't show in the device dropdown (USB) | Check the USB cable supports data (not charge-only), re-accept the debugging prompt on the phone, confirm USB debugging is still enabled |
| QR scan doesn't open anything | Confirm phone + computer are on the *same* Wi-Fi (not a guest network that isolates devices); type the printed `http://...` URL into the phone's browser manually instead |
| `Permission denied` running `apk:share` | `chmod +x android/gradlew`, then retry |
| Lost your keystore | No recovery — you'd publish as a new app listing. Back it up in two places, today. |
