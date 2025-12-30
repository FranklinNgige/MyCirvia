import { NextResponse } from "next/server";
import { listMessagesForChat } from "@/app/actions/messages";

export const GET = async (
  request: Request,
  { params }: { params: { chatId: string } }
) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const payload = await listMessagesForChat(params.chatId, cursor);
  return NextResponse.json(payload);
};
