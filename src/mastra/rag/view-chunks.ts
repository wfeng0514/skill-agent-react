/**
 * 查看知识库分割后的文本块（chunks）
 *
 * 直接从 mastra.db 读取已存储的向量数据，展示每个 chunk 的：
 * - ID、来源文档、序号
 * - 文本内容（截断展示）
 *
 * 用法：
 *   npx tsx src/mastra/rag/view-chunks.ts              # 查看所有 chunk
 *   npx tsx src/mastra/rag/view-chunks.ts onboarding    # 只看 onboarding 相关的 chunk
 *   npx tsx src/mastra/rag/view-chunks.ts onboarding-handbook  # 只看指定来源的 chunk
 */

import 'dotenv/config';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从 .env 读取 MASTRA_DB_URL，兜底用项目根的 mastra.db
const dbUrl = process.env.MASTRA_DB_URL || `file:${resolve(__dirname, '..', '..', '..', 'mastra.db')}`;

/** 从命令行参数获取过滤关键词（模糊匹配来源文件名） */
const filterKeyword = process.argv[2]?.trim();

async function viewChunks() {
  const db = createClient({ url: dbUrl });

  if (filterKeyword) {
    console.log(`🔍 过滤条件: 来源文件名包含 "${filterKeyword}"\n`);
  }

  // 查询 rag_knowledge_base 表中的所有数据
  try {
    const result = await db.execute(
      'SELECT id, metadata FROM rag_knowledge_base ORDER BY id'
    );

    if (result.rows.length === 0) {
      console.log('📭 知识库为空，没有找到任何 chunk。');
      console.log('   请先运行: npx tsx src/mastra/rag/setup-rag.ts');
      process.exit(0);
    }

    // 解析并按条件过滤
    const chunks = result.rows
      .map((row) => {
        const id = row.id as string;
        const metadata = row.metadata as string;
        let meta: Record<string, any>;
        try {
          meta = JSON.parse(metadata);
        } catch {
          meta = {};
        }
        return { id, source: meta.source || 'unknown', chunkIndex: meta.chunkIndex ?? '?', text: meta.text || '' };
      })
      .filter((chunk) => {
        if (!filterKeyword) return true;
        return chunk.source.toLowerCase().includes(filterKeyword.toLowerCase());
      });

    if (chunks.length === 0) {
      console.log(`📭 没有找到来源包含 "${filterKeyword}" 的 chunk。`);
      console.log('   可用来源文件名：');
      const allSources = [...new Set(result.rows.map((row) => {
        try { return JSON.parse(row.metadata as string).source; } catch { return 'unknown'; }
      }))];
      allSources.forEach((s) => console.log(`   - ${s}`));
      process.exit(0);
    }

    console.log(`📚 匹配 ${chunks.length} 条 chunk（共 ${result.rows.length} 条）\n`);
    console.log('═'.repeat(80));

    for (const chunk of chunks) {
      console.log(`\n🔖 ID: ${chunk.id}`);
      console.log(`📄 来源: ${chunk.source}`);
      console.log(`🔢 序号: ${chunk.chunkIndex}`);

      if (chunk.text.length > 200) {
        console.log(`📝 内容 (${chunk.text.length} 字符):`);
        console.log(`   ${chunk.text.slice(0, 200)}...`);
      } else {
        console.log(`📝 内容: ${chunk.text}`);
      }

      console.log('─'.repeat(80));
    }

    // 按来源统计
    console.log('\n📊 按文档统计:');
    const stats: Record<string, number> = {};
    for (const chunk of chunks) {
      stats[chunk.source] = (stats[chunk.source] || 0) + 1;
    }
    for (const [source, count] of Object.entries(stats)) {
      console.log(`   ${source}: ${count} chunks`);
    }

  } catch (error: any) {
    if (error.message?.includes('no such table')) {
      console.log('📭 数据库中不存在 rag_knowledge_base 表。');
      console.log('   请先运行: npx tsx src/mastra/rag/setup-rag.ts');
    } else {
      console.error('❌ 查询失败:', error.message);
    }
  }

  process.exit(0);
}

viewChunks();
