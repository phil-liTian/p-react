function renderModuleHistory(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>前端模块化经历了 <strong>IIFE → CJS → AMD → ESM</strong> 四个阶段。
    ESM 是唯一的官方标准，具有<strong>静态结构</strong>（import/export 在编译期确定），
    是 Tree Shaking 和原生浏览器模块支持的基础。CJS 是 Node.js 的运行时方案，
    两者至今并存，了解区别是解决"模块互操作"问题的前提。`);

  const principle = `
    <p><strong>四个阶段演进：</strong></p>
    <table class="metrics-table">
      <thead><tr><th>阶段</th><th>代表</th><th>加载方式</th><th>核心问题</th></tr></thead>
      <tbody>
        <tr><td>IIFE</td><td>jQuery 时代</td><td>同步，&lt;script&gt; 顺序</td><td>全局命名空间污染，依赖顺序需手动维护</td></tr>
        <tr><td>CJS</td><td>Node.js (2009)</td><td>同步，运行时 require()</td><td>不适合浏览器（同步阻塞），无法静态分析</td></tr>
        <tr><td>AMD</td><td>RequireJS (2010)</td><td>异步，define/require 回调</td><td>回调嵌套，语法繁琐，已被 ESM 取代</td></tr>
        <tr><td>ESM</td><td>ES2015 标准</td><td>异步，静态 import/export</td><td>浏览器兼容（IE 不支持），顶层 await 需 Node 14+</td></tr>
      </tbody>
    </table>
    <p><strong>ESM vs CJS 关键区别：</strong></p>
    <ul>
      <li><strong>静态 vs 动态：</strong>ESM 的 <code>import</code> 必须在顶层，路径必须是字符串字面量，编译器可静态分析依赖图；CJS 的 <code>require()</code> 可在函数、条件语句中调用，路径可以是表达式，运行时才确定依赖。</li>
      <li><strong>值复制 vs 实时绑定：</strong>CJS 导出的是值的拷贝，模块内部修改后外部不感知；ESM 导出的是<strong>实时绑定（Live Binding）</strong>，被导出的变量在原模块改变时，所有导入方同步更新。</li>
      <li><strong>this：</strong>ESM 顶层 <code>this</code> 为 <code>undefined</code>；CJS 顶层 <code>this</code> 为 <code>module.exports</code>。</li>
    </ul>`;

  const badCode = `// ✗ IIFE 时代：全局污染 + 手动维护顺序
// index.html（必须按序引入，否则报错）
// <script src="utils.js"><\/script>    ← 先
// <script src="app.js"><\/script>      ← 后

// utils.js
var MyApp = MyApp || {};
MyApp.utils = (function() {
  var _private = 'secret'; // 伪私有（仍在全局 MyApp 上）
  return {
    format: function(str) { return str.trim(); }
  };
})();

// app.js
// 如果 utils.js 未加载，MyApp.utils 是 undefined → 运行时报错
MyApp.utils.format('  hello  ');

// ✗ CJS 被用于浏览器端（不借助打包工具时无法直接使用）
const path = require('path');            // 浏览器没有 require
const { readFile } = require('fs');      // 浏览器没有 fs
module.exports = { myFunc };

// ✗ ESM 动态路径（失去静态分析能力，Tree Shaking 失效）
const mod = await import('./' + name + '.js'); // 无法静态确定依赖`;

  const goodCode = `// ✓ ESM 标准写法
// math.js
export const PI = 3.14159;

export function add(a, b) { return a + b; }

// 默认导出（每个模块只能有一个）
export default class Calculator { /* ... */ }

// ✓ 具名导入（Tree Shaking 友好：打包时只保留 add，PI 和 Calculator 被摇掉）
import { add } from './math.js';
console.log(add(1, 2));

// ✓ 动态导入（异步，返回 Promise，用于懒加载，不影响静态分析的主依赖图）
const { add: addFn } = await import('./math.js');

// ✓ CJS（Node.js 服务端，或与 ESM 互操作时）
// package.json 中 "type": "module" 表示 .js 默认为 ESM
// "type": "commonjs"（默认）表示 .js 为 CJS，.mjs 强制 ESM，.cjs 强制 CJS

// ✓ 在 ESM 中导入 CJS 模块（Node.js 18+）
import lodash from 'lodash'; // CJS 包被作为默认导出整体导入
// 但无法具名导入 CJS：import { chunk } from 'lodash' 可能失败

// ✓ package.json 双入口（同时支持 CJS 和 ESM 的库写法）
// {
//   "main": "./dist/index.cjs",      // CJS 入口（require() 使用）
//   "module": "./dist/index.esm.js", // ESM 入口（打包工具优先使用）
//   "exports": {
//     "import": "./dist/index.esm.js",
//     "require": "./dist/index.cjs"
//   }
// }`;

  const notes = [
    ruleBox('warning', `<strong>CJS 循环依赖：</strong>CJS 用运行时缓存（<code>require.cache</code>）解决循环依赖，但被循环引用的模块在首次 <code>require</code> 时可能尚未执行完毕，导致获取到的是<strong>部分导出</strong>（空对象）。ESM 通过静态分析在编译期解决循环，实时绑定保证访问到最终值，但被引用时函数未执行仍会是 <code>undefined</code>，需注意初始化顺序。`),
    ruleBox('info', `<strong>Node.js 的 ESM 支持：</strong>Node 12+ 支持 ESM，需在 <code>package.json</code> 设 <code>"type":"module"</code>，或文件扩展名用 <code>.mjs</code>。<code>__dirname</code>、<code>__filename</code>、<code>require</code> 在 ESM 中不可用，替代方案：<code>import.meta.url</code>、<code>import.meta.dirname</code>（Node 21.2+）、<code>createRequire(import.meta.url)</code>。`),
    ruleBox('success', `<strong>UMD（Universal Module Definition）：</strong>一种同时兼容 IIFE/CJS/AMD 的写法，通过 IIFE + 运行环境检测分支实现。现代库打包时用 Rollup/tsup 自动生成，无需手写。随着 ESM 普及，UMD 逐渐退出历史舞台，新库直接提供 ESM + CJS 双入口即可。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('✗ IIFE 全局污染 + CJS/ESM 常见误用', 'dot-red', 'javascript', badCode) + codeBlock('✓ ESM 标准写法 + 双入口库配置', 'dot-green', 'javascript', goodCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
