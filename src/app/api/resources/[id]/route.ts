import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { updateResourceSchema } from "@/lib/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  const { id } = await params;

  const existing = await prisma.resource.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Resource not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = updateResourceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  const updated = await prisma.resource.update({
    where: { id: existing.id },
    data: {
      title: input.title?.trim() ?? existing.title,
      type: input.type ?? existing.type,
      tier: input.tier ?? existing.tier,
      author: input.author !== undefined ? input.author?.trim() || null : existing.author,
      url: input.url !== undefined ? input.url?.trim() || null : existing.url,
      pageCount: input.pageCount !== undefined ? input.pageCount : existing.pageCount,
      estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes,
      description: input.description !== undefined ? input.description?.trim() || null : existing.description,
      userNotes: input.userNotes !== undefined ? input.userNotes?.trim() || null : existing.userNotes
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

  const existing = await prisma.resource.findFirst({
    where: { id, userId }
  });

  if (!existing) {
    return apiError("NOT_FOUND", "Resource not found", 404);
  }

  await prisma.resource.delete({
    where: { id: existing.id }
  });

  return apiSuccess({ deleted: true });
}
