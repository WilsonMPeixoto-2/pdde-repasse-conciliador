import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'server/live-source.ts',
    outDir: 'server-dist',
    emptyOutDir: true,
    target: 'node24',
  },
  ssr: {
    target: 'node',
    noExternal: [
      'linkedom',
      'css-select',
      'css-what',
      'domhandler',
      'domutils',
      'nth-check',
      'boolbase',
    ],
  },
});
