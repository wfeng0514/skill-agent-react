import * as React from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import type { AgentConfig } from './config';
import styles from '../Agent.module.scss';

/**
 * 聊天输入区 — 输入框 + 图片上传 + 提交按钮
 */
export const ChatInput: React.FC<{
  agent: AgentConfig;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onStop: () => void;
  pendingImagePreview: string | null;
  pendingFileName?: string;
  onRemoveImage: () => void;
  onUploadClick: () => void;
  onSubmit: (value: { text: string }) => void;
}> = ({ agent, status, onStop, pendingImagePreview, pendingFileName, onRemoveImage, onUploadClick, onSubmit }) => {
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <PromptInput onSubmit={onSubmit} className={styles.promptInput}>
      {/* 图片预览 — 输入框内部上方 */}
      {pendingImagePreview && (
        <div className={styles.imageBubble}>
          <img src={pendingImagePreview} alt="待上传图片" className={styles.imageBubbleThumb} />
          <div className={styles.imageBubbleInfo}>
            <span className={styles.imageBubbleName}>{pendingFileName || '图片'}</span>
            <span className={styles.imageBubbleHint}>已准备就绪</span>
          </div>
          <button
            type="button"
            className={styles.imageBubbleClose}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemoveImage();
            }}
            title="移除图片"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      <PromptInputBody>
        <PromptInputTextarea placeholder={pendingImagePreview ? '图片已准备就绪，发送或继续输入...' : agent.placeholder} />
      </PromptInputBody>
      <PromptInputFooter>
        {agent.supportsImage && (
          <button className={styles.uploadBtn} onClick={onUploadClick} disabled={isLoading} title="上传图片">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
        )}
        <span />
        <PromptInputSubmit status={status} onStop={onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
};
