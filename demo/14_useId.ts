/**
 * useId Demo
 *
 * 用途：生成在当前页面唯一且在渲染间稳定的字符串 ID。
 *
 * 为什么需要它：
 *   HTML 无障碍属性（如 aria-labelledby / aria-describedby / htmlFor）
 *   要求关联元素拥有相同的 ID 字符串。手写 ID 在多实例场景下容易冲突，
 *   useId 自动分配全局唯一 ID，组件可安全复用多次。
 *
 * 典型场景：
 *   1. <label htmlFor={id}> 与 <input id={id}> 的无障碍绑定
 *   2. 同一组件渲染多份时各自拥有独立 ID，互不干扰
 *
 * ID 格式（p-react 客户端）：'_r_N_'（N 为全局递增整数）
 * React 源码格式：'_r_N_'（客户端）/ '_RxH_'（SSR 水合）
 */
import { createElement, useState, useId } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 单个表单字段：演示 useId 将 label 与 input 关联
function FormField({ label }: { label: string }) {
  const id = useId();
  return createElement(
    'div',
    { style: { margin: '12px 0' } },
    createElement('label', { htmlFor: id, style: { marginRight: '8px' } }, `${label}（id=${id}）`),
    createElement('input', { id, type: 'text', placeholder: '请输入…' })
  );
}

// 根组件：渲染多个 FormField 实例，验证每个实例获得独立且稳定的 ID
function App() {
  const [count, setCount] = useState(0);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'monospace' } },
    createElement('h2', null, 'useId Demo'),
    createElement('p', { style: { color: '#666' } }, `重渲染次数: ${count}`),
    createElement('button', { onClick: () => setCount(count + 1) }, '触发重渲染（验证 ID 稳定性）'),
    createElement('hr', null),
    createElement(FormField, { label: '用户名' }),
    createElement(FormField, { label: '邮箱' }),
    createElement(FormField, { label: '手机号' })
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
