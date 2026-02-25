import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { updateSettingsSchema } from "@/lib/validations";
import { syncAllReflections } from "@/lib/obsidian";

export async function GET() {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      obsidianVaultPath: true,
      theme: true,
      notificationFrequency: true,
      timezone: true,
    },
  });

  return apiSuccess({ settings: user });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.obsidianVaultPath !== undefined ? { obsidianVaultPath: input.obsidianVaultPath } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.notificationFrequency !== undefined ? { notificationFrequency: input.notificationFrequency } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    },
    select: {
      obsidianVaultPath: true,
      theme: true,
      notificationFrequency: true,
      timezone: true,
    },
  });

  // When vault path is set/changed, sync all existing reflections
  let reflectionsSynced = 0;
  if (input.obsidianVaultPath && input.obsidianVaultPath.trim()) {
    reflectionsSynced = await syncAllReflections(userId);
  }

  return apiSuccess({ settings: user, reflectionsSynced });
}
