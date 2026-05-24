export interface HostConfig {
  createInstance(type: string, props: any): any;
  createTextInstance(text: string): any;
  appendInitialChild(parent: any, child: any): void;
  appendChildToContainer(container: any, child: any): void;
}
