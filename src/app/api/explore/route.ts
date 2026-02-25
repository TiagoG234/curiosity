import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { suggestExploreInsights } from "@/lib/ai";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();

  if (!process.env.GEMINI_API_KEY) {
    return apiSuccess({ suggestedTopic: null, topicScores: [] });
  }

  let excludeTitles: string[] = [];
  let spicy = false;
  try {
    const body = await req.json();
    if (Array.isArray(body?.excludeTitles)) {
      excludeTitles = body.excludeTitles.filter((t: unknown) => typeof t === "string");
    }
    if (body?.spicy === true) {
      spicy = true;
    }
  } catch {
    // body is optional
  }

  // In spicy mode, cast a wider net: 30 days of activity instead of 7
  const cutoff = new Date(Date.now() - (spicy ? 30 : 7) * 24 * 60 * 60 * 1000);

  const [recentCompletions, recentReflections, topics] = await Promise.all([
    prisma.completion.findMany({
      where: { userId, completedAt: { gte: cutoff } },
      include: {
        resource: { select: { title: true, type: true, tier: true } },
        topic: { select: { id: true, title: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.reflection.findMany({
      where: { userId, createdAt: { gte: cutoff } },
      include: { topic: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.topic.findMany({
      where: { userId, deletedAt: null, status: { not: "ARCHIVED" } },
      include: { tags: { include: { tag: { select: { name: true } } } } },
      orderBy: { lastActivityAt: "desc" },
      take: 30,
    }),
  ]);

  try {
    const result = await suggestExploreInsights({
      recentCompletions: recentCompletions.map((c) => ({
        resourceTitle: c.resource.title,
        topicTitle: c.topic.title,
        keyInsights: c.keyInsights,
      })),
      recentReflections: recentReflections.map((r) => ({
        title: r.title,
        topicTitle: r.topic?.title ?? null,
        content: r.content,
      })),
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        temperature: t.temperature,
        tags: t.tags.map((tt) => tt.tag.name),
      })),
      excludeTitles,
      spicy,
    });

    return apiSuccess({
      suggestedTopic: result?.suggestedTopic ?? null,
      topicScores: result?.topicScores ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "QUOTA_EXCEEDED") {
      return apiError("QUOTA_EXCEEDED", "AI quota exceeded", 429);
    }
    console.error("[api/explore] AI request failed:", error);
    return apiSuccess({ suggestedTopic: null, topicScores: [] });
  }
}
