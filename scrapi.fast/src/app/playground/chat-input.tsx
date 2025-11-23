"use client";

import { useState, useCallback } from "react";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
  chatId: string | null;
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  onChatCreated?: (
    chatId: string,
    userMessage: string,
    stream: ReadableStream<Uint8Array>
  ) => void;
}

export function ChatInput({
  chatId,
  onSendMessage,
  disabled,
  onChatCreated,
}: ChatInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async ({
      text,
      files,
    }: {
      text: string;
      files?: Array<{ url: string }>;
    }) => {
      if (!text.trim() || disabled || isSubmitting) return;

      setIsSubmitting(true);

      try {
        if (!chatId) {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: text.trim(),
              streaming: true,
              attachments: files?.map((f) => ({ url: f.url })),
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to create chat");
          }

          const stream = response.body;
          if (!stream) {
            throw new Error("No stream received");
          }

          if (onChatCreated) {
            const [stream1, stream2] = stream.tee();
            const reader = stream1.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            const readChatId = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  for (const line of lines) {
                    if (line.startsWith("data: ")) {
                      try {
                        const data = JSON.parse(line.slice(6));
                        if (data.id) {
                          reader.releaseLock();
                          onChatCreated(data.id, text.trim(), stream2);
                          return;
                        }
                      } catch {
                        // Not JSON, continue
                      }
                    }
                  }
                }
              } catch (error) {
                reader.releaseLock();
                console.error("Error reading chat ID:", error);
              }
            };

            readChatId();
          }
        } else {
          onSendMessage(text.trim());
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [chatId, disabled, isSubmitting, onSendMessage, onChatCreated]
  );

  return (
    <PromptInput onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <PromptInputTextarea
        placeholder={
          chatId
            ? "Continue the conversation..."
            : "Start a new conversation..."
        }
        disabled={disabled || isSubmitting}
      />
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputSubmit
            disabled={disabled || isSubmitting}
            status={isSubmitting ? "streaming" : "ready"}
          />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  );
}
