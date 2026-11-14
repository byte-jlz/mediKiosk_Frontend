import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The backend's address from .env, cleaned the same way apiClient.js does it.
  const backend = (env.VITE_API_BASE_URL || 'http://localhost:8000').trim().replace(/\/+$/, '').replace(/\/api$/, '');

  // API PROXY: the kiosk page calls its own server (localhost:5173/api/...), and this
  // server forwards the call to the backend. The browser never talks to another site,
  // so the backend's CORS settings don't matter for the kiosk.
  // Turn it off with VITE_API_PROXY=0 in .env (then the browser calls the backend directly).
  const useProxy = env.VITE_API_PROXY !== '0';
  const proxy = useProxy ? { '/api': { target: backend, changeOrigin: true, secure: true } } : undefined;

  return {
    plugins: [react()],
    define: {
      // shown in the kiosk footer as "Version 1.0" - bump it in package.json
      __APP_VERSION__: JSON.stringify(version),
      __API_PROXY__: JSON.stringify(useProxy),
    },
    server: { host: 'localhost', proxy },
    preview: { host: 'localhost', proxy }, // `npm run build` + `npm run preview` forwards the same way
  };
});
