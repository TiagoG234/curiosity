import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return apiError("VALIDATION_ERROR", "Search query parameter 'q' is required", 400);
  }

  const query = q.trim();

  // For now, search topic titles using case-insensitive contains
  const topics = await prisma.topic.findMany({
    where: {
      userId,
      deletedAt: null,
      title: {
        contains: query,
        mode: "insensitive"
      }
    },
    orderBy: { lastActivityAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      temperature: true,
      slug: true
    }
  });

  return apiSuccess({
    query,
    results: {
      topics,
      resources: [],
      reflections: []
    },
    totalCount: topics.length
  });
}
