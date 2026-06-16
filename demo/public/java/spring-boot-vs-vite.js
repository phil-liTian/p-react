function renderSpringBootVsVite(t) {
  const conclusion = ruleBox('info',
    `Spring Boot 遵循 <strong>约定优于配置</strong>：目录结构由 Maven 标准规定，框架自动扫描 <code>src/main/java/</code> 下的 Bean。Vite 项目结构则更自由，但也形成了约定：入口固定为 <code>index.html</code>，源码放 <code>src/</code>，静态资源放 <code>public/</co核心差异在于：Spring Boot 有严格的 <em>分层包结构</em>（controller / service / repository），而 Vite 项目按 <em>功能模块</em> 或 <em>技术分层</em> 均可。`);

  const springTree = `my-app/
├── src/
│   ├── main/
│   │   ├── java/com/example/myapp/
│   │   │   ├── MyAppApplication.java       # 启动类（@SpringBootApplication）
│   │   │   ├── controller/                  # Controller 层（@RestController）
│   │   │   │   └── UserController.java
│   │   │   ├── service/                     # Service 接口层
│   │   │   │   ├── UserService.java
│   │   │   └── service/impl/                # Service 实现层
│   │   │       └── UserServiceImpl.java
│   │   │   ├── mapper/                      # Mapper 接口层（@Mapper）
│   │   │   │   └── UserMapper.java
│   │   │   ├── entity/                      # 实体类
│   │   │   │   └── User.java
│   │   │   ├── dto/                         # 数据传输对象
│   │   │   │   └── UserDTO.java
│   │   │   └── config/                      # 配置类
│   │   │       └── MyBatisConfig.java
│   │   └── resources/
│   │       ├── application.yml              # 配置文件
│   │       ├── mapper/                      # MyBatis XML 映射文件
│   │       │   └── UserMapper.xml
│   │       └── mapper/org/example/myapp/    # Mapper XML 按包名组织
│   │           └── UserMapper.xml
│   └── test/
│       └── java/com/example/myapp/
│           └── mapper/
│               └── UserMapperTest.java
├── pom.xml                                  # Maven 依赖（spring-boot-starter, mybatis-spring-boot-starter）
└── .mvn/                                    # Maven Wrapper`;

  const viteTree = `my-app/
├── public/                             # 纯静态资源（不经过 Vite 处理）
│   └── favicon.ico
├── src/
│   ├── main.tsx                        # 入口文件（等同于 MyAppApplication.java）
│   ├── App.tsx                         # 根组件
│   ├── components/                     # 可复用 UI 组件
│   │   └── UserCard.tsx
│   ├── pages/                          # 页面级组件（路由对应）
│   │   └── UserPage.tsx
│   ├── services/                       # API 调用层（等同于 service/）
│   │   └── userService.ts
│   ├── hooks/                          # 自定义 React Hooks
│   │   └── useUser.ts
│   ├── types/                          # TypeScript 类型定义（等同于 model/）
│   │   └── user.ts
│   └── assets/                         # 会被 Vite 处理的静态资源
│       └── logo.svg
├── index.html                          # HTML 入口（Vite 从此处开始）
├── vite.config.ts                      # 构建配置（等同于 application.yml 的部分职责）
├── package.json
└── tsconfig.json`;

  const rows = [
    ['index.html + src/main.tsx',   'MyAppApplication.java',      '应用入口'],
    ['src/services/',               'src/main/java/.../service/', '业务 / API 调用层'],
    ['src/types/',                  'src/main/java/.../model/',   '数据模型 / DTO 定义'],
    ['src/pages/ 或 src/views/',    'controller/',                '处理"请求"（路由）的入口层'],
    ['src/components/',             '（无直接对应）',              '可复用 UI 片段，Java 不区分'],
    ['.env / .env.local',           'application.yml',            '环境配置'],
    ['public/',                     'src/main/resources/static/', '不经构建工具处理的静态资源'],
    ['vite.config.ts',              'pom.xml 插件配置',            '构建行为配置'],
    ['src/assets/',                 'src/main/resources/',        '会被打包工具处理的资源'],
    ['dist/',                       'target/',                    '构建产物输出目录'],
  ];
  const table = compareCard(rows, ['前端（Vite）', 'Java（Spring Boot）']);

  const diffsHtml = `
<p><strong>1. 入口的差异</strong><br>
    Spring Boot 的入口是一个带 <code>@SpringBootApplication</code> 注解的 Java 类，框架启动后会自动扫描同包及子包下的所有 Bean。Vite 的入口是 <code>index.html</code>，Vite 从中找到 <code>&lt;script type="module"&gt;</code> 标签，再顺着 <code>import</code> 链打包所有模块。两者都是"单一入口，框架负责把其余部分串联起来"的设计思路。</p>
    <p><strong>2. 分层约定的强制程度</strong><br>
    Spring Boot 中 controller / service / repository 是强约定：框架通过注解 (<code>@RestController</code>, <code>@Service</code>, <code>@Repository</code>) 识别 Bean 角色并注入依赖。Vite / React 项目没有强制分层——<code>src/services/</code>、<code>src/hooks/</code> 这些目录是社区约定，框架不感知也不强制。</p>
    <p><strong>3. 配置文件的职责拆分</strong><br>
    Spring Boot 的 <code>application.yml</code> 承担运行时环境配置（数据库连接、端口、功能开关）。Vite 项目用 <code>.env</code> 文件处理运行时变量，用 <code>vite.config.ts</code> 处理构建时行为（alias、插件、代理）——相当于把 <code>application.yml</code> 拆成了两份。</p>
    <p><strong>4. 测试目录位置</strong><br>
    Maven 规定测试代码必须在 <code>src/test/java/</code>，与生产代码完全隔离。Vite 项目更灵活：测试文件可以放 <code>src/</code> 旁（<code>*.test.ts</code> 或 <code>*.spec.ts</code>），也可以集中到 <code>tests/</code> 目录，Vitest 通过文件名匹配查找，不依赖固定路径。</p>`;

  const springConfig = `# src/main/resources/application.yml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: \${DB_USER}
    password: \${DB_PASS}
  jpa:
    hibernate:
      ddl-auto: validate

# 自定义配置
app:
  jwt-secret: \${JWT_SECRET}
  allowed-origins: http://localhost:5173`;

  const viteConfig = `// vite.config.ts  ← 构建时行为
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },          // 等同于 Java 的包路径简写
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080', // 开发时代理到 Spring Boot
    },
  },
})

// .env.local  ← 运行时变量（等同于 application.yml 的 \${} 占位符）
// VITE_API_BASE_URL=http://localhost:8080
// VITE_JWT_SECRET=dev-secret`;

  const configPair = codeBlocksRow([
    codeBlock('application.yml', 'dot-orange', 'yaml', springConfig),
    codeBlock('vite.config.ts + .env.local', 'dot-blue', 'typescript', viteConfig),
  ]);

  const springEntry = `// MyAppApplication.java
package com.example.myapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication   // 自动扫描同包下所有 @Component / @Bean
public class MyAppApplication {
  public static void main(String[] args) {
    SpringApplication.run(MyAppApplication.class, args);
  }
}`;

  const viteEntry = `// index.html  ← Vite 真正的入口
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"><\/script>
  </body>
</html>

// src/main.tsx  ← 应用根节点挂载
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`;

  const entryPair = codeBlocksRow([
    codeBlock('MyAppApplication.java', 'dot-orange', 'java', springEntry),
    codeBlock('index.html + src/main.tsx', 'dot-blue', 'typescript', viteEntry),
  ]);

  return articleShell(t, `
    ${section('核心结论', conclusion)}
    ${section('目录树对比', codeBlocksRow([
      codeBlock('Spring Boot 项目结构', 'dot-orange', 'plaintext', springTree),
      codeBlock('Vite + React 项目结构', 'dot-blue', 'plaintext', viteTree),
    ]))}
    ${section('对照表', table)}
    ${section('应用入口对比', entryPair)}
    ${section('配置文件对比', configPair)}
    ${section('前端开发者需要注意的差异', diffsHtml)}`);
}
