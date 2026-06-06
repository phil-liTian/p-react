import { createElement, useMemo, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 模拟一个耗时的计算
function expensiveCalc(n: number): number {
  console.log(`[expensiveCalc] 重新计算，n=${n}`);
  let result = 0;
  for (let i = 0; i <= n; i++) result += i;
  return result;
}

function App() {
  const [count, setCount] = useState(5);
  const [tick, setTick] = useState(0);

  // deps=[count]：只有 count 变化时才重新执行 expensiveCalc
  // tick 变化触发重渲染时，useMemo 直接返回缓存值
  const sum = useMemo(() => expensiveCalc(count), [count]);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'sans-serif' } },
    createElement('h2', null, `1~${count} 的累加和：${sum}`),
    createElement('p', null, `无关状态 tick：${tick}`),
    createElement(
      'button',
      { onClick: () => setCount(c => c + 1), style: { marginRight: '8px' } },
      '增大 count（触发重新计算）'
    ),
    createElement(
      'button',
      { onClick: () => setTick(t => t + 1) },
      '增大 tick（命中缓存，不重新计算）'
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
