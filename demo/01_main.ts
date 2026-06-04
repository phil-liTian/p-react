/*
 * @Author: phil
 * @Date: 2026-05-22 15:56:15
 */
import { createElement } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

const App = createElement(
  'div',
  { id: 'app', style: { padding: '20px', fontFamily: 'sans-serif' } },
  createElement('span', null, 'Hello'),
  createElement('p', null, 'This is rendered by p-react (mini React implementation)')
);

const root = createRoot(document.getElementById('root')!);
root.render(App);
