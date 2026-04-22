# 🧩 Skill & Agent — 交互式学习指南

> 用 React + TypeScript + SCSS 构建的交互式学习页面，帮助前端开发者理解 **Skill（技能插件）** 和 **Agent（智能代理）** 的核心概念与协作机制。
> 项目还集成了 **Mastra** AI 框架，提供一个真实可运行的天气 Agent 后端服务，以及对应的 AI 对话 UI 示例。

---

## 📖 内容概览

| 章节                    | 核心内容                                                        | 交互                                    |
| ----------------------- | --------------------------------------------------------------- | --------------------------------------- |
| **Hero**                | 项目介绍、视觉入口                                              | 渐变动画背景                            |
| **Section 01 — Skill**  | Skill 的 4 大特征、标准文件结构（SKILL.md）、触发流程、存储位置 | 文件树点击切换预览内容                  |
| **Section 02 — Agent**  | Agent 的 6 步工作循环（含动画演示）、工具箱、3 种工作模式       | 点击「演示循环」逐步高亮 + 实时日志输出 |
| **Section 03 — 关系**   | 类比理解、Agent-Skill-Tool 完整工作流图、对比表格               | 静态展示                                |
| **Section 04 — 实验场** | 模拟器：选择任务 → 观看 Agent 执行全过程                        | 5 种预设任务 + 自定义输入，逐行流式输出 |
| **Mastra UI**           | 真实天气 Agent 对话界面（接入 Mastra 后端）                     | 流式聊天 + 工具调用展示                 |

---

## 🤖 Mastra 集成

项目集成了 [Mastra](https://mastra.ai) AI 框架，在 `src/mastra/` 目录下实现了一套完整的天气查询 Agent 服务，同时在 `src/Mastra-UI.tsx` 提供了与之对接的聊天界面。

### 架构概览

```
src/mastra/
├── index.ts              # Mastra 实例入口（注册 Agent、Workflow、存储、可观测性）
├── agents/
│   └── weather-agent.ts  # 天气 Agent（绑定工具 + 记忆 + 模型）
├── tools/
│   └── weather-tool.ts   # 天气工具（调用 Open-Meteo API 获取实时天气）
├── workflows/
│   └── weather-workflow.ts  # 天气 Workflow（两步流水线：获取天气 → 规划活动）
└── public/               # 构建产物静态资源目录
```

### 核心模块说明

#### `src/mastra/index.ts` — Mastra 实例

- 初始化 `Mastra` 实例，注册 Agent 与 Workflow
- **复合存储（MastraCompositeStore）**：
  - 默认存储：`LibSQLStore`（SQLite 文件 `mastra.db`，用于对话记忆等）
  - 可观测性存储：`DuckDBStore`（高性能分析型数据库，存储 Trace 数据）
- **日志**：`PinoLogger`，日志级别 `info`
- **可观测性（Observability）**：
  - `DefaultExporter` — 将 Trace 持久化到本地存储，供 Mastra Studio 查看
  - `CloudExporter` — 推送至托管版 Mastra Studio（需配置 `MASTRA_CLOUD_ACCESS_TOKEN`）
  - `SensitiveDataFilter` — 自动脱敏密码、Token、Key 等敏感字段
- **自定义路由**：通过 `chatRoute` 暴露 `/chat/:agentId` 接口，供前端 AI SDK 调用

#### `src/mastra/agents/weather-agent.ts` — 天气 Agent

| 属性     | 值                                                            |
| -------- | ------------------------------------------------------------- |
| `id`     | `weather-agent`                                               |
| `name`   | Weather Agent                                                 |
| `model`  | `zhipuai/glm-4.5-flash`（也可切换为 `google/gemini-2.5-pro`） |
| `tools`  | `weatherTool`                                                 |
| `memory` | `new Memory()`（开启对话历史记忆）                            |

Agent 的 System Prompt 指导其：询问地点、翻译非英文地名、在回复中提供温度/湿度/风速/降水等详情，以及根据天气推荐活动。

#### `src/mastra/tools/weather-tool.ts` — 天气工具

- **ID**：`get-weather`
- **输入**：`{ location: string }` — 城市名称
- **输出**：`{ temperature, feelsLike, humidity, windSpeed, windGust, conditions, location }`
- **实现**：
  1. 调用 [Open-Meteo Geocoding API](https://open-meteo.com) 将城市名转换为经纬度
  2. 调用 Open-Meteo Forecast API 获取当前实时天气
  3. 将 WMO 天气代码（`weather_code`）映射为可读字符串（支持 20+ 种天气状态）
- **零依赖**：完全使用原生 `fetch`，无需第三方 HTTP 客户端

#### `src/mastra/workflows/weather-workflow.ts` — 天气 Workflow

两步串行 Workflow，展示了 Mastra 的 `.then()` 链式步骤编排：

```
Step 1: fetchWeather
  输入: { city: string }
  → 调用 Open-Meteo 获取当日最高/最低温、降水概率、天气状况
  输出: ForecastSchema

Step 2: planActivities
  输入: ForecastSchema（承接 Step 1 输出）
  → 调用 weatherAgent 的流式输出，按模板生成早/午/室内活动建议
  输出: { activities: string }
```

每个步骤通过 `createStep` 定义，包含 `inputSchema`（Zod）、`outputSchema`（Zod）和 `execute` 函数。

#### `src/Mastra-UI.tsx` — 对话 UI

使用 `@ai-sdk/react` 的 `useChat` Hook 连接 Mastra 后端：

- **Transport**：`DefaultChatTransport`，接入 `http://localhost:4111/chat/weather-agent`
- **消息渲染**：支持 `text` 类型（普通回复）和 `tool-*` 类型（工具调用展示）
- **工具调用 UI**：展示工具输入参数（`ToolInput`）和输出结果（`ToolOutput`）
- **AI 组件库**：使用 `src/components/ai-elements/` 下的原子组件（`Conversation`、`Message`、`Tool`、`PromptInput` 等）

### 启动 Mastra 后端

```bash
# 安装依赖（首次）
npm install

#启动 web 服务器
npm run dev

# 启动 Mastra 开发服务器（默认监听 http://localhost:4111）
npx mastra dev
```

启动后可访问：

- **Mastra Studio**：`http://localhost:4111` — 可视化调试 Agent / Workflow / Trace
- **Chat API**：`http://localhost:4111/chat/weather-agent` — 供前端 UI 调用

> ⚠️ 需要在 `.env` 中配置模型 API Key（参考 `.env.example`），例如：
>
> ```
> ZHIPUAI_API_KEY=your_key_here
> # 或
> GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
> ```

### 学习参考

本项目的 Mastra 天气 Agent 示例参考自官方入门教程：

- **[Mastra Vite + React 快速入门](https://mastra.org.cn/guides/getting-started/vite-react)** — 手把手教你将 Mastra 集成到 React + Vite 项目，构建工具调用型 Agent 并对接聊天 UI

---

## 🛠️ 技术栈

| 技术                                         | 版本   | 说明                           |
| -------------------------------------------- | ------ | ------------------------------ |
| [React](https://react.dev)                   | 19.x   | UI 组件化开发                  |
| [TypeScript](https://www.typescriptlang.org) | ~6.0.x | 类型安全                       |
| [Vite](https://vitejs.dev)                   | 8.x    | 开发构建工具（HMR）            |
| [SCSS Module](https://sass-lang.com)         | 1.99+  | 样式隔离 + 变量/Mixin 设计体系 |
| [Tailwind CSS](https://tailwindcss.com)      | 4.x    | Mastra UI 使用的原子化样式     |
| [Mastra](https://mastra.ai)                  | 1.x    | AI Agent / Workflow 框架       |
| [AI SDK](https://sdk.vercel.ai)              | 6.x    | 前端 `useChat` Hook + 流式通信 |
| [Zod](https://zod.dev)                       | 4.x    | 工具输入/输出 Schema 校验      |

### 主要依赖

```
# Mastra 核心
mastra ^1.6.0
@mastra/core ^1.25.0
@mastra/memory ^1.15.1
@mastra/loggers ^1.1.1
@mastra/libsql ^1.8.1        # SQLite 存储适配器
@mastra/duckdb ^1.1.2        # DuckDB 可观测性存储
@mastra/observability ^1.9.1 # Trace / 可观测性
@mastra/ai-sdk ^1.4.0        # chatRoute 服务端路由

# 前端 AI
ai ^6.0.168
@ai-sdk/react ^3.0.170

# 通用
react ^19.2.4
typescript ~6.0.2
vite ^8.0.4
sass ^1.99.0
zod ^4.3.6
```

---

## 📁 项目结构

```
skill-agent-react/
├── public/                          # 静态资源
├── src/
│   ├── main.tsx                     # 应用入口
│   ├── App.tsx                      # 根组件（组装所有 Section）
│   ├── Mastra-UI.tsx                # Mastra 天气 Agent 对话界面
│   ├── mastra/                      # Mastra 后端服务
│   │   ├── index.ts                 # Mastra 实例（注册 Agent/Workflow/存储/可观测性）
│   │   ├── agents/
│   │   │   └── weather-agent.ts     # 天气 Agent（GLM-4.5-Flash + weatherTool + Memory）
│   │   ├── tools/
│   │   │   └── weather-tool.ts      # 天气工具（Open-Meteo API）
│   │   ├── workflows/
│   │   │   └── weather-workflow.ts  # 天气 Workflow（fetchWeather → planActivities）
│   │   └── public/                  # 构建静态资源
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
│       ├── ai-elements/             # AI 对话原子组件（Conversation/Message/Tool/PromptInput 等，48 个）
│       ├── ui/                      # 通用 UI 组件（shadcn 风格，25 个）
│       ├── Navigation.tsx           # 固定导航栏（滚动监听 + 高亮）
│       ├── Hero.tsx                 # 首屏大标题区域（渐变背景动画）
│       ├── SkillSection.tsx         # Skill 章节（特征卡片 + 文件树交互）
│       ├── AgentSection.tsx         # Agent 章节（6步 SVG 循环动画 + 工作模式）
│       ├── RelationSection.tsx      # 关系图（类比卡片 + 工作流 SVG + 对比表）
│       ├── PlaygroundSection.tsx    # 实验场（预设任务选择 + Agent 执行模拟器）
│       └── Footer.tsx               # 页脚
├── AGENTS.md                        # Mastra 开发规范（AI Agent 协作指南）
├── .prettierrc                      # Prettier 格式化规则
├── tsconfig.json                    # TypeScript 配置
├── vite.config.ts                   # Vite 配置
├── index.html                       # HTML 入口
└── package.json                     # 依赖管理
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动前端开发服务器（http://localhost:5173）
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

> 如需使用 Mastra 天气 Agent 功能，请先配置 `.env` 中的模型 API Key，Mastra 开发服务器通过 `npx mastra dev` 启动，监听 `http://localhost:4111`。

---

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

| Mixin                                    | 用途         | 使用场景             |
| ---------------------------------------- | ------------ | -------------------- |
| `mobile()` / `tablet()` / `desktop-up()` | 响应式断点   | 所有组件             |
| `card-base($padding)`                    | 卡片基础样式 | 特征卡、对比卡等     |
| `glow($color)`                           | 发光效果     | 活跃节点、按钮 hover |
| `gradient-text($from, $to)`              | 渐变文字     | 标题、强调文字       |
| `glass()`                                | 玻璃态效果   | 导航栏               |

---

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

### Mastra 天气对话界面

- 通过 `useChat` Hook 与 Mastra 后端建立流式连接
- 支持展示 AI 文本回复和工具调用过程（输入参数 + 输出结果）
- 后端服务需在 `http://localhost:4111` 运行

---

## 📝 代码风格

项目使用 [Prettier](https://prettier.io) 统一代码格式，规则见 [`.prettierrc`](./.prettierrc)：

| 规则   | 值      |
| ------ | ------- |
| 单引号 | ✅      |
| 分号   | ✅      |
| 尾逗号 | all     |
| 行宽   | 90 字符 |
| 缩进   | 2 空格  |
| 行尾符 | LF      |

---

## 📄 License

MIT
