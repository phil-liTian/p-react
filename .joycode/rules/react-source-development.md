<!--
 * @Author: phil
 * @Date: 2026-05-23 07:56:20
-->
# React 源码开发规则

本项目参考 React 19.2.1 实现 React 核心功能，遵循以下开发规则：

## 项目结构规范

1. **包结构划分**
   - `packages/react`: React 核心 API 实现（createElement, Component, Hooks 等）
   - `packages/react-dom`: DOM 渲染相关实现
   - `packages/react-reconciler`: 协调器核心实现（Fiber, 调和算法等）
   - `packages/shared`: 共享工具类型和常量

2. **代码风格**
   - 使用 TypeScript 编写
   - 保持与 React 官方源码相似的命名风格和架构
   - 函数和变量使用清晰的语义化命名

## 开发原则

1. **循序渐进**
   - 从基础核心功能开始，逐步实现高级特性
   - 每个功能点保证可测试、可运行

2. **核心功能优先级**
   1. JSX → ReactElement 转换
   2. Fiber 数据结构
   3. 渲染阶段（Render Phase）：beginWork + completeWork
   4. 提交阶段（Commit Phase）
   5. Diff 算法
   6. Hooks 实现
   7. 调度器（Scheduler）
   8. Lane 模型
   9. 并发模式

3. **设计原则**
   - 理解并保留 React 原始设计动机
   - 简化但不简化核心概念和算法
   - 保留关键数据结构和流程

## 代码实现规范

1. **注释要求**
   - 复杂算法和数据结构需要添加设计思路注释
   - 关键步骤添加中文注释说明作用

2. **类型定义**
   - 所有核心数据结构必须有明确的 TypeScript 接口定义
   - 避免使用 `any` 类型

3. **版本对齐**
   - 参考 React 19.2.1 的实现思路和API设计
   - 保持公共API与React官方对齐

## 提交规范

- 每个核心功能点独立提交
- 提交信息格式：`feat(module): 功能描述`
  示例：`feat(react-reconciler): 实现beginWork工作流程`

## 测试验证

- 每次实现一个功能点后确保可正常运行
- 核心算法需要验证其正确性