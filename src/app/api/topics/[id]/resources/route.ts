import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { createResourceSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const resources = await prisma.resource.findMany({
    where: {
      userId,
      topicId: id,
      archived: false
    },
    orderBy: [{ tier: "asc" }, { orderIndex: "asc" }, { createdAt: "asc" }],
    include: {
      completions: { where: { userId } }
    }
  });

  return apiSuccess(resources);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId }
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = createResourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  const highestIndex = await prisma.resource.aggregate({
    where: { userId, topicId: id, tier: input.tier },
    _max: { orderIndex: true }
  });

  const orderIndex = (highestIndex._max.orderIndex ?? 0) + 1;

  const resource = await prisma.resource.create({
    data: {
      userId,
      topicId: id,
      title: input.title.trim(),
      type: input.type,
      tier: input.tier,
      author: input.author?.trim() || null,
      url: input.url?.trim() || null,
      pageCount: input.pageCount ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      description: input.description?.trim() || null,
      goodreadsId: input.goodreadsId?.trim() || null,
      isbn: input.isbn?.trim() || null,
      orderIndex
    }
  });

  // Adding an uncompleted resource to a "complete" tier invalidates the flag
  const tierField: Record<string, string> = {
    GATEWAY: "gatewayComplete",
    INTERMEDIATE: "intermediateComplete",
    ADVANCED: "advancedComplete",
  };
  const flagToReset = tierField[input.tier];
  const resetFlag = flagToReset && topic[flagToReset as keyof typeof topic] === true
    ? { [flagToReset]: false }
    : {};

  await prisma.topic.update({
    where: { id },
    data: { lastActivityAt: new Date(), ...resetFlag }
  });

  return apiSuccess(resource, undefined, 201);
}
