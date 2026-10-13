import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// base: './' is REQUIRED for Capacitor — the app is loaded from a local
// file/asset scheme on Android, not from a domain root. Absolute paths
// ("/assets/...") will 404 and you'll get a blank white screen on device.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Vite's preload helper injects <link rel="modulepreload" crossorigin>
    // for every dependency of a dynamically imported chunk. `crossorigin`
    // makes it a CORS request, and Capacitor serves the app from
    // https://localhost through its own local server, which sends no
    // Access-Control-Allow-Origin header. The module load then stalls behind
    // the preload — it never resolves and never rejects, so the calling code
    // just hangs forever.
    //
    // Nothing here needs preloading: the whole app is one local bundle with
    // no network latency to hide. Turning it off removes the failure mode
    // outright rather than working around it.
    modulePreload: false,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
  },
});
