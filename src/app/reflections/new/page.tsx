import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReflectionEditor } from "@/components/ReflectionEditor";

interface ReflectionNewPageProps {
  searchParams: Promise<{
    topicId?: string;
    tier?: string;
    advanceTo?: string;
    duration?: string;
    explore?: string;
  }>;
}

export default async function ReflectionNewPage({ searchParams }: ReflectionNewPageProps) {
  const { topicId, tier, advanceTo, duration, explore } = await searchParams;
  const countdownSeconds = duration ? parseInt(duration, 10) : null;
  const userId = await getCurrentUserId();

  let topicData: { id: string; title: string } | null = null;
  let topicTagNames: string[] = [];

  if (topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: topicId, userId },
      select: {
        id: true,
        title: true,
        tags: { include: { tag: { select: { name: true } } } },
      },
    });
    if (!topic) notFound();
    topicData = { id: topic.id, title: topic.title };
    topicTagNames = topic.tags.map((t) => t.tag.name);
  }

  // Fetch user's existing tags for the tag selector
  const userTags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ReflectionEditor
      mode="create"
      topicId={topicData?.id ?? null}
      topicTitle={topicData?.title ?? null}
      tier={(tier as "GATEWAY" | "INTERMEDIATE" | "ADVANCED") ?? null}
      advanceTo={(advanceTo as "INTERMEDIATE" | "ADVANCED") ?? null}
      initialTags={topicTagNames}
      existingTags={userTags}
      countdownSeconds={countdownSeconds && countdownSeconds > 0 ? countdownSeconds : null}
      fromExplore={explore === "1"}
    />
  );
}
