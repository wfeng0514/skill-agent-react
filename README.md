# 🧩 Skill & Agent — 交互式学习指南

> 用 React + TypeScript + SCSS 构建的交互式学习页面，帮助前端开发者理解 **Skill（技能插件）** 和 **Agent（智能代理）** 的核心概念与协作机制。

---

## 📖 内容概览

| 章节 | 核心内容 | 交互 |
|------|----------|------|
| **Hero** | 项目介绍、视觉入口 | 渐变动画背景 |
| **Section 01 — Skill** | Skill 的 4 大特征、标准文件结构（SKILL.md）、触发流程、存储位置 | 文件树点击切换预览内容 |
| **Section 02 — Agent** | Agent 的 6 步工作循环（含动画演示）、工具箱、3 种工作模式 | 点击「演示循环」逐步高亮 + 实时日志输出 |
| **Section 03 — 关系** | 类比理解、Agent-Skill-Tool 完整工作流图、对比表格 | 静态展示 |
| **Section 04 — 实验场** | 模拟器：选择任务 → 观看 Agent 执行全过程 | 5 种预设任务 + 自定义输入，逐行流式输出 |

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| [React](https://react.dev) | 19.x | UI 组件化开发 |
| [TypeScript](https://www.typescriptlang.org) | ~6.0.x | 类型安全 |
| [Vite](https://vitejs.dev) | 8.x | 开发构建工具（HMR / lightningcss） |
| [SCSS Module](https://sass-lang.com) | 1.99+ | 样式隔离 + 变量/Mixin 设计体系 |

### 开发依赖

```
react ^19.2.4
typescript ~6.0.2
vite ^8.0.4
sass ^1.99.0
prettier ^3.x (格式化)
eslint ^9.x (代码检查)
```

## 📁 项目结构

```
skill-agent-react/
├── public/                          # 静态资源
├── src/
│   ├── main.tsx                     # 应用入口
│   ├── App.tsx                      # 根组件（组装所有 Section）
│   ├── types/
│   │   └── index.ts                 # TypeScript 类型定义
│   ├── utils/
│   │   ├── constants.ts             # 数据常量（Skill 树结构、循环步骤、场景模拟）
│   │   └── helpers.ts               # 工具函数（sleep、throttle、cn）
│   ├── styles/                      # SCSS 设计系统
│   │   ├── _variables.scss          # 🔑 颜色/间距/圆角/字体变量
│   │   ├── _mixins.scss             # 🔧 响应式/card/glass/gradient 复用 Mixin
│   │   ├── global.scss              # 全局重置 + 滚动条 + 基础样式
│   │   └── common.scss              # Hero/Button/Section 通用组件样式
│   └── components/                  # 组件目录
│       ├── Navigation.tsx           # 固定导航栏（滚动监听 + 高亮）
│       ├── Hero.tsx                 # 首屏大标题区域（渐变背景动画）
│       ├── SkillSection.tsx         # Skill 章节（特征卡片 + 文件树交互）
│       ├── AgentSection.tsx         # Agent 章节（6步 SVG 循环动画 + 工作模式）
│       ├── RelationSection.tsx      # 关系图（类比卡片 + 工作流 SVG + 对比表）
│       ├── PlaygroundSection.tsx    # 实验场（预设任务选择 + Agent 执行模拟器）
│       └── Footer.tsx               # 页脚
├── .prettierrc                      # Prettier 格式化规则
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite 配置（lightningcss 编译 SCSS）
├── index.html                       # HTML 入口
└── package.json                     # 依赖管理
```

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查 + 构建
npm run build

# 预览构建产物
npm run preview

# 代码检查
npm run lint

# 一键格式化（Prettier）
npx prettier --write "src/**/*.{ts,tsx,scss}"
```

## 🎨 设计规范

### SCSS 变量体系 (`_variables.scss`)

- **颜色**：主色调 `#6c5ce7`（紫）、辅色调 `#00cec9`（青）、强调色 `#fd79a8`（粉）
- **暗色主题**：深色背景 `#0d1117` / 卡片 `#161b22`
- **响应式断点**：Mobile ≤640px / Tablet ≤1024px / Desktop >1024px
- **间距**：基于 `$spacing-base: 4px` 的 8 级倍数体系

### 组件样式隔离

每个组件使用 `.module.scss` (CSS Module)，避免全局污染：
```tsx
import styles from './MyComponent.module.css';
<div className={styles.container}>
```

### Mixin 复用 (`_mixins.scss`)

| Mixin | 用途 | 使用场景 |
|-------|------|----------|
| `mobile()` / `tablet()` / `desktop-up()` | 响应式断点 | 所有组件 |
| `card-base($padding)` | 卡片基础样式 | 特征卡、对比卡等 |
| `glow($color)` | 发光效果 | 活跃节点、按钮 hover |
| `gradient-text($from, $to)` | 渐变文字 | 标题、强调文字 |
| `glass()` | 玻璃态效果 | 导航栏 |

## 🔑 核心交互说明

### Agent 工作循环（SVG 圆环）

- 6 个步骤节点均匀分布在 SVG 圆环上
- 点击节点或运行「演示循环」可逐步高亮
- 当前活跃节点带发光效果 + 显示步骤标签
- 连接线从中心指向当前活跃节点

### Skill 文件树

- 点击 SKILL.md / scripts / references / assets 切换右侧预览面板
- 展示标准的 Skill 目录结构和文件内容示例

### 实验场模拟器

- 5 个预设任务：PDF 提取 / Excel 分析 / PPT 制作 / React 编程 / 浏览器自动化
- 选择任务后点击「运行」，逐行显示 Agent 的完整执行过程
- 输出包含：分析→匹配 Skill→加载 Skill→执行脚本→交付结果

## 📝 代码风格

项目使用 [Prettier](https://prettier.io) 统一代码格式，规则见 [`.prettierrc`](./.prettierrc)：

| 规则 | 值 |
|------|-----|
| 单引号 | ✅ |
| 分号 | ✅ |
| 尾逗号 | all |
| 行宽 | 90 字符 |
| 缩进 | 2 空格 |
| 行尾符 | LF |

## 📄 License

MIT
