import * as React from 'react';
import { DefaultChatTransport, type ToolUIPart } from 'ai';
import { useChat } from '@ai-sdk/react';

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

import styles from './Agent.module.scss';

// ── Agent 配置 ──

interface AgentConfig {
  id: string;
  label: string;
  icon: string;
  apiPath: string;
  placeholder: string;
  supportsImage: boolean;
}

const AGENTS: AgentConfig[] = [
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

// ── 自定义思考指示器 ──

const ThinkingIndicator: React.FC = () => (
  <div className={styles.thinkingIndicator}>
    <div className={styles.thinkingDots}>
      <span className={styles.dot} />
      <span className={`${styles.dot} ${styles.dot2}`} />
      <span className={`${styles.dot} ${styles.dot3}`} />
    </div>
    <span className={styles.thinkingText}>正在思考中...</span>
  </div>
);

// ── 主组件 ──

const Agent: React.FC = () => {
  const [activeAgentId, setActiveAgentId] = React.useState('weather-agent');
  const activeAgent = AGENTS.find((a) => a.id === activeAgentId) || AGENTS[0];

  // 图片上传状态
  const [pendingImage, setPendingImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: activeAgent.apiPath,
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // 切换 Agent 时重置对话
  const handleAgentSwitch = (agentId: string) => {
    if (agentId === activeAgentId) return;
    setActiveAgentId(agentId);
    setMessages([]);
    setPendingImage(null);
  };

  // 图片上传处理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPendingImage(base64);
    };
    reader.readAsDataURL(file);

    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  };

  // 提交消息
  const handleSubmit = async ({ text }: { text: string }) => {
    const trimmed = text.trim();

    // 如果有待发送的图片，拼接到消息中
    if (pendingImage) {
      const messageText = trimmed || '请分析这张车厢图片的装载率';
      sendMessage({
        text: `[图片数据]${pendingImage}\n\n${messageText}`,
      });
      setPendingImage(null);
      return;
    }

    if (!trimmed) return;
    sendMessage({ text: trimmed });
  };

  return (
    <div className={`${styles.agentPage}`}>
      {/* ── 侧边栏 ── */}
      <aside className={styles.sidebar}>
        <nav className={styles.agentList}>
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              className={`${styles.agentItem} ${agent.id === activeAgentId ? styles.agentItemActive : ''}`}
              onClick={() => handleAgentSwitch(agent.id)}
            >
              <span className={styles.agentIcon}>{agent.icon}</span>
              <span className={styles.agentItemLabel}>{agent.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── 主内容区 ── */}
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {activeAgent.icon} {activeAgent.label}
          </h1>
          <p className={styles.subtitle}>
            {activeAgent.id === 'weather-agent'
              ? '基于 Mastra 的天气查询智能体 · 实时对话'
              : '基于 Qwen-VL 的车厢装载率识别 · 上传图片即可分析'}
          </p>
        </div>
        <div className={styles.chatContainer}>
          <Conversation className={styles.conversation}>
            <ConversationContent>
              {messages.map((message) => (
                <React.Fragment key={message.id}>
                  {message.parts?.map((part, i) => {
                    if (part.type === 'text') {
                      const text = (part as { type: 'text'; text: string }).text;
                      // 过滤掉图片 base64 数据的显示，只保留文字部分
                      const displayText = text.replace(/\[图片数据\]data:image\/[^;]+;base64,[^\n]+/g, '[已上传图片]');
                      if (!displayText.trim()) return null;
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{displayText}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    }

                    if (part.type?.startsWith('tool-')) {
                      return (
                        <Tool key={`${message.id}-${i}`}>
                          <ToolHeader
                            type={(part as ToolUIPart).type}
                            state={(part as ToolUIPart).state || 'output-available'}
                            className="cursor-pointer"
                          />
                          <ToolContent>
                            <ToolInput input={(part as ToolUIPart).input || {}} />
                            <ToolOutput
                              output={(part as ToolUIPart).output}
                              errorText={(part as ToolUIPart).errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }

                    return null;
                  })}
                </React.Fragment>
              ))}

              {isLoading && (
                <Message from="assistant">
                  <ThinkingIndicator />
                </Message>
              )}

              <ConversationScrollButton />
            </ConversationContent>
          </Conversation>

          <PromptInput onSubmit={handleSubmit} className={styles.promptInput}>
            <PromptInputBody>
              {/* 图片上传预览 */}
              {pendingImage && (
                <div className={styles.imagePreview}>
                  <img src={pendingImage} alt="待上传图片" className={styles.imagePreviewImg} />
                  <button className={styles.imagePreviewRemove} onClick={() => setPendingImage(null)}>
                    ✕
                  </button>
                </div>
              )}
              <PromptInputTextarea placeholder={activeAgent.placeholder} />
            </PromptInputBody>
            <PromptInputFooter>
              {/* 图片上传按钮（仅装载率 Agent 显示） */}
              {activeAgent.supportsImage && (
                <button
                  className={styles.uploadButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="上传车厢图片"
                >
                  📷
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                  />
                </button>
              )}
              <span />
              <PromptInputSubmit status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default Agent;
