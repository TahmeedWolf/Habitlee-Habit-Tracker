// Builds a debug APK, then serves that single file over your local Wi-Fi
// network and prints a QR code right in the terminal — scan it with your
// phone's camera to download and install, no USB cable needed.
//
// Usage:
//   node scripts/share-apk.js                # build + serve
//   node scripts/share-apk.js --skip-build    # already built it (e.g. via
//                                              # Android Studio's Build menu)
//
// Your phone and computer must be on the SAME Wi-Fi network. This opens an
// unauthenticated download on that network for as long as the script runs —
// fine on a home network, avoid it on public/shared Wi-Fi.

import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import qrcode from 'qrcode-terminal';

const root = process.cwd();
const androidDir = path.join(root, 'android');
const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const skipBuild = process.argv.includes('--skip-build');

if (!existsSync(androidDir)) {
  console.error('No android/ folder found. Run `npx cap add android` first (see GUIDE.md, Phase 2).');
  process.exit(1);
}

if (!skipBuild) {
  console.log('Building debug APK with Gradle…\n');
  const gradleCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  try {
    execSync(`${gradleCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit', shell: true });
  } catch {
    console.error('\nGradle build failed — see the output above.');
    console.error("If you see 'Permission denied', run: chmod +x android/gradlew");
    process.exit(1);
  }
}

if (!existsSync(apkPath)) {
  console.error(`Expected an APK at ${apkPath} but didn't find one.`);
  console.error('Build it first via Android Studio (Build → Build APK(s)) or drop --skip-build.');
  process.exit(1);
}

function getLanIp() {
  const nets = networkInterfaces();
  for (const ifaceList of Object.values(nets)) {
    for (const net of ifaceList) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const ip = getLanIp();
if (!ip) {
  console.error('Could not detect a LAN IP — make sure Wi-Fi is connected, then try again.');
  process.exit(1);
}

const port = 8642;
const fileName = 'habitlee.apk';

const server = createServer((req, res) => {
  const { size } = statSync(apkPath);
  res.writeHead(200, {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Length': size,
    'Content-Disposition': `attachment; filename="${fileName}"`,
  });
  createReadStream(apkPath).pipe(res);
});

server.listen(port, () => {
  const url = `http://${ip}:${port}`;
  console.log(`\nServing the APK at: ${url}`);
  console.log('Make sure your phone is on the SAME Wi-Fi network, then scan:\n');
  qrcode.generate(url, { small: true });
  console.log(`\nIf the scan doesn't open anything, just type ${url} into your phone's browser.`);
  console.log("On the phone you'll likely need to allow 'install unknown apps' for your");
  console.log('browser/file manager the first time — Android will prompt you for this.\n');
  console.log('Press Ctrl+C here to stop sharing once the install is done.');
});
