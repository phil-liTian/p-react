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

  /**
   * 对比新旧 props，将差异同步到已有 DOM 节点
   * 对应源码: ReactFiberConfigDOM.js → commitUpdate → updateProperties
   */
  commitUpdate(instance: HTMLElement, oldProps: any, newProps: any): void {
    // 移除旧 event listeners（简化：直接替换整个元素的处理）
    for (const key of Object.keys(oldProps)) {
      if (key === 'children') continue;
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        instance.removeEventListener(eventName, oldProps[key]);
      }
    }

    for (const key of Object.keys(newProps)) {
      if (key === 'children') continue;
      if (key === 'style') {
        // 先清空旧 style，再写入新 style
        instance.removeAttribute('style');
        Object.assign(instance.style, newProps[key]);
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase();
        instance.addEventListener(eventName, newProps[key]);
      } else if (key === 'className') {
        instance.setAttribute('class', newProps[key]);
      } else {
        instance.setAttribute(key, newProps[key]);
      }
    }
  },

  /**
   * 更新文本节点内容
   * 对应源码: ReactFiberConfigDOM.js → commitTextUpdate
   */
  commitTextUpdate(textInstance: Text, newText: string): void {
    textInstance.nodeValue = newText;
  },

  removeChild(parent: HTMLElement, child: HTMLElement | Text): void {
    parent.removeChild(child);
  },
};
