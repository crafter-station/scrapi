"use client";

import {
	Message as V0Message,
	StreamingMessage,
	CodeBlock,
	type CodeProjectPartProps,
	type TaskSectionProps,
	type ThinkingSectionProps
} from "@v0-sdk/react";
import { Loader } from "@/components/ai-elements/loader";
import {
	Message,
	MessageContent,
} from "@/components/ai-elements/message";
import {
	Conversation,
	ConversationContent,
} from "@/components/ai-elements/conversation";
import {
	Task,
	TaskTrigger,
	TaskContent,
	TaskItem,
	TaskItemFile,
} from "@/components/ai-elements/task";
import {
	Reasoning,
	ReasoningTrigger,
	ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Badge } from "@/components/ui/badge";
import type { MessageBinaryFormat } from "@/lib/v0-types";
import { useState } from "react";

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string | MessageBinaryFormat;
	isStreaming?: boolean;
	stream?: ReadableStream<Uint8Array>;
}

interface ScrapiLogsPanelProps {
	chatId?: string;
	messages: ChatMessage[];
	stage: string;
	isLoading?: boolean;
	onStreamingComplete?: (content: MessageBinaryFormat) => void;
	onChatData?: (data: any) => void;
}

// CodeProjectPart wrapper component with proper styling
function CodeProjectPartWrapper({
	title,
	filename,
	code,
	language,
	collapsed,
	className,
	children,
	iconRenderer,
	...props
}: CodeProjectPartProps) {
	const [isCollapsed, setIsCollapsed] = useState(collapsed ?? false);

	return (
		<div
			className={`my-4 border border-border rounded-lg overflow-hidden ${className || ""}`}
		>
			<button
				onClick={() => setIsCollapsed(!isCollapsed)}
				className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="w-6 h-6 flex items-center justify-center">
						<svg
							className="w-5 h-5 text-foreground"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
						</svg>
					</div>
					<span className="font-medium text-foreground">
						{title || "Code Project"}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground font-mono">
						v1
					</span>
					<svg
						className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-90"}`}
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
			</button>

			{!isCollapsed && (
				<div className="border-t border-border">
					{children || (
						<div className="p-4">
							<div className="space-y-2 mb-4">
								<div className="flex items-center gap-2 text-sm text-foreground">
									<svg
										className="w-4 h-4"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fillRule="evenodd"
											d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
											clipRule="evenodd"
										/>
									</svg>
									<span className="font-mono">
										{filename || "app/page.tsx"}
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// TaskSection wrapper component with proper styling
function TaskSectionWrapper({
	title,
	type,
	parts,
	collapsed,
	onCollapse,
	children,
	taskIcon,
	chevronRightIcon,
	chevronDownIcon,
	iconRenderer,
	...props
}: TaskSectionProps) {
	return (
		<Task
			className="w-full mb-4"
			defaultOpen={!collapsed}
			onOpenChange={(open) => onCollapse?.()}
		>
			<TaskTrigger title={title || type || "Task"} />
			<TaskContent>
				{parts &&
					parts.length > 0 &&
					parts.map((part, index) => {
						if (typeof part === "string") {
							return <TaskItem key={index}>{part}</TaskItem>;
						}

						// Handle structured task data
						if (part && typeof part === "object") {
							const partObj = part as any;

							// Handle reading-file task
							if (partObj.type === "reading-file" && partObj.filePath) {
								return (
									<TaskItem key={index}>
										Reading file <TaskItemFile>{partObj.filePath}</TaskItemFile>
									</TaskItem>
								);
							}

							// Handle select-files task
							if (
								partObj.type === "select-files" &&
								Array.isArray(partObj.filePaths)
							) {
								return (
									<TaskItem key={index}>
										Read{" "}
										{partObj.filePaths.map((file: string, i: number) => (
											<TaskItemFile key={i}>
												{file.split("/").pop()}
											</TaskItemFile>
										))}
									</TaskItem>
								);
							}

							// Fallback for unknown task parts
							const message =
								partObj.message || partObj.description || partObj.text;

							if (message) {
								return (
									<TaskItem key={index}>
										<div className="text-sm">{message}</div>
									</TaskItem>
								);
							}

							return (
								<TaskItem key={index}>
									<details className="text-xs">
										<summary className="text-muted-foreground cursor-pointer">
											Unknown task part (click to expand)
										</summary>
										<div className="font-mono mt-2 bg-muted p-2 rounded">
											{JSON.stringify(part, null, 2)}
										</div>
									</details>
								</TaskItem>
							);
						}

						return null;
					})}

				{children && <TaskItem>{children}</TaskItem>}
			</TaskContent>
		</Task>
	);
}

// ThinkingSection wrapper component with proper styling
function ThinkingSectionWrapper({
	title,
	duration,
	thought,
	collapsed,
	onCollapse,
	children,
	brainIcon,
	chevronRightIcon,
	chevronDownIcon,
	iconRenderer,
	...props
}: ThinkingSectionProps) {
	return (
		<Reasoning
			duration={duration ? Math.round(duration) : duration}
			defaultOpen={!collapsed}
			onOpenChange={(open) => onCollapse?.()}
			{...props}
		>
			<ReasoningTrigger title={title || "Thinking"} />
			<ReasoningContent>
				{thought ||
					(typeof children === "string"
						? children
						: "No thinking content available")}
			</ReasoningContent>
		</Reasoning>
	);
}

// Custom components to match our design system
const sharedComponents = {
	// v0-sdk specific components
	CodeProjectPart: CodeProjectPartWrapper,
	TaskSection: TaskSectionWrapper,
	ThinkingSection: ThinkingSectionWrapper,
	CodeBlock,

	// Styled HTML elements
	p: {
		className: "mb-4 text-sm leading-relaxed text-foreground",
	},
	h1: {
		className: "text-2xl font-semibold mb-4 mt-6 text-foreground",
	},
	h2: {
		className: "text-xl font-semibold mb-3 mt-5 text-foreground",
	},
	h3: {
		className: "text-lg font-semibold mb-2 mt-4 text-foreground",
	},
	ul: {
		className: "list-disc pl-6 mb-4 space-y-1",
	},
	ol: {
		className: "list-decimal pl-6 mb-4 space-y-1",
	},
	li: {
		className: "text-sm",
	},
	code: {
		className: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono",
	},
	pre: {
		className: "bg-muted p-4 rounded-lg overflow-x-auto mb-4 border border-border",
	},
	blockquote: {
		className: "border-l-4 border-border pl-4 italic text-muted-foreground mb-4",
	},
	a: {
		className: "text-primary underline hover:opacity-80",
	},
	strong: {
		className: "font-semibold",
	},
	em: {
		className: "italic",
	},
	hr: {
		className: "my-6 border-border",
	},
};

function MessageRenderer({
	content,
	messageId,
	role,
}: {
	content: string | MessageBinaryFormat;
	messageId?: string;
	role: "user" | "assistant";
}) {
	// If content is a string (user message or fallback), render it as plain text
	if (typeof content === "string") {
		return (
			<MessageContent>
				<p className="mb-4 text-sm leading-relaxed">{content}</p>
			</MessageContent>
		);
	}

	// If content is MessageBinaryFormat (from v0 API), use the V0Message component
	return (
		<V0Message
			content={content}
			messageId={messageId}
			role={role}
			components={sharedComponents}
		/>
	);
}

export function ScrapiLogsPanel({
	chatId,
	messages,
	stage,
	isLoading = false,
	onStreamingComplete,
	onChatData,
}: ScrapiLogsPanelProps) {
	return (
		<div className="flex flex-col overflow-hidden bg-background">
			{/* Header */}
			<div className="border-b p-3 bg-muted/30">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium text-muted-foreground">
						SCRAPI LOGS
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
			<div className="flex-1 overflow-auto p-3">
				{!chatId ? (
					<Conversation>
						<ConversationContent>
							{/* Show progress messages while waiting for chat ID */}
							{stage === "extracting" && (
								<Message from="assistant">
									<MessageContent>
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader size={14} />
											<span className="text-sm">
												Analyzing prompt and extracting entities...
											</span>
										</div>
									</MessageContent>
								</Message>
							)}
							{(stage === "scraping" || stage === "generating") && (
								<>
									<Message from="assistant">
										<MessageContent>
											<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
												<svg
													className="w-4 h-4"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
														clipRule="evenodd"
													/>
												</svg>
												<span className="text-sm">
													Entities extracted successfully
												</span>
											</div>
										</MessageContent>
									</Message>
									{stage === "scraping" && (
										<Message from="assistant">
											<MessageContent>
												<div className="flex items-center gap-2 text-muted-foreground">
													<Loader size={14} />
													<span className="text-sm">
														Scraping webpage for data patterns...
													</span>
												</div>
											</MessageContent>
										</Message>
									)}
									{stage === "generating" && (
										<>
											<Message from="assistant">
												<MessageContent>
													<div className="flex items-center gap-2 text-green-600 dark:text-green-400">
														<svg
															className="w-4 h-4"
															fill="currentColor"
															viewBox="0 0 20 20"
														>
															<path
																fillRule="evenodd"
																d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
																clipRule="evenodd"
															/>
														</svg>
														<span className="text-sm">
															Webpage scraped successfully
														</span>
													</div>
												</MessageContent>
											</Message>
											<Message from="assistant">
												<MessageContent>
													<div className="flex items-center gap-2 text-muted-foreground">
														<Loader size={14} />
														<span className="text-sm">
															Generating extraction code with AI...
														</span>
													</div>
												</MessageContent>
											</Message>
										</>
									)}
								</>
							)}
						</ConversationContent>
					</Conversation>
				) : isLoading && messages.length === 0 ? (
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
					<Conversation>
						<ConversationContent>
							{messages.map((msg, index) => (
								<Message from={msg.role} key={msg.id || index}>
									{msg.isStreaming && msg.stream ? (
										<StreamingMessage
											stream={msg.stream}
											messageId={msg.id || `stream-${index}`}
											role={msg.role}
											onComplete={onStreamingComplete}
											onChatData={onChatData}
											onError={(error) =>
												console.error("Streaming error:", error)
											}
											showLoadingIndicator={false}
											components={sharedComponents}
										/>
									) : (
										<MessageRenderer
											content={msg.content}
											role={msg.role}
											messageId={msg.id || `msg-${index}`}
										/>
									)}
								</Message>
							))}

							{/* Loading indicator if still processing */}
							{(stage === "generating" || stage === "retrying") && (
								<div className="flex items-center gap-2 text-muted-foreground py-4">
									<Loader size={14} />
									<span className="text-sm font-mono">
										{stage === "retrying"
											? "Fixing errors..."
											: "Writing code..."}
									</span>
								</div>
							)}
						</ConversationContent>
					</Conversation>
				)}
			</div>
		</div>
	);
}
