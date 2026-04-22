/**
 * DashScope (阿里云) 自定义 Provider
 *
 * 为什么需要自定义 Provider？
 * ─────────────────────────────────────────────────────────────
 * 直接用字符串 'alibaba-cn/qwen3.5-plus' 时，Mastra 内部用的是 provider-registry 的默认配置，没有任何 maxTokens 限制。
 *
 *
 * qwen3.5-plus 开启 thinking 模式后，思考链 token 很长（有时 >4000 token），
 * 加上正文输出，很容易触发 DashScope 侧默认的 output token 上限（通常 1500），
 * 导致流式响应中途被服务端截断——即"回复到一半中断"的根本原因。
 *
 * 通过 OpenAICompatibleConfig 可以：
 * 1. 显式传入 baseURL / apiKey，不依赖 provider-registry 查找
 * 2. 后续通过 @ai-sdk/openai-compatible 扩展时可传 maxTokens
 * ─────────────────────────────────────────────────────────────
 */

/**
 * 创建 DashScope OpenAI-compatible 模型配置
 *
 * @param modelId - 模型 ID，如 'qwen3.5-plus'、'qwen-vl-max'
 */
export function dashscopeModel(modelId: string) {
  return {
    id: `alibaba-cn/${modelId}` as const,
    url: process.env.DASHSCOPE_API_BASE_URL,
    apiKey: process.env.DASHSCOPE_API_KEY,
  };
}

/**
 * 常用模型预设
 *
 * - qwen35Plus     : 支持 thinking 模式，适合复杂推理、代码、对话
 * - qwenVlMax      : 多模态，支持图片理解（装载率 Agent 使用）
 */
// export const QWEN35_PLUS = dashscopeModel('qwen3.5-plus');
export const QWEN35_PLUS = `alibaba-cn/qwen3.5-plus` as const;
export const QWEN_VL = dashscopeModel('qwen3-vl-plus');
