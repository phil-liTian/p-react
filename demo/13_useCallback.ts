/**
 * useCallback Demo
 *
 * 用途：缓存函数引用，使其在依赖不变时跨渲染保持同一个引用。
 *
 * 为什么需要它：
 *   每次组件重渲染，函数字面量都会重新创建，引用地址不同。
 *   当这个函数被传给子组件或用作 useEffect/useMemo 的依赖时，
 *   引用变化会导致子组件不必要的重渲染或 effect 重复执行。
 *   useCallback(() => fn, deps) 等价于 useMemo(() => () => fn, deps)，
 *   只在 deps 变化时才返回新的函数引用。
 *
 * 典型场景：
 *   1. 将回调传给用 React.memo 包裹的子组件，避免子组件因引用变化而重渲染
 *   2. 将回调作为 useEffect 的依赖，避免 effect 每轮都重新执行
 */
import { createElement, useState, useCallback } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 子组件：通过 props.onClick 接收回调，用于演示 useCallback 对引用稳定性的影响
let childRenderCount = 0;

function Child({ label, onClick }: { label: string; onClick: () => void }) {
  childRenderCount++;
  return createElement(
    'div',
    { style: { margin: '8px 0', padding: '8px', background: '#f0f0f0' } },
    createElement('span', null, `${label}（子组件渲染次数: ${childRenderCount}）`),
    createElement('button', { onClick, style: { marginLeft: '8px' } }, '点击')
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('hello');

  // deps = [count]：count 变化时才创建新函数引用
  const handleCount = useCallback(() => {
    setCount((c: number) => c + 1);
  }, [count]);

  // deps = []：始终使用同一个函数引用（mount 时创建，永不重建）
  const handleReset = useCallback(() => {
    setCount(0);
    setText('hello');
  }, []);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'monospace' } },
    createElement('h2', null, 'useCallback Demo'),
    createElement('p', null, `count: ${count}`),
    createElement('p', null, `text: ${text}`),
    createElement(
      'input',
      {
        value: text,
        onInput: (e: any) => setText(e.target.value),
        style: { marginBottom: '12px', padding: '4px' },
        placeholder: '输入文字（不触发 handleCount 重建）',
      }
    ),
    createElement(Child, { label: 'handleCount（deps=[count]）', onClick: handleCount }),
    createElement(Child, { label: 'handleReset（deps=[]，引用永不变）', onClick: handleReset }),
    createElement(
      'p',
      { style: { color: '#888', fontSize: '12px' } },
      '修改 text 不会重建 handleCount，故 Child 的 onClick 引用不变（真实 React 中配合 React.memo 可阻止子组件重渲染）'
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
