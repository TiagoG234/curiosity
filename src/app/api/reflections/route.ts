import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { createReflectionSchema } from "@/lib/validations";
import { syncReflection } from "@/lib/obsidian";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const topicId = request.nextUrl.searchParams.get("topicId");

  const reflections = await prisma.reflection.findMany({
    where: {
      userId,
      ...(topicId ? { topicId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      topic: { select: { id: true, title: true } },
    },
  });

  return apiSuccess({ reflections });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = createReflectionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  // Validate topicId belongs to user if provided
  let topic: { id: string; title: string; slug: string } | null = null;
  if (input.topicId) {
    topic = await prisma.topic.findFirst({
      where: { id: input.topicId, userId },
      select: { id: true, title: true, slug: true },
    });
    if (!topic) {
      return apiError("NOT_FOUND", "Topic not found", 404);
    }
  }

  // Create reflection with tags
  const reflection = await prisma.reflection.create({
    data: {
      userId,
      topicId: input.topicId ?? null,
      tier: input.tier ?? null,
      title: input.title.trim(),
      content: input.content.trim(),
      writingTimeSeconds: input.writingTimeSeconds ?? 0,
      tags: input.tags?.length
        ? {
            create: input.tags.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { userId_name: { userId, name } },
                  create: { userId, name },
                },
              },
            })),
          }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
    },
  });

  // Update topic lastActivityAt if topicId provided
  if (input.topicId) {
    await prisma.topic.update({
      where: { id: input.topicId },
      data: { lastActivityAt: new Date() },
    });
  }

  // Handle tier advancement if advanceTo is specified
  let tierAdvanced = false;
  if (input.advanceTo && input.topicId) {
    const field =
      input.advanceTo === "INTERMEDIATE"
        ? { intermediateStarted: true }
        : { advancedStarted: true };
    await prisma.topic.update({
      where: { id: input.topicId },
      data: field,
    });
    tierAdvanced = true;
  }

  // Obsidian sync (awaited so the runtime doesn't kill it)
  await syncReflection(reflection, userId, topic);

  return apiSuccess({ reflection, tierAdvanced }, undefined, 201);
}
