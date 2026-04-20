import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const cargoTool = createTool({
  id: 'analyze-cargo-loading',
  description: '分析车厢图片的装载率情况，识别货物填充程度、空间利用率和装载建议',
  inputSchema: z.object({
    imageBase64: z.string().describe('车厢图片的 Base64 编码（含 data:image/xxx;base64, 前缀）'),
  }),
  outputSchema: z.object({
    loadingRate: z.string().describe('装载率百分比，如 75%'),
    fillingDegree: z.string().describe('填充程度描述：如 满载/较满/适中/较空/空载'),
    spaceUtilization: z.string().describe('空间利用率详细描述'),
    cargoType: z.string().describe('识别到的货物类型'),
    suggestions: z.string().describe('装载优化建议'),
    riskAssessment: z.string().describe('安全风险评估'),
  }),
  execute: async (inputData) => {
    return await analyzeCargoLoading(inputData.imageBase64);
  },
});

const analyzeCargoLoading = async (imageBase64: string) => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('DASHSCOPE_API_KEY 环境变量未配置');
  }

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen3.5-plus',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的货运装载率分析专家。你需要根据用户提供的车厢图片，从以下维度进行精确分析：

              1. 装载率：估算车厢的装载率百分比（0%-100%）
              2. 填充程度：判断为 满载/较满/适中/较空/空载
              3. 空间利用率：描述车厢各维度（长/宽/高）的空间利用情况
              4. 货物类型：识别车厢中装载的货物类型
              5. 优化建议：提供装载优化建议，如何提高空间利用率
              6. 安全评估：评估当前装载方式的安全风险

              请务必基于图片内容客观分析，如果图片不是车厢或无法识别，请说明。`,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: '请分析这张车厢图片的装载率情况' },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen VL API 调用失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // 解析 VL 模型返回的文本，提取结构化信息
  return parseAnalysisResult(content);
};

function parseAnalysisResult(content: string) {
  // 尝试从文本中提取关键信息
  const extractField = (patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return '无法识别';
  };

  const loadingRate = extractField([/装载率[：:]\s*(\d+%)/, /装载率[：:]\s*(.*?)$/m, /(\d+)%/]);

  const fillingDegree = extractField([
    /填充程度[：:]\s*(满载|较满|适中|较空|空载)/,
    /程度[：:]\s*(满载|较满|适中|较空|空载)/,
  ]);

  const spaceUtilization = extractField([/空间利用率[：:]\s*(.*?)$/m, /空间利用[：:]\s*(.*?)$/m]);

  const cargoType = extractField([/货物类型[：:]\s*(.*?)$/m, /货物种类[：:]\s*(.*?)$/m]);

  const suggestions = extractField([/优化建议[：:]\s*([\s\S]*?)(?=安全|风险|$)/, /建议[：:]\s*(.*?)$/m]);

  const riskAssessment = extractField([
    /安全评估[：:]\s*([\s\S]*)/,
    /安全风险[：:]\s*([\s\S]*)/,
    /风险[：:]\s*(.*?)$/m,
  ]);

  return {
    loadingRate: loadingRate !== '无法识别' ? loadingRate : '需人工判断',
    fillingDegree: fillingDegree !== '无法识别' ? fillingDegree : '需人工判断',
    spaceUtilization: spaceUtilization !== '无法识别' ? spaceUtilization : content.substring(0, 200),
    cargoType: cargoType !== '无法识别' ? cargoType : '未识别',
    suggestions: suggestions !== '无法识别' ? suggestions : '请根据实际情况调整',
    riskAssessment: riskAssessment !== '无法识别' ? riskAssessment : '请人工评估',
  };
}
