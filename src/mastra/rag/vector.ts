/**
 * RAG 知识库向量存储
 *
 * DB 路径通过 MASTRA_DB_URL 环境变量统一控制（在 .env 中设置）
 * - mastra dev、setup-rag.ts、test 脚本都使用同一个路径
 * - .env: MASTRA_DB_URL=file:/absolute/path/to/mastra.db
 */

import { LibSQLVector } from '@mastra/libsql';

export const ragVectorStore = new LibSQLVector({
  id: 'rag-vector',
  url: process.env.MASTRA_DB_URL || 'file:./mastra.db',
});

/** 向量索引名称（只能包含字母、数字、下划线） */
export const RAG_INDEX_NAME = 'rag_knowledge_base';
