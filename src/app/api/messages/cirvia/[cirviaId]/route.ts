import { NextResponse } from "next/server";
import { listCirviaMessages } from "@/app/actions/messages";

export const GET = async (
  request: Request,
  { params }: { params: { cirviaId: string } }
) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const payload = await listCirviaMessages(params.cirviaId, cursor);
  return NextResponse.json(payload);
};
