import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { v0 } from "@/lib/v0-client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;

  if (!chatId) {
    return NextResponse.json(
      { error: "Missing chatId parameter" },
      { status: 400 }
    );
  }

  try {
    const chatDetails = await v0.chats.getById({ chatId });

    return NextResponse.json(chatDetails);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json(
      { error: `Failed to fetch chat: ${message}` },
      { status: 500 }
    );
  }
}
