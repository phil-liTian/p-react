function renderSourcemap(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Sourcemap 是一个 JSON 文件，记录<strong>编译后代码的每个字符位置</strong>
    到<strong>源码位置</strong>的映射，让浏览器 DevTools 能将压缩/转译后的报错
    还原到原始源码。核心数据结构是 <strong>VLQ（Variable-Length Quantity）编码</strong>的 <code>mappings</code> 字段，
    以极高压缩率存储数百万个位置映射。`);

  const principle = `
    <p><strong>Sourcemap 文件结构：</strong></p>
    <ul>
      <li><code>version</code>：当前为 3（Source Map Spec v3）</li>
      <li><code>sources</code>：源文件路径数组（可含多个原始文件）</li>
      <li><code>sourcesContent</code>：可选，内联源文件内容（离线调试时无需原始文件）</li>
      <li><code>names</code>：原始变量名/函数名数组（被压缩后用于还原符号）</li>
      <li><code>mappings</code>：<strong>核心字段</strong>，VLQ 编码的位置映射串（见下文）</li>
      <li><code>file</code>：编译后文件名</li>
    </ul>
    <p><strong>mappings 编码原理：</strong></p>
    <p><code>mappings</code> 是一个字符串，<strong>分号</strong>（<code>;</code>）分隔编译后代码的每一行，
    每行内用<strong>逗号</strong>（<code>,</code>）分隔每个片段（segment）。
    每个 segment 含 1 或 4 或 5 个 VLQ 数字，含义依次为：</p>
    <ol style="padding-left:20px; line-height:2;">
      <li><strong>编译后列偏移</strong>（相对上一个 segment）</li>
      <li><strong>sources 数组下标</strong>（相对上一个）</li>
      <li><strong>源码行偏移</strong>（相对上一个）</li>
      <li><strong>源码列偏移</strong>（相对上一个）</li>
      <li><strong>names 数组下标</strong>（可选，相对上一个）</li>
    </ol>
    <p>全部使用<strong>相对偏移量</strong>（delta encoding）而非绝对值，配合 Base64 VLQ 压缩后体积极小。
    一个 200KB 的 JS 文件，其 Sourcemap 通常约 600KB（未开启 sourcesContent 时约 200KB）。</p>`;

  const formatCode = `// ── Sourcemap 文件示例（简化）─────────────────────────────────────────────────
// dist/app.min.js 末尾会有：
// //# sourceMappingURL=app.min.js.map
// 或内联：//# sourceMappingURL=data:application/json;base64,...

// app.min.js.map
{
  "version": 3,
  "file": "app.min.js",
  "sources": ["src/utils.ts", "src/app.ts"],
  "sourcesContent": [
    "export function add(a: number, b: number) { return a + b; }",
    "import { add } from './utils'; console.log(add(1,2));"
  ],
  "names": ["add", "a", "b", "console", "log"],
  "mappings": "AAAA,SAASA,IAAIC,EAAGC,GAAK,OAAOD,EAAIC,C;ACChBC,QAAQC,IAAIH,EAAE,EAAG,I"
}

// ── 解码 mappings 片段 ────────────────────────────────────────────────────────
// 手动解码第一个 segment "AAAA"：
// A = 0 (Base64), AA = VLQ(0,0), AAAA = [0, 0, 0, 0]
// 含义：编译后第1行第0列 → sources[0] 的第0行第0列
//
// 用 source-map 库解码（推荐）
const { SourceMapConsumer } = require('source-map');

async function decodeSourcemap() {
  const rawMap = require('./dist/app.min.js.map');
  const consumer = await new SourceMapConsumer(rawMap);

  // 根据编译后位置查找源码位置
  const original = consumer.originalPositionFor({
    line: 1,
    column: 23,
  });
  console.log(original);
  // { source: 'src/utils.ts', line: 1, column: 17, name: 'add' }

  // 反向查询：根据源码位置找编译后位置
  const generated = consumer.generatedPositionFor({
    source: 'src/utils.ts',
    line: 1,
    column: 17,
  });
  console.log(generated);
  // { line: 1, column: 23, lastColumn: 26 }

  consumer.destroy(); // 释放内存
}`;

  const configCode = `// ── 不同工具的 Sourcemap 配置与策略 ─────────────────────────────────────────

// Webpack：devtool 配置项（按速度/质量权衡）
module.exports = {
  // 开发环境：质量优先，完整映射
  devtool: 'eval-source-map',
  // eval-source-map：每个模块用 eval() 执行，sourcemap 内联在 eval 字符串末尾
  // 重建速度快，但初次构建慢；映射精确到行列

  // 生产环境常用策略（三选一）：
  // devtool: false,              // 不生成，最小体积，无法调试
  // devtool: 'hidden-source-map', // 生成 .map 文件，但不在 bundle 末尾注释引用
  //                               // 上传到错误监控平台（Sentry）后可还原，用户无法访问
  // devtool: 'nosources-source-map', // 生成映射但不含 sourcesContent，
  //                                   // 保护源码同时支持行号定位
};

// Vite：build.sourcemap 配置
export default defineConfig({
  build: {
    sourcemap: false,    // 生产默认 false
    // sourcemap: true,  // 生成 .map 文件并注释引用
    // sourcemap: 'inline',  // base64 内联到 bundle 末尾（体积翻倍，仅调试用）
    // sourcemap: 'hidden',  // 生成 .map 但不注释引用（Sentry 场景）
  },
});

// ── 上传 Sourcemap 到 Sentry（生产错误定位最佳实践）────────────────────────
// 1. 构建时生成 hidden sourcemap
// 2. CI 中用 Sentry CLI 上传（构建后、部署前）
// sentry-cli releases files VERSION upload-sourcemaps ./dist \\
//   --url-prefix '~/static/js' --rewrite

// sentry.config.ts（Next.js 示例）
import { withSentryConfig } from '@sentry/nextjs';
export default withSentryConfig(nextConfig, {
  hideSourceMaps: true,    // 生产 bundle 不暴露 sourcemap 引用
  widenClientFileUpload: true,
});

// ── source-map-explorer 分析产物（查看每个模块的体积占比）─────────────────
// pnpm add -D source-map-explorer
// "analyze": "source-map-explorer 'dist/assets/*.js' --html report.html"
// 结合 Sentry 的 Release + sourcemap 可精确定位生产报错到源码行`;

  const notes = [
    ruleBox('warning', `<strong>Sourcemap 安全风险：</strong>生产环境若将 <code>.map</code> 文件部署到与 bundle 同目录且可公开访问，任何人都能通过 DevTools 查看完整源码（包括敏感逻辑、API Key 硬编码等）。正确做法：使用 <code>hidden-source-map</code> 生成 <code>.map</code> 但不在 bundle 中添加引用注释，再通过权限控制的内网渠道上传给错误监控平台。`),
    ruleBox('info', `<strong>Source Map Spec v4（草案）：</strong>v3 的 VLQ mappings 在大型项目中解析成本高。v4 草案提出了更紧凑的 <code>scopes</code> 字段，可准确映射内联变量名（现在 v3 在压缩后经常显示错误的变量名）。Chrome 113+ 已实验性支持部分 v4 特性（<code>ignoreList</code> 字段：标记 node_modules 源码，DevTools 调试时自动跳过）。`),
    ruleBox('success', `<strong>ignoreList 优化调试体验：</strong>在 Sourcemap 的 <code>ignoreList</code> 数组中列出 node_modules 对应的 sources 下标，Chrome DevTools 会在单步调试时自动跳过这些文件。Vite 已默认为 <code>node_modules</code> 模块生成 <code>ignoreList</code> 标记，调试时不会陷入 React 内部源码。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('Sourcemap 文件结构 + source-map 库解码', 'dot-blue', 'javascript', formatCode) + codeBlock('各构建工具配置策略 + Sentry 上传流程', 'dot-green', 'javascript', configCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
