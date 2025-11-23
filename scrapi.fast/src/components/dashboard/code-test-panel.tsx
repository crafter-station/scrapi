"use client";

import { useState, useEffect } from "react";
import { Play, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientCodeBlock } from "@/components/client-code-block";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TestResult {
  attempt: number;
  passed: boolean;
  output: string;
  timestamp: string;
  error?: string;
}

interface CodeTestPanelProps {
  code?: {
    getData: string;
    schema: string;
    test: string;
  };
  testResults: TestResult[];
  currentAttempt?: number;
  maxAttempts?: number;
  serviceId?: string;
}

export function CodeTestPanel({
  code,
  testResults,
  currentAttempt,
  maxAttempts,
  serviceId,
}: CodeTestPanelProps) {
  const { data: service, isLoading: isServiceLoading } = useSWR(
    serviceId ? `/api/get-service?id=${serviceId}` : null,
    fetcher,
    { refreshInterval: 10000 } // Poll every 10 seconds
  );

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [hasAutoRun, setHasAutoRun] = useState(false);

  const curlCommand = serviceId ? `curl -X POST https://www.scrapi.fast/api/service/${serviceId} \\
  -H "Content-Type: application/json" \\
  -d '{}' | jq .` : '';

  const handleRun = async () => {
    if (!serviceId) return;

    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch(`https://www.scrapi.fast/api/service/${serviceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasScript = service && service.script;
  const isReady = service && !isServiceLoading && service.url && hasScript;

  // Auto-run when service becomes ready and has URL and script
  useEffect(() => {
    if (isReady && !hasAutoRun && !isRunning) {
      setHasAutoRun(true);
      handleRun();
    }
  }, [isReady, hasAutoRun, isRunning]);

  // Show loading state when no serviceId or service is being generated
  if (!serviceId || !hasScript) {
    return (
      <div className="flex flex-col overflow-hidden bg-background">
        <div className="border-b p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              API ENDPOINT
            </span>
            {currentAttempt && maxAttempts && (
              <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                Attempt {currentAttempt}/{maxAttempts}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Generating your API...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            API ENDPOINT
          </span>
          {isReady ? (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 gap-1.5 px-2"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span className="text-xs">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleRun}
                disabled={isRunning}
                className="h-6 gap-1.5 px-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" fill="currentColor" />
                    <span className="text-xs">Run</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Badge variant="secondary" className="h-6 px-2">
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              <span className="text-xs">Generating...</span>
            </Badge>
          )}
        </div>
        {service?.name && (
          <p className="text-xs text-muted-foreground font-mono">
            {service.name}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {!isReady ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Generating your API...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This usually takes 30-60 seconds
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Curl Command */}
            <div>
              <div className="bg-muted/50 px-2 py-1.5 border-b rounded-t-lg">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                  BASH
                </span>
              </div>
              <div className="rounded-b-lg overflow-hidden border border-t-0">
                <ClientCodeBlock lang="bash" code={curlCommand} />
              </div>
            </div>

            <Separator />

            {/* Response */}
            <div>
              <div className="flex items-center justify-between bg-muted/50 px-2 py-1.5 border-b rounded-t-lg">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                  RESPONSE
                </span>
                {result && !result.error && (
                  <Badge
                    variant={result.status === 200 ? "default" : "destructive"}
                    className="font-mono text-[9px] h-4"
                  >
                    {result.status}
                  </Badge>
                )}
              </div>
              <div className="rounded-b-lg overflow-hidden border border-t-0 bg-card">
                <div className="p-3 min-h-[200px]">
                  {!result ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="rounded-full bg-muted p-2 mb-2">
                        <Play className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Click <span className="font-semibold">Run</span> to test
                      </p>
                    </div>
                  ) : result.error ? (
                    <div className="text-destructive text-xs">
                      <div className="font-semibold mb-1">Error:</div>
                      <div>{result.error}</div>
                    </div>
                  ) : (
                    <ClientCodeBlock
                      lang="json"
                      code={JSON.stringify(result.data, null, 2)}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
