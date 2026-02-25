import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";

export async function PATCH(
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

  if (resource.archived) {
    return apiError("ALREADY_ARCHIVED", "Resource is already archived", 400);
  }

  let body: { archiveReason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // archiveReason is optional, so empty body is fine
  }

  const updated = await prisma.resource.update({
    where: { id: resource.id },
    data: {
      archived: true,
      archivedAt: new Date(),
      archiveReason: body.archiveReason?.trim() || null
    }
  });

  return apiSuccess(updated);
}
