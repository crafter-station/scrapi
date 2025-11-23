"use client";

import { Message, StreamingMessage } from "@v0-sdk/react";
import { CheckCircle2, Code2, Zap } from "lucide-react";
import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtHeader,
	ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
	Checkpoint,
	CheckpointIcon,
} from "@/components/ai-elements/checkpoint";
import { Loader } from "@/components/ai-elements/loader";
import {
	Message as AIMessage,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	Queue,
	QueueItem,
	QueueItemContent,
	QueueItemIndicator,
	QueueList,
	QueueSection,
	QueueSectionContent,
	QueueSectionLabel,
	QueueSectionTrigger,
} from "@/components/ai-elements/queue";
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import { parseV0Content } from "@/lib/parse-v0-content";
import type { MessageBinaryFormat } from "@/lib/v0-types";
import { CodeProjectBlock } from "./code-project-block";

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
	content: MessageBinaryFormat,
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
				if (
					item.length >= 3 &&
					item[0] === "text" &&
					typeof item[2] === "string"
				) {
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

interface ScrapiLogsPanelProps {
	chatId?: string;
	messages: V0Message[];
	stage: string;
	onStreamingComplete?: (content: MessageBinaryFormat) => void;
	onChatData?: (data: any) => void;
}

export function ScrapiLogsPanel({
	chatId,
	messages,
	stage,
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
						{/* Process Progress Queue */}
						{(stage === "extracting" ||
							stage === "scraping" ||
							stage === "generating") && (
							<Queue>
								<QueueSection defaultOpen={true}>
									<QueueSectionTrigger>
										<QueueSectionLabel
											icon={<Code2 className="size-4" />}
											label="Process Steps"
											count={messages.length}
										/>
									</QueueSectionTrigger>
									<QueueSectionContent>
										<QueueList>
											{messages
												.filter((m) => m.role === "assistant")
												.map((msg, idx) => (
													<QueueItem key={msg.id || idx}>
														<div className="flex items-start gap-2">
															<QueueItemIndicator completed={true} />
															<QueueItemContent completed={false}>
																{typeof msg.content === "string"
																	? msg.content
																	: "Processing..."}
															</QueueItemContent>
														</div>
													</QueueItem>
												))}
											{stage === "generating" && (
												<QueueItem>
													<div className="flex items-start gap-2">
														<QueueItemIndicator completed={false} />
														<QueueItemContent completed={false}>
															<Shimmer duration={1.5}>
																Generating extraction code...
															</Shimmer>
														</QueueItemContent>
													</div>
												</QueueItem>
											)}
										</QueueList>
									</QueueSectionContent>
								</QueueSection>
							</Queue>
						)}

						{/* Checkpoint for major milestones */}
						{stage === "completed" && (
							<Checkpoint>
								<CheckpointIcon>
									<CheckCircle2 className="size-4 text-green-500" />
								</CheckpointIcon>
								<span className="text-sm font-medium">
									Service Generated Successfully
								</span>
							</Checkpoint>
						)}

						{messages.map((msg, index) => (
							<div key={msg.id || `msg-${index}`} className="space-y-3">
								{/* User messages - using Streamdown for markdown rendering */}
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

												{/* Message content - using Streamdown for markdown rendering */}
												{typeof msg.content === "string" ? (
													(() => {
														const parsed = parseV0Content(msg.content);
														return (
															<>
																{parsed.textContent && (
																	<AIMessage from="assistant">
																		<MessageContent>
																			<MessageResponse>
																				{parsed.textContent}
																			</MessageResponse>
																		</MessageContent>
																	</AIMessage>
																)}
																{parsed.hasCodeProject && (
																	<CodeProjectBlock
																		version="v1"
																		files={parsed.files}
																	/>
																)}
															</>
														);
													})()
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
										? "Fixing errors..."
										: "Writing code..."}
								</span>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
