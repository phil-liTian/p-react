import { createElement, useReducer } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

type Action = 'inc' | 'dec' | 'reset';

function reducer(state: number, action: Action): number {
  switch (action) {
    case 'inc':
      return state + 2;
    case 'dec':
      return state - 3;
    case 'reset':
      return 0;
    default:
      return state;
  }
}

function Counter() {
  const [count, dispatch] = useReducer(reducer, 0);

  return createElement(
    'div',
    { style: { padding: '20px', fontFamily: 'sans-serif' } },
    createElement('h1', null, `Count: ${count}`),
    createElement('button', { onClick: () => dispatch('inc') }, '+2'),
    createElement('button', { onClick: () => dispatch('dec'), style: { marginLeft: '8px' } }, '-2'),
    createElement('button', { onClick: () => dispatch('reset'), style: { marginLeft: '8px' } }, 'Reset')
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(Counter, null));
