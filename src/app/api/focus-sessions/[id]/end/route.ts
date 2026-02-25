import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const existing = await prisma.focusSession.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Focus session not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { wordCount, durationMinutes } = body as {
    wordCount?: number;
    durationMinutes?: number;
  };

  const updated = await prisma.focusSession.update({
    where: { id: existing.id },
    data: {
      wordCount: wordCount ?? existing.wordCount,
      durationMinutes: durationMinutes ?? existing.durationMinutes
    }
  });

  // Update topic's lastActivityAt if session is linked to a topic
  if (updated.topicId) {
    await prisma.topic.update({
      where: { id: updated.topicId },
      data: { lastActivityAt: new Date() }
    });
  }

  return apiSuccess(updated);
}
