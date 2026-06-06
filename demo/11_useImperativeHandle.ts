import { createElement, useRef, useImperativeHandle, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

// 演示 useImperativeHandle：子组件通过 ref 向父组件暴露指定方法
// mount 阶段：layout effect 执行 create()，将结果写入 ref.current
// update 阶段：deps 未变化时跳过 create()，deps 变化时重新执行

interface InputHandle {
  focus: () => void;
  getValue: () => string;
}

function FancyInput(props: { inputRef: { current: InputHandle | null } }) {
  const nativeRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(
    props.inputRef,
    () => ({
      focus() {
        nativeRef.current?.focus();
      },
      getValue() {
        return nativeRef.current?.value ?? '';
      },
    }),
    []
  );

  return createElement('input', {
    ref: nativeRef,
    type: 'text',
    placeholder: '子组件 input',
    style: { padding: '4px 8px', fontSize: '14px' },
  });
}

function App() {
  const inputRef = useRef<InputHandle | null>(null);
  const [msg, setMsg] = useState('');

  function handleFocus() {
    inputRef.current?.focus();
  }

  function handleRead() {
    setMsg('当前值: ' + (inputRef.current?.getValue() ?? ''));
  }

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'sans-serif' } },
    createElement('h3', null, 'useImperativeHandle 演示'),
    createElement(FancyInput, { inputRef }),
    createElement('br', null),
    createElement('br', null),
    createElement('button', { onClick: handleFocus, style: { marginRight: '8px' } }, '聚焦子组件'),
    createElement('button', { onClick: handleRead }, '读取子组件值'),
    msg ? createElement('p', null, msg) : null
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
