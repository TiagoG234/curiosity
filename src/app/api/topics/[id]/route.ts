import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { updateTopicSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      resources: {
        where: { archived: false },
        orderBy: [{ tier: "asc" }, { orderIndex: "asc" }]
      },
      completions: true,
      reflections: true,
      tags: {
        include: { tag: true }
      },
      concepts: {
        include: { concept: true }
      },
      inspirations: {
        include: {
          inspiredByTopic: { select: { id: true, title: true } }
        }
      },
      inspiredTopics: {
        include: {
          topic: { select: { id: true, title: true } }
        }
      }
    }
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  return apiSuccess(topic);
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

  const parsed = updateTopicSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const topic = await prisma.topic.findFirst({
    where: { id, userId, deletedAt: null }
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  const input = parsed.data;
  const now = new Date();

  const updated = await prisma.topic.update({
    where: { id: topic.id },
    data: {
      title: input.title?.trim() ?? topic.title,
      description: input.description !== undefined ? input.description?.trim() || null : topic.description,
      whyInterested: input.whyInterested !== undefined ? input.whyInterested?.trim() || null : topic.whyInterested,
      status: input.status ?? topic.status,
      temperature: input.temperature ?? topic.temperature,
      // Tier progression
      ...(input.gatewayComplete !== undefined ? { gatewayComplete: input.gatewayComplete } : {}),
      ...(input.intermediateStarted !== undefined ? { intermediateStarted: input.intermediateStarted } : {}),
      ...(input.intermediateComplete !== undefined ? { intermediateComplete: input.intermediateComplete } : {}),
      ...(input.advancedStarted !== undefined ? { advancedStarted: input.advancedStarted } : {}),
      ...(input.advancedComplete !== undefined ? { advancedComplete: input.advancedComplete } : {}),
      // Shelving sets temperature to COOL
      ...(input.status === "DORMANT" ? { shelvedAt: now, temperature: "COOL" } : {}),
      ...(input.status === "SATISFIED" ? { satisfiedAt: now } : {}),
      // Reactivating clears shelvedAt and bumps lastActivityAt
      ...(input.status === "ACTIVE" && topic.status === "DORMANT"
        ? { shelvedAt: null, lastActivityAt: now, temperature: input.temperature ?? "WARM" }
        : {}),
    }
  });

  return apiSuccess(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId, deletedAt: null }
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  await prisma.topic.update({
    where: { id: topic.id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ deleted: true });
}
