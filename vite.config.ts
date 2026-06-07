import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './demo',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        hub: resolve(__dirname, 'demo/hub.html'),
        runner: resolve(__dirname, 'demo/runner.html'),
        pitfalls: resolve(__dirname, 'demo/pitfalls.html'),
      },
    },
  },
});
