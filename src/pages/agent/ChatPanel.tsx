import * as React from 'react';
import { DefaultChatTransport, type FileUIPart } from 'ai';
import { useChat } from '@ai-sdk/react';

import type { AgentConfig } from './config';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useImageUpload } from './useImageUpload';

import styles from '../Agent.module.scss';

interface ChatPanelProps {
  agent: AgentConfig;
}

/**
 * 聊天面板 — useChat + 消息列表 + 输入区
 * 通过 key={agentId} 在切换时完全重新挂载，确保 transport 正确
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({ agent }) => {
  const { pendingFilePart, pendingImagePreview, fileInputRef, handleImageUpload, clearImage } =
    useImageUpload();

  const { messages, sendMessage, status, stop } = useChat({
    id: agent.id,
    transport: new DefaultChatTransport({
      api: agent.apiPath,
    }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // 提交消息
  const handleSubmit = async ({ text }: { text: string }) => {
    const trimmed = text.trim();

    // 如果有待发送的图片，使用 files 参数发送多模态消息
    if (pendingFilePart) {
      const messageText = trimmed || '请分析这张车厢图片的装载率';
      sendMessage({
        text: messageText,
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
      <ChatMessages messages={messages} isLoading={isLoading} />

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
        onRemoveImage={clearImage}
        onUploadClick={() => fileInputRef.current?.click()}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
