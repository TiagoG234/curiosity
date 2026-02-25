import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TopicDetailClient } from "@/components/TopicDetailClient";

interface TopicPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const topic = await prisma.topic.findFirst({
    where: { id, userId },
    include: {
      resources: {
        where: { archived: false },
        orderBy: [{ tier: "asc" }, { orderIndex: "asc" }],
        include: {
          completions: {
            where: { userId },
          },
        },
      },
      tags: {
        include: { tag: true },
      },
      inspirations: {
        include: {
          inspiredByTopic: {
            select: { id: true, title: true },
          },
        },
      },
      reflections: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!topic) {
    notFound();
  }

  const allTags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Serialize dates for client component
  const serializedResources = topic.resources.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    type: r.type,
    tier: r.tier,
    estimatedMinutes: r.estimatedMinutes,
    url: r.url,
    completions: r.completions.map((c) => ({
      id: c.id,
      resourceId: c.resourceId,
      completedAt: c.completedAt.toISOString(),
      timeSpentMinutes: c.timeSpentMinutes,
      rating: c.rating,
    })),
  }));

  const gatewayResources = serializedResources.filter((r) => r.tier === "GATEWAY");
  const intermediateResources = serializedResources.filter((r) => r.tier === "INTERMEDIATE");
  const advancedResources = serializedResources.filter((r) => r.tier === "ADVANCED");
  const referenceResources = serializedResources.filter((r) => r.tier === "REFERENCE");

  const serializedTopic = {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    status: topic.status,
    temperature: topic.temperature,
    whyInterested: topic.whyInterested,
    gatewayComplete: topic.gatewayComplete,
    intermediateStarted: topic.intermediateStarted,
    intermediateComplete: topic.intermediateComplete,
    advancedStarted: topic.advancedStarted,
    advancedComplete: topic.advancedComplete,
    tags: topic.tags.map((t) => ({ tag: { id: t.tag.id, name: t.tag.name } })),
    inspirations: topic.inspirations.map((i) => ({
      inspiredByTopic: i.inspiredByTopic
        ? { id: i.inspiredByTopic.id, title: i.inspiredByTopic.title }
        : null,
      context: i.context,
    })),
    reflections: topic.reflections.map((r) => ({
      id: r.id,
      title: r.title,
      tier: r.tier,
      content: r.content,
      writingTimeSeconds: r.writingTimeSeconds,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };

  return (
    <TopicDetailClient
      topic={serializedTopic}
      gatewayResources={gatewayResources}
      intermediateResources={intermediateResources}
      advancedResources={advancedResources}
      referenceResources={referenceResources}
      allTags={allTags}
    />
  );
}
