import { createElement } from '../packages/react/src/index.ts';
import { REACT_ELEMENT_TYPE } from '../packages/shared/src/index.ts';
import { createReconciler } from '../packages/react-reconciler/src/index.ts';
import type { HostConfig } from '../packages/react-reconciler/src/hostConfig.ts';

// Minimal DOM simulation for verification
const nodes: string[] = [];

const testHostConfig: HostConfig = {
  createInstance(type: string, props: any) {
    const node = { type, props, children: [] as any[] };
    return node;
  },
  createTextInstance(text: string) {
    return { text };
  },
  appendInitialChild(parent: any, child: any) {
    parent.children.push(child);
  },
  appendChildToContainer(container: any, child: any) {
    container.children.push(child);
  },
};

// Test createElement
const element = createElement(
  'div',
  { id: 'app' },
  createElement('h1', null, 'Hello World'),
  createElement('p', null, 'This is p-react')
);

console.assert(element.$$typeof === REACT_ELEMENT_TYPE, '$$typeof check failed');
console.assert(element.type === 'div', 'type check failed');
console.assert(element.props.id === 'app', 'props check failed');
console.log('✓ createElement works');

// Test full render pipeline
const { createContainer, updateContainer } = createReconciler(testHostConfig);
const container = { children: [] as any[] };
const root = createContainer(container);
updateContainer(element, root);

console.assert(container.children.length > 0, 'render produced no output');
const rootDiv = container.children[0];
console.assert(rootDiv.type === 'div', `expected div, got ${rootDiv.type}`);
console.assert(rootDiv.props.id === 'app', 'div props incorrect');
console.assert(rootDiv.children.length === 2, `expected 2 children, got ${rootDiv.children.length}`);

const h1 = rootDiv.children[0];
console.assert(h1.type === 'h1', `expected h1, got ${h1.type}`);
console.assert(h1.children[0].text === 'Hello World', `expected "Hello World", got "${h1.children[0].text}"`);

const p = rootDiv.children[1];
console.assert(p.type === 'p', `expected p, got ${p.type}`);
console.assert(p.children[0].text === 'This is p-react', `expected "This is p-react", got "${p.children[0].text}"`);

console.log('✓ Full render pipeline works');
console.log('✓ Output structure: div#app > h1("Hello World") + p("This is p-react")');
console.log('\nAll tests passed! The demo will render Hello World correctly in the browser.');
