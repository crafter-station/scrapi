import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v0 } from "@/lib/v0-client";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, chatId, streaming, attachments } = await request.json();

  if (!message) {
    return NextResponse.json(
      { error: "Missing required field: message" },
      { status: 400 }
    );
  }

  try {
    if (chatId) {
      if (streaming) {
        const chat = await v0.chats.sendMessage({
          chatId,
          message,
          responseMode: "experimental_stream",
          ...(attachments && attachments.length > 0 && { attachments }),
        });

        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } else {
        const chat = await v0.chats.sendMessage({
          chatId,
          message,
          ...(attachments && attachments.length > 0 && { attachments }),
        });

        return NextResponse.json(chat);
      }
    } else {
      if (streaming) {
        const chat = await v0.chats.create({
          message,
          responseMode: "experimental_stream",
          ...(attachments && attachments.length > 0 && { attachments }),
        });

        return new Response(chat as ReadableStream<Uint8Array>, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } else {
        const chat = await v0.chats.create({
          message,
          responseMode: "sync",
          ...(attachments && attachments.length > 0 && { attachments }),
        });

        return NextResponse.json(chat);
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { error: `Failed to process chat: ${errorMessage}` },
      { status: 500 }
    );
  }
}
