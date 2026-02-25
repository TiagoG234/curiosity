import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api";
import { createTopicSchema } from "@/lib/validations";
import { Prisma } from "@prisma/client";
import { slugify } from "@/lib/obsidian";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") as Prisma.TopicWhereInput["status"] | null;

  const topics = await prisma.topic.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(status ? { status } : {})
    },
    orderBy: [
      { temperature: "desc" },
      { lastActivityAt: "desc" }
    ],
    include: {
      tags: {
        include: {
          tag: true
        }
      },
      inspirations: {
        include: {
          inspiredByTopic: { select: { id: true, title: true } }
        }
      },
      _count: {
        select: { resources: true, completions: true }
      }
    }
  });

  return apiSuccess(topics);
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON body", 400);
  }

  const parsed = createTopicSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const input = parsed.data;

  const baseSlug = slugify(input.title);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.topic.findFirst({
      where: { userId, slug, deletedAt: null }
    });
    if (!existing) break;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const now = new Date();

  const topic = await prisma.topic.create({
    data: {
      userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      slug,
      whyInterested: input.whyInterested?.trim() || null,
      initialQuestions: input.initialQuestions ?? [],
      temperature: input.temperature ?? "WARM",
      status: "ACTIVE",
      lastActivityAt: now,
      interestStartDate: now,
      tags: input.tags
        ? {
            create: input.tags.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: {
                    userId_name: { userId, name }
                  },
                  create: { userId, name }
                }
              }
            }))
          }
        : undefined,
      inspirations: input.inspiration
        ? {
            create: {
              inspiredByTopicId: input.inspiration.inspiredByTopicId || null,
              context: input.inspiration.context || null
            }
          }
        : undefined
    },
    include: {
      tags: {
        include: { tag: true }
      },
      inspirations: {
        include: {
          inspiredByTopic: { select: { id: true, title: true } }
        }
      }
    }
  });

  return apiSuccess(topic, undefined, 201);
}
