import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // shown in the kiosk footer as "Version 1.0" - bump it in package.json
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
  },
});
