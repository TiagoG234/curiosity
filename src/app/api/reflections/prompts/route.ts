import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { reflectionPromptsSchema } from "@/lib/validations";
import { suggestReflectionPrompts } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = reflectionPromptsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  try {
    if (input.context === "tier_advancement") {
      const topic = await prisma.topic.findFirst({
        where: { id: input.topicId!, userId },
        select: {
          title: true,
          description: true,
          resources: {
            where: { tier: input.tier!, archived: false },
            select: {
              title: true,
              completions: {
                where: { userId },
                select: { keyInsights: true },
                take: 1,
              },
            },
          },
          reflections: {
            where: { userId, tier: input.tier! },
            select: { title: true, content: true },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      if (!topic) {
        return apiError("NOT_FOUND", "Topic not found", 404);
      }

      const completedResources = topic.resources
        .filter((r) => r.completions.length > 0)
        .map((r) => ({
          title: r.title,
          keyInsights: r.completions[0]?.keyInsights ?? null,
        }));

      const prompts = await suggestReflectionPrompts({
        type: "tier_advancement",
        topicTitle: topic.title,
        topicDescription: topic.description ?? undefined,
        tier: input.tier!,
        advanceTo: input.advanceTo!,
        completedResources,
        existingReflections: topic.reflections.map((r) => ({
          title: r.title,
          contentSnippet: r.content.slice(0, 200),
        })),
      });

      return apiSuccess({ prompts });
    }

    if (input.context === "freestyle") {
      const [recentTopics, recentReflections] = await Promise.all([
        prisma.topic.findMany({
          where: { userId },
          orderBy: { lastActivityAt: "desc" },
          take: 10,
          select: {
            title: true,
            description: true,
            status: true,
            tags: {
              include: { tag: { select: { name: true } } },
            },
          },
        }),
        prisma.reflection.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { title: true, content: true },
        }),
      ]);

      if (recentTopics.length === 0) {
        return apiSuccess({ prompts: [] });
      }

      const prompts = await suggestReflectionPrompts({
        type: "freestyle",
        recentTopics: recentTopics.map((t) => ({
          title: t.title,
          description: t.description,
          status: t.status,
          tags: t.tags.map((tt) => tt.tag.name),
        })),
        recentReflections: recentReflections.map((r) => ({
          title: r.title,
          contentSnippet: r.content.slice(0, 200),
        })),
      });

      return apiSuccess({ prompts });
    }

    // topic_specific
    const topic = await prisma.topic.findFirst({
      where: { id: input.topicId!, userId },
      select: {
        title: true,
        description: true,
        gatewayComplete: true,
        intermediateStarted: true,
        advancedStarted: true,
        resources: {
          where: { archived: false },
          select: {
            title: true,
            tier: true,
            completions: {
              where: { userId },
              select: { keyInsights: true },
              take: 1,
            },
          },
        },
        reflections: {
          where: { userId },
          select: { title: true, content: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!topic) {
      return apiError("NOT_FOUND", "Topic not found", 404);
    }

    const currentTierLevel = topic.advancedStarted
      ? "ADVANCED"
      : topic.intermediateStarted
        ? "INTERMEDIATE"
        : "GATEWAY";

    const prompts = await suggestReflectionPrompts({
      type: "topic_specific",
      topicTitle: topic.title,
      topicDescription: topic.description ?? undefined,
      currentTierLevel,
      resources: topic.resources.map((r) => ({
        title: r.title,
        tier: r.tier,
        completed: r.completions.length > 0,
        keyInsights: r.completions[0]?.keyInsights ?? null,
      })),
      existingReflections: topic.reflections.map((r) => ({
        title: r.title,
        contentSnippet: r.content.slice(0, 200),
      })),
    });

    return apiSuccess({ prompts });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "QUOTA_EXCEEDED") {
      return apiError("QUOTA_EXCEEDED", "AI quota exceeded — try again later", 429);
    }
    console.error("[api] reflections/prompts error:", error);
    return apiError("AI_REQUEST_FAILED", "Failed to generate prompts", 500);
  }
}
