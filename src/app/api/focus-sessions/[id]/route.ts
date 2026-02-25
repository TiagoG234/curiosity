import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function PATCH(
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
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const { content, wordCount, discoveries, questions, connections } = body as {
    content?: string;
    wordCount?: number;
    discoveries?: string;
    questions?: string;
    connections?: string;
  };

  const updated = await prisma.focusSession.update({
    where: { id: existing.id },
    data: {
      content: content?.trim() ?? existing.content,
      wordCount: wordCount ?? existing.wordCount,
      discoveries: discoveries !== undefined ? discoveries?.trim() || null : existing.discoveries,
      questions: questions !== undefined ? questions?.trim() || null : existing.questions,
      connections: connections !== undefined ? connections?.trim() || null : existing.connections
    }
  });

  return apiSuccess(updated);
}
