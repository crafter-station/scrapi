"use client";

import { Message as V0Message, StreamingMessage } from "@v0-sdk/react";
import { Loader } from "@/components/ai-elements/loader";
import {
	Message,
	MessageContent,
} from "@/components/ai-elements/message";
import {
	Conversation,
	ConversationContent,
} from "@/components/ai-elements/conversation";
import { Badge } from "@/components/ui/badge";
import type { MessageBinaryFormat } from "@/lib/v0-types";

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

// Custom components to match our design system
const sharedComponents = {
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
