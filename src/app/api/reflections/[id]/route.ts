import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { updateReflectionSchema } from "@/lib/validations";
import { syncReflection } from "@/lib/obsidian";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const reflection = await prisma.reflection.findFirst({
    where: { id, userId },
    include: {
      tags: { include: { tag: true } },
      topic: { select: { id: true, title: true } },
    },
  });

  if (!reflection) {
    return apiError("NOT_FOUND", "Reflection not found", 404);
  }

  return apiSuccess({ reflection });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = updateReflectionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const reflection = await prisma.reflection.findFirst({
    where: { id, userId },
  });

  if (!reflection) {
    return apiError("NOT_FOUND", "Reflection not found", 404);
  }

  const input = parsed.data;

  // Handle tag replacement if tags provided
  if (input.tags !== undefined) {
    await prisma.reflectionTag.deleteMany({ where: { reflectionId: id } });

    if (input.tags.length > 0) {
      for (const name of input.tags) {
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
        });
        await prisma.reflectionTag.create({
          data: { reflectionId: id, tagId: tag.id },
        });
      }
    }
  }

  const updated = await prisma.reflection.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.content !== undefined ? { content: input.content.trim() } : {}),
      ...(input.writingTimeSeconds !== undefined
        ? { writingTimeSeconds: input.writingTimeSeconds }
        : {}),
    },
    include: {
      tags: { include: { tag: true } },
    },
  });

  // Update topic lastActivityAt only if topicId exists
  if (reflection.topicId) {
    await prisma.topic.update({
      where: { id: reflection.topicId },
      data: { lastActivityAt: new Date() },
    });
  }

  // Obsidian sync (awaited so the runtime doesn't kill it)
  let topic: { title: string; slug: string } | null = null;
  if (reflection.topicId) {
    topic = await prisma.topic.findUnique({
      where: { id: reflection.topicId },
      select: { title: true, slug: true },
    });
  }
  await syncReflection(updated, userId, topic);

  return apiSuccess({ reflection: updated });
}
