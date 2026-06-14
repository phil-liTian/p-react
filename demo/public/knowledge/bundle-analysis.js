function renderBundleAnalysis(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>构建产物分析的目标是找出「体积杀手」——
    意外引入的大依赖、重复打包的模块、未被 Tree Shake 的死代码。
    核心工具：<strong>webpack-bundle-analyzer</strong>（Webpack）和
    <strong>rollup-plugin-visualizer</strong>（Vite/Rollup）可视化 Bundle，
    配合 <strong>bundlephobia</strong> 在引入依赖前评估包大小。`);

  const principle = `
    <p><strong>分析流程（4 步）：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li><strong>生成分析报告</strong>：在构建命令中加入分析插件，输出交互式 treemap（矩形面积 = 模块体积）</li>
      <li><strong>识别体积大户</strong>：关注 > 50KB（gzip）的模块；重点检查是否存在多版本 React、多份 lodash 等重复依赖</li>
      <li><strong>查明引入路径</strong>：在 treemap 中点击模块，或用 <code>source-map-explorer</code> 追溯「谁引入了这个包」</li>
      <li><strong>针对性优化</strong>：替换重包、按需引入、动态导入、CDN 外链等手段逐一优化，再次对比体积</li>
    </ol>
    <p><strong>常见体积问题与优化手段：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>问题</th><th>常见原因</th><th>解决方案</th></tr></thead>
      <tbody>
        <tr><td>moment.js 过大</td><td>打包了全部 locale（约 500KB）</td><td>改用 day.js（2KB）或配置 ContextReplacementPlugin 只保留所需 locale</td></tr>
        <tr><td>lodash 全量引入</td><td><code>import _ from 'lodash'</code></td><td>改用 <code>import { chunk } from 'lodash-es'</code> + Tree Shaking</td></tr>
        <tr><td>重复的 React 版本</td><td>子包 peerDependencies 未正确对齐</td><td>pnpm dedupe / yarn deduplicate，或在打包工具配置 alias 强制指向同一份</td></tr>
        <tr><td>图标库全量引入</td><td><code>import * as Icons from '@ant-design/icons'</code></td><td>按需引入：<code>import { SearchOutlined } from '@ant-design/icons'</code></td></tr>
        <tr><td>polyfill 重复打包</td><td>多个入口各自 import 'core-js'</td><td>统一在入口文件引入一次，或改用 <code>useBuiltIns: 'usage'</code></td></tr>
      </tbody>
    </table>`;

  const analyzeCode = `// ── Webpack：bundle 分析 ──────────────────────────────────────────────────────
// 安装：pnpm add -D webpack-bundle-analyzer

// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    // 方式一：构建后自动打开浏览器（开发调试用）
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'server',   // 启动本地服务器
      openAnalyzer: true,
    }),

    // 方式二：生成静态 HTML 报告（CI 环境用）
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ].filter(Boolean),
};

// package.json scripts
// "analyze": "ANALYZE=true webpack --mode production"
// 运行：pnpm analyze

// ── Vite：rollup-plugin-visualizer ───────────────────────────────────────────
// 安装：pnpm add -D rollup-plugin-visualizer

// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/bundle-stats.html',
      open: true,           // 构建后自动打开
      gzipSize: true,       // 显示 gzip 后大小（更贴近传输实际）
      brotliSize: true,     // 显示 Brotli 大小
      template: 'treemap',  // 'treemap' | 'sunburst' | 'network'
    }),
  ],
});

// ── source-map-explorer：追溯模块来源 ────────────────────────────────────────
// 安装：pnpm add -D source-map-explorer

// 生成带 sourcemap 的构建，然后分析
// package.json: "analyze:sme": "source-map-explorer 'dist/assets/*.js'"

// 分析结果示例：
// dist/assets/index-abc123.js (total 1.2 MB, gzipped 380 KB)
//   src/components/RichEditor.tsx  423 KB  (35%)  ← 最大单一模块
//   node_modules/@codemirror/        180 KB  (15%)
//   node_modules/react-dom/          121 KB  (10%)`;

  const optimizeCode = `// ── 常见优化实践 ──────────────────────────────────────────────────────────────

// 1. moment.js → day.js（减少 ~500KB）
// ✗ import moment from 'moment';
// ✓
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn');
const formatted = dayjs().format('YYYY-MM-DD');

// 2. lodash 按需引入（结合 Tree Shaking）
// ✗ import _ from 'lodash';          // 引入全部 ~70KB gzip
// ✓
import { chunk, debounce } from 'lodash-es'; // lodash-es 是 ESM 版本

// 3. 重依赖走 CDN + externals（框架类库最适合）
// webpack.config.js
module.exports = {
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    // 这些包不打入 bundle，由 HTML 中的 CDN <script> 提供
  },
};
// index.html 中对应添加：
// <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>

// 4. 图片优化（构建时压缩）
// vite-plugin-imagemin 或 webpack 的 image-minimizer-webpack-plugin
// vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';
export default defineConfig({
  plugins: [
    viteImagemin({
      webp: { quality: 80 },
      svgo: { plugins: [{ name: 'preset-default' }] },
    }),
  ],
});

// 5. 按需引入 Ant Design（使用 babel-plugin-import 或 vite-plugin-style-import）
// ✗ import { Button, Table, Modal } from 'antd'; // 引入全量 CSS（约 600KB）
// ✓ Ant Design 5 已支持 ESM Tree Shaking，无需额外插件，直接按需引入即可
import { Button } from 'antd'; // 自动 Tree Shake

// 6. 动态 polyfill（仅向需要的浏览器发送 polyfill）
// index.html
// <script src="https://polyfill.io/v3/polyfill.min.js?features=Promise,Array.from"><\/script>
// 服务端根据 User-Agent 动态返回所需 polyfill，现代浏览器几乎得到空响应

// 7. 分析重复依赖（pnpm dedupe）
// pnpm dedupe                           # 自动去重
// pnpm why lodash                       # 查看 lodash 被哪些包引入
// npx npm-check-updates -u              # 更新依赖，可能消除版本冲突`;

  const notes = [
    ruleBox('warning', `<strong>Gzip vs Brotli：</strong>衡量真实体积时应看 Brotli 压缩后的大小（现代 CDN 默认启用 Brotli，压缩率比 Gzip 高 20-30%）。rollup-plugin-visualizer 同时展示两者，以 Brotli 为准更准确。Nginx 开启 Brotli：<code>brotli on; brotli_comp_level 6; brotli_types text/javascript application/javascript;</code>`),
    ruleBox('info', `<strong>CI 中持续监控 Bundle 大小：</strong>使用 <code>bundlesize</code> 或 <code>size-limit</code> 在 CI 中设定体积上限，超出时 PR 自动失败。配置示例：<code>"size-limit": [{ "path": "dist/assets/*.js", "limit": "200 KB" }]</code>。GitHub Action 中配置后，每次 PR 都可看到体积变化对比，防止体积悄悄膨胀。`),
    ruleBox('success', `<strong>性价比最高的优化手段排序：</strong>① 替换 moment.js（~-500KB）；② 修复 lodash 全量引入（~-50KB）；③ 图片转 WebP/AVIF（~-50%图片体积）；④ 启用 Brotli 压缩（~-20% 传输体积）；⑤ 路由级 Code Splitting（首屏-60%）。前三项通常能在半天内完成，收益显著。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('生成 Bundle 分析报告（Webpack + Vite）', 'dot-blue', 'javascript', analyzeCode) + codeBlock('✓ 常见体积优化实践', 'dot-green', 'javascript', optimizeCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
