/**
 * DashScope Relevance Scorer
 *
 * 实现 Mastra 的 RelevanceScoreProvider 接口，用 DashScope gte-rerank-v2 模型
 * 对查询-文档对进行相关性评分。利用批量 API + 并发收集机制，将多个
 * getRelevanceScore() 调用合并为一次 DashScope API 请求，极大提升性能。
 *
 * 性能对比：
 *   - MastraAgentRelevanceScorer（LLM）：每个 chunk 一次 LLM 调用，3 chunks ≈ 100s
 *   - DashScopeRelevanceScorer（本方案）：所有 chunks 一次批量 API，3 chunks ≈ 1-2s
 *
 * 用法（配合 createVectorQueryTool）：
 *   const scorer = new DashScopeRelevanceScorer();
 *   createVectorQueryTool({
 *     ...
 *     reranker: {
 *       model: scorer,   // Mastra 内部通过 "getRelevanceScore" in model 自动检测
 *       options: { topK: 5, weights: { semantic: 0.5, vector: 0.3, position: 0.2 } },
 *     },
 *   });
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 类型定义（与 @mastra/core 一致）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface RelevanceScoreProvider {
  getRelevanceScore(text1: string, text2: string): Promise<number>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DashScope Relevance Scorer
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** DashScope Rerank API 端点（独立于 OpenAI 兼容模式） */
const RERANK_URL = 'https://dashscope.aliyuncs.com/api/v1/services/rerank/text-rerank/text-rerank';

/** 待评分的查询-文档对 */
interface PendingItem {
  query: string;
  document: string;
  resolve: (score: number) => void;
  reject: (err: Error) => void;
}

export class DashScopeRelevanceScorer implements RelevanceScoreProvider {
  private apiKey: string;
  private model: string;

  /** 批量收集窗口（ms）— Mastra 内部用 Promise.all 并发调用，此窗口收集所有并发请求 */
  private batchWindow = 10;

  /** 当前收集队列 */
  private pending: PendingItem[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.model = model || 'gte-rerank-v2';
    if (!this.apiKey) {
      throw new Error('DashScopeRelevanceScorer: DASHSCOPE_API_KEY is required');
    }
  }

  /**
   * RelevanceScoreProvider 接口方法
   *
   * Mastra 内部（executeRerank）通过 Promise.all 并发调用此方法，
   * 我们将所有并发调用收集到队列中，在 batchWindow 内一次性发送批量 API 请求。
   *
   * @param query - 用户查询
   * @param text - 候选文档文本
   * @returns 相关性分数（0~1）
   */
  async getRelevanceScore(query: string, text: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      this.pending.push({ query, document: text, resolve, reject });

      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.flush();
        }, this.batchWindow);
      }
    });
  }

  /**
   * 批量发送评分请求
   *
   * DashScope Rerank API 支持一次请求对多个文档评分，比逐个调用快 10 倍+
   */
  private async flush(): Promise<void> {
    this.timer = null;
    const batch = this.pending.splice(0);

    if (batch.length === 0) return;

    // 按 query 分组（同一查询的多个文档合并为一次请求）
    const byQuery = new Map<string, PendingItem[]>();
    for (const item of batch) {
      const items = byQuery.get(item.query) || [];
      items.push(item);
      byQuery.set(item.query, items);
    }

    // 对每组 query 并行发送 API 请求
    await Promise.all(
      Array.from(byQuery.entries()).map(([query, items]) => this.callRerank(query, items)),
    );
  }

  private async callRerank(query: string, items: PendingItem[]): Promise<void> {
    const documents = items.map((item) => item.document);

    try {
      const response = await fetch(RERANK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: { query, documents },
          parameters: { return_documents: false },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`DashScope Rerank API ${response.status}: ${body}`);
      }

      const data = await response.json();
      // 响应格式：{ output: { results: [{ index, relevance_score }] } }
      const results = data?.output?.results || [];

      // 按 index 分发分数
      for (const item of items) {
        const idx = documents.indexOf(item.document);
        const scored = results.find((r: { index: number }) => r.index === idx);
        item.resolve(scored?.relevance_score ?? 0);
      }
    } catch (err) {
      // 任何一个失败，整个批次都 reject
      for (const item of items) {
        item.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }
}
