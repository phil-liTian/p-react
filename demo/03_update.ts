import { createElement, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示组件更新的三种核心场景：
// 1. 属性更新（Update flag）：同类型节点原地更新，DOM 节点复用
// 2. 条件渲染（ChildDeletion + Placement）：类型改变时旧节点删除、新节点插入
// 3. 列表更新（多子节点 diff）：通过 key 复用不变节点

function Counter() {
  const [count, setCount] = useState(0);
  const [showBonus, setShowBonus] = useState(false);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px' } },
    // createElement('h2', null, 'Update Demo'),

    // 场景 1：属性更新 —— 文本内容变化，<p> 节点本身被复用（Update flag）
    createElement(
      'p',
      { style: { color: count > 5 ? '#ef4444' : '#1e293b', fontSize: '18px' } },
      `Count: ${count}`
    ),

    createElement(
      'div',
      { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
      createElement(
        'button',
        {
          onClick: () => setCount(count + 1),
          style: { padding: '6px 14px', cursor: 'pointer' },
        },
        '+1'
      ),
      // createElement(
      //   'button',
      //   {
      //     onClick: () => setCount(0),
      //     style: { padding: '6px 14px', cursor: 'pointer' },
      //   },
      //   'Reset'
      // )
    ),

    // 场景 2：条件渲染 —— 切换时触发 ChildDeletion + Placement
    // createElement(
    //   'button',
    //   {
    //     onClick: () => setShowBonus(!showBonus),
    //     style: { padding: '6px 14px', cursor: 'pointer', marginBottom: '12px', display: 'block' },
    //   },
    //   showBonus ? 'Hide bonus' : 'Show bonus'
    // ),
    // showBonus
    //   ? createElement(
    //       'div',
    //       { style: { background: '#fef9c3', padding: '10px', borderRadius: '6px' } },
    //       `Bonus: ${count * 2}`
    //     )
    //   : null
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(Counter, null));

