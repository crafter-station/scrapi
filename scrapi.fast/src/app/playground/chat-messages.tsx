"use client";

import { useEffect, useRef } from "react";
import {
  Message as AIMessage,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { StreamingMessage, Message } from "@v0-sdk/react";
import type { MessageBinaryFormat } from "v0-sdk";
import { Loader } from "@/components/ai-elements/loader";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtContent,
} from "@/components/ai-elements/chain-of-thought";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | MessageBinaryFormat;
  reasoning?: string[];
  tools?: Array<{
    name: string;
    input: unknown;
    output?: unknown;
    state?:
      | "input-streaming"
      | "input-available"
      | "output-available"
      | "output-error";
  }>;
  tasks?: Array<{
    description: string;
    status: "pending" | "in_progress" | "completed";
  }>;
  isStreaming?: boolean;
  stream?: ReadableStream<Uint8Array>;
}

interface ChatMessagesProps {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  currentChat?: any;
  onStreamingComplete?: (content: MessageBinaryFormat) => void;
  onChatData?: (data: any) => void;
}

export function ChatMessages({
  chatHistory,
  isLoading,
  isStreaming,
  currentChat,
  onStreamingComplete,
  onChatData,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isStreaming]);

  if (chatHistory.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            No messages yet. Start a conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div ref={scrollRef} className="flex flex-col gap-6 p-6">
        {chatHistory.map((msg, index) => (
          <div key={msg.id || `msg-${index}`} className="space-y-3">
            {/* User messages */}
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                  <AIMessage from="user">
                    <MessageContent>
                      <MessageResponse>
                        {typeof msg.content === "string"
                          ? msg.content
                          : JSON.stringify(msg.content)}
                      </MessageResponse>
                    </MessageContent>
                  </AIMessage>
                </div>
              </div>
            )}

            {/* Assistant messages */}
            {msg.role === "assistant" && (
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-3">
                  {/* Streaming message */}
                  {msg.isStreaming && msg.stream ? (
                    <div className="rounded-lg border bg-card p-4">
                      <StreamingMessage
                        stream={msg.stream}
                        messageId={msg.id || `stream-${index}`}
                        role="assistant"
                        onComplete={onStreamingComplete}
                        onChatData={onChatData}
                        onError={(error) =>
                          console.error("Streaming error:", error)
                        }
                        showLoadingIndicator={false}
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                      {/* Reasoning section */}
                      {msg.reasoning && msg.reasoning.length > 0 && (
                        <Reasoning defaultOpen={false}>
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {msg.reasoning.join("\n\n")}
                          </ReasoningContent>
                        </Reasoning>
                      )}

                      {/* Chain of thought steps */}
                      {msg.tasks && msg.tasks.length > 0 && (
                        <ChainOfThought defaultOpen={true}>
                          <ChainOfThoughtHeader>
                            Execution Steps
                          </ChainOfThoughtHeader>
                          <ChainOfThoughtContent>
                            {msg.tasks.map((task, i) => (
                              <ChainOfThoughtStep
                                key={i}
                                label={task.description}
                                status={
                                  task.status === "completed"
                                    ? "complete"
                                    : task.status === "in_progress"
                                      ? "active"
                                      : "pending"
                                }
                              />
                            ))}
                          </ChainOfThoughtContent>
                        </ChainOfThought>
                      )}

                      {/* Tools used */}
                      {msg.tools &&
                        msg.tools.map((tool, i) => (
                          <Tool key={i} defaultOpen={false}>
                            <ToolHeader
                              title={tool.name}
                              type={`tool-${tool.name}`}
                              state={tool.state || "output-available"}
                            />
                            <ToolContent>
                              <ToolInput input={tool.input} />
                              {tool.output && (
                                <ToolOutput
                                  output={tool.output}
                                  errorText={undefined}
                                />
                              )}
                            </ToolContent>
                          </Tool>
                        ))}

                      {/* Message content */}
                      {typeof msg.content === "string" ? (
                        <AIMessage from="assistant">
                          <MessageContent>
                            <MessageResponse>{msg.content}</MessageResponse>
                          </MessageContent>
                        </AIMessage>
                      ) : (
                        <Message
                          content={msg.content}
                          messageId={msg.id || `msg-${index}`}
                          role="assistant"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader size={14} />
            <span className="text-sm">Streaming response...</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
