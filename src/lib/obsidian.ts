import { prisma } from "@/lib/prisma";
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface ReflectionData {
  id: string;
  title: string;
  content: string;
  tier: string | null;
  writingTimeSeconds: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: { tag: { name: string } }[];
}

interface TopicData {
  title: string;
  slug: string;
}

const REFLECTION_TEMPLATE = `---
id: ""
title: ""
topic: ""
tier: ""
tags: []
writing_time_seconds: 0
created: ""
updated: ""
synced: ""
---

`;

export function getReflectionPath(
  vaultPath: string,
  topicSlug: string | null,
  tier: string | null,
  title: string
): string {
  const topicFolder = topicSlug || "_standalone";
  const tierFolder = tier ? tier.toLowerCase() : "unsorted";
  const filename = `${slugify(title)}.md`;
  return join(vaultPath, "reflections", topicFolder, tierFolder, filename);
}

export function formatReflectionMarkdown(
  reflection: ReflectionData,
  topic?: TopicData | null
): string {
  const tags = reflection.tags?.map((t) => t.tag.name) || [];
  const tagsStr = tags.map((t) => `"${t}"`).join(", ");

  const now = new Date().toISOString();

  return `---
id: "${reflection.id}"
title: "${reflection.title.replace(/"/g, '\\"')}"
topic: "${topic?.title?.replace(/"/g, '\\"') || ""}"
tier: "${reflection.tier?.toLowerCase() || ""}"
tags: [${tagsStr}]
writing_time_seconds: ${reflection.writingTimeSeconds}
created: ${reflection.createdAt.toISOString()}
updated: ${reflection.updatedAt.toISOString()}
synced: ${now}
---

${reflection.content}
`;
}

async function ensureTemplate(vaultPath: string): Promise<void> {
  const templatePath = join(vaultPath, "templates", "reflection.md");
  try {
    await access(templatePath);
  } catch {
    await mkdir(dirname(templatePath), { recursive: true });
    await writeFile(templatePath, REFLECTION_TEMPLATE, "utf-8");
  }
}

export async function syncAllReflections(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { obsidianVaultPath: true },
  });

  const vaultPath = user?.obsidianVaultPath;
  if (!vaultPath) return 0;

  const reflections = await prisma.reflection.findMany({
    where: { userId },
    include: {
      tags: { include: { tag: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  let synced = 0;
  for (const reflection of reflections) {
    try {
      await ensureTemplate(vaultPath);

      const filePath = getReflectionPath(
        vaultPath,
        reflection.topic?.slug || null,
        reflection.tier,
        reflection.title
      );

      const markdown = formatReflectionMarkdown(reflection, reflection.topic);

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, markdown, "utf-8");
      synced++;
    } catch (error) {
      console.error(`[obsidian] Failed to sync reflection ${reflection.id}:`, error);
    }
  }

  return synced;
}

export async function syncReflection(
  reflection: ReflectionData,
  userId: string,
  topic?: TopicData | null
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { obsidianVaultPath: true },
    });

    const vaultPath = user?.obsidianVaultPath;
    if (!vaultPath) return;

    await ensureTemplate(vaultPath);

    const filePath = getReflectionPath(
      vaultPath,
      topic?.slug || null,
      reflection.tier,
      reflection.title
    );

    const markdown = formatReflectionMarkdown(reflection, topic);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, markdown, "utf-8");
  } catch (error) {
    console.error("[obsidian] Failed to sync reflection:", error);
  }
}
