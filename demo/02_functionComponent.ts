import { createElement, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示函数组件：props 传递、嵌套组件、条件渲染

interface BadgeProps {
  label: string;
  color: string;
}

// 子组件：接收 props 渲染 badge
function Badge(props: BadgeProps) {
  return createElement(
    'span',
    {
      style: {
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        background: props.color,
        color: '#fff',
        fontSize: '13px',
        marginRight: '8px',
      },
    },
    props.label
  );
}

interface UserCardProps {
  name: string;
  role: string;
  online: boolean;
}

// 嵌套组件 + 条件渲染：online 状态决定 badge 颜色
function UserCard(props: UserCardProps) {
  return createElement(
    'div',
    {
      style: {
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        maxWidth: '320px',
      },
    },
    createElement('strong', null, props.name),
    createElement('div', { style: { marginTop: '6px' } },
      createElement(Badge, { label: props.role, color: '#6366f1' } as any),
      props.online
        ? createElement(Badge, { label: 'Online', color: '#22c55e' } as any)
        : createElement(Badge, { label: 'Offline', color: '#94a3b8' } as any)
    )
  );
}

// 根组件：管理用户列表状态，演示函数组件树的更新
function App() {
  const [onlineId, setOnlineId] = useState<number>(0);

  const users = [
    { id: 0, name: 'Alice', role: 'Engineer' },
    { id: 1, name: 'Bob', role: 'Designer' },
    { id: 2, name: 'Carol', role: 'PM' },
  ];

  return createElement(
    'div',
    { style: { padding: '24px', fontFamily: 'sans-serif' } },
    createElement('h2', null, 'Function Component Demo'),
    createElement('p', { style: { color: '#64748b', fontSize: '14px' } },
      'Click a name to toggle online status'
    ),
    ...users.map(u =>
      createElement(
        'div',
        {
          key: u.id,
          onClick: () => setOnlineId(u.id),
          style: { cursor: 'pointer' },
        },
        createElement(UserCard, {
          name: u.name,
          role: u.role,
          online: onlineId === u.id,
        } as any)
      )
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
