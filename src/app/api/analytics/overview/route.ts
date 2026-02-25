import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess } from "@/lib/api";
import { Temperature, TopicStatus } from "@prisma/client";

export async function GET(_request: NextRequest) {
  const userId = await getCurrentUserId();

  const [topics, completionsCount, topicsCount] = await Promise.all([
    prisma.topic.findMany({
      where: { userId, deletedAt: null },
      include: {
        tags: {
          include: { tag: true }
        }
      }
    }),
    prisma.completion.count({
      where: { userId }
    }),
    prisma.topic.count({
      where: { userId, deletedAt: null }
    })
  ]);

  const grouped = {
    hot: [] as typeof topics,
    warm: [] as typeof topics,
    cool: [] as typeof topics
  };

  topics.forEach((topic) => {
    if (topic.temperature === Temperature.HOT) {
      grouped.hot.push(topic);
    } else if (topic.temperature === Temperature.WARM) {
      grouped.warm.push(topic);
    } else {
      grouped.cool.push(topic);
    }
  });

  const dormantCount = topics.filter((t) => t.status === TopicStatus.DORMANT).length;
  const satisfiedCount = topics.filter((t) => t.status === TopicStatus.SATISFIED).length;

  return apiSuccess({
    activeTopics: {
      hot: grouped.hot,
      warm: grouped.warm,
      cool: grouped.cool
    },
    dormantCount,
    satisfiedCount,
    stats: {
      topicsExplored: topicsCount,
      resourcesCompleted: completionsCount
    }
  });
}
