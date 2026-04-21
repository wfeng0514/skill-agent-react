import * as React from 'react';
import { DefaultChatTransport, type FileUIPart } from 'ai';
import { useChat } from '@ai-sdk/react';

import type { AgentConfig } from './config';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useImageUpload } from './useImageUpload';
import { useChatHistory } from './useChatHistory';

import styles from '../Agent.module.scss';

interface ChatPanelProps {
  agent: AgentConfig;
  sessionId: string;
  onHistoryChange: () => void;
}

/**
 * 聊天面板 — useChat + 消息列表 + 输入区
 * 通过 key={sessionId} 在切换/新建时完全重新挂载，确保 initialMessages 生效
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ agent, sessionId, onHistoryChange }) => {
  const { pendingFilePart, pendingImagePreview, pendingFileName, fileInputRef, handleImageUpload, clearImage } =
    useImageUpload();

  const { initialMessages, loaded, persist } = useChatHistory(agent.id, sessionId);

  // 等 IndexedDB 加载完再初始化 useChat，避免用空 initialMessages
  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: `${agent.id}-${sessionId}`,
    initialMessages: loaded ? initialMessages : [],
    transport: new DefaultChatTransport({ api: agent.apiPath }),
  });

  // 强制同步 initialMessages → useChat 内部状态
  React.useEffect(() => {
    if (loaded && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [loaded, initialMessages, messages.length, setMessages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // 每次 messages 变化时持久化 + 通知父组件刷新历史列表
  const prevCountRef = React.useRef(0);
  React.useEffect(() => {
    if (messages.length > 0) {
      persist(messages);
      if (messages.length !== prevCountRef.current) {
        prevCountRef.current = messages.length;
        onHistoryChange();
      }
    }
  }, [messages, persist, onHistoryChange]);

  // 提交消息
  const handleSubmit = ({ text }: { text: string }) => {
    const trimmed = text.trim();

    if (pendingFilePart) {
      sendMessage({
        text: trimmed || '请分析这张车厢图片的装载率',
        files: [pendingFilePart as FileUIPart],
      });
      clearImage();
      return;
    }

    if (!trimmed) return;
    sendMessage({ text: trimmed });
  };

  return (
    <div className={styles.chatContainer}>
      {/* 等待 IndexedDB 加载完成 */}
      {!loaded && (
        <div className={styles.historyLoading}>
          <div className={styles.historyLoadingSpinner} />
          <span>加载对话记录...</span>
        </div>
      )}

      <ChatMessages messages={loaded ? messages : []} isLoading={isLoading && loaded} />

      {/* 隐藏的文件选择 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className={styles.fileInput}
      />

      <ChatInput
        agent={agent}
        status={status}
        onStop={stop}
        pendingImagePreview={pendingImagePreview}
        pendingFileName={pendingFileName}
        onRemoveImage={clearImage}
        onUploadClick={() => fileInputRef.current?.click()}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
