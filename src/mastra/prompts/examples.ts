/**
 * Mastra Prompt Blocks 完整使用示例
 *
 * Prompt Blocks 是可复用的指令模板，核心特性：
 * 1. 模板变量：{{variable}} 语法，支持默认值 {{variable || 'default'}}
 * 2. 显示条件：根据 rules (AND/OR) 控制块是否出现在最终 prompt 中
 * 3. 版本控制：每次编辑创建新版本，支持 draft/published/archived 状态
 * 4. 多 Agent 复用：同一个 Prompt Block 可被多个 Agent 引用
 *
 * ─────────────────────────────────────────────────────────────
 * 核心概念
 * ─────────────────────────────────────────────────────────────
 *
 * Prompt Block 本身只是一个"存储单元"，它不会自动注入到 Agent 中。
 * 使用流程是：
 *   1. 注册 Block（addPromptBlock 或 editor.prompt.create）
 *   2. 获取 Block（mastra.getPromptBlock('key')）
 *   3. 手动拼接到 Agent 的 instructions 中
 *
 * 两种注册方式：
 *   A. 内存型：mastra.addPromptBlock() — 不走 DB，重启丢失
 *   B. 存储型：editor.prompt.create() — 存入 mastra.db，支持版本控制
 */

import { mastra } from '../index';

// ============================================================================
// 第一步：注册 Prompt Block
// ============================================================================

// ── 方式 A：内存型（适合开发调试）────────────────────────────────────
// addPromptBlock 注册后，通过 mastra.getPromptBlock('key') 获取
function registerInMemoryBlocks() {
  // Block 1：品牌语气（所有 Agent 共用）
  mastra.addPromptBlock({
    id: 'brand-voice',
    name: 'Brand Voice',
    description: '品牌语气和风格指南',
    content:
      '你代表 Acme 物流公司，语气专业但友好。' +
      '始终称呼用户为 {{userName || "客户"}}。' +
      '回复使用中文，简洁专业。',
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Block 2：装载率特殊规则（cargo-agent 专用）
  mastra.addPromptBlock({
    id: 'cargo-rules',
    name: 'Cargo Analysis Rules',
    description: '装载率分析的特殊判定规则',
    content: `
## 特殊判定规则
- **关门检测**：如果图片显示车厢门关闭 → 装载率 0%，警告"请勿关门拍照"
- **满载判定**：如果宽度 ≥92% 且 高度 ≥92% → 装载率 100%
- **三维加权**：装载率 = (长度利用率×0.4 + 宽度利用率×0.35 + 高度利用率×0.25) × 密度系数
- **密度系数**：纸箱规整 0.85-0.95 / 纸箱散乱 0.70-0.85 / 软包装 0.60-0.75 / 混合 0.75-0.85
- **填充标准**：0-20% 空载🔴 / 20-40% 较空🟠 / 40-60% 适中🟡 / 60-80% 较满🔵 / 80-100% 满载🟢
`,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Block 3：输出格式模板
  mastra.addPromptBlock({
    id: 'output-format',
    name: 'Output Format',
    description: '统一的输出格式模板',
    content: `
## 输出格式（严格遵循）
📊 **装载率分析报告**
━━━━━━━━━━━━━━━━━
🚛 装载率：XX%
📦 填充程度：较满/适中/较空 等
📐 空间利用率：详细描述
📋 货物类型：识别结果
💡 优化建议：具体可操作的建议
⚠️ 安全评估：风险等级和说明
━━━━━━━━━━━━━━━━━
`,
    status: 'published',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('📋 已注册 Prompt Blocks:', Object.keys(mastra.listPromptBlocks()));
}

// ── 方式 B：存储型（推荐生产使用）────────────────────────────────────
// 通过 Editor API 创建，数据存入 mastra.db，支持 Mastra Studio 管理
async function registerStoredBlocks() {
  const editor = mastra.getEditor()!;

  const block = await editor.prompt.create({
    id: 'brand-voice-stored',
    name: 'Brand Voice (Stored)',
    description: '存储在 DB 中的品牌语气指南',
    content: '你代表 Acme 物流公司，回复使用中文，简洁专业。',
  });

  console.log('✅ 存储型 Block 创建成功:', block.id, block.status);

  // 列出所有存储的 Prompt Blocks
  const { promptBlocks } = await editor.prompt.list({ perPage: false });
  console.log('📋 存储 Prompt Blocks:', promptBlocks.map((b) => ({ id: b.id, status: b.status })));
}

// ============================================================================
// 第二步：获取 Prompt Block 并拼接成 Agent instructions
// ============================================================================

/**
 * 核心用法：获取已注册的 Block，拼成 instructions 字符串
 *
 * 注意：Mastra 不会自动将 Prompt Block 注入到 Agent。
 * 你需要手动获取 block 的 content，拼接到 Agent 的 instructions 中。
 * 模板变量（{{var}}）需要自己替换，Mastra 不提供自动模板渲染。
 */
function buildAgentInstructions(context: Record<string, string> = {}) {
  // 通过 key 获取（addPromptBlock 注册的）
  const brandVoice = mastra.getPromptBlock('brand-voice');
  const cargoRules = mastra.getPromptBlock('cargo-rules');
  const outputFormat = mastra.getPromptBlock('output-format');

  // 模板变量替换（手动实现，Mastra 不提供内置模板引擎）
  const interpolate = (template: string, vars: Record<string, string>) => {
    return template.replace(/\{\{(\w+)(?:\s*\|\|\s*'([^']*)')?\}\}/g, (_, key, defaultVal) => {
      return vars[key] ?? defaultVal ?? `\${${key}}`;
    });
  };

  // 拼接成完整的 instructions
  const instructions = [
    interpolate(brandVoice.content, context),
    '\n你是一个专业的货运装载率分析助手。用户会上传车厢图片，你需要直接分析图片中的装载情况。',
    '\n禁止调用任何工具，直接根据图片和以下规则进行分析。',
    cargoRules.content,
    outputFormat.content,
    '\n## 注意事项\n- 非货物区域（传送带、通道、人员等）需排除\n- 安全风险要重点提示，建议要具体可操作',
  ].join('\n');

  return instructions;
}

// ============================================================================
// 第三步：应用 —— 将拼接好的 instructions 给 Agent 使用
// ============================================================================

/**
 * 方式 1：在 Agent 定义时使用（静态）
 *
 * 在 cargo-agent.ts 中：
 *   import { mastra } from '../index';
 *   // ⚠️ 注意：addPromptBlock 必须在 Agent 定义之前调用
 *   const instructions = buildAgentInstructions({ userName: '客户' });
 *   export const cargoAgent = new Agent({ instructions, ... });
 */

/**
 * 方式 2：在 Agent 定义时使用（动态函数）
 *
 * Mastra Agent 的 instructions 支持 DynamicArgument，可以传函数：
 *   instructions: async ({ requestContext }) => {
 *     const userName = requestContext?.headers?.get('x-user-name') || '客户';
 *     return buildAgentInstructions({ userName });
 *   }
 */

/**
 * 方式 3：通过 Editor API 更新已有 Agent 的 instructions
 *
 * 适用于运行时动态修改（需要存储型 Prompt Block）：
 *   const editor = mastra.getEditor()!;
 *   await editor.agent.update({
 *     id: 'cargo-agent',
 *     instructions: '新的 instructions 内容...',
 *   });
 */

// ============================================================================
// 条件规则 (Display Conditions) 示例
// ============================================================================
async function setupConditionalBlocks() {
  const editor = mastra.getEditor()!;

  // RuleGroup 结构：{ operator: 'AND' | 'OR', conditions: (Rule | RuleGroupDepth1)[] }
  // Rule 结构：{ field, operator, value? }
  // ConditionOperator: equals | not_equals | contains | not_contains
  //                  | greater_than | less_than | in | not_in | exists | not_exists

  await editor.prompt.create({
    id: 'strict-mode',
    name: 'Strict Mode',
    description: '严格模式——strictMode=true 且 userRole 在 admin/auditor 中时启用',
    content: '必须严格按照标准流程逐项检查，不允许跳过任何步骤。',
    rules: {
      operator: 'AND',
      conditions: [
        { field: 'strictMode', operator: 'equals', value: true },
        { field: 'userRole', operator: 'in', value: ['admin', 'auditor'] },
      ],
    },
  });

  await editor.prompt.create({
    id: 'detailed-output',
    name: 'Detailed Output',
    description: '详细输出——verbosity=detailed 或 userRole=expert 时启用',
    content: '请提供非常详细的分析报告，包含所有维度的数据。',
    rules: {
      operator: 'OR',
      conditions: [
        { field: 'verbosity', operator: 'equals', value: 'detailed' },
        { field: 'userRole', operator: 'equals', value: 'expert' },
      ],
    },
  });

  console.log('✅ 条件规则 Block 创建成功');
}

// ============================================================================
// 预览 Prompt（存储型 Block 专用）
// ============================================================================
async function previewPrompt() {
  const editor = mastra.getEditor()!;

  // editor.prompt.preview() 会渲染模板变量 + 评估条件规则
  // 只适用于通过 editor.prompt.create() 创建的存储型 Block
  const result = await editor.prompt.preview(
    [
      { type: 'prompt_block_ref', id: 'brand-voice-stored' },
      { type: 'text', content: '\n\n你是一个专业的分析助手。' },
    ],
    // context 提供模板变量值，并用于评估 rules
    { userName: '张经理', strictMode: true },
  );

  console.log('🔍 预览结果:\n', result);
}

// ============================================================================
// 启动示例
// ============================================================================
async function main() {
  console.log('🚀 Prompt Blocks 使用演示\n');

  // ── 第一步：注册 ──
  console.log('--- 第一步：注册 Prompt Blocks ---');
  registerInMemoryBlocks();

  // ── 第二步：获取并拼接 ──
  console.log('\n--- 第二步：获取 Block 并拼接 instructions ---');
  const instructions = buildAgentInstructions({ userName: '张经理' });
  console.log('📦 拼接后的 instructions（前 200 字）:\n', instructions.slice(0, 200) + '...');

  // ── 第三步：应用 ──
  console.log('\n--- 第三步：如何应用到 Agent ---');
  console.log('方式 1（静态）: new Agent({ instructions: buildAgentInstructions(), ... })');
  console.log('方式 2（动态）: new Agent({ instructions: async () => buildAgentInstructions(), ... })');
  console.log('方式 3（运行时）: editor.agent.update({ id, instructions: "..." })');

  // ── 存储型和条件规则 ──
  console.log('\n--- 存储型和条件规则 ---');
  await registerStoredBlocks();
  await setupConditionalBlocks();
  await previewPrompt();

  console.log('\n✅ 演示完成！');
}

// 运行: npx tsx src/mastra/prompts/examples.ts
main().catch(console.error);
