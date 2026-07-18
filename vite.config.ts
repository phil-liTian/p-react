/*
 * @Author: phil
 * @Date: 2026-06-06 09:05:26
 */
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
        deployment: resolve(__dirname, 'demo/deployment.html'),
        tools: resolve(__dirname, 'demo/tools.html'),
        java: resolve(__dirname, 'demo/java.html'),
        knowledge: resolve(__dirname, 'demo/knowledge.html'),
        'ai-coding': resolve(__dirname, 'demo/ai-coding.html'),
        python: resolve(__dirname, 'demo/python.html'),
        'ai-app': resolve(__dirname, 'demo/ai-app.html'),
        'react-principle': resolve(__dirname, 'demo/react-principle.html'),
        database: resolve(__dirname, 'demo/database.html'),
      },
    },
  },
});
