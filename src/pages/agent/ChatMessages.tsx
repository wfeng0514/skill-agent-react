import * as React from 'react';
import { type ToolUIPart, type FileUIPart } from 'ai';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import type { UIMessage } from '@ai-sdk/react';
import { ThinkingIndicator } from './ThinkingIndicator';
import { MessageImage } from './ImagePreview';
import styles from '../Agent.module.scss';

/**
 * 聊天消息列表 — 消息渲染 + 思考指示器
 */
export const ChatMessages: React.FC<{
  messages: UIMessage[];
  isLoading: boolean;
}> = ({ messages, isLoading }) => (
  <Conversation className={styles.conversation}>
    <ConversationContent>
      {messages.map((message) => (
        <React.Fragment key={message.id}>
          {message.parts?.map((part, i) => {
            // ── 文字消息 ──
            if (part.type === 'text') {
              const text = (part as { type: 'text'; text: string }).text;
              if (!text.trim()) return null;
              return (
                <Message key={`${message.id}-${i}`} from={message.role}>
                  <MessageContent>
                    <MessageResponse children={text} />
                  </MessageContent>
                </Message>
              );
            }

            // ── 图片文件消息 ──
            if (part.type === 'file') {
              const filePart = part as FileUIPart;
              if (filePart.mediaType?.startsWith('image/')) {
                return (
                  <Message key={`${message.id}-${i}`} from={message.role}>
                    <MessageContent>
                      <MessageImage src={filePart.url} />
                    </MessageContent>
                  </Message>
                );
              }
              const fileLabel = `📎 ${filePart.filename || '附件'}`;
              return (
                <Message key={`${message.id}-${i}`} from={message.role}>
                  <MessageContent>
                    <MessageResponse children={fileLabel} />
                  </MessageContent>
                </Message>
              );
            }

            // ── 工具调用消息 ──
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
);
