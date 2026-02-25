import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { completeResourceSchema } from "@/lib/validations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const resource = await prisma.resource.findFirst({
    where: { id, userId }
  });

  if (!resource) {
    return apiError("NOT_FOUND", "Resource not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = completeResourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;
  const completedAt = input.completedAt ? new Date(input.completedAt) : new Date();

  const completion = await prisma.completion.upsert({
    where: {
      userId_resourceId: {
        userId,
        resourceId: resource.id
      }
    },
    update: {
      completedAt,
      timeSpentMinutes: input.timeSpentMinutes ?? null,
      keyInsights: input.keyInsights?.trim() ?? null,
      rating: input.rating ?? null
    },
    create: {
      userId,
      resourceId: resource.id,
      topicId: resource.topicId,
      completedAt,
      timeSpentMinutes: input.timeSpentMinutes ?? null,
      keyInsights: input.keyInsights?.trim() ?? null,
      rating: input.rating ?? null
    }
  });

  await prisma.topic.update({
    where: { id: resource.topicId },
    data: { lastActivityAt: completedAt }
  });

  // Create a reflection if the user wrote insights
  if (input.keyInsights?.trim()) {
    await prisma.reflection.create({
      data: {
        userId,
        topicId: resource.topicId,
        tier: resource.tier === "REFERENCE" ? null : resource.tier as "GATEWAY" | "INTERMEDIATE" | "ADVANCED",
        title: `${resource.title} review`,
        content: input.keyInsights.trim(),
      },
    });
  }

  // Check if the completed resource's tier is now fully complete
  let showDecisionModal = false;
  let completedTier: string | null = null;

  const tierCompletionField: Record<string, "gatewayComplete" | "intermediateComplete" | "advancedComplete"> = {
    GATEWAY: "gatewayComplete",
    INTERMEDIATE: "intermediateComplete",
    ADVANCED: "advancedComplete",
  };

  const field = tierCompletionField[resource.tier];
  if (field) {
    const topic = await prisma.topic.findUnique({
      where: { id: resource.topicId },
      include: {
        resources: {
          where: { tier: resource.tier, archived: false }
        },
        completions: true
      }
    });

    if (topic && !topic[field]) {
      const tierResources = topic.resources;
      const completedIds = new Set(topic.completions.map((c) => c.resourceId));
      const allComplete = tierResources.every((r) => completedIds.has(r.id));

      if (allComplete && tierResources.length > 0) {
        await prisma.topic.update({
          where: { id: topic.id },
          data: { [field]: true }
        });
        showDecisionModal = true;
        completedTier = resource.tier;
      }
    }
  }

  return apiSuccess({ completion, showDecisionModal, completedTier }, undefined, 201);
}
