import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  const { id: topicId, tagId } = await params;
  const userId = await getCurrentUserId();

  // Verify topic belongs to user
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    select: { id: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  await prisma.topicTag.deleteMany({
    where: { topicId, tagId },
  });

  return NextResponse.json({ data: { deleted: true } });
}
