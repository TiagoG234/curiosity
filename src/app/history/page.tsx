import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { HistoryClient } from "@/components/HistoryClient";
import { NavHeader } from "@/components/NavHeader";

export type SerializedTopic = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  temperature: string;
  gatewayComplete: boolean;
  intermediateStarted: boolean;
  advancedStarted: boolean;
  lastActivityAt: string;
  createdAt: string;
  tags: { id: string; name: string }[];
};

export type SerializedResource = {
  id: string;
  title: string;
  type: string;
  tier: string;
  topicId: string;
  topicTitle: string;
  author: string | null;
  estimatedMinutes: number | null;
  archived: boolean;
  createdAt: string;
  completion: {
    completedAt: string;
    rating: number | null;
    timeSpentMinutes: number | null;
  } | null;
};

export type SerializedReflection = {
  id: string;
  title: string;
  tier: string | null;
  content: string;
  topicId: string | null;
  topicTitle: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: string; name: string }[];
};

async function getHistoryData() {
  const userId = await getCurrentUserId();

  const [topics, resources, reflections, tags] = await Promise.all([
    prisma.topic.findMany({
      where: { userId },
      include: { tags: { include: { tag: true } } },
      orderBy: { lastActivityAt: "desc" },
    }),
    prisma.resource.findMany({
      where: { userId },
      include: {
        topic: { select: { id: true, title: true } },
        completions: {
          where: { userId },
          select: { completedAt: true, rating: true, timeSpentMinutes: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reflection.findMany({
      where: { userId },
      include: {
        topic: { select: { id: true, title: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serializedTopics: SerializedTopic[] = topics.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    temperature: t.temperature,
    gatewayComplete: t.gatewayComplete,
    intermediateStarted: t.intermediateStarted,
    advancedStarted: t.advancedStarted,
    lastActivityAt: t.lastActivityAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    tags: t.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })),
  }));

  const serializedResources: SerializedResource[] = resources.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    tier: r.tier,
    topicId: r.topic.id,
    topicTitle: r.topic.title,
    author: r.author,
    estimatedMinutes: r.estimatedMinutes,
    archived: r.archived,
    createdAt: r.createdAt.toISOString(),
    completion: r.completions[0]
      ? {
          completedAt: r.completions[0].completedAt.toISOString(),
          rating: r.completions[0].rating,
          timeSpentMinutes: r.completions[0].timeSpentMinutes,
        }
      : null,
  }));

  const serializedReflections: SerializedReflection[] = reflections.map((r) => ({
    id: r.id,
    title: r.title,
    tier: r.tier,
    content: r.content,
    topicId: r.topic?.id ?? null,
    topicTitle: r.topic?.title ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    tags: r.tags.map(({ tag }) => ({ id: tag.id, name: tag.name })),
  }));

  return {
    topics: serializedTopics,
    resources: serializedResources,
    reflections: serializedReflections,
    tags,
  };
}

export default async function HistoryPage() {
  const data = await getHistoryData();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="history" />

      <HistoryClient
        topics={data.topics}
        resources={data.resources}
        reflections={data.reflections}
        allTags={data.tags}
      />
    </main>
  );
}
