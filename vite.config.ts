import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = resolve(__dirname);

export default defineConfig({
  root: resolve(root, 'demo'),
  resolve: {
    alias: {
      '@p-react/shared': resolve(root, 'packages/shared/src'),
      '@p-react/react': resolve(root, 'packages/react/src'),
      '@p-react/react-reconciler': resolve(root, 'packages/react-reconciler/src'),
      '@p-react/react-dom': resolve(root, 'packages/react-dom/src'),
    },
  },
});
