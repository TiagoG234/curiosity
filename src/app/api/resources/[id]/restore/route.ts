import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function PATCH(
  _request: NextRequest,
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

  if (!resource.archived) {
    return apiError("NOT_ARCHIVED", "Resource is not archived", 400);
  }

  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: {
      archived: false,
      archivedAt: null,
      archiveReason: null
    }
  });

  return apiSuccess(updated);
}
