function renderBabel(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Babel 是一个 <strong>JS 编译器</strong>，核心流程分三步：
    <strong>Parse（解析）→ Transform（转换）→ Generate（生成）</strong>。
    Parse 将源码转为 AST，Transform 通过插件遍历并修改 AST 节点，Generate 将修改后的 AST 重新输出为代码。
    理解这三步是编写 Babel 插件、自定义语法转换、以及排查编译问题的基础。`);

  const principle = `
    <p><strong>三步核心流程：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li>
        <strong>Parse（解析）</strong>：由 <code>@babel/parser</code>（原 babylon）完成。
        分两个阶段：<strong>词法分析</strong>将字符流切分为 Token 序列（如 <code>const</code>、<code>x</code>、<code>=</code>、<code>1</code>），
        <strong>语法分析</strong>将 Token 序列按语法规则构建为 <strong>AST（抽象语法树）</strong>
      </li>
      <li>
        <strong>Transform（转换）</strong>：由 <code>@babel/traverse</code> 深度优先遍历 AST。
        每个插件注册对特定节点类型的 <strong>访问者（Visitor）</strong>，在进入/退出节点时执行转换逻辑。
        插件按配置顺序依次执行，Preset 是插件集合的快捷方式（内部倒序执行插件）
      </li>
      <li>
        <strong>Generate（生成）</strong>：由 <code>@babel/generator</code> 将修改后的 AST
        重新转换为代码字符串，同时生成 <strong>Sourcemap</strong>（记录新旧代码的位置映射）
      </li>
    </ol>
    <p><strong>核心包速览：</strong></p>
    <ul>
      <li><code>@babel/core</code>：orchestrate 三步流程的入口</li>
      <li><code>@babel/parser</code>：词法 + 语法分析，输出 AST</li>
      <li><code>@babel/traverse</code>：遍历 AST，驱动 Visitor 执行</li>
      <li><code>@babel/types</code>：AST 节点的工厂函数和类型断言（<code>t.isIdentifier(node)</code>）</li>
      <li><code>@babel/generator</code>：AST → 代码字符串 + Sourcemap</li>
      <li><code>@babel/template</code>：将代码字符串快速转为 AST 片段，避免手动拼 AST 节点</li>
    </ul>`;

  const pluginCode = `// ── 手写 Babel 插件：将 console.log 调用替换为 noop ─────────────────────────
// 插件本质是一个返回 { visitor } 对象的函数
// babel.config.js 或 .babelrc 中配置：plugins: ['./my-plugin.js']

// my-plugin.js
module.exports = function({ types: t }) {
  // types (t) 是 @babel/types 的工具集
  return {
    name: 'remove-console',   // 插件名，用于错误提示

    visitor: {
      // 每当遍历到 CallExpression 节点时触发
      CallExpression(path) {
        const { callee } = path.node;

        // 判断是否为 console.log / console.warn / console.error
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: 'console' }) &&
          t.isIdentifier(callee.property)
        ) {
          const method = callee.property.name;
          if (['log', 'warn', 'error', 'info'].includes(method)) {
            // 用空语句替换整个调用（也可直接 path.remove()）
            path.replaceWith(t.expressionStatement(
              t.identifier('undefined')
            ));
            // 或者：path.remove(); // 直接删除该语句
          }
        }
      },
    },
  };
};

// ── 测试插件 ──────────────────────────────────────────────────────────────────
const babel = require('@babel/core');

const input = \`
  console.log('debug:', data);
  const result = compute(data);
  console.warn('result:', result);
  return result;
\`;

const { code } = babel.transformSync(input, {
  plugins: [require('./my-plugin.js')],
});

console.log(code);
// 输出：
//   undefined;
//   const result = compute(data);
//   undefined;
//   return result;`;

  const astCode = `// ── 使用 @babel/parser 观察 AST 结构 ────────────────────────────────────────
const parser = require('@babel/parser');

const ast = parser.parse(\`
  const greet = (name) => \\\`Hello, \\\${name}!\\\`;
\`, {
  sourceType: 'module',
  plugins: ['jsx', 'typescript'], // 按需开启语法插件
});

// AST 结构示意（JSON 简化版）：
// {
//   type: "File",
//   program: {
//     type: "Program",
//     body: [{
//       type: "VariableDeclaration",
//       kind: "const",
//       declarations: [{
//         type: "VariableDeclarator",
//         id: { type: "Identifier", name: "greet" },
//         init: {
//           type: "ArrowFunctionExpression",
//           params: [{ type: "Identifier", name: "name" }],
//           body: {
//             type: "TemplateLiteral",
//             quasis: [...],
//             expressions: [{ type: "Identifier", name: "name" }]
//           }
//         }
//       }]
//     }]
//   }
// }

// ── @babel/template：快速生成 AST 片段 ───────────────────────────────────────
const template = require('@babel/template').default;
const t = require('@babel/types');
const traverse = require('@babel/traverse').default;

// 用模板生成"性能埋点"注入逻辑：在每个函数入口插入计时代码
const timerTemplate = template(\`
  const TIMER_VAR = performance.now();
\`);

module.exports = function({ types: t }) {
  return {
    visitor: {
      FunctionDeclaration(path) {
        const timerVar = path.scope.generateUidIdentifier('_t');
        // 在函数体第一行插入 const _t = performance.now();
        path.get('body').unshiftContainer('body',
          timerTemplate({ TIMER_VAR: timerVar })
        );
      },
    },
  };
};

// ── babel.config.js 生产配置示例 ─────────────────────────────────────────────
module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,          // 保留 ESM，让打包工具做 Tree Shaking
      useBuiltIns: 'usage',    // 按需注入 polyfill（需配合 corejs: 3）
      corejs: 3,
      targets: '> 0.5%, not dead, not IE 11',
    }],
    ['@babel/preset-react', {
      runtime: 'automatic',    // React 17+ 无需手动 import React
    }],
    '@babel/preset-typescript',
  ],
  plugins: [
    // 生产环境去除 console.log
    process.env.NODE_ENV === 'production' && './my-plugin.js',
    // class 属性、装饰器等提案
    '@babel/plugin-proposal-class-properties',
  ].filter(Boolean),
};`;

  const notes = [
    ruleBox('warning', `<strong>Preset 执行顺序是倒序：</strong>plugins 从前到后执行，presets 从后往前执行（历史原因）。<code>presets: ['@babel/preset-env', '@babel/preset-react']</code> 实际执行顺序是先 React 再 env。插件总在 preset 之前执行。这个顺序经常是 Bug 来源，遇到奇怪的转换错误时首先检查顺序。`),
    ruleBox('info', `<strong>SWC / esbuild 与 Babel 的区别：</strong>SWC（Rust）和 esbuild（Go）同样做 JS 转译，速度比 Babel 快 10-100 倍，但<strong>不支持任意自定义插件</strong>（只有有限的内置变换）。Babel 的最大价值在于庞大的插件生态和高度可定制性——如 styled-components、i18n、自动埋点等需要 AST 级操作的场景仍需 Babel。`),
    ruleBox('success', `<strong>调试 AST 的工具：</strong>① <a href="https://astexplorer.net" style="color:var(--blue)">astexplorer.net</a> 实时查看任意代码的 AST 结构，是开发 Babel 插件的必备工具；② <code>babel --plugins ./my-plugin.js input.js</code> CLI 快速测试插件效果；③ Babel 插件手册（GitHub: jamiebuilds/babel-handbook）是最权威的入门文档。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('手写 Babel 插件（Visitor 模式）', 'dot-blue', 'javascript', pluginCode) + codeBlock('AST 结构观察 + @babel/template + 生产配置', 'dot-green', 'javascript', astCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
