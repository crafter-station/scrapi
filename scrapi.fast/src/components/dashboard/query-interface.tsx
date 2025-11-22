"use client";

import { useState, useEffect, useRef } from "react";
import {
	Copy,
	Check,
	Sparkles,
	Code2,
	Zap,
	Terminal,
	FileCode,
	Eye,
	ChevronRight,
	Circle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeViewer } from "@/components/dashboard/code-viewer";
import { cn } from "@/lib/utils";

const PLACEHOLDER_QUERIES = [
	"Get trending products from ProductHunt",
	"Find React jobs on RemoteOK",
	"Extract prices from Amazon product page",
];

type QueryState = "idle" | "processing" | "success" | "error";

interface LogEntry {
	timestamp: string;
	level: "info" | "success" | "error";
	message: string;
}

interface GeneratedCode {
	language: string;
	code: string;
}

interface ApiResponse {
	endpoint: string;
	data: Record<string, unknown>;
	generatedCode: GeneratedCode[];
	logs: LogEntry[];
}

export function QueryInterface() {
	const [query, setQuery] = useState("");
	const [state, setState] = useState<QueryState>("idle");
	const [response, setResponse] = useState<ApiResponse | null>(null);
	const [placeholderIndex, setPlaceholderIndex] = useState(0);
	const [copied, setCopied] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const logsEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const interval = setInterval(() => {
			setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_QUERIES.length);
		}, 4000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
			if (e.key === "Escape") {
				setQuery("");
				inputRef.current?.blur();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs]);

	const addLog = (level: LogEntry["level"], message: string) => {
		const timestamp = new Date().toLocaleTimeString("en-US", {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		setLogs((prev) => [...prev, { timestamp, level, message }]);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) return;

		setState("processing");
		setLogs([]);

		// Simulate progressive logs
		setTimeout(() => addLog("info", "Initializing scraper engine..."), 100);
		setTimeout(() => addLog("info", "Analyzing target structure..."), 400);
		setTimeout(() => addLog("success", "DOM structure mapped"), 700);
		setTimeout(() => addLog("info", "Generating extraction patterns..."), 900);
		setTimeout(() => addLog("info", "Creating API schema..."), 1200);
		setTimeout(() => addLog("info", "Compiling TypeScript definitions..."), 1500);
		setTimeout(() => addLog("success", "Code generation complete"), 1800);
		setTimeout(() => addLog("success", "API endpoint deployed"), 2000);

		setTimeout(() => {
			const mockResponse: ApiResponse = {
				endpoint: `/api/scrape/${query.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}`,
				data: {
					results: [
						{
							id: "1",
							title: "Example Product #1",
							price: "$99.99",
							rating: 4.5,
							availability: "In Stock",
						},
						{
							id: "2",
							title: "Example Product #2",
							price: "$149.99",
							rating: 4.8,
							availability: "In Stock",
						},
					],
					meta: {
						total: 2,
						scraped_at: new Date().toISOString(),
					},
				},
				generatedCode: [
					{
						language: "typescript",
						code: `// Auto-generated scraper function
export async function scrape${query.replace(/\s+/g, "")}() {
  const response = await fetch('${window.location.origin}/api/scrape/${query.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}');
  const data = await response.json();
  return data;
}

// Type definitions
export interface ScrapedData {
  id: string;
  title: string;
  price: string;
  rating: number;
  availability: string;
}

export interface ApiResponse {
  results: ScrapedData[];
  meta: {
    total: number;
    scraped_at: string;
  };
}`,
					},
					{
						language: "python",
						code: `# Auto-generated scraper function
import requests
from typing import TypedDict, List

class ScrapedData(TypedDict):
    id: str
    title: str
    price: str
    rating: float
    availability: str

def scrape_${query.toLowerCase().replace(/\s+/g, "_")}():
    response = requests.get("${window.location.origin}/api/scrape/${query.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}")
    return response.json()`,
					},
				],
				logs,
			};
			setResponse(mockResponse);
			setState("success");
		}, 2100);
	};

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const LogLevel = ({ level }: { level: LogEntry["level"] }) => {
		const colors = {
			info: "bg-blue-500",
			success: "bg-primary",
			error: "bg-destructive",
		};
		return <Circle className={cn("size-1.5 fill-current", colors[level])} />;
	};

	return (
		<div className="flex h-full w-full flex-col overflow-hidden [--query-bar-height:44px] [--status-bar-height:24px]">
			{/* Compact Query Bar */}
			<div className="border-b bg-background px-4 py-2 h-[var(--query-bar-height)] flex items-center">
				<form onSubmit={handleSubmit} className="w-full">
					<div className="flex items-center gap-2">
						<Sparkles
							className={cn(
								"size-3.5 shrink-0 text-muted-foreground transition-colors",
								state === "processing" && "animate-pulse text-primary",
								state === "success" && "text-primary"
							)}
						/>
						<Input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={PLACEHOLDER_QUERIES[placeholderIndex]}
							className="h-7 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
							disabled={state === "processing"}
						/>
						<div className="flex shrink-0 items-center gap-2">
							<KbdGroup className="hidden md:flex">
								<Kbd className="h-4 min-w-4 text-[10px]">⌘</Kbd>
								<Kbd className="h-4 min-w-4 text-[10px]">K</Kbd>
							</KbdGroup>
							<Button
								type="submit"
								size="sm"
								disabled={!query.trim() || state === "processing"}
								className="h-6 px-3 text-xs"
							>
								{state === "processing" ? (
									<>
										<div className="size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
										<span className="hidden sm:inline">Processing</span>
									</>
								) : (
									<>
										<Zap className="size-3" />
										<span className="hidden sm:inline">Generate</span>
									</>
								)}
							</Button>
						</div>
					</div>
				</form>
			</div>

			{/* Main Content Area */}
			<div
				className="flex flex-1 overflow-hidden"
			>
				{state === "idle" && (
					<div className="flex flex-1 items-center justify-center p-6">
						<div className="max-w-md text-center">
							<div className="mb-4 inline-flex rounded-full bg-primary/10 p-3">
								<Sparkles className="size-6 text-primary" />
							</div>
							<h2 className="mb-2 text-xl font-semibold">
								Turn any website into an API
							</h2>
							<p className="mb-6 text-sm text-muted-foreground">
								Describe what data you need in natural language
							</p>
							<div className="flex flex-wrap justify-center gap-2">
								{PLACEHOLDER_QUERIES.map((suggestion, i) => (
									<Button
										key={i}
										variant="outline"
										size="sm"
										onClick={() => setQuery(suggestion)}
										className="text-xs"
									>
										{suggestion}
									</Button>
								))}
							</div>
						</div>
					</div>
				)}

				{(state === "processing" || state === "success") && (
					<div className="grid flex-1 grid-cols-2 gap-px bg-border overflow-hidden">
						{/* Left Panel: Logs + Preview */}
						<div className="flex flex-col gap-px bg-border overflow-hidden">
							{/* Logs Terminal */}
							<div className="flex-1 flex flex-col bg-background overflow-hidden font-mono">
								<div className="border-b px-3 py-1.5 flex items-center gap-2 bg-muted/30">
									<Terminal className="size-3 text-muted-foreground" />
									<span className="text-[10px] font-medium text-muted-foreground">
										LOGS
									</span>
									{state === "processing" && (
										<div className="size-1.5 animate-pulse rounded-full bg-primary ml-auto" />
									)}
								</div>
								<div className="flex-1 overflow-auto p-3 space-y-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
									{logs.map((log, i) => (
										<div key={i} className="flex items-start gap-2">
											<span className="text-muted-foreground shrink-0 text-[10px]">
												{log.timestamp}
											</span>
											<LogLevel level={log.level} />
											<span className="text-foreground">{log.message}</span>
										</div>
									))}
									<div ref={logsEndRef} />
								</div>
							</div>

							{/* Preview */}
							<div className="flex-1 flex flex-col bg-background overflow-hidden font-mono">
								<div className="border-b px-3 py-1.5 flex items-center gap-2 bg-muted/30">
									<Eye className="size-3 text-muted-foreground" />
									<span className="text-[10px] font-medium text-muted-foreground">
										RESPONSE PREVIEW
									</span>
									{state === "success" && (
										<Button
											variant="ghost"
											size="sm"
											className="h-5 px-2 text-[10px] ml-auto"
											onClick={() =>
												copyToClipboard(
													JSON.stringify(response?.data || {}, null, 2)
												)
											}
										>
											{copied ? (
												<Check className="size-2.5 text-primary" />
											) : (
												<Copy className="size-2.5" />
											)}
										</Button>
									)}
								</div>
								<div className="flex-1 overflow-auto">
									{state === "success" && response ? (
										<CodeViewer
											code={JSON.stringify(response.data, null, 2)}
											lang="json"
											className="h-full"
										/>
									) : (
										<div className="flex items-center justify-center h-full text-muted-foreground text-xs">
											Waiting for response...
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Right Panel: Generated Code */}
						<div className="flex flex-col bg-background overflow-hidden font-mono">
							<div className="border-b px-3 py-1.5 flex items-center gap-2 bg-muted/30">
								<FileCode className="size-3 text-muted-foreground" />
								<span className="text-[10px] font-medium text-muted-foreground">
									GENERATED CODE
								</span>
								{state === "success" && response && (
									<div className="flex items-center gap-1 ml-auto">
										<Badge
											variant="outline"
											className="h-4 px-1.5 text-[9px]"
											style={{ fontFamily: 'var(--font-mono)' }}
										>
											GET {response.endpoint}
										</Badge>
										<Button
											variant="ghost"
											size="sm"
											className="h-5 px-2 text-[10px]"
											onClick={() =>
												copyToClipboard(response.endpoint)
											}
										>
											{copied ? (
												<Check className="size-2.5 text-primary" />
											) : (
												<Copy className="size-2.5" />
											)}
										</Button>
									</div>
								)}
							</div>

							{state === "success" && response ? (
								<Tabs defaultValue="typescript" className="flex-1 flex flex-col overflow-hidden">
									<div className="border-b bg-muted/30 px-3">
										<TabsList className="h-7 bg-transparent p-0 gap-1">
											<TabsTrigger
												value="typescript"
												className="h-6 px-2 text-[10px] data-[state=active]:bg-background"
											>
												TypeScript
											</TabsTrigger>
											<TabsTrigger
												value="python"
												className="h-6 px-2 text-[10px] data-[state=active]:bg-background"
											>
												Python
											</TabsTrigger>
											<TabsTrigger
												value="curl"
												className="h-6 px-2 text-[10px] data-[state=active]:bg-background"
											>
												cURL
											</TabsTrigger>
										</TabsList>
									</div>
									<TabsContent value="typescript" className="flex-1 overflow-auto m-0">
										<div className="relative h-full">
											<Button
												variant="ghost"
												size="sm"
												className="absolute top-3 right-3 h-6 px-2 text-[10px] z-10"
												onClick={() =>
													copyToClipboard(response.generatedCode[0].code)
												}
											>
												{copied ? (
													<Check className="size-2.5 text-primary" />
												) : (
													<Copy className="size-2.5" />
												)}
											</Button>
											<CodeViewer
												code={response.generatedCode[0].code}
												lang="typescript"
												className="h-full"
											/>
										</div>
									</TabsContent>
									<TabsContent value="python" className="flex-1 overflow-auto m-0">
										<div className="relative h-full">
											<Button
												variant="ghost"
												size="sm"
												className="absolute top-3 right-3 h-6 px-2 text-[10px] z-10"
												onClick={() =>
													copyToClipboard(response.generatedCode[1].code)
												}
											>
												{copied ? (
													<Check className="size-2.5 text-primary" />
												) : (
													<Copy className="size-2.5" />
												)}
											</Button>
											<CodeViewer
												code={response.generatedCode[1].code}
												lang="python"
												className="h-full"
											/>
										</div>
									</TabsContent>
									<TabsContent value="curl" className="flex-1 overflow-auto m-0">
										<div className="relative h-full">
											<Button
												variant="ghost"
												size="sm"
												className="absolute top-3 right-3 h-6 px-2 text-[10px] z-10"
												onClick={() =>
													copyToClipboard(
														`curl -X GET "${window.location.origin}${response.endpoint}"`
													)
												}
											>
												{copied ? (
													<Check className="size-2.5 text-primary" />
												) : (
													<Copy className="size-2.5" />
												)}
											</Button>
											<CodeViewer
												code={`curl -X GET "${window.location.origin}${response.endpoint}"`}
												lang="bash"
												className="h-full"
											/>
										</div>
									</TabsContent>
								</Tabs>
							) : (
								<div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
									Code will appear here...
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Bottom Status Bar */}
			<div className="border-t bg-muted/30 px-4 h-[var(--status-bar-height)] flex items-center">
				<div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
					<div className="flex items-center gap-3">
						<span className="hidden md:inline">scrapi.fast</span>
						<ChevronRight className="size-2.5 hidden md:block" />
						<span style={{ fontFamily: 'var(--font-mono)' }}>
							{state === "idle" && "Ready"}
							{state === "processing" && "Generating..."}
							{state === "success" && "Complete"}
						</span>
					</div>
					{state === "success" && (
						<div className="flex items-center gap-2">
							<Circle className="size-1.5 fill-primary text-primary" />
							<span>Live</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
