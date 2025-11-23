"use client";

import { Circle, Globe, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BrowserbasePanel } from "./browserbase-panel";
import { CodeTestPanel } from "./code-test-panel";
import { V0ReasoningPanel } from "./v0-reasoning-panel";
import { useV0Chat } from "@/hooks/use-v0-chat";
import useSWR from "swr";

const PLACEHOLDER_URLS = [
  "https://example.com/products",
  "https://luma.com/event-id",
  "https://example.com/blog",
];

const PLACEHOLDER_QUERIES = [
  "Extract all product names and prices",
  "Get event hosts names and photos",
  "Scrape article titles and publication dates",
];

type WorkflowStage =
  | "idle"
  | "scraping"
  | "generating"
  | "testing"
  | "retrying"
  | "completed"
  | "failed";

interface WorkflowMetadata {
  stage: WorkflowStage;

  browserbase?: {
    sessionId: string;
    sessionUrl: string;
    logs: Array<{
      timestamp: string;
      type: "console" | "network" | "error";
      message: string;
      data?: unknown;
    }>;
  };

  v0?: {
    chatId: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
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
    }>;
  };

  tests?: {
    currentAttempt: number;
    maxAttempts: number;
    results: Array<{
      attempt: number;
      passed: boolean;
      output: string;
      timestamp: string;
      error?: string;
    }>;
  };

  code?: {
    getData: string;
    schema: string;
    test: string;
  };

  error?: string;
}

export function QueryInterface() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskResult, setTaskResult] = useState<{
    serviceId: string;
    taskId: string;
  } | null>(null);

  const [mockMetadata, setMockMetadata] = useState<WorkflowMetadata>({
    stage: "idle",
  });

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const { data: service } = useSWR(
    taskResult?.serviceId ? `/api/get-service?id=${taskResult.serviceId}` : null,
    fetcher
  );

  const { chatHistory, handleStreamingComplete, handleChatData } = useV0Chat(
    service?.agent_chat_id
  );

  useEffect(() => {
    if (service?.agent_chat_id) {
      setMockMetadata((prev) => ({
        ...prev,
        v0: {
          chatId: service.agent_chat_id,
          messages: chatHistory.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
            reasoning: msg.reasoning,
            tools: msg.tools,
            tasks: msg.tasks,
          })),
        },
      }));
    }
  }, [service?.agent_chat_id, chatHistory]);

  const metadata = mockMetadata;
  const stage = metadata?.stage || "idle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !query.trim()) return;

    setIsSubmitting(true);
    setMockMetadata({ stage: "scraping" });

    try {
      const response = await fetch("/api/create-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          prompt: query.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create service");
      }

      const result = await response.json();
      setTaskResult(result);
      setMockMetadata({ stage: "generating" });
      console.log("Service created:", result);
    } catch (error) {
      setMockMetadata({
        stage: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="border-b bg-background px-4 py-3 space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border rounded-md px-3 py-2">
            <Globe className="size-4 text-muted-foreground" />
            <Input
              placeholder={PLACEHOLDER_URLS[0]}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={stage !== "idle" || isSubmitting}
              className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
            />
          </div>
          <div className="flex-1 flex items-center gap-2 border rounded-md px-3 py-2">
            <Sparkles className="size-4 text-muted-foreground" />
            <Input
              placeholder={PLACEHOLDER_QUERIES[0]}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={stage !== "idle" || isSubmitting}
              className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
            />
          </div>
          <Button
            type="submit"
            disabled={
              !url.trim() || !query.trim() || stage !== "idle" || isSubmitting
            }
            className="shrink-0"
          >
            {stage === "idle" && !isSubmitting ? (
              <>
                <Zap className="size-4 mr-2" />
                Generate
              </>
            ) : (
              <>
                <div className="size-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </>
            )}
          </Button>
        </form>

        {/* Live Status */}
        {stage !== "idle" && (
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge stage={stage} />
            <span className="text-muted-foreground">
              {stage === "scraping" && "Analyzing webpage..."}
              {stage === "generating" &&
                `Generating extraction code... ${taskResult ? `(Task: ${taskResult.taskId})` : ""}`}
              {stage === "testing" &&
                `Testing code (Attempt ${metadata?.tests?.currentAttempt}/${metadata?.tests?.maxAttempts})...`}
              {stage === "retrying" && "Fixing errors..."}
              {stage === "completed" && "API Ready!"}
              {stage === "failed" && "Failed"}
            </span>
          </div>
        )}
      </div>

      {/* 3 Panels */}
      {stage !== "idle" && (
        <div className="flex-1 grid grid-cols-3 gap-px bg-border overflow-hidden">
          <BrowserbasePanel
            sessionId={metadata?.browserbase?.sessionId}
            sessionUrl={metadata?.browserbase?.sessionUrl}
            logs={metadata?.browserbase?.logs || []}
          />

          <V0ReasoningPanel
            chatId={metadata?.v0?.chatId}
            messages={metadata?.v0?.messages || []}
            stage={stage}
            onStreamingComplete={handleStreamingComplete}
            onChatData={handleChatData}
          />

          <CodeTestPanel
            code={metadata?.code}
            testResults={metadata?.tests?.results || []}
            currentAttempt={metadata?.tests?.currentAttempt}
            maxAttempts={metadata?.tests?.maxAttempts}
          />
        </div>
      )}

      {/* Idle State */}
      {stage === "idle" && (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-2xl text-center space-y-6">
            <div className="inline-flex rounded-full bg-primary/10 p-4">
              <Sparkles className="size-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">
                Turn any website into an API
              </h2>
              <p className="text-muted-foreground">
                Enter a URL and describe what data you need - we'll generate a
                working API for you
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Example URLs:
                </p>
                <div className="space-y-1">
                  {PLACEHOLDER_URLS.map((urlExample, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => setUrl(urlExample)}
                      className="w-full justify-start text-xs font-mono"
                    >
                      <Globe className="size-3 mr-2" />
                      {urlExample}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Example queries:
                </p>
                <div className="space-y-1">
                  {PLACEHOLDER_QUERIES.map((queryExample, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery(queryExample)}
                      className="w-full justify-start text-xs"
                    >
                      {queryExample}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {metadata?.error && (
        <div className="border-t p-4 bg-destructive/10 text-destructive">
          Error: {metadata.error}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ stage }: { stage: WorkflowStage }) {
  const colors: Record<WorkflowStage, string> = {
    idle: "bg-gray-500",
    scraping: "bg-blue-500",
    generating: "bg-purple-500",
    testing: "bg-orange-500",
    retrying: "bg-yellow-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
  };

  return (
    <Circle
      className={cn(
        "size-2 rounded-full animate-pulse fill-current",
        colors[stage],
      )}
    />
  );
}
