/**
 * demo/16_lane.ts — Lane 优先级模型演示
 *
 * 演示要点：
 * 1. 通过 console.log 打印每次更新走过的 Lane
 * 2. 两个按钮分别触发 SyncLane（同步）和 DefaultLane（普通）更新
 * 3. 在控制台可以观察到 pendingLanes / finishedLanes 的变化
 */
import { createElement, useState, useStateWithLane } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';
import { SyncLane, DefaultLane } from '@p-react/shared';

function LaneDemo() {
  const [syncCount, setSyncCount] = useState(0);
  // 使用 useStateWithLane 指定 DefaultLane，让该 state 的更新走不同优先级
  const [defaultCount, setDefaultCount] = useStateWithLane(0, DefaultLane);

  return createElement(
    'div',
    { style: { padding: '24px', fontFamily: 'monospace' } },
    createElement('h2', null, 'Lane 模型演示'),
    createElement(
      'p',
      { style: { color: '#666', marginBottom: '16px' } },
      '打开控制台，观察每次 setState 触发时 pendingLanes / finishedLanes 的位掩码变化。注意两个按钮触发的 Lane 不同！'
    ),

    // SyncLane 更新区块
    createElement(
      'div',
      { style: { marginBottom: '16px', padding: '12px', background: '#e8f4fd', borderRadius: '6px' } },
      createElement('strong', null, 'SyncLane (0b10) — 最高优先级'),
      createElement('p', { style: { margin: '4px 0' } }, `点击次数: ${syncCount}`),
      createElement(
        'button',
        {
          onClick: () => setSyncCount(syncCount + 1),
          style: { padding: '6px 14px', cursor: 'pointer' }
        },
        '同步更新 +1'
      )
    ),

    // DefaultLane 更新区块
    createElement(
      'div',
      { style: { marginBottom: '16px', padding: '12px', background: '#fdf3e8', borderRadius: '6px' } },
      createElement('strong', null, 'DefaultLane (0b100000) — 普通优先级'),
      createElement('p', { style: { margin: '4px 0' } }, `点击次数: ${defaultCount}`),
      createElement(
        'button',
        {
          onClick: () => setDefaultCount(defaultCount + 1),
          style: { padding: '6px 14px', cursor: 'pointer' }
        },
        '普通更新 +1'
      )
    ),

    // Lane 位掩码可视化
    createElement(
      'div',
      { style: { padding: '12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px' } },
      createElement('div', null, '── Lane 常量 ──────────────'),
      createElement('div', null, 'NoLanes            = 0b00000000000000000000000000000000'),
      createElement('div', null, 'SyncLane           = 0b00000000000000000000000000000010'),
      createElement('div', null, 'InputContinuousLane= 0b00000000000000000000000000001000'),
      createElement('div', null, 'DefaultLane        = 0b00000000000000000000000000100000'),
      createElement('div', null, 'TransitionLane     = 0b00000000000000000000000100000000'),
      createElement('div', null, 'IdleLane           = 0b00100000000000000000000000000000'),
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(LaneDemo, null));
