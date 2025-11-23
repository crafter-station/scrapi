import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v0 } from "@/lib/v0-client";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId, message } = await request.json();

  if (!chatId || !message) {
    return NextResponse.json(
      { error: "Missing required fields: chatId, message" },
      { status: 400 }
    );
  }

  try {
    const chat = await v0.chats.sendMessage({
      chatId,
      message,
      responseMode: "experimental_stream",
    });

    return new Response(chat as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { error: `Failed to stream chat: ${message}` },
      { status: 500 }
    );
  }
}
