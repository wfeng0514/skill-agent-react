import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { QWEN35_PLUS } from '../providers/dashscope';

export const cargoAgent = new Agent({
  id: 'cargo-agent',
  name: 'Cargo Loading Agent',
  description:
    '一个专业的货运装载率分析助手，能够分析车厢图片中的装载情况，提供装载率、空间利用率、货物类型识别和优化建议',
  /**
   * instructions 使用 DynamicArgument（async 函数），在每次请求时从 mastra.db 动态读取
   * Prompt Block 内容并拼接，实现在 Mastra Studio (localhost:4111) 修改后立即生效。
   * 首次使用前需要运行一次初始化脚本（已运行则跳过）：npx tsx src/mastra/prompts/setup.ts
   */
  instructions: async ({ mastra }) => {
    if (!mastra) {
      return '你是一个专业的货运装载率分析助手。';
    }
    const editor = mastra.getEditor();
    if (!editor) {
      return '你是一个专业的货运装载率分析助手。';
    }
    // 从 DB 读取两个 Prompt Block 并拼接
    const [rulesBlock, formatBlock] = await Promise.all([
      editor.prompt.getById('cargo-rules').catch(() => null),
      editor.prompt.getById('cargo-output-format').catch(() => null),
    ]);
    return (
      [rulesBlock?.content, formatBlock?.content].filter(Boolean).join('\n\n') || '你是一个专业的货运装载率分析助手。'
    );
  },

  model: QWEN35_PLUS,
  memory: new Memory(),
});
