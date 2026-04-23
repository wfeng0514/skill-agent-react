/**
 * RAG Agent — 基于向量检索的知识库问答 Agent
 *
 * 功能：
 * - 用户提问时，Agent 自动调用 vectorQueryTool 检索知识库
 * - 基于检索到的上下文生成回答
 * - 支持 Mastra Studio 可视化调试
 * - 集成 Live Evaluation：每次对话自动评分（答案相关性 + 忠实度）
 *
 * 使用前：
 * 1. 确保 .env 中配置了 DASHSCOPE_API_KEY（用于 embedding）
 * 2. 运行初始化脚本：npx tsx src/mastra/rag/setup-rag.ts
 *    该脚本会将文档 chunk → embed → upsert 到向量数据库
 *
 * Embedding 模型：
 * - 使用 DashScope 的 text-embedding-v3（1024维）
 * - 通过 OpenAICompatibleConfig 传入 API Key 和 URL
 */

import 'dotenv/config';
import { Agent } from '@mastra/core/agent';
import { createVectorQueryTool } from '@mastra/rag';
import { ragVectorStore, RAG_INDEX_NAME } from '../vector';
import { QWEN35_PLUS } from '../providers/dashscope';
import { embeddingModel } from '../embedding';
import { createAnswerRelevancyScorer, createFaithfulnessScorer } from '@mastra/evals/scorers/prebuilt';

/**
 * 向量查询工具
 * Agent 调用此工具将用户问题转换为 embedding，检索知识库中相似的内容
 */
const vectorQueryTool = createVectorQueryTool({
  vectorStore: ragVectorStore,
  indexName: RAG_INDEX_NAME,
  model: embeddingModel,
});

export const ragAgent = new Agent({
  id: 'rag-agent',
  name: 'RAG 知识库助手',
  description: '一个基于 RAG（检索增强生成）的知识库问答助手。',
  instructions: `你是一个专业的知识库问答助手。当用户提出问题时，使用 knowledgeSearch 工具在知识库中搜索相关内容，然后基于搜索结果回答问题。如果搜索结果中没有相关信息，请明确告知。`,
  model: QWEN35_PLUS,
  tools: { knowledgeSearch: vectorQueryTool },

  /**
   * Live Evaluation — 每次 Agent 对话自动评分
   *
   * 在 Mastra Studio 的 Observability → Scorers 页面可查看评分结果
   *
   * 两个 Scorer：
   * 1. relevancy（答案相关性）：回答是否切题（0-1，>0.7 为好）
   * 2. faithfulness（忠实度）：回答是否基于知识库事实，有无幻觉（0-1，>0.8 为好）
   *
   * sampling.rate = 1.0 表示 100% 的对话都自动评分（演示用，生产环境可降低）
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
