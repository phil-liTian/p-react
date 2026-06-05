import { createElement, useState, useRef, useEffect } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// useRef 有两个主要用途：
// 1. 访问 DOM 元素
// 2. 保存跨渲染的可变值（不触发重渲染）

// ============================================
// 场景一：访问 DOM 元素
// ============================================
function FocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showInput, setShowInput] = useState(true);

  function handleFocus() {
    // 通过 ref.current 访问 DOM 元素
    console.log('inputRef.current', inputRef.current);
    
    inputRef.current?.focus();
  }

  function handleScrollToBottom() {
    // 访问 textarea 并操作其滚动位置
    const textarea = document.querySelector('.demo-textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  }

  return createElement(
    'div',
    { style: { padding: '20px', borderBottom: '1px solid #ccc', marginBottom: '20px' } },
    createElement('h2', null, '场景一：访问 DOM 元素'),
    createElement('p', null, 'useRef 最常见的用途是获取 DOM 元素的引用'),
    
    // 条件渲染的输入框，使用 ref 访问
    showInput
      ? createElement('input', {
          ref: inputRef,
          type: 'text',
          placeholder: '点击按钮聚焦到这里',
          style: { padding: '8px', marginRight: '10px', width: '200px' }
        })
      : null,
    
    createElement('button', { onClick: () => setShowInput(!showInput), style: { marginRight: '10px' } }, 
      showInput ? '隐藏输入框' : '显示输入框'
    ),
    createElement('button', { onClick: handleFocus, style: { marginRight: '10px' } }, '聚焦'),
    createElement('button', { onClick: handleScrollToBottom }, '滚动到底部'),
    
    createElement('textarea', {
      className: 'demo-textarea',
      style: { display: 'block', marginTop: '10px', width: '300px', height: '50px' },
      rows: 5
    }, '第一行\n第二行\n第三行\n第四行\n第五行（点击"滚动到底部"查看效果）'),
  );
}

// ============================================
// 场景二：保存跨渲染的可变值
// ============================================
function Timer() {
  const [count, setCount] = useState(0);
  // renderCount.current 在每次渲染后自增，但不触发额外重渲染
  const renderCount = useRef(0);
  renderCount.current += 1;

  // prevCount 保存上一次渲染的 count 值
  const prevCount = useRef(0);

  function handleClick() {
    prevCount.current = count;
    setCount(count + 1);
  }

  return createElement(
    'div',
    { style: { padding: '20px' } },
    createElement('h2', null, '场景二：保存跨渲染的可变值'),
    createElement('p', null, `当前 count: ${count}`),
    createElement('p', null, `上一次 count: ${prevCount.current}`),
    createElement('p', null, `组件渲染次数: ${renderCount.current}`),
    createElement('button', { onClick: handleClick }, 'count + 1'),
  );
}

// 组合两个场景
function App() {
  return createElement(
    'div',
    { style: { fontFamily: 'monospace' } },
    createElement(FocusInput),
    createElement(Timer),
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
