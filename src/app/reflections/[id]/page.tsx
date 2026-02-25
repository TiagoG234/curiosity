import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ReflectionEditor } from "@/components/ReflectionEditor";

interface ReflectionEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReflectionEditPage({ params }: ReflectionEditPageProps) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const reflection = await prisma.reflection.findFirst({
    where: { id, userId },
    include: {
      tags: { include: { tag: true } },
      topic: { select: { id: true, title: true } },
    },
  });

  if (!reflection) notFound();

  // Fetch user's existing tags for the tag selector
  const userTags = await prisma.tag.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <ReflectionEditor
      mode="edit"
      reflectionId={reflection.id}
      topicId={reflection.topicId}
      topicTitle={reflection.topic?.title ?? null}
      tier={reflection.tier as "GATEWAY" | "INTERMEDIATE" | "ADVANCED" | null}
      initialTitle={reflection.title}
      initialContent={reflection.content}
      initialWritingTimeSeconds={reflection.writingTimeSeconds}
      initialTags={reflection.tags.map((rt) => rt.tag.name)}
      existingTags={userTags}
    />
  );
}
