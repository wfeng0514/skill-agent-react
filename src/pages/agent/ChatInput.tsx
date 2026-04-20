import * as React from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import type { AgentConfig } from './config';
import { ImagePreviewCard } from './ImagePreview';
import styles from '../Agent.module.scss';

/**
 * 聊天输入区 — 输入框 + 图片上传 + 提交按钮
 */
export const ChatInput: React.FC<{
  agent: AgentConfig;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  onStop: () => void;
  pendingImagePreview: string | null;
  onRemoveImage: () => void;
  onUploadClick: () => void;
  onSubmit: (value: { text: string }) => void;
}> = ({ agent, status, onStop, pendingImagePreview, onRemoveImage, onUploadClick, onSubmit }) => {
  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <PromptInput onSubmit={onSubmit} className={styles.promptInput}>
      <PromptInputBody>
        {pendingImagePreview && <ImagePreviewCard previewUrl={pendingImagePreview} onRemove={onRemoveImage} />}
        <PromptInputTextarea placeholder={agent.placeholder} />
      </PromptInputBody>
      <PromptInputFooter>
        {agent.supportsImage && (
          <button className={styles.uploadBtn} onClick={onUploadClick} disabled={isLoading} title="上传车厢图片">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
        )}
        <span />
        <PromptInputSubmit status={status} onStop={onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
};
