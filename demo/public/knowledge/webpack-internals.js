function renderWebpackInternals(t) {
  const question = ruleBox('info',
    `<strong>结论：</strong>Webpack 的核心是一个<strong>模块图（Module Graph）编译器</strong>，
    通过 <strong>Entry → 递归解析依赖 → 生成 Chunk → 输出 Bundle</strong> 四步完成构建。
    <strong>Tapable</strong> 是 Webpack 的插件总线（发布-订阅），
    <strong>Loader</strong> 负责转换单个文件（链式管道），
    <strong>Plugin</strong> 监听构建生命周期钩子实现扩展能力。`);

  const principle = `
    <p><strong>核心构建流程（6 步）：</strong></p>
    <ol style="padding-left:20px; line-height:2.2;">
      <li><strong>初始化</strong>：读取配置，创建 <code>Compiler</code> 对象，注册所有 Plugin（Plugin 在此阶段调用 <code>compiler.hooks.xxx.tap()</code> 注册监听）</li>
      <li><strong>开始编译</strong>：执行 <code>compiler.run()</code>，触发 <code>make</code> 钩子，从 Entry 开始</li>
      <li><strong>构建模块（Module Building）</strong>：对每个文件依次执行匹配的 Loader 链（从右到左），将文件转为 JS；解析 AST 提取 <code>import/require</code>，递归处理所有依赖，构建<strong>模块依赖图</strong></li>
      <li><strong>封装 Chunk</strong>：根据 Entry 和动态 <code>import()</code> 将模块图切分为若干 Chunk（代码分割的核心）</li>
      <li><strong>代码生成</strong>：将每个 Chunk 的模块拼装为 Bundle 字符串，注入 Webpack Runtime（模块加载器）</li>
      <li><strong>输出文件</strong>：将 Bundle 写入磁盘，触发 <code>emit</code> 钩子（Plugin 可在此修改输出内容）</li>
    </ol>
    <p><strong>Tapable 核心 Hook 类型：</strong></p>
    <ul>
      <li><code>SyncHook</code>：同步，顺序执行，不关心返回值</li>
      <li><code>SyncBailHook</code>：同步，任意 tap 返回非 undefined 则中断后续（用于"是否需要处理"类决策）</li>
      <li><code>AsyncSeriesHook</code>：异步串行，上一个完成才执行下一个（多数 Webpack 生命周期钩子）</li>
      <li><code>AsyncParallelHook</code>：异步并行，全部完成才继续</li>
    </ul>
    <p><strong>Loader vs Plugin：</strong>Loader 是函数，接收源文件内容返回转换后内容，只能处理单个文件；Plugin 是类，有 <code>apply(compiler)</code> 方法，可访问整个编译生命周期，可修改输出产物。</p>`;

  const loaderCode = `// ── 自定义 Loader：将 console.log 替换为 logger.log ──────────────────────────
// loaders/replace-console-loader.js
module.exports = function replaceConsoleLoader(source) {
  // this 是 Webpack 注入的 loaderContext，包含 this.query（选项）、this.emitFile 等
  const options = this.getOptions() || {};
  const prefix = options.prefix || '[LOG]';

  // Loader 必须返回 string 或 Buffer（同步）
  // 或调用 this.callback(null, result)（异步）
  const result = source.replace(
    /console\.log\(/g,
    \`logger.log('\${prefix}',\`
  );

  return result;

  // ── 异步 Loader（如需要读文件/网络请求）──
  // const callback = this.async(); // 声明异步
  // someAsyncOperation(source).then(result => {
  //   callback(null, result, sourceMap, meta); // 参数：(err, code, map, meta)
  // });
};

// 告诉 Webpack 此 Loader 是否处理原始 Buffer（默认 false，接收 string）
// module.exports.raw = true;

// webpack.config.js 中使用
module.exports = {
  module: {
    rules: [
      {
        test: /\\.js$/,
        use: [
          {
            loader: path.resolve('./loaders/replace-console-loader.js'),
            options: { prefix: '[APP]' },
          },
          'babel-loader', // Loader 从右到左执行：先 babel，再 replace-console
        ],
      },
    ],
  },
};`;

  const pluginCode = `// ── 自定义 Plugin：构建完成后输出文件大小报告 ────────────────────────────────
class BuildReportPlugin {
  constructor(options = {}) {
    this.options = { threshold: options.threshold || 200 * 1024 }; // 默认 200KB 警告
  }

  // apply 是 Plugin 的必须方法，Webpack 初始化时调用
  apply(compiler) {
    // emit 钩子：文件即将写入磁盘前，此时可修改 compilation.assets
    compiler.hooks.emit.tapAsync('BuildReportPlugin', (compilation, callback) => {
      const assets = compilation.assets;
      const report = [];

      for (const [filename, source] of Object.entries(assets)) {
        const size = source.size();
        const kb = (size / 1024).toFixed(1);
        const warn = size > this.options.threshold ? ' ⚠️  超出警告阈值' : '';
        report.push(\`  \${filename}: \${kb} KB\${warn}\`);
      }

      // 将报告写入构建产物（作为一个新的 asset）
      const content = \`Build Report\\n\${new Date().toISOString()}\\n\\n\${report.join('\\n')}\\n\`;
      compilation.assets['build-report.txt'] = {
        source: () => content,
        size: () => Buffer.byteLength(content),
      };

      console.log('\\n[BuildReportPlugin]\\n' + report.join('\\n'));
      callback(); // 异步钩子必须调用 callback，否则构建挂起
    });

    // done 钩子：构建完全结束后（含写文件）
    compiler.hooks.done.tap('BuildReportPlugin', stats => {
      const { errors, warnings } = stats.compilation;
      if (errors.length) console.error(\`构建失败：\${errors.length} 个错误\`);
      if (warnings.length) console.warn(\`构建警告：\${warnings.length} 个警告\`);
    });
  }
}

// webpack.config.js 使用
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
module.exports = {
  plugins: [
    new BuildReportPlugin({ threshold: 150 * 1024 }),
    // 常用内置 Plugin
    new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('production') }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
    // 分析模式下才启用 BundleAnalyzer
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),
};`;

  const notes = [
    ruleBox('warning', `<strong>Webpack 5 持久化缓存：</strong>配置 <code>cache: { type: 'filesystem' }</code> 可将模块图缓存到磁盘，二次构建速度提升 90%+。缓存 key 由配置文件哈希、Node 版本、Webpack 版本等决定，任意变化自动失效。开发环境默认内存缓存，生产环境推荐关闭（保证构建确定性）。`),
    ruleBox('info', `<strong>Loader 执行顺序细节：</strong>rules 中的 <code>use</code> 数组从右到左（从下到上）执行，与管道方向相反是历史原因。<code>enforce: 'pre'</code>（如 eslint-loader）在其他 Loader 前执行；<code>enforce: 'post'</code> 在最后执行。同一 Rule 中可用 <code>resourceQuery</code>、<code>issuer</code> 精细匹配文件来源。`),
    ruleBox('success', `<strong>Module Federation（Webpack 5）：</strong>允许多个独立 Webpack 构建在运行时共享模块，是微前端的主流实现方案。<code>ModuleFederationPlugin</code> 让 App A 在运行时远程加载 App B 暴露的组件，无需提前打包在一起。模块版本冲突由 <code>shared</code> 配置自动处理（单例模式）。`),
  ];

  return articleShell(t, `
    ${section('核心问题', question)}
    ${section('原理剖析', principle)}
    ${section('代码示例', codeBlock('自定义 Loader（文件转换管道）', 'dot-blue', 'javascript', loaderCode) + codeBlock('自定义 Plugin（生命周期钩子）', 'dot-green', 'javascript', pluginCode))}
    ${section('延伸与注意事项', notes.join(''))}`);
}
