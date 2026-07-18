function renderJarVsNpm(t) {
  const conclusion = ruleBox('accent',
    `<strong>jar</strong> 是 Java 的<strong>编译产物打包格式</strong>（本质是 ZIP，里面是 <code>.class</code> 字节码），<strong>npm 包</strong>是 Node.js 的<strong>分发单元</strong>（一个含 <code>package.json</code> 的目录，或压缩后的 <code>.tgz</code>）。核心差异：jar 分发的是<strong>已编译字节码</strong>，npm 包通常分发<strong>源码</strong>，由消费方在安装时再转译/打包。`);

  const rows = [
    ['.jar 文件',              '.tgz 文件 / 包目录',           '分发格式：jar 是 ZIP 压缩包，npm 包可目录可压缩'],
    ['.class 字节码',          '.js 源码',                     '内容形式：jar 内是编译后字节码，npm 包通常直接是源码'],
    ['META-INF/MANIFEST.MF',   'package.json',                 '元信息清单：jar 用清单文件，npm 用 JSON'],
    ['javac 编译',             '无需编译（或 tsc/babel 转译）', '构建过程：Java 必须编译，JS 多数情况下源码即产物'],
    ['mvn package',            'npm pack',                     '打包命令：产出可上传的归档文件'],
    ['mvn install / deploy',   'npm publish',                  '发布到仓库：jar 进 Maven Central，npm 包进 npm registry'],
    ['groupId:artifactId:ver', '@scope/name@version',          '坐标系统：GAV 三元组 vs 包名+语义化版本'],
    ['Fat jar / Uber jar',     'bundle.js / dist/产物',         '可执行产物：Spring Boot 打成可运行 jar，前端打包成静态资源'],
    ['类路径 classpath',       'node_modules 解析',            '依赖查找：Java 按 classpath 顺序加载，Node 沿目录向上查找'],
    ['jar 不可修改（已编译）', 'node_modules 可被改写',         '可变性：jar 是只读二进制，npm 包是源文件可编辑'],
  ];

  const table = compareCard(rows, ['Java（Maven）', '前端（npm）' ]);

  const diffsHtml = `
    <p><strong>1. jar 本质是 ZIP</strong><br>
    把任何 <code>.jar</code> 后缀改成 <code>.zip</code> 就能用解压软件打开。结构通常是 <code>META-INF/MANIFEST.MF</code> + 一堆 <code>.class</code> 文件 + 资源文件。Java 源码 <code>.java</code> <strong>不会</strong>进 jar（除非主动打包 sources jar），这点和 npm 包直接装源码完全不同。</p>
    <p><strong>2. npm 包默认带源码</strong><br>
    <code>npm install some-pkg</code> 后，<code>node_modules/some-pkg/</code> 里就是作者发布的<strong>原始 JS 文件</strong>。所以前端开发者可以直接打开看实现、断点调试，甚至 monkey-patch 修改。Java 想看依赖源码必须单独下载 <code>-sources.jar</code>，且 IDE 反编译出来的代码是重构的、不带注释。</p>
    <p><strong>3. 编译时机不同</strong><br>
    Java：作者 <code>javac</code> 编译成 <code>.class</code> → 打成 jar → 用户拉取后<strong>直接加载字节码</strong>，机器架构无关（JVM 跨平台）。<br>
    npm：作者发布 <code>.js</code>（可能用 ESNext 写）→ 用户拉取后由 <strong>bundler</strong>（webpack/vite）或 <strong>babel/swc</strong> 在构建时转译打包。Node.js 后端则直接运行 <code>.js</code>。</p>
    <p><strong>4. Fat jar vs 前端 bundle</strong><br>
    Spring Boot 的 <code>spring-boot-maven-plugin</code> 把所有依赖打进一个 <strong>Fat jar</strong>，<code>java -jar app.jar</code> 即可启动。前端的对应物是 <code>vite build</code> / <code>webpack</code> 把所有模块打成 <code>dist/</code> 静态文件，由 nginx/CDN 托管。两者都是「自包含可部署单元」，但 jar 内嵌运行时（Tomcat），bundle 不内嵌运行时（依赖浏览器）。</p>`;

  const manifest = `Manifest-Version: 1.0
Created-By: Apache Maven 3.9.6
Built-By: litian
Build-Jdk: 17.0.10
Main-Class: com.example.Application
Start-Class: com.example.Application
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/`;

  const pkgJson = `{
  "name": "@example/my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.2.0"
  }
}`;

  const codePair = codeBlocksRow([
    codeBlock('META-INF/MANIFEST.MF', 'dot-orange', 'yaml', manifest),
    codeBlock('package.json', 'dot-blue', 'json', pkgJson),
  ]);

  const fatJarCmd = `# Java：打成可独立运行的 Fat jar
mvn clean package -DskipTests
# 产物：target/my-app-1.0.0.jar
# 运行：java -jar target/my-app-1.0.0.jar
# 内嵌 Tomcat，无需额外容器`;

  const npmBuildCmd = `# 前端：打成静态资源 bundle
pnpm build
# 产物：dist/index.html + dist/assets/*.js + *.css
# 部署：拷到 nginx 静态目录或 CDN
# 运行时由浏览器提供，不内嵌`;

  const codePairCmd = codeBlocksRow([
    codeBlock('Java 打包 & 运行', 'dot-orange', 'bash', fatJarCmd),
    codeBlock('前端打包 & 部署', 'dot-blue', 'bash', npmBuildCmd),
  ]);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('对照表', table)}
    ${section('关键差异', diffsHtml)}
    ${section('元信息清单对比', codePair)}
    ${section('打包 & 运行流程对比', codePairCmd)}`);
}
