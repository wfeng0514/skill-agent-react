import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const cargoTool = createTool({
  id: "analyze-cargo-loading",
  description: "\u5206\u6790\u8F66\u53A2\u56FE\u7247\u7684\u88C5\u8F7D\u7387\u60C5\u51B5\uFF0C\u8BC6\u522B\u8D27\u7269\u586B\u5145\u7A0B\u5EA6\u3001\u7A7A\u95F4\u5229\u7528\u7387\u548C\u88C5\u8F7D\u5EFA\u8BAE",
  inputSchema: z.object({
    imageBase64: z.string().describe("\u8F66\u53A2\u56FE\u7247\u7684 Base64 \u7F16\u7801\uFF08\u542B data:image/xxx;base64, \u524D\u7F00\uFF09")
  }),
  outputSchema: z.object({
    loadingRate: z.string().describe("\u88C5\u8F7D\u7387\u767E\u5206\u6BD4\uFF0C\u5982 75%"),
    fillingDegree: z.string().describe("\u586B\u5145\u7A0B\u5EA6\u63CF\u8FF0\uFF1A\u5982 \u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D"),
    spaceUtilization: z.string().describe("\u7A7A\u95F4\u5229\u7528\u7387\u8BE6\u7EC6\u63CF\u8FF0"),
    cargoType: z.string().describe("\u8BC6\u522B\u5230\u7684\u8D27\u7269\u7C7B\u578B"),
    suggestions: z.string().describe("\u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE"),
    riskAssessment: z.string().describe("\u5B89\u5168\u98CE\u9669\u8BC4\u4F30")
  }),
  execute: async (inputData) => {
    return await analyzeCargoLoading(inputData.imageBase64);
  }
});
const analyzeCargoLoading = async (imageBase64) => {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY \u73AF\u5883\u53D8\u91CF\u672A\u914D\u7F6E");
  }
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen3.5-plus",
      messages: [
        {
          role: "system",
          content: `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8D27\u8FD0\u88C5\u8F7D\u7387\u5206\u6790\u4E13\u5BB6\u3002\u4F60\u9700\u8981\u6839\u636E\u7528\u6237\u63D0\u4F9B\u7684\u8F66\u53A2\u56FE\u7247\uFF0C\u4ECE\u4EE5\u4E0B\u7EF4\u5EA6\u8FDB\u884C\u7CBE\u786E\u5206\u6790\uFF1A

              1. \u88C5\u8F7D\u7387\uFF1A\u4F30\u7B97\u8F66\u53A2\u7684\u88C5\u8F7D\u7387\u767E\u5206\u6BD4\uFF080%-100%\uFF09
              2. \u586B\u5145\u7A0B\u5EA6\uFF1A\u5224\u65AD\u4E3A \u6EE1\u8F7D/\u8F83\u6EE1/\u9002\u4E2D/\u8F83\u7A7A/\u7A7A\u8F7D
              3. \u7A7A\u95F4\u5229\u7528\u7387\uFF1A\u63CF\u8FF0\u8F66\u53A2\u5404\u7EF4\u5EA6\uFF08\u957F/\u5BBD/\u9AD8\uFF09\u7684\u7A7A\u95F4\u5229\u7528\u60C5\u51B5
              4. \u8D27\u7269\u7C7B\u578B\uFF1A\u8BC6\u522B\u8F66\u53A2\u4E2D\u88C5\u8F7D\u7684\u8D27\u7269\u7C7B\u578B
              5. \u4F18\u5316\u5EFA\u8BAE\uFF1A\u63D0\u4F9B\u88C5\u8F7D\u4F18\u5316\u5EFA\u8BAE\uFF0C\u5982\u4F55\u63D0\u9AD8\u7A7A\u95F4\u5229\u7528\u7387
              6. \u5B89\u5168\u8BC4\u4F30\uFF1A\u8BC4\u4F30\u5F53\u524D\u88C5\u8F7D\u65B9\u5F0F\u7684\u5B89\u5168\u98CE\u9669

              \u8BF7\u52A1\u5FC5\u57FA\u4E8E\u56FE\u7247\u5185\u5BB9\u5BA2\u89C2\u5206\u6790\uFF0C\u5982\u679C\u56FE\u7247\u4E0D\u662F\u8F66\u53A2\u6216\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u8BF4\u660E\u3002`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "\u8BF7\u5206\u6790\u8FD9\u5F20\u8F66\u53A2\u56FE\u7247\u7684\u88C5\u8F7D\u7387\u60C5\u51B5" },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 2e3
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Qwen VL API \u8C03\u7528\u5931\u8D25: ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseAnalysisResult(content);
};
function parseAnalysisResult(content) {
  const extractField = (patterns) => {
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return "\u65E0\u6CD5\u8BC6\u522B";
  };
  const loadingRate = extractField([/装载率[：:]\s*(\d+%)/, /装载率[：:]\s*(.*?)$/m, /(\d+)%/]);
  const fillingDegree = extractField([
    /填充程度[：:]\s*(满载|较满|适中|较空|空载)/,
    /程度[：:]\s*(满载|较满|适中|较空|空载)/
  ]);
  const spaceUtilization = extractField([/空间利用率[：:]\s*(.*?)$/m, /空间利用[：:]\s*(.*?)$/m]);
  const cargoType = extractField([/货物类型[：:]\s*(.*?)$/m, /货物种类[：:]\s*(.*?)$/m]);
  const suggestions = extractField([/优化建议[：:]\s*([\s\S]*?)(?=安全|风险|$)/, /建议[：:]\s*(.*?)$/m]);
  const riskAssessment = extractField([
    /安全评估[：:]\s*([\s\S]*)/,
    /安全风险[：:]\s*([\s\S]*)/,
    /风险[：:]\s*(.*?)$/m
  ]);
  return {
    loadingRate: loadingRate !== "\u65E0\u6CD5\u8BC6\u522B" ? loadingRate : "\u9700\u4EBA\u5DE5\u5224\u65AD",
    fillingDegree: fillingDegree !== "\u65E0\u6CD5\u8BC6\u522B" ? fillingDegree : "\u9700\u4EBA\u5DE5\u5224\u65AD",
    spaceUtilization: spaceUtilization !== "\u65E0\u6CD5\u8BC6\u522B" ? spaceUtilization : content.substring(0, 200),
    cargoType: cargoType !== "\u65E0\u6CD5\u8BC6\u522B" ? cargoType : "\u672A\u8BC6\u522B",
    suggestions: suggestions !== "\u65E0\u6CD5\u8BC6\u522B" ? suggestions : "\u8BF7\u6839\u636E\u5B9E\u9645\u60C5\u51B5\u8C03\u6574",
    riskAssessment: riskAssessment !== "\u65E0\u6CD5\u8BC6\u522B" ? riskAssessment : "\u8BF7\u4EBA\u5DE5\u8BC4\u4F30"
  };
}

export { cargoTool };
