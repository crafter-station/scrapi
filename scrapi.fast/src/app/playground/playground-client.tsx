"use client";

import { useState, useCallback } from "react";
import { useV0Chat } from "@/hooks/use-v0-chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader } from "@/components/ai-elements/loader";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import type { MessageBinaryFormat } from "v0-sdk";

export function PlaygroundClient() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [inputChatId, setInputChatId] = useState("");
  const [newChatStream, setNewChatStream] = useState<{
    userMessage: string;
    stream: ReadableStream<Uint8Array>;
  } | null>(null);

  const {
    chatHistory,
    currentChat,
    isLoading,
    error,
    isStreaming,
    handleStreamingComplete,
    handleChatData,
    startStreaming,
  } = useV0Chat(chatId);

  const handleChatCreated = useCallback(
    (newChatId: string, userMessage: string, stream: ReadableStream<Uint8Array>) => {
      setChatId(newChatId);
      setInputChatId(newChatId);
      setNewChatStream({ userMessage, stream });
    },
    []
  );

  const handleNewChatStreamComplete = useCallback(
    (content: MessageBinaryFormat) => {
      setNewChatStream(null);
      if (chatId) {
        handleStreamingComplete(content);
      }
    },
    [chatId, handleStreamingComplete]
  );

  const handleNewChat = () => {
    setChatId(null);
    setInputChatId("");
    setNewChatStream(null);
  };

  const handleLoadChat = () => {
    if (inputChatId.trim()) {
      setChatId(inputChatId.trim());
    }
  };

  const handleDeleteChat = () => {
    setChatId(null);
    setInputChatId("");
    setNewChatStream(null);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">V0 Chat Playground</h1>
          </div>
          <div className="flex items-center gap-2">
            {chatId && (
              <Badge variant="outline" className="font-mono text-xs">
                {chatId.slice(0, 8)}...
              </Badge>
            )}
            {chatId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteChat}
                className="h-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewChat}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      </header>

      {/* Chat ID Input */}
      {!chatId && (
        <div className="border-b bg-muted/30 px-6 py-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Load Existing Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter chat ID to continue conversation..."
                  value={inputChatId}
                  onChange={(e) => setInputChatId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLoadChat();
                    }
                  }}
                  className="font-mono text-sm"
                />
                <Button onClick={handleLoadChat} disabled={!inputChatId.trim()}>
                  Load Chat
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Start a new conversation by typing a message below, or load an
                existing chat by entering its ID.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading && !chatHistory.length ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader size={20} />
              <p className="text-sm text-muted-foreground">
                Loading chat history...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-destructive">
                Error loading chat: {error.message || "Unknown error"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="mt-4"
              >
                Start New Chat
              </Button>
            </div>
          </div>
        ) : (
          <ChatMessages
            chatHistory={
              newChatStream
                ? [
                    {
                      id: `user-${Date.now()}`,
                      role: "user",
                      content: newChatStream.userMessage,
                    },
                    {
                      id: `assistant-${Date.now()}`,
                      role: "assistant",
                      content: [],
                      isStreaming: true,
                      stream: newChatStream.stream,
                    },
                  ]
                : chatHistory
            }
            isLoading={isLoading}
            isStreaming={isStreaming || !!newChatStream}
            currentChat={currentChat}
            onStreamingComplete={
              newChatStream ? handleNewChatStreamComplete : handleStreamingComplete
            }
            onChatData={handleChatData}
          />
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <ChatInput
          chatId={chatId}
          onSendMessage={startStreaming}
          disabled={isStreaming || !!newChatStream}
          onChatCreated={handleChatCreated}
        />
      </div>
    </div>
  );
}
