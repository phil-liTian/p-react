// ── 渲染器: JSX 本质、createElement、ReactElement 结构 ──────────────────────
(function (global) {
  const { renderArticle } = global.PrincipleUtils;

  const blocks = [
    { kind: 'text', title: '一句话结论',
      body: '<strong>JSX 是 createElement 的语法糖；createElement 返回的是 ReactElement 对象，不是真实 DOM。</strong>React 拿到这个对象后再交给 reconciler 协调成 fiber，最终由 renderer 渲染成真实节点。' },

    { kind: 'code', label: 'JSX 源 → 编译后', dot: 'accent', lang: 'jsx',
      code: `// 源代码（JSX）
<div id="box" className="card">
  <span>hello</span>
  <span>react</span>
</div>

// Babel / SWC 编译后（classic runtime）
React.createElement(
  'div',
  { id: 'box', className: 'card' },
  React.createElement('span', null, 'hello'),
  React.createElement('span', null, 'react')
);

// React 17+ automatic runtime（默认）
// 不再显式 import React，由编译器注入 jsx-runtime
import { jsx as _jsx } from 'react/jsx-runtime';
_jsx('div', {
  id: 'box',
  className: 'card',
  children: [
    _jsx('span', { children: 'hello' }),
    _jsx('span', { children: 'react' }),
  ]
});` },

    { kind: 'text', title: 'createElement 做了什么',
      body: ' createElement 接收三个参数：<code>type</code>（标签名或组件函数）、<code>config</code>（属性对象）、<code>...children</code>（剩余参数都是子节点）。它做的事很朴素：从 config 中挑出 <code>key</code> 和 <code>ref</code>，剩下原样拷到 props；把 children 按数量挂到 <code>props.children</code> 上；最后调用 <code>ReactElement</code> 包装成一个对象返回。' },

    { kind: 'code', label: 'p-react 简化实现 · packages/react/src/createElement.ts', dot: 'blue', lang: 'typescript',
      code: `export function createElement(
  type: Type,
  config: Record<string, any> | null,
  ...maybeChildren: any[]
): ReactElement {
  const props: Props = {};
  let key: Key = null;
  let ref: Ref = null;

  if (config) {
    for (const prop in config) {
      if (prop === 'key') {
        key = '' + config[prop];          // key 强制转字符串
      } else if (prop === 'ref') {
        ref = config[prop];
      } else {
        props[prop] = config[prop];        // 其余原样挂到 props
      }
    }
  }

  // 单个子节点直接赋值，多个组成数组 —— 与 JSX 编译结果一致
  if (maybeChildren.length === 1) {
    props.children = maybeChildren[0];
  } else if (maybeChildren.length > 1) {
    props.children = maybeChildren;
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,  // Symbol.for('react.element')
    type,                          // 'div' | Function | Context...
    key,
    ref,
    props,
  };
}` },

    { kind: 'text', title: 'ReactElement 的结构',
      body: 'ReactElement 就是一个普通对象，只有五个关键字段。它本身不含任何渲染逻辑，只是<strong>描述</strong>"这里要渲染一个什么节点"。<code>$$typeof</code> 是安全标记，<code>type</code> 决定渲染成什么（字符串 → 原生标签；函数 → 函数组件；类 → 类组件；memo/lazy/context 等特殊类型按各自分支处理），<code>key/ref</code> 是 React 内部使用的保留字段，<code>props</code> 携带数据和子节点。' },

    { kind: 'code', label: 'ReactElement 对象字面量', dot: 'green', lang: 'typescript',
      code: `// 编译 <div id="box"><span>hi</span></div> 后得到的对象
{
  $$typeof: Symbol.for('react.element'),  // 运行时类型守卫
  type: 'div',                            // 标签名 / 组件函数 / 特殊对象
  key: null,                              // 列表复用 key
  ref: null,                              // DOM / 实例引用
  props: {
    id: 'box',
    children: {                            // 单子节点直接是对象
      $$typeof: Symbol.for('react.element'),
      type: 'span',
      key: null,
      ref: null,
      props: { children: 'hi' },
    },
  },
}` },

    { kind: 'rule', ruleType: 'accent',
      text: '<strong>$$typeof 为什么必须是 Symbol？</strong>—— 防止服务端把用户提交的 JSON 当作 ReactElement 注入。如果 $$typeof 只是字符串 <code>"react.element"</code>，攻击者构造一段 <code>{ $$typeof: "react.element", type: "script", props: { src: "evil.js" } }</code> 的 JSON 入库，水合时就会被 React 当作合法元素渲染。Symbol 无法在 JSON 中序列化，从根上杜绝了这一类 XSS。源码位置：<code>shared/ReactSymbols.js</code>。' },

    { kind: 'text', title: '与源码的差异',
      body: '源码 <code>source/packages/react/src/jsx/ReactJSXElement.js</code> 中的 <code>createElement</code> 还做了：① <code>__self / __source</code>（调试信息）过滤；② <code>defaultProps</code> 合并；③ dev 模式下对 <code>key</code> 做字符串化校验、对 <code>ref</code> 访问加废弃警告；④ 把 <code>_owner</code>（创建者 fiber）挂在 element 上，便于 DevTools 追溯。p-react 出于教学目的全部省略，只保留主链路。' },

    { kind: 'rule', ruleType: 'info',
      text: '<strong>automatic vs classic runtime</strong>：React 17+ 默认走 automatic runtime（<code>react/jsx-runtime</code>），编译产物不再需要文件顶部 <code>import React</code>，<code>createElement</code> 被替换为更专用的 <code>jsx</code> / <code>jsxs</code>。两者产物等价，但 automatic runtime 体积更小、children 处理更直接。阅读老项目源码时仍会看到 <code>React.createElement</code>。' },

    { kind: 'rule', ruleType: 'success',
      text: '<strong>记忆要点</strong>：① JSX ≈ createElement(...) 调用；② createElement 只<strong>组装对象</strong>，不碰 DOM；③ ReactElement 是不可变描述对象，<code>$$typeof</code> 守门；④ 真正的"变成 DOM"发生在 reconciler + renderer 里，不在这一层。' },
  ];

  global.renderJsxCreateelementReactelement = function (p) {
    return renderArticle(Object.assign({}, p, { blocks }));
  };
})(window);