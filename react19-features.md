# React 核心功能全览

> 覆盖 React 全版本核心概念，`🆕` 标注 React 18 / 19 新增或改进的功能。

---

## 目录

1. [JSX 与渲染基础](#一jsx-与渲染基础)
2. [组件](#二组件)
3. [Props](#三props)
4. [State 与更新](#四state-与更新)
5. [生命周期与副作用](#五生命周期与副作用)
6. [全部 Hooks 速查](#六全部-hooks-速查)
7. [Context](#七context)
8. [Refs](#八refs)
9. [事件系统](#九事件系统)
10. [列表与 Key](#十列表与-key)
11. [条件渲染与列表渲染](#十一条件渲染)
12. [性能优化](#十二性能优化)
13. [代码分割与懒加载](#十三代码分割与懒加载)
14. [Portals](#十四portals)
15. [Error Boundary](#十五error-boundary)
16. [Suspense](#十六suspense)
17. [并发特性（React 18）](#十七并发特性react-18)
18. [Actions 与表单（React 19）](#十八actions-与表单react-19)
19. [Server Components（React 19 稳定）](#十九server-componentsreact-19-稳定)
20. [React DOM API](#二十react-dom-api)
21. [调试工具](#二十一调试工具)

---

## 一、JSX 与渲染基础

### JSX 本质

JSX 是 `React.createElement()` 的语法糖，编译后产生 React 元素（普通 JS 对象）。

```tsx
// JSX
const el = <h1 className="title">Hello</h1>;

// 编译结果（React 17+ 自动引入，无需显式 import React）
const el = _jsx("h1", { className: "title", children: "Hello" });
```

### Fragment

避免多余的 DOM 包裹节点。

```tsx
// 完整写法
<React.Fragment key="item-1"><td>A</td><td>B</td></React.Fragment>

// 简写（不支持 key 属性）
<><td>A</td><td>B</td></>
```

### 表达式嵌入

```tsx
const name = 'React';
const el = <p>Hello, {name.toUpperCase()}!</p>;  // 花括号内可放任意 JS 表达式
```

---

## 二、组件

### 函数组件（推荐）

```tsx
function Welcome({ name }: { name: string }) {
  return <h1>Hello, {name}</h1>;
}
```

### 类组件（仍受支持，但不推荐新代码使用）

```tsx
class Welcome extends React.Component<{ name: string }> {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}
```

### 纯组件 / 记忆化

| API | 用途 |
|-----|------|
| `React.memo(Component)` | 函数组件浅比较 props，跳过不必要的重渲染 |
| `React.PureComponent` | 类组件版本的浅比较 |

```tsx
const ExpensiveList = React.memo(function List({ items }) {
  return items.map(i => <Item key={i.id} item={i} />);
});
```

---

## 三、Props

- 从父组件向子组件单向传递数据
- 子组件不能修改 props（只读）
- 特殊 prop：`children`（组件插槽内容）

```tsx
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

// 使用
<Card title="Welcome">
  <p>Content goes here</p>
</Card>
```

### 默认 Props

```tsx
function Button({ color = 'blue', label = 'Click' }) {
  return <button style={{ color }}>{label}</button>;
}
```

### Props 展开

```tsx
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}
```

---

## 四、State 与更新

### `useState`

```tsx
const [count, setCount] = useState(0);

// 函数式更新（依赖前一个状态时使用）
setCount(prev => prev + 1);

// 惰性初始化（初始值计算代价大时）
const [data, setData] = useState(() => expensiveCompute());
```

### `useReducer`

状态逻辑复杂、多个子值、下一状态依赖前一状态时使用。

```tsx
type Action = { type: 'increment' } | { type: 'reset' };

function reducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment': return state + 1;
    case 'reset':     return 0;
  }
}

const [count, dispatch] = useReducer(reducer, 0);
dispatch({ type: 'increment' });
```

### 状态更新批处理

React 18+ 默认将所有更新（包括 setTimeout、原生事件中的更新）自动批处理为一次重渲染。

```tsx
// React 18+：下面两个 setState 只触发一次重渲染
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 0);
```

---

## 五、生命周期与副作用

### 类组件生命周期（了解即可）

```
挂载: constructor → render → componentDidMount
更新: render → componentDidUpdate(prevProps, prevState)
卸载: componentWillUnmount
错误: getDerivedStateFromError / componentDidCatch
```

### `useEffect`（函数组件等价物）

```tsx
useEffect(() => {
  // 副作用逻辑（componentDidMount + componentDidUpdate）

  return () => {
    // 清理函数（componentWillUnmount + 下次 effect 执行前）
  };
}, [dependency]);  // 依赖数组
```

| 依赖数组 | 触发时机 |
|---------|---------|
| 不传 | 每次渲染后 |
| `[]` | 仅挂载后执行一次 |
| `[a, b]` | 挂载后 + `a` 或 `b` 变化后 |

### `useLayoutEffect`

在 DOM 更新后、浏览器绘制前同步执行，用于读取布局信息或同步 DOM 操作。

```tsx
useLayoutEffect(() => {
  // 此时可以安全读取 DOM 尺寸，不会闪烁
  const { width } = ref.current.getBoundingClientRect();
  setWidth(width);
}, []);
```

### `useInsertionEffect` 🆕（React 18）

专为 CSS-in-JS 库设计，在 DOM 变更前同步注入样式，执行时机早于 `useLayoutEffect`。

```tsx
useInsertionEffect(() => {
  const style = document.createElement('style');
  style.textContent = `.my-class { color: red }`;
  document.head.appendChild(style);
  return () => document.head.removeChild(style);
}, []);
```

---

## 六、全部 Hooks 速查

### 状态 Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useState` | 声明本地状态 | 16.8 |
| `useReducer` | 复杂状态逻辑 | 16.8 |

### 副作用 Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useEffect` | 异步副作用（数据获取、订阅） | 16.8 |
| `useLayoutEffect` | 同步 DOM 副作用（读取布局） | 16.8 |
| `useInsertionEffect` | CSS-in-JS 样式注入 | 18 |

### Ref Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useRef` | 持久化引用（DOM / 任意值） | 16.8 |
| `useImperativeHandle` | 向父组件暴露自定义 ref 接口 | 16.8 |

### Context Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useContext` | 读取 Context 值 | 16.8 |

### 性能 Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useMemo` | 缓存计算结果 | 16.8 |
| `useCallback` | 缓存函数引用 | 16.8 |
| `useDeferredValue` | 降低非紧急更新优先级 | 18 |
| `useTransition` | 标记非紧急过渡更新 | 18 |

### 工具 Hooks

| Hook | 用途 | 引入版本 |
|------|------|---------|
| `useId` | 生成唯一 ID（SSR 安全） | 18 |
| `useSyncExternalStore` | 订阅外部 store | 18 |
| `useDebugValue` | 在 DevTools 显示自定义 label | 16.8 |

### React 19 新增

| Hook / API | 用途 | 引入版本 |
|-----------|------|---------|
| `useActionState` | 管理 Action 的状态和 pending | 19 |
| `useOptimistic` | 乐观 UI 更新 | 19 |
| `useFormStatus` | 读取父级 form 提交状态 | 19 |
| `use(promise/context)` | 在渲染期间读取 Promise 或 Context | 19 |

---

### 各 Hook 详解

#### `useMemo` / `useCallback`

```tsx
// useMemo：缓存计算值
const sortedList = useMemo(
  () => items.slice().sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback：缓存函数（等价于 useMemo(() => fn, deps)）
const handleClick = useCallback((id: number) => {
  dispatch({ type: 'select', id });
}, [dispatch]);
```

#### `useRef`

```tsx
// 1. 引用 DOM 节点
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />
inputRef.current?.focus();

// 2. 保存不触发重渲染的可变值（如 timer ID）
const timerRef = useRef<ReturnType<typeof setTimeout>>();
timerRef.current = setTimeout(() => {}, 1000);
```

#### `useImperativeHandle`

```tsx
const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => { if (inputRef.current) inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} />;
});
```

#### `useId` 🆕（React 18）

服务端和客户端生成相同 ID，避免 hydration 不匹配。

```tsx
function FormField({ label }: { label: string }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

#### `useSyncExternalStore` 🆕（React 18）

用于订阅外部数据源（Redux store、浏览器 API 等），是状态管理库集成的推荐方式。

```tsx
function useWindowWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    () => window.innerWidth,       // 客户端快照
    () => 0,                       // 服务端快照
  );
}
```

---

## 七、Context

跨组件层级共享数据，避免 prop drilling。

```tsx
// 1. 创建
const ThemeContext = createContext<'light' | 'dark'>('light');

// 2. 提供（React 19 简化写法）
<ThemeContext value="dark">
  <App />
</ThemeContext>

// 3. 消费
function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

**注意**：Context 值变化时，所有消费者组件都会重渲染。可以用 `useMemo` 包裹 value 对象避免不必要渲染。

---

## 八、Refs

### 创建方式

```tsx
// 函数组件（推荐）
const ref = useRef<HTMLDivElement>(null);

// 类组件
this.ref = React.createRef<HTMLDivElement>();

// Ref 回调（可返回清理函数，React 19 新增）
<div ref={(node) => {
  // node 存在时绑定，返回清理函数
  if (node) {
    const listener = () => {};
    node.addEventListener('click', listener);
    return () => node.removeEventListener('click', listener);
  }
}} />
```

### `forwardRef`（React 19 已废弃，改用 ref prop）

```tsx
// React 18 及之前
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// React 19：ref 作为普通 prop
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

---

## 九、事件系统

React 使用**合成事件**（SyntheticEvent）统一跨浏览器差异，事件委托绑定在根节点（React 17 之前是 document，17+ 是 root container）。

```tsx
function Form() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
    </form>
  );
}
```

### 常用事件类型

| 事件 | 类型 |
|------|------|
| `onClick` | `React.MouseEvent<T>` |
| `onChange` | `React.ChangeEvent<T>` |
| `onSubmit` | `React.FormEvent<T>` |
| `onKeyDown` | `React.KeyboardEvent<T>` |
| `onFocus / onBlur` | `React.FocusEvent<T>` |
| `onDrop` | `React.DragEvent<T>` |

---

## 十、列表与 Key

```tsx
function List({ items }: { items: { id: number; name: string }[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>  // key 必须在列表中唯一且稳定
      ))}
    </ul>
  );
}
```

**Key 的作用**：帮助 React Reconciler 在 Diff 时识别哪些元素变化了、新增了或删除了。

- 使用稳定的业务 ID，**不要用数组 index**（除非列表不会重排）
- Key 只在兄弟节点间唯一即可，全局不要求唯一

---

## 十一、条件渲染

```tsx
// 三元运算符
{isLoggedIn ? <Dashboard /> : <Login />}

// 短路运算（右侧为 0 时会渲染 "0"，注意 Boolean 转换）
{count > 0 && <Badge count={count} />}

// 提前 return
function Alert({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="alert">{message}</div>;
}
```

---

## 十二、性能优化

### 避免不必要的重渲染

```tsx
// 1. React.memo 跳过 props 未变化的子组件
const Child = React.memo(({ value }) => <div>{value}</div>);

// 2. useMemo 缓存昂贵计算
const result = useMemo(() => heavyCalc(input), [input]);

// 3. useCallback 稳定函数引用（配合 React.memo 使用）
const onClick = useCallback(() => doSomething(id), [id]);
```

### `useTransition` 🆕（React 18）

将非紧急更新标记为"过渡"，让紧急更新（如键盘输入）优先响应。

```tsx
const [isPending, startTransition] = useTransition();

function handleSearch(input: string) {
  setQuery(input);                       // 紧急：立即更新输入框
  startTransition(() => {
    setSearchResults(filter(input));     // 非紧急：可被打断
  });
}
```

### `useDeferredValue` 🆕（React 18）

推迟某个值的更新，UI 在低优先级版本追上来之前保持旧值。

```tsx
const deferredQuery = useDeferredValue(query);
// deferredQuery 在 query 更新后异步追上，期间显示旧结果
```

---

## 十三、代码分割与懒加载

```tsx
// 动态 import + React.lazy 实现按需加载
const Dashboard = React.lazy(() => import('./Dashboard'));

// 必须用 Suspense 包裹，提供加载中的 fallback
function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

---

## 十四、Portals

将子节点渲染到父组件 DOM 层级之外的节点（常用于模态框、提示框）。

```tsx
import { createPortal } from 'react-dom';

function Modal({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="modal-overlay">{children}</div>,
    document.getElementById('modal-root')!
  );
}
```

Portal 中的事件冒泡遵循 **React 组件树**，而非 DOM 树。

---

## 十五、Error Boundary

捕获子组件树的渲染错误，防止整个应用崩溃。**只能是类组件**（目前无 Hook 等价）。

```tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logToService(error, info.componentStack);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// 使用
<ErrorBoundary fallback={<p>出错了</p>}>
  <RiskyComponent />
</ErrorBoundary>
```

### 🆕 React 19 错误回调

```tsx
createRoot(container, {
  onCaughtError(error, errorInfo) { /* 被 ErrorBoundary 捕获 */ },
  onUncaughtError(error, errorInfo) { /* 未捕获，导致 unmount */ },
  onRecoverableError(error, errorInfo) { /* React 自动恢复（如 hydration 不匹配）*/ },
});
```

---

## 十六、Suspense

声明式处理异步内容的加载状态。

```tsx
<Suspense fallback={<Skeleton />}>
  <LazyComponent />          {/* React.lazy */}
  <AsyncDataComponent />     {/* use(promise) / Server Components */}
</Suspense>
```

### Suspense 嵌套

```tsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<FeedSkeleton />}>
    <Feed />   {/* Feed 加载时只显示 FeedSkeleton，不影响 Header */}
  </Suspense>
</Suspense>
```

---

## 十七、并发特性（React 18）

React 18 引入**并发渲染**：渲染可以被打断、恢复和丢弃，浏览器始终能响应用户输入。

### `createRoot`（替代 `ReactDOM.render`）

```tsx
// React 17 及之前
ReactDOM.render(<App />, document.getElementById('root'));

// React 18+（开启并发特性）
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

### `startTransition`（不需要 isPending 时的简化版）

```tsx
import { startTransition } from 'react';

startTransition(() => {
  setTab('comments');  // 标记为非紧急，可被打断
});
```

### 自动批处理

React 18 默认将所有环境（setTimeout、Promise、原生事件）中的多次 setState 合并为一次渲染。

```tsx
// 退出批处理（极少需要）
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1));  // 立即同步渲染
```

---

## 十八、Actions 与表单（React 19）

### Actions 概念

在 `useTransition` 的异步过渡中执行的函数，自动管理 pending 状态和错误。

```tsx
const [isPending, startTransition] = useTransition();

startTransition(async () => {
  await saveToDB(data);       // 支持 async/await
  router.push('/success');
});
```

### `<form>` Action

`action` 属性直接接收函数，提交后自动重置表单（非受控）。

```tsx
<form action={async (formData) => {
  const name = formData.get('name') as string;
  await updateName(name);
}}>
  <input name="name" />
  <button type="submit">Save</button>
</form>
```

### `useActionState`

```tsx
async function updateName(prevState: string, formData: FormData) {
  const name = formData.get('name') as string;
  await save(name);
  return 'Saved!';
}

const [message, dispatch, isPending] = useActionState(updateName, '');
```

### `useFormStatus`

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();   // 读取最近父级 <form> 的状态
  return <button disabled={pending}>{pending ? 'Saving...' : 'Save'}</button>;
}
```

### `useOptimistic`

```tsx
const [optimisticMessages, addOptimisticMessage] = useOptimistic(
  messages,
  (state, newText: string) => [...state, { text: newText, sending: true }]
);

async function send(formData: FormData) {
  const text = formData.get('message') as string;
  addOptimisticMessage(text);  // 立即反映
  await sendMessage(text);      // 异步完成后替换为真实数据
}
```

### `use()`

```tsx
// 在渲染期间读取 Promise（需要 Suspense 包裹）
const data = use(dataPromise);

// 在条件语句中读取 Context（打破 Hooks 规则限制）
if (condition) {
  const theme = use(ThemeContext);
}
```

### Ref 改进

```tsx
// React 19：ref 作为普通 prop，无需 forwardRef
function Input({ ref, ...props }: React.ComponentProps<'input'>) {
  return <input ref={ref} {...props} />;
}

// ref 回调支持返回清理函数
<video ref={(node) => {
  if (!node) return;
  const player = initPlayer(node);
  return () => player.destroy();
}} />
```

### Context 简写

```tsx
// 直接用 Context 对象作为 Provider（Context.Provider 已废弃）
<ThemeContext value="dark">
  <App />
</ThemeContext>
```

### 文档元数据

```tsx
function Page({ title }: { title: string }) {
  return (
    <>
      <title>{title}</title>
      <meta name="description" content="..." />
      <link rel="canonical" href="https://example.com" />
      <main>...</main>
    </>
  );
}
// React 自动将 title/meta/link 提升到 <head>，SSR 时自动去重
```

### 资源预加载

```tsx
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom';

prefetchDNS('https://fonts.googleapis.com');
preconnect('https://fonts.gstatic.com');
preload('/fonts/inter.woff2', { as: 'font', crossOrigin: 'anonymous' });
preinit('/scripts/analytics.js', { as: 'script' });
```

---

## 十九、Server Components（React 19 稳定）

服务端组件在服务器上渲染，**不发送 JS 到客户端**。

```
客户端组件（'use client'）   ←→   服务端组件（默认）
  useState / useEffect              async / await
  事件处理                           直接访问数据库/文件
  浏览器 API                         零 bundle 体积
```

```tsx
// app/page.tsx（Server Component，默认）
async function Page() {
  const posts = await db.select('posts');   // 直接查询数据库
  return <PostList posts={posts} />;
}

// app/like-button.tsx（Client Component）
'use client';
function LikeButton() {
  const [liked, setLiked] = useState(false);
  return <button onClick={() => setLiked(true)}>{liked ? '❤️' : '🤍'}</button>;
}
```

### Server Actions

```tsx
// 在服务端函数上标记 'use server'
async function createPost(formData: FormData) {
  'use server';
  await db.insert('posts', { title: formData.get('title') });
  revalidatePath('/posts');
}

<form action={createPost}>
  <input name="title" />
  <button type="submit">Create</button>
</form>
```

---

## 二十、React DOM API

### 渲染

```tsx
import { createRoot, hydrateRoot } from 'react-dom/client';

// 客户端渲染
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
root.unmount();  // 卸载

// SSR 注水（hydration）
hydrateRoot(document.getElementById('root')!, <App />);
```

### Portals

```tsx
import { createPortal } from 'react-dom';
createPortal(<Modal />, document.body);
```

### `flushSync`

强制同步刷新更新，绕过并发批处理（慎用）。

```tsx
import { flushSync } from 'react-dom';
flushSync(() => setState(newValue));
```

---

## 二十一、调试工具

### `StrictMode`

开发模式下启用额外检查：检测废弃 API、副作用幂等性（effect 执行两次）。

```tsx
<React.StrictMode>
  <App />
</React.StrictMode>
```

### `Profiler`

测量组件树的渲染性能。

```tsx
<Profiler id="Navigation" onRender={(id, phase, actualDuration) => {
  console.log(`${id} [${phase}]: ${actualDuration.toFixed(2)}ms`);
}}>
  <Navigation />
</Profiler>
```

### `useDebugValue`

在 React DevTools 中为自定义 Hook 显示标签。

```tsx
function useAuth() {
  const user = getUser();
  useDebugValue(user ? `Logged in as ${user.name}` : 'Not logged in');
  return user;
}
```

---

## 功能速查表

| 功能 | 引入版本 | 类别 |
|------|---------|------|
| JSX / Fragment | 早期 | 语法 |
| 函数组件 / 类组件 | 早期 | 组件 |
| Props / Children | 早期 | 数据流 |
| `useState` | 16.8 | Hook |
| `useReducer` | 16.8 | Hook |
| `useEffect` | 16.8 | Hook |
| `useLayoutEffect` | 16.8 | Hook |
| `useContext` | 16.8 | Hook |
| `useMemo` | 16.8 | Hook |
| `useCallback` | 16.8 | Hook |
| `useRef` | 16.8 | Hook |
| `useImperativeHandle` | 16.8 | Hook |
| `useDebugValue` | 16.8 | Hook |
| `forwardRef` | 16.3 | API（React 19 废弃） |
| `createContext` | 16.3 | API |
| `React.memo` | 16.6 | API |
| `React.lazy` | 16.6 | API |
| `Suspense` | 16.6 | 组件 |
| `Portals` | 16 | API |
| `Error Boundary` | 16 | 类组件 |
| `Profiler` | 16.5 | 组件 |
| `createRoot` | 18 | DOM API |
| `useTransition` | 18 | Hook |
| `useDeferredValue` | 18 | Hook |
| `useId` | 18 | Hook |
| `useSyncExternalStore` | 18 | Hook |
| `useInsertionEffect` | 18 | Hook |
| 自动批处理 | 18 | 行为 |
| `startTransition` | 18 | API |
| `useActionState` | 19 | Hook |
| `useOptimistic` | 19 | Hook |
| `useFormStatus` | 19 | Hook (react-dom) |
| `use()` | 19 | API |
| ref 作为 prop | 19 | 语法改进 |
| ref 清理函数 | 19 | 语法改进 |
| `<Context>` as Provider | 19 | 语法改进 |
| `<form>` Action | 19 | DOM 改进 |
| 文档元数据提升 | 19 | DOM 改进 |
| 资源预加载 API | 19 | DOM API |
| Server Components（稳定） | 19 | 架构 |
| Server Actions | 19 | 架构 |
| 错误处理回调 | 19 | API 改进 |
