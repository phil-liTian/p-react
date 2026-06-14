function renderCodeSplitting(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Code Splitting 将单一巨大 Bundle 拆分为多个按需加载的 Chunk，
    让首屏只加载必要代码。核心 API 是 <strong>动态 <code>import()</code></strong>，
    打包工具在遇到动态 import 时自动创建独立 Chunk。
    结合路由懒加载，首屏 JS 体积可减少 <strong>60-80%</strong>。`);

  const principle = `
    <p><strong>三种拆分策略：</strong></p>
    <ul>
      <li><strong>入口分割（Entry Splitting）</strong>：多个 entry point，各自生成独立 Bundle，适合多页应用（MPA）</li>
      <li><strong>动态导入（Dynamic Import）</strong>：<code>import('./module')</code> 触发打包工具在此处"切割"，生成异步 Chunk，是 SPA 懒加载的基础</li>
      <li><strong>公共模块提取（SplitChunks / manualChunks）</strong>：将多个 Chunk 共同依赖的模块（如 React、lodash）提取为单独的 vendor Chunk，避免重复打包，利用浏览器缓存</li>
    </ul>
    <p><strong>Webpack SplitChunksPlugin 核心策略：</strong></p>
    <ul>
      <li><code>chunks: 'all'</code>：同步和异步 Chunk 都参与提取，推荐生产环境使用</li>
      <li><code>minSize</code>：模块大于此值才考虑提取（默认 20KB）</li>
      <li><code>cacheGroups</code>：按规则分组，如 <code>node_modules</code> 单独打包为 <code>vendors</code> Chunk</li>
    </ul>
    <p><strong>预加载与预获取：</strong></p>
    <ul>
      <li><code>import(/* webpackPrefetch: true */ './Modal')</code>：浏览器空闲时后台下载，适合「下一步可能用到」的资源</li>
      <li><code>import(/* webpackPreload: true */ './Chart')</code>：与当前 Chunk 并行下载，适合「当前页面肯定用到」的资源</li>
    </ul>`;

  const badCode = `// ✗ 一个 entry，所有代码打包在一起
// webpack.config.js
module.exports = {
  entry: './src/index.js', // 单入口，所有路由、组件全打包
};
// 结果：main.js 可能高达 2MB+，首屏必须全部下载

// ✗ React 路由不做懒加载
import HomePage from './pages/Home';       // 立即加载
import DashboardPage from './pages/Dashboard'; // 立即加载
import SettingsPage from './pages/Settings';   // 立即加载
// 用户只访问首页，却下载了所有路由代码

// ✗ 公共依赖重复打包
// Chunk A 和 Chunk B 都引入了 lodash（600KB），
// 未配置 splitChunks 时各自打包一份，浪费带宽`;

  const goodCode = `// ✓ React 路由级懒加载（React.lazy + Suspense）
import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// 每个路由对应一个独立 Chunk，只有导航到该路由时才下载
const HomePage      = lazy(() => import('./pages/Home'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const SettingsPage  = lazy(() => import('./pages/Settings'));

function App() {
  return (
    // fallback 在 Chunk 下载期间显示
    <Suspense fallback={<div className="loading-spinner" />}>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
}

// ✓ 组件级懒加载（大型弹窗/图表）
function ProductPage() {
  const [showChart, setShowChart] = React.useState(false);
  // 首次点击时才下载 Chart.js（约 200KB）
  const ChartComponent = showChart
    ? lazy(() => import('./components/SalesChart'))
    : null;

  return (
    <>
      <button onClick={() => setShowChart(true)}>显示图表</button>
      {showChart && (
        <Suspense fallback={<div>加载图表中...</div>}>
          <ChartComponent />
        </Suspense>
      )}
    </>
  );
}

// ✓ Webpack 5 SplitChunks 配置（提取公共依赖）
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',          // 同步 + 异步 Chunk 都处理
      cacheGroups: {
        // React 等核心框架单独 Chunk（版本稳定，缓存命中率高）
        react: {
          test: /[\\\\/]node_modules[\\\\/](react|react-dom|react-router)[\\\\/]/,
          name: 'vendor-react',
          chunks: 'all',
          priority: 20,
        },
        // 其余 node_modules 打包为 vendors
        vendors: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
};

// ✓ Vite 的 manualChunks（rollupOptions）
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'vendor-react';
          if (id.includes('node_modules/')) return 'vendor';
        },
      },
    },
  },
});

// ✓ 魔法注释：给 Chunk 命名（方便 Bundle 分析）
const Editor = lazy(() =>
  import(/* webpackChunkName: "editor" */ './components/RichEditor')
);

// ✓ 预获取：用户悬停链接时提前下载下一页
link.addEventListener('mouseenter', () => {
  import(/* webpackPrefetch: true */ './pages/NextPage');
});`;

  const notes = [
    ruleBox('warning', `<strong>Suspense + lazy 的限制：</strong>① <code>React.lazy</code> 只支持默认导出（<code>export default</code>），如需具名导出需包一层：<code>lazy(() => import('./Foo').then(m => ({ default: m.NamedExport })))</code>；② SSR 场景需使用 <code>@loadable/component</code> 或 Next.js 的 <code>dynamic()</code>，<code>React.lazy</code> 在服务端不可用（React 18 的 Suspense for Data Fetching 正在逐步支持 SSR）。`),
    ruleBox('info', `<strong>加载状态的用户体验：</strong>路由切换的 loading 状态推荐配合 <code>useTransition</code>（React 18）——<code>startTransition</code> 中触发路由跳转，React 会保持当前页面可交互直到新页面准备好，避免突兀的 fallback 闪烁。或用 <code>React Router 6.4+</code> 的 <code>defer</code> + <code>Await</code> 实现流式加载。`),
    ruleBox('success', `<strong>衡量拆分效果：</strong>用 <code>webpack-bundle-analyzer</code> 或 Vite 的 <code>rollup-plugin-visualizer</code> 生成可视化地图，检查：① 是否有重复模块；② vendor Chunk 是否过大（建议 < 250KB gzip）；③ 异步 Chunk 是否按路由正确分割。<code>npx vite-bundle-visualizer</code> 一键分析。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ 未拆分：单一巨大 Bundle', 'dot-red', 'javascript', badCode) + codeBlock('✓ 路由懒加载 + SplitChunks 提取公共依赖', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
