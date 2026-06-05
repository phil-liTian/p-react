import { createElement, useState, useEffect, useLayoutEffect } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

/**
 * 演示 useLayoutEffect 与 useEffect 执行时机的差异：
 * - useLayoutEffect: 同步执行，DOM 变更后、paint 前（可避免闪烁）
 * - useEffect: 异步执行，paint 后（在 console 中晚于 layoutEffect 打印）
 */
function TimingDemo() {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    console.log('[useLayoutEffect] DOM updated, count =', count, '（同步，paint 前）');
    return () => {
      console.log('[useLayoutEffect] cleanup, count =', count);
    };
  }, [count]);

  useEffect(() => {
    console.log('[useEffect] count =', count, '（异步，paint 后）');
    return () => {
      console.log('[useEffect] cleanup, count =', count);
    };
  }, [count]);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'monospace' } },
    createElement('h2', null, 'useLayoutEffect vs useEffect'),
    createElement('p', null, `count: ${count}`),
    createElement('p', { style: { color: '#666', fontSize: '14px' } },
      '点击按钮，观察 console 中两个 effect 的执行顺序'
    ),
    createElement(
      'button',
      {
        onClick: () => setCount(count + 1),
        style: { padding: '8px 16px', fontSize: '16px', cursor: 'pointer' }
      },
      '+1'
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(TimingDemo, null));
