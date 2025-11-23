"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import type { MessageBinaryFormat } from "v0-sdk";

interface V0Message {
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
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | MessageBinaryFormat;
  reasoning?: string[];
  tools?: V0Message["tools"];
  tasks?: V0Message["tasks"];
  isStreaming?: boolean;
  stream?: ReadableStream<Uint8Array>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useV0Chat(chatId: string | null | undefined) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: currentChat, error, isLoading } = useSWR(
    chatId ? `/api/chats/${chatId}` : null,
    fetcher,
    {
      onSuccess: (chat) => {
        if (chat?.messages) {
          const messages: ChatMessage[] = chat.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.experimental_content || msg.content,
            reasoning: msg.reasoning,
            tools: msg.tools,
            tasks: msg.tasks,
          }));
          setChatHistory(messages);
        }
      },
    }
  );

  const handleStreamingComplete = useCallback(
    async (finalContent: MessageBinaryFormat) => {
      setIsStreaming(false);

      if (chatId) {
        const response = await fetch(`/api/chats/${chatId}`);
        if (response.ok) {
          const chatDetails = await response.json();
          if (chatDetails?.messages) {
            const messages: ChatMessage[] = chatDetails.messages.map(
              (msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.experimental_content || msg.content,
                reasoning: msg.reasoning,
                tools: msg.tools,
                tasks: msg.tasks,
              })
            );
            setChatHistory(messages);
          }
        }
      } else {
        setChatHistory((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: finalContent,
              isStreaming: false,
              stream: undefined,
            };
          }
          return updated;
        });
      }
    },
    [chatId]
  );

  const handleChatData = useCallback((chatData: any) => {
    if (chatData?.id && !chatId) {
      console.log("Chat ID received:", chatData.id);
    }
  }, [chatId]);

  const startStreaming = useCallback(
    async (message: string) => {
      if (!chatId) return;

      setIsStreaming(true);

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      };

      setChatHistory((prev) => [...prev, userMessage]);

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            message,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to stream message");
        }

        const streamingMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: [],
          isStreaming: true,
          stream: response.body || undefined,
        };

        setChatHistory((prev) => [...prev, streamingMessage]);
      } catch (error) {
        setIsStreaming(false);
        console.error("Streaming error:", error);
      }
    },
    [chatId]
  );

  return {
    chatHistory,
    currentChat,
    isLoading,
    error,
    isStreaming,
    handleStreamingComplete,
    handleChatData,
    startStreaming,
  };
}
