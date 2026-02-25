import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId },
  });

  if (!topic) {
    return apiError("NOT_FOUND", "Topic not found", 404);
  }

  const reflections = await prisma.reflection.findMany({
    where: { topicId: id, userId },
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
    },
  });

  return apiSuccess({ reflections });
}
