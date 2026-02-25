import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { addTagSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const userId = await getCurrentUserId();

  // Verify topic belongs to user
  const topic = await prisma.topic.findFirst({
    where: { id: topicId, userId },
    select: { id: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = addTagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  // connectOrCreate tag, then create TopicTag junction
  const tag = await prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    update: {},
    create: { userId, name },
  });

  // Create junction (ignore if already exists)
  await prisma.topicTag.upsert({
    where: { topicId_tagId: { topicId, tagId: tag.id } },
    update: {},
    create: { topicId, tagId: tag.id },
  });

  return NextResponse.json({ data: { id: tag.id, name: tag.name } });
}
