/**
 * Embedding 模型配置
 *
 * 统一管理 RAG 使用的 embedding 模型，确保 setup 脚本和 Agent 使用同一模型
 * 不同模型生成的 embedding 维度不同，混用会导致向量检索失败
 *
 * 模型：DashScope text-embedding-v3（1024维）
 * 接口：OpenAI Compatible API（通过 URL 和 API Key 指向 DashScope）
 *
 * ⚠️ 注意：ModelRouterEmbeddingModel 的构造函数会检查对应 provider 的 API key 环境变量
 * 如果使用 OpenAICompatibleConfig 传入自定义 url/apiKey，providerId 仍需是已注册的 provider
 * 且对应的环境变量（如 OPENAI_API_KEY）必须存在（即使不会被实际使用）
 *
 * 解决方案：在 Next.js 环境中（Agent 运行时），.env 被 Next.js 自动加载，OPENAI_API_KEY 存在
 * 对于独立脚本（setup-rag.ts），使用 openai SDK 直接调用 DashScope embedding API
 */

import { ModelRouterEmbeddingModel } from '@mastra/core/llm';

/**
 * DashScope Embedding 模型（用于 Agent 运行时）
 *
 * providerId 用 'openai'（已注册的 provider），通过 url/apiKey 重定向到 DashScope
 * 前提：运行环境中 OPENAI_API_KEY 环境变量已设置（Next.js 自动加载 .env）
 */
export const embeddingModel = new ModelRouterEmbeddingModel({
  id: 'openai/text-embedding-v3' as const,
  url: process.env.DASHSCOPE_API_BASE_URL,
  apiKey: process.env.DASHSCOPE_API_KEY,
});
