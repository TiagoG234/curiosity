import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { suggestTopicMeta } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const { title } = body as { title?: string };
  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return apiError("VALIDATION_ERROR", "Title is required (min 2 chars)", 400);
  }

  try {
    const userTags = await prisma.tag.findMany({
      where: { userId },
      select: { name: true },
      orderBy: { name: "asc" },
    });

    const result = await suggestTopicMeta({
      title: title.trim(),
      existingTags: userTags.map((t) => t.name),
    });

    return apiSuccess({ suggestion: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "QUOTA_EXCEEDED") {
      return apiError("QUOTA_EXCEEDED", "AI quota exceeded — try again later", 429);
    }
    console.error("[api] topics/suggest-meta error:", error);
    return apiError("AI_REQUEST_FAILED", "Failed to generate suggestions", 500);
  }
}
