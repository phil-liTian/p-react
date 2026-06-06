// 用静态 glob 让 Vite 感知所有 demo 脚本，runner.html 通过此模块动态加载
export const scripts = import.meta.glob('./[0-9]*.ts');
