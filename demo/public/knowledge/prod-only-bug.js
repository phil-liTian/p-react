function renderProdOnlyBug(t) {

  const principle = ruleBox('info',
    `<strong>核心原则：不要凭感觉猜，要用信息驱动缩小范围。</strong><br><br>
    线上问题无法直接 debug，唯一的武器是日志、监控和信息收集。
    每一步的目的是把"问题空间"缩小一半，直到定位到根因。`);

  const portrait = section('第一步：建立问题画像（收集信息）', `
    <p style="margin-bottom:12px">在动手之前，先把问题描述清楚。这一步决定后续方向，做得越细，排查越快。</p>
    <table class="metrics-table">
      <thead><tr><th>维度</th><th>要问的问题</th><th>目的</th></tr></thead>
      <tbody>
        <tr><td>时间</td><td>什么时候开始出现？持续还是偶发？有没有对应的上线记录？</td><td>关联到版本 / 变更</td></tr>
        <tr><td>用户</td><td>哪些用户受影响？全部还是部分？有无共同特征（地区、账号类型、设备）？</td><td>缩小用户维度</td></tr>
        <tr><td>环境</td><td>什么浏览器 / 版本 / OS？是否只在 App WebView 里？网络类型？</td><td>缩小运行环境</td></tr>
        <tr><td>行为</td><td>做了什么操作触发的？能否提供操作步骤？是否只在某个功能路径上出现？</td><td>锁定操作路径</td></tr>
        <tr><td>影响</td><td>报错还是白屏还是数据异常？频率多高？监控大盘有没有异常波动？</td><td>判断影响范围和优先级</td></tr>
      </tbody>
    </table>`);

  const logs = section('第二步：查日志和监控（获取线索）', `
    <p style="margin-bottom:12px">线上唯一能看到的是日志和监控，这是复现之前最重要的信息来源。</p>
    ${ruleBox('warning',
      `<strong>前端错误监控（Sentry / 自研）：</strong>查看报错堆栈、出错的 URL、用户 UA、出错前的操作序列（breadcrumbs）。
      重点看：<code>message</code>、<code>stack</code>、<code>context</code> 三个字段。`)}
    <div style="height:10px"></div>
    ${ruleBox('info',
      `<strong>接口日志（后端 / 网关）：</strong>确认请求是否到达后端、响应状态码、响应时间、请求参数。
      排查是前端问题还是接口问题的最快手段。`)}
    <div style="height:10px"></div>
    ${ruleBox('info',
      `<strong>性能监控（Web Vitals / PerformanceObserver）：</strong>LCP、FID、CLS 是否有异常尖峰？
      有时"功能正常但用户说坏了"是性能问题（超时、卡顿）而非 bug。`)}`);

  const bisect = section('第三步：逐层排除（缩小范围）', `
    <p style="margin-bottom:12px">用二分法思维，每次排除一半可能性。</p>
    <table class="metrics-table">
      <thead><tr><th>排查层</th><th>排查方式</th><th>排除结论</th></tr></thead>
      <tbody>
        <tr><td>是否最新版本引入</td><td>对比出现时间与发布记录，git bisect 二分定位</td><td>确认是否为新上线代码引起</td></tr>
        <tr><td>是否前端问题</td><td>看接口返回是否正确，用 Charles / Whistle 抓包线上请求</td><td>前端 vs 后端</td></tr>
        <tr><td>是否环境相关</td><td>用真机 / 模拟器复现指定浏览器版本，或借用 BrowserStack</td><td>是否与特定 UA / OS 绑定</td></tr>
        <tr><td>是否数据相关</td><td>用受影响用户的账号（脱敏 / 测试账号）在线上 / 预发复现</td><td>是否与账号数据绑定</td></tr>
        <tr><td>是否网络相关</td><td>弱网模拟、Charles 断网 / 延迟，看是否与 CDN / 接口超时有关</td><td>是否为竞态 / 超时问题</td></tr>
      </tbody>
    </table>`);

  const reproduce = section('第四步：构造复现条件', `
    <p style="margin-bottom:12px">用前三步收集到的信息，尝试在本地或预发环境精确复现。</p>
    ${ruleBox('info',
      `<strong>Cookie / Token 注入：</strong>Chrome DevTools → Application → Cookies，
      把线上 Cookie 复制到本地，模拟特定用户身份访问本地构建。`)}
    <div style="height:10px"></div>
    ${ruleBox('info',
      `<strong>Charles Map Remote：</strong>把线上指定接口 Map 到本地 mock，
      或把线上 JS 资源 Map 到本地构建产物，在真实数据下调试本地代码。`)}
    <div style="height:10px"></div>
    ${ruleBox('warning',
      `<strong>Feature Flag / 灰度开关：</strong>如果有灰度系统，强制把自己切到出问题的灰度桶，
      在线上直接复现并用 DevTools 调试。`)}
    <div style="height:10px"></div>
    ${ruleBox('info',
      `<strong>sourcemap 调试：</strong>上传 sourcemap 到 Sentry 后，
      可以直接在错误详情里看到原始 TypeScript 源码行号，不需要手动 decode。`)}`);

  const rootCause = section('第五步：加临时日志 → 定位根因', `
    <p style="margin-bottom:12px">当以上手段仍无法定位时，在疑似路径上加埋点 / 日志，发布到预发或通过热更新推送，收集数据后分析。</p>
    ${ruleBox('warning',
      `<strong>加日志的原则：</strong>在「输入」和「输出」边界加日志，而不是在逻辑中间加。
      例如：接口请求前记录入参，响应后记录出参，这样能快速判断是数据问题还是处理逻辑问题。`)}
    <div style="height:10px"></div>
    ${ruleBox('info',
      `<strong>常见根因分类：</strong>
      <ul style="margin-top:8px;padding-left:20px;line-height:2">
        <li><strong>竞态条件</strong> — 异步请求顺序不固定，旧结果覆盖新结果（加 AbortController 或 requestId 校验）</li>
        <li><strong>缓存失效</strong> — 强缓存命中旧版本 JS / CSS（检查 CDN Cache-Control 和文件名 hash）</li>
        <li><strong>环境差异</strong> — iOS Safari / 低版本 Chrome 不支持某个 API（检查 Polyfill / browserslist）</li>
        <li><strong>数据边界</strong> — 线上存在本地 mock 数据中不存在的空值 / 边界数据</li>
        <li><strong>时序问题</strong> — 组件卸载后异步回调仍然 setState（检查 cleanup）</li>
      </ul>`)}`);

  const toolkit = section('工具箱速查', `
    <table class="metrics-table">
      <thead><tr><th>工具</th><th>用途</th></tr></thead>
      <tbody>
        <tr><td>Sentry / 前端监控</td><td>错误堆栈、breadcrumbs、用户操作回放</td></tr>
        <tr><td>Charles / Whistle</td><td>抓包、Map Remote（线上 JS → 本地构建）、弱网模拟</td></tr>
        <tr><td>Chrome DevTools → Network</td><td>查看实际请求 / 响应、缓存命中情况</td></tr>
        <tr><td>Chrome DevTools → Application</td><td>Cookie 注入、Service Worker 状态、localStorage</td></tr>
        <tr><td>BrowserStack / 真机调试</td><td>特定浏览器 / OS 环境复现</td></tr>
        <tr><td>sourcemap + Sentry</td><td>直接在报错详情看原始源码行号</td></tr>
        <tr><td>git bisect</td><td>二分法定位引入 bug 的 commit</td></tr>
      </tbody>
    </table>`);

  return articleShell(t, principle + portrait + logs + bisect + reproduce + rootCause + toolkit);
}
