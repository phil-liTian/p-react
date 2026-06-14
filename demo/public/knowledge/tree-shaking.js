function renderTreeShaking(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Tree Shaking 依赖 <strong>ESM 的静态结构</strong>——
    打包工具在编译期分析哪些 export 没有被 import，标记为"dead code"，压缩时删除。
    CJS（<code>require/module.exports</code>）是动态的，无法静态分析，Tree Shaking 无效。
    两大陷阱：<strong>副作用文件</strong>（执行即改变全局状态）和<strong>Babel 转换为 CJS</strong>会让 Tree Shaking 失效。`);

  const principle = `
    <p><strong>工作原理（3 步）：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li><strong>静态分析依赖图：</strong>打包工具（Rollup / webpack）遍历所有 ESM import，构建"哪个模块被谁引用、用了哪些导出"的完整图谱</li>
      <li><strong>标记 used exports：</strong>从 Entry 出发，标记所有被实际消费的导出符号；未被任何 import 引用的导出标记为"unreachable"</li>
      <li><strong>Terser/SWC 压缩时删除：</strong>压缩器识别 unreachable 的函数/变量声明，连同其依赖一并删除</li>
    </ol>
    <p><strong>Tree Shaking 失效的三类原因：</strong></p>
    <ul>
      <li><strong>CJS 导出：</strong><code>module.exports = { ... }</code> 和 <code>exports.fn = ...</code> 无法静态分析，整个模块作为黑盒引入</li>
      <li><strong>副作用（Side Effects）：</strong>模块被 import 时执行了修改全局状态的代码（如 polyfill、CSS-in-JS 注入），打包工具无法判断是否安全删除，保守地保留整个模块</li>
      <li><strong>Babel 转译成 CJS：</strong>旧版 Babel 默认将 ESM 转换为 CJS（<code>@babel/plugin-transform-modules-commonjs</code>），导致打包工具收到的已是 CJS，Tree Shaking 失效</li>
    </ul>
    <p><strong><code>sideEffects</code> 字段：</strong>在 <code>package.json</code> 中声明副作用文件列表，告诉打包工具哪些文件不能被"摇掉"。<code>"sideEffects": false</code> 表示整个包无副作用，可放心 Tree Shake；<code>"sideEffects": ["*.css", "./src/polyfills.js"]</code> 列出有副作用的文件白名单。</p>`;

  const badCode = `// ✗ 导致 Tree Shaking 失效的常见写法

// 1. CJS 导出（整包引入，无法 Tree Shake）
// utils.js
module.exports = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b, // 即使没人用，也会被打包进去
};
// 使用方
const { add } = require('./utils'); // 实际打包了 add + subtract + multiply

// 2. 重导出时改变结构（桶文件陷阱）
// index.js（barrel file）
export { default as Button } from './Button';
export { default as Modal } from './Modal';
export { default as Table } from './Table'; // 巨大的组件库
// 使用方
import { Button } from 'ui-lib'; // 理论上只引 Button，实际可能引入全部

// 3. Babel 配置错误，将 ESM 转成 CJS
// .babelrc（错误）
{
  "presets": [
    ["@babel/preset-env", {
      "modules": "commonjs"  // ← 禁止！让 Babel 保留 ESM 结构
      // 应改为 "modules": false
    }]
  ]
}

// 4. 模块顶层有副作用（无法安全删除）
// analytics.js
window.__analytics = new Analytics(); // 顶层执行 → 副作用！
export function track(event) { /* ... */ }
// 即使 track 没被用，整个文件也会保留`;

  const goodCode = `// ✓ 让 Tree Shaking 生效的正确写法

// 1. 纯 ESM 导出
// utils.js（ESM，无副作用）
export const add = (a, b) => a + b;
export const subtract = (a, b) => a - b;
export const multiply = (a, b) => a * b;

// 使用方：只引 add，Tree Shaking 后 subtract/multiply 被删除
import { add } from './utils';

// 2. package.json 声明 sideEffects
// {
//   "name": "my-lib",
//   "sideEffects": false,           // 整个包无副作用，打包工具放心 Tree Shake
//   // 或列出有副作用的文件：
//   "sideEffects": ["*.css", "./src/polyfills.js"]
// }

// 3. Babel 保留 ESM（让打包工具处理模块转换）
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false, // ✓ 保留 ESM import/export，由 webpack/rollup 处理
    }],
    '@babel/preset-typescript',
  ],
};

// 4. 副作用代码隔离到独立文件，并在 sideEffects 中声明
// polyfills.js（有副作用，单独引入）
import 'core-js/stable';
import 'regenerator-runtime/runtime';
// package.json: "sideEffects": ["./src/polyfills.js"]
// 主入口不引入 polyfills，用户按需自行引入

// 5. 组件库正确的 barrel 文件写法（启用 Webpack sideEffects 模式）
// 确保每个子模块都是纯 ESM 且 package.json 声明 sideEffects: false
// 或直接从具体路径引入，绕过 barrel
import Button from 'ui-lib/Button';   // ✓ 直接引入，不走 index.js
// import { Button } from 'ui-lib';   // ✗ 可能引入整个库（取决于库的配置）

// 6. Rollup 配置（库打包首选，Tree Shaking 更彻底）
// rollup.config.js
export default {
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.cjs', format: 'cjs' },
    { file: 'dist/index.esm.js', format: 'esm' }, // 保留 ESM，让消费方 Tree Shake
  ],
  treeshake: {
    moduleSideEffects: false, // 告诉 Rollup 所有模块无副作用
  },
};`;

  const notes = [
    ruleBox('warning', `<strong>桶文件（Barrel）陷阱：</strong>大型库用 <code>index.js</code> 统一重导出所有子模块，如果子模块有副作用或未声明 <code>sideEffects:false</code>，打包工具会把整个 barrel 及其依赖全部打包进来。解决方案：① 库正确设置 <code>package.json sideEffects</code>；② 消费方直接引入子路径；③ 使用支持 <code>exports</code> 字段的包（让包管理器自动映射路径）。`),
    ruleBox('info', `<strong>Webpack vs Rollup 的 Tree Shaking 差异：</strong>Rollup 在设计上优先考虑 Tree Shaking（专为库打包设计），删除更彻底，输出更干净；Webpack 对动态特性支持更好（code splitting、HMR），但 Tree Shaking 需要更多配置（<code>optimization.usedExports: true</code> + <code>optimization.minimize: true</code>）。Vite 生产构建默认使用 Rollup，享受更好的 Tree Shaking 效果。`),
    ruleBox('success', `<strong>验证 Tree Shaking 是否生效：</strong>① 在目标导出函数中加入 <code>console.log('THIS SHOULD BE SHAKEN')</code>，检查 bundle 是否包含该字符串；② 使用 <code>webpack-bundle-analyzer</code> 查看实际打包内容；③ Rollup 的 <code>--watch</code> 模式会在输出中用注释标记被删除的代码（<code>/* removed */</code>）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ Tree Shaking 失效的常见场景', 'dot-red', 'javascript', badCode) + codeBlock('✓ 让 Tree Shaking 生效的正确写法', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
