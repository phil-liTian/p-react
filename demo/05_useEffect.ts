import { createElement, useEffect } from '@p-react/react';
import { createRoot } from '@p-react/react-dom';

function App() {
  useEffect(() => {
    console.log('useEffect: App mounted');
    return () => {
      console.log('useEffect cleanup: App unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('useEffect: no deps - runs every render');
  });

  return createElement(
    'div',
    { id: 'app', style: { padding: '20px', fontFamily: 'sans-serif' } },
    createElement('h1', null, 'Hello p-react'),
    createElement('p', null, 'Check console for useEffect logs')
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(createElement(App, null));
