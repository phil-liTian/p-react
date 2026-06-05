import { createElement, createContext, useContext, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 创建 Theme Context，默认值为 'light'
const ThemeContext = createContext<'light' | 'dark'>('light');

// 消费 context 的子组件
function ThemedButton() {
  const theme = useContext(ThemeContext);
  const bg = theme === 'dark' ? '#333' : '#eee';
  const color = theme === 'dark' ? '#fff' : '#000';

  return createElement(
    'button',
    { style: { background: bg, color, padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' } },
    `当前主题: ${theme}`
  );
}

// Provider 包裹子树，value 变化时子组件读取到新值
function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return createElement(
    'div',
    { style: { padding: '24px', fontFamily: 'sans-serif' } },
    createElement('h2', null, 'useContext Demo'),
    createElement(ThemeContext.Provider, { value: theme },
      createElement(ThemedButton, null)
    ),
    createElement('br', null),
    createElement(
      'button',
      {
        onClick: () => setTheme(t => t === 'light' ? 'dark' : 'light'),
        style: { marginTop: '12px', padding: '8px 16px', cursor: 'pointer' }
      },
      '切换主题'
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
