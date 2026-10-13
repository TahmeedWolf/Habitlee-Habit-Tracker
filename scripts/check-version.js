// Stops a build whose version numbers disagree.
//
// The app shows the version from package.json (Settings > About), while Google
// Play reads versionName/versionCode from android/app/build.gradle. 1.0.1
// shipped with the screen still saying "v1.0.0" because only build.gradle was
// changed. This check runs first in `npm run cap:sync`, so that can't happen
// again: if the two don't match, nothing gets built.
//
// Run on its own with: npm run version:check

import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const gradlePath = new URL('android/app/build.gradle', root);

if (!existsSync(gradlePath)) {
  console.warn('[version] android/app/build.gradle not found, skipping check.');
  process.exit(0);
}

const gradle = readFileSync(gradlePath, 'utf8');
const name = gradle.match(/versionName\s*=?\s*["']([^"']+)["']/)?.[1];
const code = gradle.match(/versionCode\s*=?\s*(\d+)/)?.[1];

if (!name || !code) {
  console.error('[version] Could not find versionName / versionCode in android/app/build.gradle.');
  process.exit(1);
}

if (name !== pkg.version) {
  console.error('');
  console.error('  VERSION MISMATCH - build stopped.');
  console.error(`    package.json             version     = ${pkg.version}`);
  console.error(`    android/app/build.gradle versionName = ${name}`);
  console.error('  Make them the same, then run the command again.');
  console.error('');
  process.exit(1);
}

console.log(`[version] OK: ${name} (versionCode ${code})`);
