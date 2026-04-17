import * as React from 'react';
import { DefaultChatTransport, type ToolUIPart } from 'ai';
import { useChat } from '@ai-sdk/react';

import { PromptInput, PromptInputBody, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

export default function App() {
  const [input, setInput] = React.useState<string>('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: 'http://localhost:4111/chat/weather-agent',
    }),
  });

  const handleSubmit = async () => {
    if (!input.trim()) return;

    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
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
              </div>
            ))}
            <ConversationScrollButton />
          </ConversationContent>
        </Conversation>
        <PromptInput onSubmit={handleSubmit} className="mt-20">
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              className="md:leading-10"
              value={input}
              placeholder="Ask about the weather..."
              disabled={status !== 'ready'}
            />
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
