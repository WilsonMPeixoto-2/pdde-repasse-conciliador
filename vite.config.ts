import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.PDDE_API_DEV_TARGET ?? 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
