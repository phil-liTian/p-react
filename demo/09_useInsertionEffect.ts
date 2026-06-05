import { createElement, useState, useInsertionEffect, useLayoutEffect, useEffect } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示 useInsertionEffect 的执行时机：早于 useLayoutEffect，早于 useEffect
// 典型用途：CSS-in-JS 库在 layout 读取前注入 <style>

function StyleInjector({ color }: { color: string }) {
  // useInsertionEffect: mutation 阶段前执行，此时 DOM 尚未被 React 修改
  useInsertionEffect(() => {
    console.log('[1] useInsertionEffect create — 注入样式, color:', color);
    const style = document.createElement('style');
    style.id = 'p-react-injected';
    style.textContent = `#box { background: ${color}; padding: 16px; border-radius: 4px; }`;
    document.head.appendChild(style);
    return () => {
      console.log('[1] useInsertionEffect destroy — 移除旧样式');
      style.remove();
    };
  }, [color]);

  // useLayoutEffect: mutation 结束后、paint 前执行
  useLayoutEffect(() => {
    console.log('[2] useLayoutEffect — DOM 已更新，可读取 layout');
    return () => {
      console.log('[2] useLayoutEffect destroy');
    };
  }, [color]);

  // useEffect: paint 后异步执行
  useEffect(() => {
    console.log('[3] useEffect — 浏览器已 paint');
    return () => {
      console.log('[3] useEffect destroy');
    };
  }, [color]);

  return createElement(
    'div',
    null,
    createElement('div', { id: 'box' }, `当前颜色: ${color}`),
  );
}

function App() {
  const [color, setColor] = useState('lightblue');
  const colors = ['lightblue', 'lightcoral', 'lightgreen', 'lightyellow'];

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'monospace' } },
    createElement('h2', null, 'useInsertionEffect 演示'),
    createElement('p', null, '打开控制台查看三个 effect 的执行顺序: [1]→[2]→[3]'),
    createElement(StyleInjector, { color }),
    createElement(
      'div',
      { style: { marginTop: '12px' } },
      ...colors.map(c =>
        createElement(
          'button',
          {
            key: c,
            onClick: () => setColor(c),
            style: { marginRight: '8px', padding: '4px 10px' },
          },
          c
        )
      )
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
