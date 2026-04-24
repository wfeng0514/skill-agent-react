# Mastra 框架实战指南 — 知识分享

> 基于 skill-agent-react 项目的真实实践，覆盖 Studio、Agent、Tool、Workflow、Memory、RAG、MCP、Skills 八大核心概念。

---

## 一、Mastra 是什么？

**Mastra** 是一个开源的 AI Agent 框架（TypeScript），用于构建多智能体应用。核心理念：

```
Mastra = Agent（大脑）+ Tool（手脚）+ Workflow（流程编排）+ Memory（记忆）+ RAG（知识库）+ MCP（协议）+ Skills（技能包）
```

**一句话概括**：把 LLM 变成一个有工具、有记忆、能协作的智能体系统。

### 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@mastra/core` | ^1.25.0 | 核心框架（Agent、Workflow、Storage） |
| `@mastra/rag` | ^2.2.1 | 检索增强生成 |
| `@mastra/memory` | ^1.15.1 | 对话记忆 |
| `@mastra/mcp` | ^1.5.0 | MCP 协议集成 |
| `@mastra/evals` | ^1.2.1 | 质量评估 |
| `@mastra/editor` | ^0.7.16 | Prompt 动态管理 |
| `@mastra/libsql` | ^1.8.1 | 向量存储 + 数据库 |
| `@mastra/observability` | ^1.9.1 | 可观测性/追踪 |
| `mastra` (CLI) | ^1.6.0 | 开发服务器 + Studio |

---

## 二、Studio — 可视化管理控制台

### 2.1 启动

```bash
npx mastra dev
# → 打开 http://localhost:4111
```

### 2.2 能做什么

| 功能 | 说明 |
|------|------|
| **Agent 对话** | 左侧选择 Agent，直接对话测试 |
| **Prompt 编辑** | 在 Studio 中修改 Prompt Block，即时生效 |
| **Workflow 可视化** | 查看工作流的步骤执行流程图 |
| **Traces 追踪** | 查看每次请求的完整调用链（工具调用、token 用量、延迟） |
| **Evals 评分** | 查看 RAG Agent 的相关性/忠实度评分 |
| **Memory 管理** | 查看对话历史记录 |

### 2.3 API 路由

```typescript
// index.ts 中配置
server: {
  apiRoutes: [
    chatRoute({ path: '/chat/:agentId' }),
  ],
},
```

```bash
# 调用 Agent
curl -X POST http://localhost:4111/chat/rag-agent \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"年假有几天？"}]}'
```

### 2.4 Storage 层

```typescript
storage: new MastraCompositeStore({
  id: 'composite-storage',
  default: new LibSQLStore({ url: 'file:./mastra.db' }),  // Agent 数据、Memory、Prompt
  domains: {
    observability: await new DuckDBStore().getStore('observability'),  // 追踪数据
  },
}),
```

- **LibSQL**：存储 Agent 配置、对话历史、Prompt Block、向量索引
- **DuckDB**：存储 Observability 追踪数据（高性能分析）

---

## 三、Agent — 智能体

### 3.1 概念

Agent 是 Mastra 的核心。每个 Agent = **一个 LLM + 一套指令 + 一组工具 + 记忆**。

### 3.2 最小示例

```typescript
import { Agent } from '@mastra/core/agent';

export const myAgent = new Agent({
  id: 'my-agent',
  name: 'My Agent',
  instructions: '你是一个专业的助手...',
  model: 'alibaba-cn/qwen3.5-plus',
});
```

### 3.3 完整配置（项目中的 rag-agent）

```typescript
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const ragAgent = new Agent({
  id: 'rag-agent',                    // 唯一标识
  name: 'RAG 知识库助手',              // 显示名称
  description: '基于 RAG 的知识库问答',  // Studio 中显示的描述
  instructions: `你是一个专业的...`,    // 系统提示词
  model: QWEN35_PLUS,                 // LLM 模型
  tools: { knowledgeSearch: vectorQueryTool },  // 工具集
  memory: new Memory({                // 记忆配置
    options: { lastMessages: 10, semanticRecall: false },
  }),
  scorers: {                          // 质量评估
    relevancy: { scorer: createAnswerRelevancyScorer(...), sampling: { type: 'ratio', rate: 1.0 } },
    faithfulness: { scorer: createFaithfulnessScorer(...), sampling: { type: 'ratio', rate: 1.0 } },
  },
});
```

### 3.4 动态 Instructions（Prompt Block）

```typescript
// cargo-agent.ts — 从数据库动态加载 Prompt
instructions: async ({ mastra }) => {
  const editor = mastra.getEditor();
  const [rulesBlock, formatBlock] = await Promise.all([
    editor.prompt.getById('cargo-rules'),
    editor.prompt.getById('cargo-output-format'),
  ]);
  return [rulesBlock?.content, formatBlock?.content].filter(Boolean).join('\n\n');
},
```

**好处**：在 Studio 中修改 Prompt Block 后无需重启服务，下次请求自动生效。

### 3.5 项目中的 5 个 Agent

| Agent | 模型 | 工具 | 特点 |
|-------|------|------|------|
| weather-agent | glm-4.5-flash | weatherTool | 天气查询 + Memory(10条) |
| cargo-agent | qwen3.5-plus | — | 动态 Prompt（Studio 可编辑） |
| music-agent | qwen3.5-plus | 4个音乐工具 | 搜索/歌词/歌手/播放 |
| mcp-agent | qwen3.5-plus | MCP 工具集 | 聚合3个外部 MCP 服务 |
| rag-agent | qwen3.5-plus | knowledgeSearch | RAG 知识库 + Reranker + Eval |

---

## 四、Tool — 工具

### 4.1 概念

Tool 是 Agent 的"手脚"——让 LLM 能调用外部 API、查询数据库、执行操作。

### 4.2 创建工具

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',  // Agent 根据此描述决定何时调用
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // 调用外部 API...
    return { temperature: 25, conditions: 'Clear sky', location: 'Shenzhen' };
  },
});
```

### 4.3 关键设计

| 要素 | 说明 |
|------|------|
| `id` | 工具唯一标识，Agent 通过 id 引用工具 |
| `description` | **最重要！** Agent 靠此判断何时调用，要写清楚能力边界 |
| `inputSchema` | Zod schema，定义输入参数（也是 Agent 的 Function Calling 参数） |
| `outputSchema` | Zod schema，定义返回结构 |
| `execute` | 实际执行逻辑 |

### 4.4 工作原理

```
用户提问 → LLM 决定需要调用工具 → Function Calling → execute() → 返回结果 → LLM 生成回答
```

LLM 通过 `description` + `inputSchema` 来决定是否调用工具、传什么参数。**description 写得好不好，直接影响 Agent 的决策质量。**

### 4.5 项目中的工具

| 工具 | 功能 | 数据源 |
|------|------|--------|
| weather-tool | 天气查询（温度/湿度/风速） | Open-Meteo API |
| search-music | 歌曲搜索 | 网易云 API |
| get-lyrics | 获取歌词 | 网易云 API |
| get-artist-songs | 歌手作品列表 | 网易云 API |
| get-music-url | 播放链接 | 网易云 API |
| knowledgeSearch | 知识库检索（向量+Rerank） | LibSQLVector |

---

## 五、Workflow — 工作流

### 5.1 概念

Workflow 是**多步骤的确定性流程**，与 Agent 的自主决策不同，Workflow 的步骤是预先定义的。

### 5.2 Agent vs Workflow

| 特性 | Agent | Workflow |
|------|-------|----------|
| 决策方式 | LLM 自主决定 | 预定义步骤 |
| 适用场景 | 开放式对话、工具选择 | 固定流程、数据处理 |
| 工具调用 | LLM 决定何时调用 | 开发者指定 |

### 5.3 创建 Workflow

```typescript
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// 步骤 1：获取天气
const fetchWeather = createStep({
  id: 'fetch-weather',
  description: '获取天气数据',
  inputSchema: z.object({ city: z.string() }),
  outputSchema: z.object({ date: z.string(), maxTemp: z.number(), ... }),
  execute: async ({ inputData }) => {
    // 调用 API 获取天气...
    return { date: '...', maxTemp: 30, ... };
  },
});

// 步骤 2：根据天气规划活动（调用 Agent）
const planActivities = createStep({
  id: 'plan-activities',
  description: '根据天气推荐活动',
  inputSchema: forecastSchema,  // 接收步骤 1 的输出
  outputSchema: z.object({ activities: z.string() }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra.getAgent('weatherAgent');
    const response = await agent.stream([{ role: 'user', content: `...` }]);
    // 流式输出...
    return { activities: activitiesText };
  },
});

// 组装工作流
const weatherWorkflow = createWorkflow({
  id: 'weather-workflow',
  inputSchema: z.object({ city: z.string() }),
})
  .then(fetchWeather)     // 步骤 1
  .then(planActivities);  // 步骤 2（接收步骤 1 的输出）

weatherWorkflow.commit();  // 必须调用 commit() 注册
```

### 5.4 关键点

- **`createStep`**：每个步骤有独立的 input/output schema
- **`.then()`**：步骤串联，前一步的 output 自动成为下一步的 input
- **`mastra.getAgent()`**：Workflow 内部可以调用 Agent（让 LLM 做决策）
- **`commit()`**：必须调用，注册到 Mastra 实例

---

## 六、Memory — 对话记忆

### 6.1 概念

Memory 让 Agent 记住之前的对话内容，实现多轮对话。

### 6.2 配置

```typescript
import { Memory } from '@mastra/memory';

export const weatherAgent = new Agent({
  // ...
  memory: new Memory({
    options: {
      lastMessages: 10,        // 保留最近 10 条消息
      semanticRecall: false,    // 不使用语义召回（简单模式）
    },
  }),
});
```

### 6.3 两种模式

| 模式 | 说明 | 适用 |
|------|------|------|
| `lastMessages` | 保留最近 N 条消息 | 简单对话（项目使用） |
| `semanticRecall` | 语义相似度召回历史对话 | 长期记忆、大量历史 |

### 6.4 存储位置

Memory 数据存储在 LibSQL（mastra.db）中，通过 `MastraCompositeStore` 统一管理。

---

## 七、RAG — 检索增强生成

### 7.1 概念

RAG（Retrieval-Augmented Generation）= **让 AI 基于你的私有数据回答问题**。

```
用户提问 → Embedding → 向量检索 → Rerank 重排 → LLM 生成回答
```

### 7.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户提问                              │
│                         ↓                               │
│              ┌──────────────────────┐                   │
│              │  Embedding 模型       │                   │
│              │  text-embedding-v3   │  ← DashScope      │
│              │  (1024 维)           │                   │
│              └──────────────────────┘                   │
│                         ↓                               │
│              ┌──────────────────────┐                   │
│              │  向量检索 (topN)      │                   │
│              │  LibSQLVector        │  ← cosine 距离    │
│              └──────────────────────┘                   │
│                         ↓                               │
│              ┌──────────────────────┐                   │
│              │  Rerank 重排         │                   │
│              │  gte-rerank-v2       │  ← DashScope      │
│              │  semantic × 0.5      │  ← Cross-Encoder  │
│              │  vector × 0.3        │                   │
│              │  position × 0.2      │                   │
│              └──────────────────────┘                   │
│                         ↓                               │
│              ┌──────────────────────┐                   │
│              │  LLM 生成回答         │                   │
│              │  qwen3.5-plus        │                   │
│              └──────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### 7.3 知识库初始化

```typescript
// setup-rag.ts
const mdoc = MDocument.fromMarkdown(doc.text, { source: doc.filename });

// 1. 文档切分
const chunks = await mdoc.chunk({
  strategy: 'recursive',  // 递归切分
  maxSize: 1024,          // 每个 chunk 最大 1024 字符
  overlap: 200,           // 相邻 chunk 重叠 200 字符
});

// 2. 生成 Embedding
const embeddings = await generateEmbeddings(chunkTexts);

// 3. 存入向量数据库
await ragVectorStore.upsert({
  indexName: 'rag_knowledge_base',
  vectors: embeddings,   // number[][] — 平行数组
  ids,                   // string[] — 平行数组
  metadata,              // Record[] — 平行数组（包含 text 字段！）
});
```

### 7.4 createVectorQueryTool（核心 API）

```typescript
const vectorQueryTool = createVectorQueryTool({
  vectorStore: ragVectorStore,
  indexName: RAG_INDEX_NAME,
  model: embeddingModel,

  id: 'knowledgeSearch',
  description: '搜索公司知识库...',
  includeSources: true,    // 返回来源信息

  // Reranker 配置
  reranker: {
    model: dashScorer,     // RelevanceScoreProvider
    options: {
      topK: 3,
      weights: { semantic: 0.5, vector: 0.3, position: 0.2 },
    },
  },
});
```

### 7.5 评分公式

```
finalScore = semantic × 0.5 + vector × 0.3 + position × 0.2
```

| 维度 | 含义 | 来源 |
|------|------|------|
| **semantic** (0.5) | 语义相关性 | Cross-Encoder (gte-rerank-v2) |
| **vector** (0.3) | 向量相似度 | Embedding cosine 距离 |
| **position** (0.2) | 位置分 | `1 - position/total` |

### 7.6 自定义 Reranker（性能关键）

```typescript
// dashscope-scorer.ts
export class DashScopeRelevanceScorer implements RelevanceScoreProvider {
  async getRelevanceScore(query: string, text: string): Promise<number> {
    // 利用 setTimeout(10ms) 收集所有并发调用 → 一次 API 请求
    // Mastra 内部用 Promise.all 并发调用此方法
    return new Promise((resolve, reject) => {
      this.pending.push({ query, document: text, resolve, reject });
      this.timer = setTimeout(() => this.flush(), 10);
    });
  }
}
```

**为什么不用 LLM 做评分？**

| 方案 | 3 chunks 耗时 | 评分质量 |
|------|-------------|---------|
| LLM（MastraAgentRelevanceScorer） | ~100s | 粗糙（0/0.1/1.0） |
| **Cross-Encoder（gte-rerank-v2）** | **~0.2s** | **精细（0~0.3 连续）** |

### 7.7 Live Evaluation

```typescript
scorers: {
  relevancy: {
    scorer: createAnswerRelevancyScorer({ model: QWEN35_PLUS }),  // 答案相关性
    sampling: { type: 'ratio', rate: 1.0 },  // 100% 采样（演示用）
  },
  faithfulness: {
    scorer: createFaithfulnessScorer({ model: QWEN35_PLUS }),     // 忠实度（有无幻觉）
    sampling: { type: 'ratio', rate: 1.0 },
  },
},
```

每次 Agent 对话后自动评分，结果可在 Studio 的 Evals 面板查看。

---

## 八、MCP — Model Context Protocol

### 8.1 概念

MCP 是一个开放协议，让 AI 应用能标准化地接入外部工具和数据源。

```
┌──────────┐     MCP 协议     ┌──────────┐
│  Agent   │ ←─────────────→ │ MCP 服务  │
│ (客户端)  │   工具发现+调用   │ (服务端)  │
└──────────┘                 └──────────┘
```

### 8.2 MCP Client（连接外部服务）

```typescript
import { MCPClient } from '@mastra/mcp';

export const mcpClient = new MCPClient({
  id: 'mcp-client',
  servers: {
    // 标准 MCP 服务
    mastra: {
      command: 'npx',
      args: ['-y', '@mastra/mcp-docs-server'],
      env: { DOCS_CACHE_TTL: '3600' },
    },
    // 远程 MCP 服务（URL）
    weather: {
      url: new URL('https://server.smithery.ai/@smithery-ai/national-weather-service/mcp'),
    },
  },
});

// Agent 使用 MCP 工具
export const mcpAgent = new Agent({
  // ...
  tools: await mcpClient.listTools(),  // 自动发现所有工具
});
```

### 8.3 MCP Server（暴露自己的工具）

```typescript
import { MCPServer } from '@mastra/mcp';

export const musicMCPServer = new MCPServer({
  name: 'music-service',
  version: '1.0.0',
  description: '网易云音乐 MCP 服务',
  agents: { musicAgent },
  tools: { searchMusicTool, getLyricsTool, ... },
});

await musicMCPServer.startStdio();  // 以 Stdio 方式启动
```

### 8.4 项目中的 MCP

| 角色 | 服务 | 协议 |
|------|------|------|
| Client → | Mastra 官方文档 | Stdio (`npx @mastra/mcp-docs-server`) |
| Client → | 食谱查询 | Stdio (`npx howtocook-mcp`) |
| Client → | 美国天气 | HTTP (Smithery URL) |
| Server ← | 音乐服务 | Stdio（暴露给其他 Agent） |

---

## 九、Skills — 技能包

### 9.1 概念

Skills 是预打包的能力单元（Prompt + 脚本 + 参考资料），类似"插件"。

### 9.2 结构

```
public/wokerkspace/
├── .agents/skills/          # 系统技能
│   ├── find-skills/         # 技能搜索
│   ├── skill-creator/       # 技能创建器
│   ├── pdf/                 # PDF 处理
│   └── pypdf/               # PyPDF 处理
└── my-skills/
    └── vehicle-loading-rate-detector/  # 自定义技能
        ├── SKILL.md         # 技能定义（必需）
        ├── scripts/         # 执行脚本
        ├── references/      # 参考资料
        └── assets/          # 静态资源
```

### 9.3 配置

```typescript
const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: './wokerkspace', contained: false }),
  skills: ['./**/skills', './**/my-skills'],  // 技能目录
  bm25: true,  // 开启 BM25 全文搜索
});
```

### 9.4 SKILL.md 示例

```markdown
---
name: vehicle-loading-rate-detector
description: 检测车辆装载率的 AI 技能
version: 1.0.0
---

# 车辆装载率检测

## 触发条件
当用户需要检测车辆装载率时使用此技能。

## 工作流
1. 接收图片
2. 调用 scripts/detect_loading.py 进行检测
3. 返回装载率分析结果
```

---

## 十、项目整体架构

```
skill-agent-react/
├── src/mastra/
│   ├── index.ts                    # 入口（注册所有组件）
│   ├── agents/                     # 5 个 Agent
│   │   ├── weather-agent.ts        # 天气 + Tool + Memory
│   │   ├── cargo-agent.ts          # 货运 + 动态 Prompt
│   │   ├── music-agent.ts          # 音乐 + 4 Tools + Memory
│   │   ├── mcp-agent.ts            # MCP 集成
│   │   └── rag-agent.ts            # RAG + Reranker + Eval
│   ├── tools/                      # 5 个自定义 Tool
│   ├── workflows/                  # 1 个 Workflow（天气流水线）
│   ├── mcp/                        # MCP Client + Server
│   ├── rag/                        # RAG 组件
│   │   ├── setup-rag.ts            # 知识库初始化
│   │   ├── vector.ts               # 向量存储
│   │   ├── embedding.ts            # Embedding 模型
│   │   ├── dashscope-scorer.ts     # 自定义 Reranker
│   │   └── documents/              # 知识库文档
│   ├── prompts/                    # Prompt Block 管理
│   ├── providers/                  # 自定义 LLM Provider
│   └── public/                     # 数据（DB、Workspace）
└── .env                            # 环境变量
```

---

## 十一、快速上手清单

### 环境准备

```bash
# 1. 安装依赖
cd skill-agent-react
npm install

# 2. 配置 .env
DASHSCOPE_API_KEY=sk-xxx
MASTRA_DB_URL=file:./mastra.db
```

### 运行项目

```bash
# 1. 初始化 RAG 知识库（首次）
npx tsx src/mastra/rag/setup-rag.ts

# 2. 初始化 Prompt Block（首次）
npx tsx src/mastra/prompts/setup.ts

# 3. 启动 Mastra Studio
npx mastra dev
# → 打开 http://localhost:4111
```

### Studio 演示顺序

1. **Weather Agent** → 输入 "深圳天气" → 观察 Tool 调用（get-weather）
2. **Music Agent** → 输入 "搜索周杰伦的歌" → 观察 4 个音乐工具的调用
3. **RAG Agent** → 输入 "年假有几天？" → 观察 knowledgeSearch 检索 + Evals 评分
4. **MCP Agent** → 输入 "Mastra 的 RAG 怎么用？" → 观察 MCP 工具调用
5. **Cargo Agent** → 上传车辆图片 → 观察 Prompt Block 加载 + 多模态分析
6. **Workflow** → 在 Studio 的 Workflow 面板运行 weatherWorkflow

---

## 十二、踩坑经验速查

| 场景 | 坑 | 解法 |
|------|-----|------|
| Embedding 模型 | DashScope 不在 Mastra registry | 用 `openai` providerId + url/apiKey |
| Rerank API 404 | `DASHSCOPE_API_BASE_URL` 是 OpenAI 兼容地址 | 用独立端点 `dashscope.aliyuncs.com/api/v1/services/rerank/...` |
| LLM Rerank 太慢 | 每个 chunk 一次 LLM 调用 | 用 Cross-Encoder (gte-rerank-v2) 批量 API |
| DB 路径 | `mastra dev` 打包后 CWD 变了 | 统一用 `MASTRA_DB_URL` 环境变量 |
| ESM import | static import 早于 env 设置 | 独立脚本用 `await import()` 动态导入 |
| Prompt Block | 不自动注入 Agent | 用 `DynamicArgument` + `editor.prompt.getById()` |
| 向量索引名 | 不能有连字符 | 只用字母、数字、下划线 |
| 权重校验 | `executeRerank` 严格校验 sum=1 | `0.5+0.3+0.2=1.0` ✅ |
