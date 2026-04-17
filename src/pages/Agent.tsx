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
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

import styles from './Agent.module.scss';

const Agent: React.FC = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat/weather-agent',
    }),
  });

  const handleSubmit = async ({ text }: { text: string }) => {
    if (!text.trim()) return;
    sendMessage({ text });
  };

  return (
    <div className={`dark ${styles.agentPage}`}>
      <div className={styles.header}>
        <h1 className={styles.title}>🤖 Weather Agent</h1>
        <p className={styles.subtitle}>基于 Mastra 的天气查询智能体 · 实时对话</p>
      </div>
      <div className={styles.chatContainer}>
        <Conversation className={styles.conversation}>
          <ConversationContent>
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                {message.parts?.map((part, i) => {
                  if (part.type === 'text') {
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
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
                          <ToolOutput output={(part as ToolUIPart).output} errorText={(part as ToolUIPart).errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }

                  return null;
                })}
              </React.Fragment>
            ))}
            <ConversationScrollButton />
          </ConversationContent>
        </Conversation>
        <PromptInput onSubmit={handleSubmit} className={styles.promptInput}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask about the weather..." />
          </PromptInputBody>
          <PromptInputFooter>
            <span />
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};

export default Agent;
