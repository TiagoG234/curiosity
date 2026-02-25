import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";

export async function GET(_request: NextRequest) {
  const userId = await getCurrentUserId();

  // Gather basic counts for placeholder insights
  const [topicCount, completionCount, focusSessionCount, reflectionCount] =
    await Promise.all([
      prisma.topic.count({ where: { userId, deletedAt: null } }),
      prisma.completion.count({ where: { userId } }),
      prisma.focusSession.count({ where: { userId } }),
      prisma.reflection.count({ where: { userId } })
    ]);

  return apiSuccess({
    summary: {
      topicsExplored: topicCount,
      resourcesCompleted: completionCount,
      focusSessions: focusSessionCount,
      reflectionsWritten: reflectionCount
    },
    // Placeholder for future AI-generated insights
    insights: [],
    patterns: [],
    suggestions: []
  });
}
