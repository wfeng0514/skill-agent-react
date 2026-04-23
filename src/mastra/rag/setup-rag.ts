/**
 * RAG 知识库初始化脚本
 *
 * 功能：
 * 1. 读取 rag/documents/ 目录下的 .md 文档
 * 2. 将文档切分为 chunks
 * 3. 生成 embedding 向量（通过 DashScope API）
 * 4. 存入 LibSQLVector 向量数据库
 *
 * 运行：npx tsx src/mastra/rag/setup-rag.ts
 */

import 'dotenv/config';
import { resolve, join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// 动态 import，确保 MASTRA_DB_URL 已设置
const { ragVectorStore, RAG_INDEX_NAME } = await import('./vector');
const { MDocument } = await import('@mastra/rag');
import OpenAI from 'openai';

/** DashScope Embedding 模型参数 */
const DASHSCOPE_EMBEDDING_MODEL = 'text-embedding-v3';
const EMBEDDING_DIMENSIONS = 1024;

/** 文档目录（相对于本脚本所在目录） */
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DOCS_DIR = resolve(__dirname, 'documents');

/**
 * 使用 openai SDK 直接调用 DashScope Embedding API
 */
function createDashScopeEmbeddingClient() {
  return new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_API_BASE_URL,
  });
}

/**
 * 将文本列表转换为 embedding 向量
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = createDashScopeEmbeddingClient();
  const batchSize = 10;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await client.embeddings.create({
      model: DASHSCOPE_EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    });
    const embeddings = response.data.map((d) => d.embedding);
    allEmbeddings.push(...embeddings);
    console.log(`   🧮 批次 ${Math.floor(i / batchSize) + 1}: ${batch.length} 条 → ${embeddings.length} 个向量`);
  }

  return allEmbeddings;
}

/**
 * 从 documents/ 目录读取所有 .md 文件
 */
function loadDocuments(): Array<{ filename: string; text: string }> {
  const files = readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.warn(`   ⚠️  ${DOCS_DIR} 下没有找到 .md 文件`);
    return [];
  }

  return files.map((filename) => {
    const filepath = join(DOCS_DIR, filename);
    const text = readFileSync(filepath, 'utf-8');
    console.log(`   📄 ${filename} (${text.length} 字符)`);
    return { filename: filename.replace(/\.md$/, ''), text };
  });
}

/**
 * 初始化 RAG 知识库
 */
async function setupRAG() {
  console.log('🚀 开始初始化 RAG 知识库...\n');
  console.log(`📊 Embedding 模型: DashScope text-embedding-v3 (${EMBEDDING_DIMENSIONS}维)\n`);

  if (!process.env.DASHSCOPE_API_KEY) {
    console.error('❌ DASHSCOPE_API_KEY 未配置，请在 .env 文件中设置');
    process.exit(1);
  }

  // 0. 加载文档
  console.log('📂 加载文档:');
  const docs = loadDocuments();
  if (docs.length === 0) {
    console.error('❌ 没有可处理的文档，请将 .md 文件放入 src/mastra/rag/documents/ 目录');
    process.exit(1);
  }

  // 1. 创建向量索引（如果不存在）
  console.log('\n🔨 创建向量索引...');
  try {
    await ragVectorStore.createIndex({
      indexName: RAG_INDEX_NAME,
      dimension: EMBEDDING_DIMENSIONS,
      metric: 'cosine',
    });
    console.log('   ✅ 索引创建成功');
  } catch (error: any) {
    if (error?.message?.includes('already exists') || error?.rawCode === 1) {
      console.log('   ℹ️  索引已存在，跳过创建');
    } else {
      console.warn('   ⚠️  索引创建警告:', error.message);
    }
  }

  let totalChunks = 0;

  for (const doc of docs) {
    console.log(`\n📄 处理文档: ${doc.filename}`);

    // 2. 创建 MDocument 并切分
    const mdoc = MDocument.fromMarkdown(doc.text, { source: doc.filename });

    const chunks = await mdoc.chunk({
      strategy: 'recursive',
      maxSize: 1024, // 增大 chunk：保留更完整的语义上下文
      overlap: 200, // 增大 overlap：避免语义截断
    });
    console.log(`   ✂️  切分为 ${chunks.length} 个 chunks`);

    // 3. 生成 embeddings
    const chunkTexts = chunks.map((chunk) => chunk.text);
    const embeddings = await generateEmbeddings(chunkTexts);

    // 4. 构造 upsert 参数（平行数组）
    const ids = chunks.map((_, i) => `${doc.filename}__chunk_${i}`);
    const metadata = chunks.map((chunk, i) => ({
      source: doc.filename,
      chunkIndex: i,
      text: chunk.text,
    }));

    // 5. 存入向量数据库
    console.log(
      `   📍 ragVectorStore DB URL: ${(ragVectorStore as any).url || (ragVectorStore as any).config?.url || 'unknown'}`,
    );
    const upsertedIds = await ragVectorStore.upsert({
      indexName: RAG_INDEX_NAME,
      vectors: embeddings,
      ids,
      metadata,
    });

    console.log(`   ✅ 存储完成，${upsertedIds.length} 条记录`);
    totalChunks += chunks.length;
  }

  // 6. 验证索引统计
  try {
    const stats = await ragVectorStore.describeIndex({ indexName: RAG_INDEX_NAME });
    console.log('\n📊 索引统计:');
    console.log(`   - 维度: ${stats.dimension}`);
    console.log(`   - 向量数: ${stats.count}`);
    console.log(`   - 距离度量: ${stats.metric}`);
  } catch (error) {
    console.warn('\n⚠️  无法获取索引统计:', error);
  }

  console.log(`\n🎉 初始化完成！共处理 ${docs.length} 个文档，${totalChunks} 个 chunks`);
  console.log('\n💡 现在可以通过以下方式测试 RAG Agent：');
  console.log('   1. 启动 Mastra: npx mastra dev');
  console.log('   2. 打开 Mastra Studio: http://localhost:4111');
  console.log('   3. 选择 RAG Agent 进行对话测试');
  console.log('   或直接 API 调用: POST http://localhost:4111/chat/rag-agent');
}

setupRAG().catch((err) => {
  console.error('❌ RAG 初始化失败:', err);
  process.exit(1);
});
