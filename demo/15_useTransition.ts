/*
 * @Author: phil
 * @Date: 2026-06-06 22:49:09
 */
import { createElement, useState, useTransition } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示 useTransition：将耗时的列表渲染标记为低优先级更新
// mount 阶段：isPending = false，start 函数已创建
// update 阶段：点击按钮触发 startTransition，isPending 在 callback 执行期间为 true
function App() {
  const [query, setQuery] = useState('');
  const [list, setList] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    setQuery(value);

    // 把生成大列表的更新包在 startTransition 内，标记为低优先级
    startTransition(() => {
      const items = Array.from({ length: 20000000 }, (_, i) => `${value} - item ${i}`);
      setList(items);
    });
  }

  return createElement(
    'div',
    { style: { padding: '24px', fontFamily: 'sans-serif' } },
    createElement('h2', null, 'useTransition Demo'),
    createElement('p', { style: { color: '#666' } },
      'p-react 无 Lane/Scheduler，startTransition 同步执行，isPending 为演示机制。'
    ),
    createElement('input', {
      type: 'text',
      value: query,
      onInput: handleChange,
      placeholder: '输入关键词过滤列表...',
      style: { padding: '8px', width: '300px', fontSize: '16px' }
    }),
    createElement(
      'p',
      { style: { color: isPending ? 'orange' : 'green', marginTop: '8px' } },
      isPending ? '⏳ isPending: true（更新进行中）' : `✅ isPending: false，列表共 ${list.length} 项`
    ),
    createElement(
      'ul',
      { style: { height: '240px', overflowY: 'auto', border: '1px solid #ddd', margin: '8px 0', padding: '8px' } },
      ...list.slice(0, 20).map(item =>
        createElement('li', { key: item, style: { padding: '2px 0' } }, item)
      ),
      list.length > 20
        ? createElement('li', null, `...还有 ${list.length - 20} 项`)
        : null
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
