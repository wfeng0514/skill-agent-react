/**
 * RAG Agent — 基于向量检索 + DashScope Reranker 的知识库问答 Agent
 *
 * 架构：
 *   用户提问 → Embedding → 向量检索 topN → DashScope gte-rerank-v2 重排序 → LLM 生成回答
 *
 * Reranker 性能：
 *   DashScopeRelevanceScorer 利用批量 API + 并发收集，所有 chunks 一次 API 请求
 *   3 chunks ≈ 1-2s（对比 LLM 方案的 ~100s）
 *
 * 使用前：
 * 1. 确保 .env 中配置了 DASHSCOPE_API_KEY
 * 2. 运行初始化脚本：npx tsx src/mastra/rag/setup-rag.ts
 * 3. 启动服务：npx mastra dev
 */

import 'dotenv/config';
import { Agent } from '@mastra/core/agent';
import { createVectorQueryTool } from '@mastra/rag';
import { ragVectorStore, RAG_INDEX_NAME } from '../rag/vector';
import { QWEN35_PLUS } from '../providers/dashscope';
import { embeddingModel } from '../rag/embedding';
import { DashScopeRelevanceScorer } from '../rag/dashscope-scorer';
import { createAnswerRelevancyScorer, createFaithfulnessScorer } from '@mastra/evals/scorers/prebuilt';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Vector Query Tool + Reranker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const dashScorer = new DashScopeRelevanceScorer();

const vectorQueryTool = createVectorQueryTool({
  vectorStore: ragVectorStore,
  indexName: RAG_INDEX_NAME,
  model: embeddingModel,

  // 工具配置
  id: 'knowledgeSearch',
  description:
    '搜索公司知识库，查找相关信息来回答用户问题。支持按文档来源过滤。当用户询问公司制度、流程、福利、技术规范等问题时使用此工具。',
  enableFilter: true,
  includeSources: true,
  includeVectors: false,

  // Reranker — DashScope gte-rerank-v2（Cross-Encoder，1-2s 批量评分）
  // Mastra 内部通过 "getRelevanceScore" in model 鸭量检测 → 走 rerankWithScorer 路径
  reranker: {
    model: dashScorer as any, // RelevanceScoreProvider，需 as any 绕过类型检查
    options: {
      topK: 3,
      weights: {
        semantic: 0.5, // Cross-Encoder 精排（主要信号）
        vector: 0.3, // 向量余弦相似度（辅助）
        position: 0.2, // 位置分（微调）
      },
    },
  },
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. RAG Agent
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const ragAgent = new Agent({
  id: 'rag-agent',
  name: 'RAG 知识库助手',
  description: '一个基于 RAG（检索增强生成）的知识库问答助手，支持向量检索 + Cross-Encoder 重排序。',
  instructions: `你是一个专业的公司知识库问答助手。请严格遵循以下规则：

## 回答流程
1. 使用 knowledgeSearch 工具在知识库中搜索相关内容
2. 仔细阅读搜索结果，提取与问题相关的关键信息
3. 基于搜索结果组织回答，不要编造知识库中没有的信息

## 回答规范
- **严格基于知识库**：只使用 knowledgeSearch 返回的内容，绝不能凭空编造
- **标注来源**：在回答末尾注明信息来自哪个文档/章节
- **如果找不到**：明确告知用户"知识库中没有找到相关信息"，不要猜测
- **精确引用**：引用具体数字、条款时，确保与检索结果完全一致
- **简洁回答**：直接回答问题，避免无关的寒暄
- **结构化**：如果问题涉及多个方面，分点回答


## 示例
问：年假有几天？
答：根据员工手册，年假为 **15天/年**，入职即享，首年按比例折算。
来源：薪酬福利 > 休假制度`,
  model: QWEN35_PLUS,
  tools: { knowledgeSearch: vectorQueryTool },

  /**
   * Live Evaluation — 每次 Agent 对话自动评分
   *
   * - relevancy（答案相关性）：回答是否切题
   * - faithfulness（忠实度）：回答是否基于知识库事实，有无幻觉
   * - sampling.rate = 1.0：100% 评分（演示用）
   */
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({ model: QWEN35_PLUS }),
      sampling: { type: 'ratio', rate: 1.0 },
    },
    faithfulness: {
      scorer: createFaithfulnessScorer({ model: QWEN35_PLUS }),
      sampling: { type: 'ratio', rate: 1.0 },
    },
  },
});
