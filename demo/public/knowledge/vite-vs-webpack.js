function renderViteVsWebpack(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Vite 开发模式利用浏览器原生 <strong>ESM</strong> 按需加载，
    启动时<strong>不打包</strong>，服务器只在浏览器请求时实时编译单个文件，
    冷启动从秒级降至毫秒级。生产构建使用 <strong>Rollup</strong>（非 esbuild），
    输出更优化的静态产物。Webpack 的捆绑模式在大项目开发时慢，但生态更成熟。`);

  const principle = `
    <p><strong>Vite 开发模式核心架构：</strong></p>
    <ul>
      <li><strong>依赖预打包（Pre-bundling）</strong>：首次启动时用 <strong>esbuild</strong>（Go 语言，比 Babel 快 10-100x）将 <code>node_modules</code> 中的 CJS/UMD 依赖转换为 ESM，并合并碎片化模块（如 lodash 的数百个子文件合并为一个），存入 <code>.vite/deps/</code> 缓存</li>
      <li><strong>按需编译（On-demand Compilation）</strong>：浏览器请求哪个模块，Vite Dev Server 才编译哪个；未访问的文件不做任何处理，首屏加载速度与项目体积无关</li>
      <li><strong>原生 ESM HMR</strong>：模块更新时只需让浏览器重新请求变更的模块及其直接父模块，不需要重新构建依赖图，HMR 速度恒定（不随项目增大而变慢）</li>
    </ul>
    <p><strong>Vite 生产构建（Rollup）vs Webpack 的区别：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>维度</th><th>Vite（Rollup）</th><th>Webpack 5</th></tr></thead>
      <tbody>
        <tr><td>开发启动速度</td><td>毫秒级（无需 bundle）</td><td>秒~分钟（全量 bundle）</td></tr>
        <tr><td>HMR 速度</td><td>恒定（毫秒）</td><td>随项目增大而变慢</td></tr>
        <tr><td>生产 Tree Shaking</td><td>彻底（Rollup 设计如此）</td><td>需配置，略逊于 Rollup</td></tr>
        <tr><td>代码分割</td><td>良好，但动态 import 嵌套处理有差异</td><td>更灵活，SplitChunks 可深度定制</td></tr>
        <tr><td>生态/插件</td><td>兼容 Rollup 插件，社区增长快</td><td>庞大成熟，企业级场景覆盖更全</td></tr>
        <tr><td>CSS 处理</td><td>内置 CSS Modules / PostCSS</td><td>需配置 loader，灵活但繁琐</td></tr>
        <tr><td>适用场景</td><td>新项目、中小型应用、库打包</td><td>复杂企业级应用、已有存量项目</td></tr>
      </tbody>
    </table>`;

  const hmrCode = `// ── Vite HMR 原理演示 ──────────────────────────────────────────────────────────
// 浏览器请求 http://localhost:5173/src/App.tsx 时，Vite Dev Server：
// 1. 读取 src/App.tsx 原始文件
// 2. 用 esbuild 或 SWC 实时编译 TSX → JS
// 3. 在输出中注入 HMR 运行时代码
// 4. 将 import 路径改写为绝对 URL（浏览器可直接请求）
// 返回结果示例（简化）：
//   import { useState } from '/@fs/node_modules/react/...'
//   import MyComp from '/src/components/MyComp.tsx?t=1234567890'
//   // 注意：每个 .tsx 文件以真实路径作为模块 ID，无需 bundle

// Vite 插件：热更新时通知客户端
// vite 插件 API（等同于 Rollup 插件 + Vite 专属钩子）
export default function myPlugin() {
  return {
    name: 'my-vite-plugin',

    // Rollup 兼容钩子：转换文件内容
    transform(code, id) {
      if (!id.endsWith('.vue')) return null;
      return { code: compileVue(code), map: null };
    },

    // Vite 专属：配置 Dev Server
    configureServer(server) {
      server.middlewares.use('/api/custom', (req, res) => {
        res.end(JSON.stringify({ ok: true }));
      });
    },

    // Vite 专属：模块热更新时触发
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.data.json')) {
        // 自定义 HMR 逻辑：通知浏览器重新获取数据
        server.ws.send({ type: 'custom', event: 'data-update', data: { file } });
        return []; // 返回空数组阻止默认 HMR 行为
      }
    },
  };
}`;

  const configCode = `// ── vite.config.ts 常用配置 ───────────────────────────────────────────────────
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // 用 SWC 替代 Babel，更快
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // 生产构建后生成可视化分析报告
    visualizer({ open: true, gzipSize: true, brotliSize: true }),
  ],

  // 开发服务器配置
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
    // 预热常用模块，避免首次访问时的编译延迟
    warmup: {
      clientFiles: ['./src/components/App.tsx', './src/pages/*.tsx'],
    },
  },

  // 依赖预打包优化
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'], // 强制预打包（默认自动检测）
    exclude: ['@my/local-pkg'],  // 排除不需要预打包的包（已是 ESM）
  },

  // 生产构建（Rollup）
  build: {
    target: 'es2020',         // 输出目标，影响语法转换范围
    sourcemap: false,         // 生产环境关闭（或改为 'hidden'）
    chunkSizeWarningLimit: 500, // 超出此 KB 数时 Rollup 发出警告
    rollupOptions: {
      output: {
        // 手动拆分 Chunk，将 React 单独缓存
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
        },
        // 输出文件名含 hash，配合强缓存
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  // 路径别名（减少 ../../../ 相对路径）
  resolve: {
    alias: { '@': '/src', '@comp': '/src/components' },
  },
});

// ── Webpack 5 对应配置（对比参考）─────────────────────────────────────────────
// const path = require('path');
// module.exports = {
//   entry: './src/index.tsx',
//   output: {
//     filename: '[name].[contenthash].js',
//     path: path.resolve(__dirname, 'dist'),
//     clean: true,
//   },
//   cache: { type: 'filesystem' },  // 持久化缓存，加速二次构建
//   module: {
//     rules: [
//       { test: /\\.tsx?$/, use: 'swc-loader' }, // 用 SWC 替代 ts-loader
//     ],
//   },
// };`;

  const notes = [
    ruleBox('warning', `<strong>Vite 开发/生产不一致问题：</strong>开发模式用原生 ESM（无 bundle），生产用 Rollup（有 bundle），两者行为有细微差异：① 开发时每个文件独立请求，生产时已合并，某些依赖 side effect 的代码只在其中一个模式生效；② <code>import.meta.glob</code> 的结果在开发/生产可能有顺序差异。发布前务必用 <code>vite build && vite preview</code> 做生产环境验证。`),
    ruleBox('info', `<strong>esbuild 仅用于开发 + 预打包：</strong>Vite 的生产构建不使用 esbuild 打包（esbuild 的代码分割和 CSS 处理能力尚不成熟），而是用 Rollup。esbuild 负责：依赖预打包（<code>optimizeDeps</code>）和 JS/TS/JSX 的 <em>转译</em>（transform，非 bundle）。Vite 5 引入 Rolldown（Rust 重写的 Rollup）作为未来统一的开发/生产构建引擎。`),
    ruleBox('success', `<strong>从 Webpack 迁移到 Vite：</strong>① 将 <code>webpack.config.js</code> 的 loader/plugin 映射到 Vite 插件（<code>vite-plugin-*</code>）；② 替换 <code>require.context</code> 为 <code>import.meta.glob</code>；③ 环境变量从 <code>process.env.REACT_APP_*</code> 改为 <code>import.meta.env.VITE_*</code>；④ 迁移工具：<code>webpack-to-vite</code> 可自动转换大部分配置。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('Vite 插件开发 + HMR 原理', 'dot-blue', 'javascript', hmrCode) + codeBlock('vite.config.ts 完整配置与 Webpack 对比', 'dot-green', 'javascript', configCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
