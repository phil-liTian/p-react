import { createElement, useState } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

function Counter() {
  const [count, setCount] = useState(0);

  return createElement(
    'div',
    { id: 'app', style: { padding: '20px', fontFamily: 'sans-serif' } },
    createElement('h1', null, `Count: ${count}`),
    createElement(
      'button',
      {
        onClick: () => setCount((prev: number) => prev + 1),
        style: { padding: '8px 16px', fontSize: '16px', cursor: 'pointer' },
      },
      '+1'
    ),
    createElement(
      'button',
      {
        onClick: () => setCount((prev: number) => prev - 1),
        style: {
          padding: '8px 16px',
          fontSize: '16px',
          cursor: 'pointer',
          marginLeft: '8px',
        },
      },
      '-1'
    ),
    createElement(
      'button',
      {
        onClick: () => setCount(0),
        style: {
          padding: '8px 16px',
          fontSize: '16px',
          cursor: 'pointer',
          marginLeft: '8px',
        },
      },
      'Reset'
    )
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(Counter, null));
