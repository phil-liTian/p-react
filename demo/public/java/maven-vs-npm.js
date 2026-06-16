function renderMavenVsNpm(t) {
  const conclusion = ruleBox('accent',
    `Maven 之于 Java，等同于 npm 之于 Node.js。核心差异：依赖配置是声明式 XML（<code>pom.xml</code>），项目目录里<strong>没有</strong> <code>node_modules</code>，所有依赖统一缓存在 <code>~/.m2/repository/</code>，多个项目共享同一份缓存。`);

  const rows = [
    ['package.json',       'pom.xml',                   '项目元信息 + 依赖声明'],
    ['npm install',        'mvn dependency:resolve',    '下载所有依赖到本地缓存'],
    ['node_modules/',      '~/.m2/repository/',         '全局缓存，不在项目目录内'],
    ['npm run build',      'mvn package',               '编译 → 测试 → 打包为 .jar'],
    ['npm run dev',        'mvn spring-boot:run',       '启动本地开发服务器'],
    ['devDependencies',    '<scope>test</scope>',        '仅测试阶段可用'],
    ['peerDependencies',   '<scope>provided</scope>',   '运行时由容器提供（如 Servlet API）'],
    ['package-lock.json',  '<dependencyManagement>',    '在父 pom 中统一锁定版本'],
    ['^1.2.3（浮动版本）', '1.2.3（精确版本）',          'Maven 默认不做语义化版本浮动'],
    ['npm scripts',        'Maven lifecycle phases',    'validate→compile→test→package→install→deploy'],
  ];

  const table = compareCard(rows);

  const diffsHtml = `
    <p><strong>1. 依赖不在项目目录里</strong><br>
    Maven 将所有依赖缓存在 <code>~/.m2/repository/</code>，是机器级别的全局缓存。Java 项目 clone 下来后看不到任何依赖文件夹，也无需在 <code>.gitignore</code> 中排除它们——这与 <code>node_modules/</code> 必须在 <code>.gitignore</code> 中的前端习惯截然不同。</p>
    <p><strong>2. 生命周期是固定的</strong><br>
    Maven 内置 6 个阶段：<code>validate → compile → test → package → install → deploy</code>。执行 <code>mvn package</code> 时，Maven 会自动依次执行所有前置阶段，无需像 <code>npm scripts</code> 那样手动用 <code>&amp;&amp;</code> 串联命令。插件（Plugin）绑定到特定阶段，扩展能力而不破坏生命周期。</p>
    <p><strong>3. 坐标系统（GAV）</strong><br>
    npm 用 <code>@scope/name@version</code> 标识包，Maven 用 <strong>GAV 三元组</strong>：<code>groupId:artifactId:version</code>，例如 <code>org.springframework.boot:spring-boot-starter-web:3.2.0</code>。<code>groupId</code> 通常是组织的反向域名，<code>artifactId</code> 是具体模块名，<code>version</code> 是精确版本号。</p>`;

  const pkgJson = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  },
  "scripts": {
    "build": "tsc && vite build",
    "dev": "vite",
    "test": "vitest"
  }
}`;

  const pomXml = `<project>
  <groupId>com.example</groupId>
  <artifactId>my-app</artifactId>
  <version>1.0.0</version>
  <packaging>jar</packaging>

  <dependencies>
    <!-- 等同于 dependencies -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>3.2.0</version>
    </dependency>

    <!-- 等同于 devDependencies -->
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <version>3.2.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>`;

  const codePair = codeBlocksRow([
    codeBlock('package.json', 'dot-blue', 'json', pkgJson),
    codeBlock('pom.xml', 'dot-orange', 'xml', pomXml),
  ]);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('对照表', table)}
    ${section('前端开发者需要注意的差异', diffsHtml)}
    ${section('代码对比', codePair)}`);
}
