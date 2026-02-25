import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { suggestResources } from "@/lib/ai";
import { ResourceTier } from "@prisma/client";

const VALID_TIERS = new Set<string>(["GATEWAY", "INTERMEDIATE", "ADVANCED"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const tier = request.nextUrl.searchParams.get("tier") ?? "GATEWAY";
  if (!VALID_TIERS.has(tier)) {
    return apiError("INVALID_TIER", "Tier must be GATEWAY, INTERMEDIATE, or ADVANCED", 400);
  }

  const topic = await prisma.topic.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  const existingResources = await prisma.resource.findMany({
    where: { topicId: id, userId, tier: tier as ResourceTier, archived: false },
    select: { title: true },
  });

  try {
    const suggestions = await suggestResources({
      topicTitle: topic.title,
      topicDescription: topic.description ?? undefined,
      tier: tier as "GATEWAY" | "INTERMEDIATE" | "ADVANCED",
      existingResourceTitles: existingResources.map((r) => r.title),
    });

    return apiSuccess(suggestions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUOTA_EXCEEDED") {
      return apiError("QUOTA_EXCEEDED", "AI quota exceeded — try again later or check your Gemini API plan", 429);
    }
    return apiError("AI_ERROR", "Failed to get suggestions", 500);
  }
}
