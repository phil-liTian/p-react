function renderPerfBuild(t) {
  const question = ruleBox('info',
    `<strong>构建优化的目标：</strong>减小产物体积、加快首屏加载、降低解析执行成本。
    核心手段分三层：<strong>压缩（体积）</strong>→ <strong>分割（并行加载）</strong>→ <strong>缓存（复用）</strong>。
    任何优化都要先有数据：用 bundle-analyzer 找到「体积大户」，再对症下药。`);

  const overview = `
    <table class="metrics-table">
      <thead><tr><th>优化手段</th><th>典型收益</th><th>适用场景</th></tr></thead>
      <tbody>
        <tr><td>Tree Shaking</td><td>减少 20-60% JS 体积</td><td>存在未使用的导出；使用 ESM 模块</td></tr>
        <tr><td>Code Splitting（路由级）</td><td>首屏 JS -50~70%</td><td>多页应用、路由数量 > 5</td></tr>
        <tr><td>替换重型依赖</td><td>-100~500KB gzip</td><td>moment → day.js；lodash 全量引入</td></tr>
        <tr><td>资源压缩（Gzip/Brotli）</td><td>JS/CSS -60~80%传输体积</td><td>所有静态资源</td></tr>
        <tr><td>图片优化（WebP/AVIF）</td><td>-30~70% 图片体积</td><td>内容图、Banner、图标</td></tr>
        <tr><td>长效缓存（Content Hash）</td><td>复访零传输</td><td>所有静态资源文件名</td></tr>
        <tr><td>Scope Hoisting</td><td>减少模块包装开销 ~5%</td><td>Webpack mode:production 自动开启</td></tr>
      </tbody>
    </table>`;

  const splitCode = `// ── 路由级 Code Splitting ─────────────────────────────────────────────────────

// React Router + React.lazy
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings  = lazy(() => import('./pages/Settings'));
const Report    = lazy(() => import('./pages/Report'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="/report"    element={<Report />} />
      </Routes>
    </Suspense>
  );
}

// ── 组件级按需加载（重型组件）────────────────────────────────────────────────

// 富文本编辑器、图表库等重型组件，仅在用户交互后才加载
const RichEditor = lazy(() => import('./components/RichEditor'));

function ArticleEditor({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Suspense fallback={<div>加载编辑器…</div>}>
      <RichEditor />
    </Suspense>
  );
}

// ── Webpack 手动分割策略 ────────────────────────────────────────────────────

// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // React 相关：变化频率低，单独 chunk 利于长效缓存
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'vendor-react',
          priority: 30,
        },
        // 其余 node_modules：共享 chunk
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          minChunks: 2,   // 至少被 2 个 chunk 引用才提取
        },
      },
    },
  },
};`;

  const cacheCode = `// ── 长效缓存：Content Hash 文件名 ────────────────────────────────────────────

// webpack.config.js（production）
module.exports = {
  output: {
    filename:      '[name].[contenthash:8].js',   // JS
    chunkFilename: '[name].[contenthash:8].chunk.js',
    assetModuleFilename: '[name].[contenthash:8][ext]', // 图片/字体
  },
  // 将 webpack runtime 单独提取，防止业务代码 hash 频繁变化
  optimization: {
    runtimeChunk: 'single',
  },
};

// Vite（默认已启用 contenthash，无需额外配置）
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 手动分 chunk，让 vendor 走独立缓存桶
        manualChunks: {
          react:  ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
});

// ── 服务端配置 Brotli 压缩（Nginx）────────────────────────────────────────────

// nginx.conf
// brotli on;
// brotli_comp_level 6;
// brotli_types text/javascript application/javascript application/json text/css;
//
// # 静态资源长效缓存（1 年）
// location ~* \\.(js|css|woff2|png|webp)$ {
//   add_header Cache-Control "public, max-age=31536000, immutable";
// }`;

  const treeShakeCode = `// ── Tree Shaking 确保生效 ────────────────────────────────────────────────────

// 1. 使用 ESM 格式（CJS 无法 Tree Shake）
// package.json 中自己的库声明
// { "main": "dist/index.cjs.js", "module": "dist/index.esm.js", "sideEffects": false }

// 2. sideEffects 标记（防止 Webpack 误删有副作用的模块）
// package.json
// { "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"] }

// 3. 避免"命名空间导入"导致 Tree Shaking 失效
// ✗ 全量引入
import * as Icons from '@ant-design/icons';
import _ from 'lodash';

// ✓ 具名导入（配合 ESM 版本）
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { debounce, chunk } from 'lodash-es';

// 4. 检查 Tree Shaking 是否生效
// 构建后搜索产物中是否还有已知未使用的函数名
// pnpm build && grep -r "unusedFunction" dist/`;

  const notes = [
    ruleBox('warning', `<strong>Code Splitting 的粒度：</strong>不要过度拆分——每个额外 chunk 都有一次 HTTP 往返开销（HTTP/2 下有所缓解）。经验值：单个 chunk gzip 后 < 30KB 时，拆分的网络开销可能超过首屏收益。路由级拆分最值得做，组件级拆分针对 > 100KB 的重型组件。`),
    ruleBox('info', `<strong>构建速度优化：</strong>开发环境下构建慢影响体验。Vite 本地开发基于 ESM 无需打包；Webpack 项目可用 <code>thread-loader</code> 开启多进程编译、<code>cache-loader</code> 或 Webpack 5 内置持久缓存（<code>cache: { type: 'filesystem' }</code>）将冷启动从 60s 降到 5s。`),
    ruleBox('success', `<strong>优先级排序：</strong>① 路由 Code Splitting（首屏收益最大）→ ② 替换 moment/lodash（体积收益立竿见影）→ ③ Content Hash 缓存（复访零传输）→ ④ 开启 Brotli（传输体积 -20%）→ ⑤ 图片 WebP/AVIF 转换。前两步通常半天内完成。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('优化手段总览', overview)}
    ${section('代码示例', codeBlock('路由 & 组件级 Code Splitting', 'dot-blue', 'javascript', splitCode) + codeBlock('长效缓存 & Brotli 压缩配置', 'dot-green', 'javascript', cacheCode) + codeBlock('Tree Shaking 正确姿势', 'dot-cyan', 'javascript', treeShakeCode))}
    ${section('延伸与注意事项', notes.join(''))}
  `);
}
