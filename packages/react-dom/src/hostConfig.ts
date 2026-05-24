import type { HostConfig } from '@p-react/react-reconciler';

export const DOMHostConfig: HostConfig = {
  createInstance(type: string, props: any): HTMLElement {
    const element = document.createElement(type);

    for (const key of Object.keys(props)) {
      if (key === 'children') continue;
      if (key === 'style') {
        Object.assign(element.style, props[key]);
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, props[key]);
      } else if (key === 'className') {
        element.setAttribute('class', props[key]);
      } else {
        element.setAttribute(key, props[key]);
      }
    }

    return element;
  },

  createTextInstance(text: string): Text {
    return document.createTextNode(text);
  },

  appendInitialChild(parent: HTMLElement, child: HTMLElement | Text): void {
    parent.appendChild(child);
  },

  appendChildToContainer(container: HTMLElement, child: HTMLElement | Text): void {
    container.appendChild(child);
  },
};
