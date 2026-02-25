import { prisma } from "@/lib/prisma";
import type { TopicForRanking, RankedTopic } from "@/lib/explore-types";

export type { RankedTopic } from "@/lib/explore-types";

function getStage(topic: TopicForRanking) {
  if (topic.intermediateStarted && topic.advancedStarted) {
    return { stage: "Advanced", score: 15 };
  }
  if (topic.intermediateStarted) {
    return { stage: "Intermediate", score: 10 };
  }
  return { stage: "Gateway", score: 5 };
}

function getStageProgress(topic: TopicForRanking, stage: string) {
  const resources = topic.resources.filter(
    (r) => r.tier === stage.toUpperCase()
  );
  const completed = resources.filter((r) => r.completions.length > 0).length;
  return { completed, total: resources.length };
}

export async function getExploreTopics(userId: string): Promise<{
  topics: RankedTopic[];
  recentTagNames: string[];
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch recent tags from reflections and topics
  const [recentReflectionTags, recentTopicTags] = await Promise.all([
    prisma.reflectionTag.findMany({
      where: {
        reflection: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      },
      include: { tag: { select: { name: true } } },
    }),
    prisma.topicTag.findMany({
      where: {
        topic: {
          userId,
          lastActivityAt: { gte: thirtyDaysAgo },
        },
      },
      include: { tag: { select: { name: true } } },
    }),
  ]);

  const recentTagNames = [
    ...new Set([
      ...recentReflectionTags.map((rt) => rt.tag.name),
      ...recentTopicTags.map((tt) => tt.tag.name),
    ]),
  ];

  // Fetch all user topics
  const topics = await prisma.topic.findMany({
    where: { userId },
    include: {
      tags: { include: { tag: true } },
      resources: {
        where: { archived: false },
        select: {
          id: true,
          tier: true,
          completions: { select: { id: true } },
        },
      },
    },
    orderBy: [{ temperature: "desc" }, { lastActivityAt: "desc" }],
    take: 50,
  });

  // Score each topic
  const temperatureScores: Record<string, number> = {
    HOT: 30,
    WARM: 20,
    COOL: 10,
  };

  const scored: RankedTopic[] = topics.map((topic) => {
    const tempScore = temperatureScores[topic.temperature] ?? 0;

    const topicTagNames = topic.tags.map((t) => t.tag.name);
    const tagAffinity = Math.min(
      topicTagNames.filter((name) => recentTagNames.includes(name)).length * 5,
      25
    );

    const { stage, score: stageScore } = getStage(topic);

    const totalScore = tempScore + tagAffinity + stageScore;

    return {
      ...topic,
      score: totalScore,
      stage,
    };
  });

  // Sort by score desc, tiebreak by lastActivityAt desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.lastActivityAt).getTime() -
      new Date(a.lastActivityAt).getTime()
    );
  });

  return {
    topics: scored.slice(0, 20),
    recentTagNames,
  };
}

export { getStageProgress };
