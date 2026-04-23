# RAG 知识库助手 — 使用与部署指南

## 架构概览

```
┌──────────────────────────────────────────────────┐
│              Mastra Studio (localhost:4111)       │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Agent    │  │ Evaluate Tab │  │ Scorers    │ │
│  │ 对话调试  │  │ 运行评估实验  │  │ 查看评分结果│ │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘ │
│       │               │                │         │
├───────┴───────────────┴────────────────┴─────────┤
│              RAG Agent (rag-agent.ts)             │
│  ┌─────────────────┐  ┌────────────────────────┐ │
│  │ knowledgeSearch  │  │ Live Evaluation        │ │
│  │ 向量检索工具      │  │ - relevancy (相关性)   │ │
│  └────────┬────────┘  │ - faithfulness (忠实度) │ │
│           │           └────────────────────────┘ │
├───────────┴──────────────────────────────────────┤
│           LibSQLVector (rag_knowledge_base)       │
│           mastra.db — 向量索引 + 评分数据          │
└──────────────────────────────────────────────────┘
```

## 文件结构

```
src/mastra/
├── agents/
│   └── rag-agent.ts          # RAG Agent + Live Evaluation
├── embedding.ts              # DashScope embedding 模型配置
├── vector.ts                 # LibSQLVector 向量存储配置
└── rag/
    ├── documents/
    │   └── onboarding-handbook.md  # 入职手册（知识库文档）
    ├── setup-rag.ts           # 知识库初始化（文档灌入向量）
    ├── run-evals.ts           # 批量评估脚本（7 个测试用例）
    ├── test-rag.ts            # 向量检索单元测试
    └── test-agent-direct.ts   # Agent 端到端测试
```

---

## 一、初始化知识库

首次使用或文档更新后，运行初始化脚本：

```bash
npx tsx src/mastra/rag/setup-rag.ts
```

该脚本会：
1. 读取 `documents/` 目录下所有 `.md` 文件
2. 将每个文档切分为约 500 字符的 chunks
3. 使用 DashScope text-embedding-v3 生成向量
4. 写入 LibSQLVector（mastra.db）

---

## 二、启动 Mastra Studio

```bash
npx mastra dev
```

打开 http://localhost:4111

### 2.1 对话测试

1. 左侧选择 **RAG 知识库助手** Agent
2. 直接输入问题，如"公司的年假有几天？"
3. 观察右侧 **Tool Calls** 面板，确认 `knowledgeSearch` 工具被正确调用

### 2.2 查看 Live Evaluation 评分

每次对话后，Agent 会自动评分。查看方式：

1. 左侧 **Observability** → **Scorers**
2. 选择 `rag-relevancy` 或 `rag-faithfulness`
3. 查看每次对话的评分（0-1）和评分理由

### 2.3 Agent Evaluate Tab

1. 左侧选择 **RAG 知识库助手** → **Evaluate** 标签
2. 可以在此运行评估实验、管理数据集、查看历史评分

---

## 三、文档更新流程

### 3.1 添加新文档

```bash
# 1. 将文档放入 documents/ 目录
cp your-new-doc.md src/mastra/rag/documents/

# 2. 重新初始化知识库
npx tsx src/mastra/rag/setup-rag.ts

# 3. 重启 Mastra（如果正在运行）
# Ctrl+C → npx mastra dev
```

### 3.2 更新已有文档

```bash
# 1. 直接编辑文档
vim src/mastra/rag/documents/onboarding-handbook.md

# 2. 重新初始化（会自动覆盖旧的 chunks）
npx tsx src/mastra/rag/setup-rag.ts
```

### 3.3 删除文档

```bash
# 1. 删除文档文件
rm src/mastra/rag/documents/your-doc.md

# 2. 重新初始化（只处理 documents/ 下存在的文件）
npx tsx src/mastra/rag/setup-rag.ts
```

> **注意**：setup-rag.ts 每次会清空索引后重建，确保向量数据和文档一致。

---

## 四、批量评估

```bash
npx tsx src/mastra/rag/run-evals.ts
```

输出示例：
```
❓ 公司的年假有几天？
   ✅ 相关性: 0.95 | 🎯 忠实度: 0.88
   💬 回答准确引用了知识库中年假15天的信息...

═══════════════════════════════════════════════════
✅ 评估完成！耗时 45.2s，共 7 个用例

📊 rag-relevancy: 0.891
📊 rag-faithfulness: 0.843
```

---

## 五、Studio 演示要点

### 推荐演示顺序

1. **对话演示**：选择 RAG Agent → 输入"年假有几天" → 展示知识库检索 + 回答
2. **工具调用可视化**：展开 Tool Calls 面板 → 展示 `knowledgeSearch` 的输入/输出
3. **Live Evaluation**：Observability → Scorers → 展示自动评分结果
4. **Evaluate Tab**：Agent → Evaluate → 运行评估实验 → 展示批量评分

### 演示问题推荐

| 问题 | 检索内容 | 预期效果 |
|------|---------|---------|
| 年假有几天？ | 工作制度-假期 | 直接命中，相关性高 |
| 远程办公有什么规定？ | 工作制度-远程 | 多 chunk 聚合 |
| 入职第一天做什么？ | 入职流程 | 步骤完整 |
| 信息安全红线是什么？ | IT安全 | 列表型回答 |
| 公司用什么技术栈？ | 开发环境 | 技术细节丰富 |
