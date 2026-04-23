/**
 * Prompt Block 初始化脚本
 *
 * 直接写入 Studio 使用的数据库 (src/mastra/public/mastra.db)。
 * cargo-agent 的 instructions 通过 DynamicArgument 从 DB 动态读取 Block 内容，
 *
 * 幂等脚本：已存在的 Block 会跳过。可安全重复运行。
 * 运行方式：npx tsx src/mastra/prompts/setup.ts
 */

import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { MastraEditor } from '@mastra/editor';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Studio 使用的实际数据库路径
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DB_PATH = resolve(__dirname, '../public/mastra.db');

async function main() {
  console.log('📦 数据库路径:', DB_PATH);

  const m = new Mastra({
    storage: new LibSQLStore({
      id: 'mastra-storage',
      url: `file:${DB_PATH}`,
    }),
    editor: new MastraEditor(),
  });

  const editor = m.getEditor()!;

  console.log('🚀 初始化 Prompt Blocks...\n');

  const blocks = [
    {
      id: 'brand-voice',
      name: 'Brand Voice',
      description: '品牌语气和风格指南，适用于所有面向用户的 Agent',
      content:
        '你代表 Acme 物流公司，语气专业但友好。' +
        '始终称呼用户为 {{userName || "客户"}}。' +
        '回复使用中文，简洁专业。',
    },
    {
      id: 'cargo-rules',
      name: 'Cargo Analysis Rules',
      description: '装载率分析特殊判定规则，可在 Mastra Studio 直接编辑',
      content: `你是一个专业的货运装载率分析助手。用户会上传车厢图片，你需要直接分析图片中的装载情况。
禁止调用任何工具，直接根据图片和以下规则进行分析。

## 分析维度（必须全部覆盖）
1. **装载率**：估算车厢的装载率百分比（0%-100%）
2. **填充程度**：判断为 满载/较满/适中/较空/空载
3. **空间利用率**：描述车厢各维度（长/宽/高）的空间利用情况
4. **货物类型**：识别车厢中装载的货物类型
5. **优化建议**：提供装载优化建议，如何提高空间利用率
6. **安全评估**：评估当前装载方式的安全风险

## 特殊判定规则（优先级最高）
- **关门检测**：如果图片显示车厢门关闭 → 装载率 0%，红字警告"⚠️ 图片违规，请勿关门拍照，此为空载 0%"
- **满载判定**：如果宽度 ≥92% 且 高度 ≥92% → 装载率 100%，提醒"⚠️ 深度方向可能未填满，建议检查"
- **三维加权**：装载率 = (长度利用率×0.4 + 宽度利用率×0.35 + 高度利用率×0.25) × 密度系数
- **密度系数**：纸箱规整 0.85-0.95 / 纸箱散乱 0.70-0.85 / 软包装 0.60-0.75 / 混合 0.75-0.85
- **填充标准**：0-20% 空载🔴 / 20-40% 较空🟠 / 40-60% 适中🟡 / 60-80% 较满🔵 / 80-100% 满载🟢

## 注意事项
- 使用中文回复
- 如果用户没有上传图片，提醒用户需要上传车厢图片
- 如果图片不是车厢，友好地告知用户
- 非货物区域（传送带、通道、人员等）需排除
- 安全风险要重点提示，建议要具体可操作`,
    },
    {
      id: 'cargo-output-format',
      name: 'Cargo Output Format',
      description: '装载率分析报告的输出格式模板',
      content: `## 输出格式（严格遵循）
📊 **装载率分析报告**
━━━━━━━━━━━━━━━━━
🚛 装载率：XX%
📦 填充程度：较满/适中/较空 等
📐 空间利用率：详细描述
📋 货物类型：识别结果
💡 优化建议：具体可操作的建议
⚠️ 安全评估：风险等级和说明
━━━━━━━━━━━━━━━━━`,
    },
  ];

  for (const block of blocks) {
    // 幂等检查：已发布且 activeVersionId 存在则跳过
    const existing = await editor.prompt.getById(block.id);
    if (existing?.status === 'published' && existing.activeVersionId) {
      console.log(`⏭️  ${block.id} 已存在且已发布，跳过`);
      continue;
    }

    const created = await editor.prompt.create(block);
    console.log('  创建返回:', {
      id: created.id,
      status: created.status,
      activeVersionId: created.activeVersionId,
      resolvedVersionId: created.resolvedVersionId,
      contentLen: created.content?.length,
    });

    // create() 可能不自动设置 activeVersionId，用 resolvedVersionId 作为回退
    const versionId = created.resolvedVersionId || created.activeVersionId;
    if (versionId) {
      await editor.prompt.update({
        id: created.id,
        status: 'published',
        activeVersionId: versionId,
      });
    }
    console.log(`✅ ${block.id} (published)`);
  }

  // 验证：读取并打印
  console.log('\n🔍 验证读取结果:\n');
  for (const block of blocks) {
    const result = await editor.prompt.getById(block.id);
    console.log(`  ${block.id}:`);
    console.log(`    status=${result?.status}, activeVersionId=${result?.activeVersionId}`);
    console.log(`    content=${result?.content?.slice(0, 50)}...`);
    console.log();
  }

  console.log('✅ 初始化完成！刷新 Mastra Studio (localhost:4111/prompts) 即可查看。');
}

main().catch(console.error);
