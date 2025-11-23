"use client";

import { Badge } from "@/components/ui/badge";
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
import {
  Message as AIMessage,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { StreamingMessage, Message } from "@v0-sdk/react";
import type { MessageBinaryFormat } from "@/lib/v0-types";

interface V0Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessageBinaryFormat;
  reasoning?: string[];
  tools?: Array<{
    name: string;
    input: any;
    output?: any;
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

function extractTextFromMessageBinaryFormat(
  content: MessageBinaryFormat
): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  const texts: string[] = [];
  const traverse = (arr: any[]) => {
    for (const item of arr) {
      if (Array.isArray(item)) {
        if (item.length >= 3 && item[0] === "text" && typeof item[2] === "string") {
          texts.push(item[2]);
        } else {
          traverse(item);
        }
      }
    }
  };

  traverse(content);
  return texts.join(" ") || JSON.stringify(content);
}

interface V0ReasoningPanelProps {
  chatId?: string;
  messages: V0Message[];
  stage: string;
  onStreamingComplete?: (content: MessageBinaryFormat) => void;
  onChatData?: (data: any) => void;
}

export function V0ReasoningPanel({
  chatId,
  messages,
  stage,
  onStreamingComplete,
  onChatData,
}: V0ReasoningPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            V0 REASONING PROCESS
          </span>
          {chatId && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[9px] font-mono"
            >
              {chatId.slice(0, 8)}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {!chatId ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader size={20} />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Waiting for chat ID...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The chat will be created during trigger execution
                </p>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader size={20} />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Loading chat history...
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Chat ID: {chatId.slice(0, 8)}...
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={msg.id || `msg-${index}`} className="space-y-3">
                {/* User messages */}
                {msg.role === "user" && (
                  <AIMessage from="user">
                    <MessageContent>
                      <MessageResponse>
                        {typeof msg.content === "string"
                          ? msg.content
                          : extractTextFromMessageBinaryFormat(msg.content)}
                      </MessageResponse>
                    </MessageContent>
                  </AIMessage>
                )}

                {/* Assistant reasoning and responses */}
                {msg.role === "assistant" && (
                  <>
                    {/* Streaming message */}
                    {msg.isStreaming && msg.stream ? (
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
                    ) : (
                  <>
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
                      </>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Loading indicator if still processing */}
            {(stage === "generating" || stage === "retrying") && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader size={14} />
                <span className="text-sm font-mono">
                  {stage === "retrying"
                    ? "v0 fixing errors..."
                    : "v0 writing code..."}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
