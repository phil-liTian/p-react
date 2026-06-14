function renderDebounceThrottle(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>
    <strong>防抖（Debounce）</strong>：连续触发时，只执行最后一次（等待停止后执行）。适合搜索框输入、窗口 resize 结束后计算。
    <strong>节流（Throttle）</strong>：固定时间间隔内只执行一次（均匀执行）。适合滚动监听、鼠标移动、游戏按键。
    核心区别：防抖<strong>重置计时器</strong>，节流<strong>忽略计时器内的调用</strong>。`);

  const principle = `
    <p><strong>防抖（Debounce）原理：</strong>每次事件触发时清除上一个定时器，重新开始计时。只有在 <code>wait</code> 时间内没有新事件触发，回调才会执行。</p>
    <p><strong>节流（Throttle）原理：</strong>第一次触发立即执行（或延迟执行），之后在 <code>wait</code> 时间内的所有调用都被忽略，等计时器到期后才允许下一次执行。</p>
    <p><strong>选择指南：</strong></p>
    <ul>
      <li>需要「最终结果」，中间过程无意义 → <strong>防抖</strong>（搜索输入、表单验证、resize）</li>
      <li>需要「持续反馈」，但要限制频率 → <strong>节流</strong>（滚动位置、鼠标追踪、进度更新）</li>
      <li>第一次必须立即响应 → 防抖/节流都支持 <code>leading: true</code> 选项</li>
    </ul>`;

  const debounceCode = `// 防抖实现（支持 leading/trailing）
function debounce(fn, wait, options = {}) {
  const { leading = false, trailing = true } = options;
  let timer = null;
  let lastCallTime = 0;

  function debounced(...args) {
    const now = Date.now();
    const isFirstCall = leading && !timer;

    clearTimeout(timer);

    if (isFirstCall) {
      fn.apply(this, args); // leading：立即执行
    }

    timer = setTimeout(() => {
      timer = null;
      if (trailing && !isFirstCall) {
        fn.apply(this, args); // trailing：停止后执行
      }
    }, wait);
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };

  return debounced;
}

// 使用：搜索框输入防抖
const searchInput = document.getElementById('search');
const handleSearch = debounce((e) => {
  fetchResults(e.target.value); // 停止输入 300ms 后才发请求
}, 300);

searchInput.addEventListener('input', handleSearch);

// 组件卸载时取消，防止内存泄漏
// window.removeEventListener('resize', handleSearch);
// handleSearch.cancel();`;

  const throttleCode = `// 节流实现（时间戳 + 定时器结合，保证首尾都执行）
function throttle(fn, wait) {
  let lastTime = 0;
  let timer = null;

  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      // 到达时间间隔，立即执行
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      // 在间隔内，设置定时器确保最后一次调用也能执行
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

// 使用：滚动事件节流
const handleScroll = throttle(() => {
  const scrollTop = document.documentElement.scrollTop;
  updateProgressBar(scrollTop); // 每 100ms 最多执行一次
}, 100);

window.addEventListener('scroll', handleScroll, { passive: true });

// React 中结合 useCallback + useRef 使用
function useThrottle(fn, wait) {
  const fnRef = useRef(fn);
  fnRef.current = fn; // 保持引用最新

  return useCallback(
    throttle((...args) => fnRef.current(...args), wait),
    [wait] // wait 变化时重建节流函数
  );
}`;

  const notes = [
    ruleBox('warning', `<strong>React 常见陷阱：</strong>在函数组件中直接 <code>const fn = debounce(handler, 300)</code> 会在每次渲染时创建新的防抖函数，<strong>完全失效</strong>。正确做法：用 <code>useCallback</code> 包裹，或用 <code>useRef</code> 持久化。推荐直接用 <code>usehooks-ts</code> 的 <code>useDebounce</code> / <code>useThrottle</code>。`),
    ruleBox('info', `<strong>Lodash 的增强版：</strong><code>_.debounce(fn, wait, { leading, trailing, maxWait })</code>。<code>maxWait</code> 解决了纯 trailing 防抖的「永不执行」问题——即使事件一直在触发，超过 <code>maxWait</code> 也会强制执行一次。<code>_.throttle</code> 本质上是 <code>maxWait === wait</code> 的防抖。`),
    ruleBox('success', `<strong>passive 事件监听：</strong>滚动/触摸事件监听器加上 <code>{ passive: true }</code> 选项，告诉浏览器不会调用 <code>preventDefault()</code>，浏览器可以在合成线程中提前滚动，无需等待主线程。与节流配合使用，是滚动性能优化的标配。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('防抖实现（Debounce）', 'dot-blue', 'javascript', debounceCode) + codeBlock('节流实现（Throttle）', 'dot-green', 'javascript', throttleCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
