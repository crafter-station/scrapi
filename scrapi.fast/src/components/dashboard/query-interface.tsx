"use client";

import { Circle, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CodeTestPanel } from "./code-test-panel";
import { ScrapiLogsPanel } from "./scrapi-logs-panel";
import { useV0Chat } from "@/hooks/use-v0-chat";
import useSWR from "swr";
import { Shimmer } from "@/components/ai-elements/shimmer";

const PLACEHOLDER_PROMPTS = [
  "Generate an API that returns the sell and buy price of USD in Peru from https://kambista.com/",
  "Fetch the five most recent events, including the date, time, registration link, and image from https://www.buk.cl/recursos/eventos-recursos-humanos",
  "Extract the title and description of the upcoming Buk webinars from https://www.buk.cl/recursos/eventos-recursos-humanos",
];

type WorkflowStage =
  | "idle"
  | "extracting"
  | "scraping"
  | "generating"
  | "testing"
  | "retrying"
  | "completed"
  | "failed";

interface WorkflowMetadata {
  stage: WorkflowStage;

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

interface QueryInterfaceProps {
  serviceId?: string | null;
  taskId?: string | null;
}

export function QueryInterface({ serviceId: initialServiceId, taskId: initialTaskId }: QueryInterfaceProps = {}) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskResult, setTaskResult] = useState<{
    serviceId: string;
    taskId: string;
  } | null>(
    initialServiceId && initialTaskId
      ? { serviceId: initialServiceId, taskId: initialTaskId }
      : null
  );

  const [mockMetadata, setMockMetadata] = useState<WorkflowMetadata>({
    stage: initialServiceId ? "generating" : "idle",
  });

  const [fakeLogs, setFakeLogs] = useState<Array<{
    id: string;
    role: "assistant";
    content: string;
    tasks?: Array<{
      description: string;
      status: "pending" | "in_progress" | "completed";
    }>;
  }>>([]);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());

  const metadata = mockMetadata;
  const stage = metadata?.stage || "idle";

  // Poll for service until script is generated
  const { data: service } = useSWR(
    taskResult?.serviceId ? `/api/get-service?id=${taskResult.serviceId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Keep polling if we're still in progress stages
        if (stage === "generating" || stage === "extracting" || stage === "scraping") {
          // Stop polling only when both agent_chat_id AND script are available
          if (data?.agent_chat_id && data?.script) {
            return 0; // Stop polling
          }
          return 1000; // Poll every 1 second for faster updates
        }
        return 0; // Stop polling in other stages
      },
    }
  );

  const {
    chatHistory,
    isLoading: isChatLoading,
    error: chatError,
    isStreaming,
    handleStreamingComplete,
    handleChatData,
  } = useV0Chat(service?.agent_chat_id);

  // Update stage when service is complete
  useEffect(() => {
    if (service?.script && (stage === "generating" || stage === "extracting" || stage === "scraping")) {
      // Service has script, mark as completed
      setMockMetadata({ stage: "completed" });
    }
  }, [service?.script, stage]);

  // Generate fake logs with structured tasks - clear when completed
  useEffect(() => {
    if (stage === "completed" || (stage !== "extracting" && stage !== "scraping" && stage !== "generating")) {
      setFakeLogs([]);
      return;
    }

    // Create a single message with all tasks for the current stage
    const stageMessage = {
      extracting: {
        id: "extracting-tasks",
        role: "assistant" as const,
        content: "Analyzing prompt and extracting entities",
        tasks: [
          { description: "Parse user prompt", status: "completed" as const },
          { description: "Extract URL entity", status: "completed" as const },
          { description: "Extract extraction goal", status: "completed" as const },
        ],
      },
      scraping: {
        id: "scraping-tasks",
        role: "assistant" as const,
        content: "Scraping webpage for data patterns",
        tasks: [
          { description: "Initialize browser session", status: "completed" as const },
          { description: "Navigate to target URL", status: "completed" as const },
          { description: "Load page content", status: "completed" as const },
          { description: "Analyze DOM structure", status: "completed" as const },
          { description: "Capture HTML snapshot", status: "completed" as const },
        ],
      },
      generating: {
        id: "generating-tasks",
        role: "assistant" as const,
        content: "Generating extraction code with AI",
        tasks: [
          { description: "Start AI code generation", status: "completed" as const },
          { description: "Analyze data patterns", status: "completed" as const },
          { description: "Generate extraction selectors", status: "in_progress" as const },
          { description: "Build Zod schemas", status: "pending" as const },
          { description: "Create test cases", status: "pending" as const },
          { description: "Optimize performance", status: "pending" as const },
        ],
      },
    };

    const message = stageMessage[stage as keyof typeof stageMessage];
    if (message) {
      setFakeLogs([message]);
    }
  }, [stage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsSubmitting(true);
    setMockMetadata({ stage: "extracting" });

    try {
      // Simulate extraction step
      await new Promise(resolve => setTimeout(resolve, 500));
      setMockMetadata({ stage: "scraping" });

      const response = await fetch("/api/create-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
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
            <Sparkles className="size-4 text-muted-foreground" />
            <Input
              placeholder={PLACEHOLDER_PROMPTS[0]}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={stage !== "idle" || isSubmitting}
              className="border-0 p-0 h-auto focus-visible:ring-0 shadow-none"
            />
          </div>
          <Button
            type="submit"
            disabled={!prompt.trim() || stage !== "idle" || isSubmitting}
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
        {stage !== "idle" && stage !== "completed" && (
          <div className={cn(
            "flex items-center gap-2 text-sm px-3 py-2 rounded-md",
            stage === "extracting" && "bg-stripes"
          )}>
            <StatusBadge stage={stage} />
            <span className="text-muted-foreground font-mono text-xs">
              {stage === "extracting" && <Shimmer duration={1.5}>Identifying entities from prompt...</Shimmer>}
              {stage === "scraping" && <Shimmer duration={1.5}>Analyzing webpage...</Shimmer>}
              {stage === "generating" && <Shimmer duration={1.5}>
                {`Generating extraction code... ${taskResult ? `(Task: ${taskResult.taskId})` : ""}`}
              </Shimmer>}
              {stage === "testing" && <Shimmer duration={1.5}>
                {`Testing code (Attempt ${metadata?.tests?.currentAttempt}/${metadata?.tests?.maxAttempts})...`}
              </Shimmer>}
              {stage === "retrying" && <Shimmer duration={1.5}>Fixing errors...</Shimmer>}
              {stage === "failed" && "Failed"}
            </span>
          </div>
        )}
      </div>

      {/* 2 Panels - 50/50 Split */}
      {stage !== "idle" && (
        <div className="flex-1 grid grid-cols-2 gap-px bg-border overflow-hidden">
          <ScrapiLogsPanel
            chatId={service?.agent_chat_id || metadata?.v0?.chatId}
            messages={
              chatHistory.length > 0
                ? chatHistory.map((msg) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    reasoning: msg.reasoning,
                    tools: msg.tools,
                    tasks: msg.tasks,
                    isStreaming: msg.isStreaming,
                    stream: msg.stream,
                  }))
                : [...fakeLogs, ...(metadata?.v0?.messages || [])]
            }
            stage={stage}
            isLoading={isChatLoading}
            onStreamingComplete={handleStreamingComplete}
            onChatData={handleChatData}
          />

          <CodeTestPanel
            code={metadata?.code}
            testResults={metadata?.tests?.results || []}
            currentAttempt={metadata?.tests?.currentAttempt}
            maxAttempts={metadata?.tests?.maxAttempts}
            serviceId={taskResult?.serviceId}
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
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Example prompts:
              </p>
              <div className="space-y-2">
                {PLACEHOLDER_PROMPTS.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setPrompt(example)}
                    className="w-full justify-start text-xs text-left h-auto py-2"
                  >
                    <Sparkles className="size-3 mr-2 shrink-0" />
                    <span className="line-clamp-2">{example}</span>
                  </Button>
                ))}
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
    extracting: "bg-cyan-500",
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
