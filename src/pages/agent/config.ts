/**
 * Agent 配置定义
 */

export interface AgentConfig {
  id: string;
  label: string;
  icon: string;
  apiPath: string;
  placeholder: string;
  supportsImage: boolean;
}

export const AGENTS: AgentConfig[] = [
  {
    id: 'weather-agent',
    label: '天气查询',
    icon: '🌤️',
    apiPath: 'http://localhost:4111/chat/weather-agent',
    placeholder: 'Ask about the weather...',
    supportsImage: false,
  },
  {
    id: 'cargo-agent',
    label: '装载率识别',
    icon: '🚛',
    apiPath: 'http://localhost:4111/chat/cargo-agent',
    placeholder: '上传车厢图片，分析装载率...',
    supportsImage: true,
  },
];
