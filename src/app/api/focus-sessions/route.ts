import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const { content, wordCount, durationMinutes, topicId, promptText } = body as {
    content?: string;
    wordCount?: number;
    durationMinutes?: number;
    topicId?: string;
    promptText?: string;
  };

  if (!content || typeof content !== "string" || !content.trim()) {
    return apiError("VALIDATION_ERROR", "content is required", 400);
  }

  if (wordCount == null || typeof wordCount !== "number" || wordCount < 0) {
    return apiError("VALIDATION_ERROR", "wordCount is required and must be a non-negative number", 400);
  }

  if (durationMinutes == null || typeof durationMinutes !== "number" || durationMinutes < 0) {
    return apiError("VALIDATION_ERROR", "durationMinutes is required and must be a non-negative number", 400);
  }

  // Validate topicId belongs to user if provided
  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, userId }
    });

    if (!topic) {
      return apiError("NOT_FOUND", "Topic not found", 404);
    }
  }

  const focusSession = await prisma.focusSession.create({
    data: {
      userId,
      content: content.trim(),
      wordCount,
      durationMinutes,
      topicId: topicId || null,
      promptText: promptText?.trim() || null
    }
  });

  return apiSuccess(focusSession, undefined, 201);
}
