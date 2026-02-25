import { GoogleGenAI } from "@google/genai";

export interface ReflectionPromptSuggestion {
  prompt: string;
  suggestedTitle: string;
}

export interface ResourceSuggestion {
  title: string;
  author: string | null;
  type: string;
  url: string | null;
  estimatedMinutes: number | null;
  description: string | null;
}

const TIER_PROMPTS: Record<string, string> = {
  GATEWAY:
    `Suggest 5-7 freely accessible gateway resources. You MUST only use these two types:
- type WIKIPEDIA: a Wikipedia article. The "title" field must be the exact Wikipedia article title as it appears in the URL (e.g. "World War II", "Photosynthesis", "Roman Republic"). Do NOT append "- Wikipedia" or any other suffix.
- type VIDEO: a YouTube video from a well-known educational channel. Only use channels you are certain produce content on this topic: CrashCourse, 3Blue1Brown, Kurzgesagt, Khan Academy, TED-Ed, Vsauce, SciShow, Veritasium, PBS Space Time, or similar. The "title" must be the exact video title; "author" must be the channel name.
Do NOT suggest type ARTICLE, BOOK, PODCAST, or COURSE. Wikipedia and YouTube are the only acceptable types for gateway resources.`,
  INTERMEDIATE:
    `Suggest 5-7 intermediate resources for someone who understands the basics. Prioritize type BOOK and type COURSE. For books: use the exact published title and the author's full name as it appears on the cover — this is critical for lookup. Only suggest books that are widely cited and that you are highly confident exist with this exact title and author. Prefer books with strong Goodreads ratings and Reddit/HN consensus.`,
  ADVANCED:
    `Suggest 5-7 advanced resources for deep study. Prioritize type BOOK and type PAPER. For books and papers: use the exact published title and the author's full name — this is critical for lookup. Only suggest resources that are widely cited in academic or expert communities and that you are highly confident exist with this exact title.`,
};

const VALID_TYPES = new Set([
  "WIKIPEDIA", "ARTICLE", "VIDEO", "BOOK", "PODCAST",
  "COURSE", "PAPER", "DOCUMENTARY", "OTHER",
]);

export async function suggestResources(params: {
  topicTitle: string;
  topicDescription?: string;
  tier: "GATEWAY" | "INTERMEDIATE" | "ADVANCED";
  existingResourceTitles: string[];
}): Promise<ResourceSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const tierPrompt = TIER_PROMPTS[params.tier];
  if (!tierPrompt) return [];

  const existingClause =
    params.existingResourceTitles.length > 0
      ? `\nAlready added (do NOT suggest these): ${params.existingResourceTitles.join(", ")}`
      : "";

  const prompt = `${tierPrompt}

Topic: ${params.topicTitle}${params.topicDescription ? `\nContext: ${params.topicDescription}` : ""}${existingClause}

Task: Recommend highly-regarded learning resources on this topic. Base recommendations on real-world consensus (Goodreads, Hacker News, Reddit, expert opinion). Every resource must genuinely exist — titles and authors will be looked up via external APIs, so accuracy is essential.

Return ONLY a JSON array (no markdown, no explanation):
[{
  "title": "Exact resource title",
  "author": "Author or channel name",
  "type": "WIKIPEDIA|ARTICLE|VIDEO|BOOK|PODCAST|COURSE|PAPER|DOCUMENTARY",
  "estimatedMinutes": <number>,
  "description": "One-sentence description of why this resource is good for this level"
}]`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return [];

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    const existingLower = new Set(
      params.existingResourceTitles.map((t) => t.toLowerCase())
    );

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          typeof item.title === "string" &&
          item.title.trim() &&
          !existingLower.has(item.title.toLowerCase())
      )
      .slice(0, 10)
      .map((item: Record<string, unknown>) => {
        const title = String(item.title).trim();
        const type = VALID_TYPES.has(String(item.type)) ? String(item.type) : "OTHER";
        const url = type === "WIKIPEDIA"
          ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`
          : null;
        return {
          title,
          author: typeof item.author === "string" ? item.author.trim() || null : null,
          type,
          url,
          estimatedMinutes: typeof item.estimatedMinutes === "number" ? item.estimatedMinutes : null,
          description: typeof item.description === "string" ? item.description.trim() || null : null,
        };
      });
  } catch (error) {
    console.error("[ai] suggestResources failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("AI_REQUEST_FAILED");
  }
}

// ============================================
// TOPIC META (tags + description)
// ============================================

export interface TopicMetaSuggestion {
  description: string;
  tags: string[];
}

export async function suggestTopicMeta(params: {
  title: string;
  existingTags: string[];
}): Promise<TopicMetaSuggestion | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const existingClause =
    params.existingTags.length > 0
      ? `\nThe user already has these tags in their system: ${params.existingTags.join(", ")}. Reuse existing tags when appropriate before inventing new ones.`
      : "";

  const prompt = `Given a learning topic titled "${params.title}", generate:

1. A concise description (1-2 sentences) explaining what this topic covers and why someone might study it. Write from a neutral, encyclopedic perspective.
2. 2-5 relevant tags for categorization. Tags should be lowercase, single words or short hyphenated phrases (e.g., "machine-learning", "history", "philosophy").${existingClause}

Return ONLY a JSON object (no markdown, no explanation):
{
  "description": "The description text",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(jsonString);
    if (typeof parsed.description !== "string" || !Array.isArray(parsed.tags)) return null;

    return {
      description: parsed.description.trim(),
      tags: parsed.tags
        .filter((t: unknown) => typeof t === "string" && t.trim())
        .map((t: string) => t.trim().toLowerCase())
        .slice(0, 5),
    };
  } catch (error) {
    console.error("[ai] suggestTopicMeta failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("AI_REQUEST_FAILED");
  }
}

// ============================================
// EXPLORE INSIGHTS (suggestion + relevance scores)
// ============================================

export interface ExploreInsights {
  suggestedTopic: {
    title: string;
    description: string;
    rationale: string;
    tags: string[];
  };
  topicScores: {
    topicId: string;
    score: number; // 0-30, added to existing score
  }[];
}

export async function suggestExploreInsights(params: {
  recentCompletions: { resourceTitle: string; topicTitle: string; keyInsights: string | null }[];
  recentReflections: { title: string; topicTitle: string | null; content: string }[];
  topics: { id: string; title: string; status: string; temperature: string; tags: string[] }[];
  excludeTitles?: string[];
  spicy?: boolean;
}): Promise<ExploreInsights | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const completionLines = params.recentCompletions
    .slice(0, 20)
    .map((c) => `- "${c.resourceTitle}" (topic: ${c.topicTitle})${c.keyInsights ? ` — ${c.keyInsights.slice(0, 6000)}` : ""}`)
    .join("\n");

  const reflectionLines = params.recentReflections
    .slice(0, 10)
    .map((r) => `- "${r.title}"${r.topicTitle ? ` (topic: ${r.topicTitle})` : ""}: ${r.content.slice(0, 6000)}`)
    .join("\n");

  const topicLines = params.topics
    .slice(0, 30)
    .map((t) => `- id:${t.id} "${t.title}" [${t.status}, ${t.temperature}]${t.tags.length ? ` tags: ${t.tags.join(", ")}` : ""}`)
    .join("\n");

  const excludeClause = params.excludeTitles && params.excludeTitles.length > 0
    ? `\n\nIMPORTANT: Do NOT suggest any of these topics (already shown to the user):\n${params.excludeTitles.map((t) => `- "${t}"`).join("\n")}`
    : "";

  const suggestionInstruction = params.spicy
    ? `2. Suggest 1 new topic that is DELIBERATELY from a different domain than their recent activity. The goal is a surprising lateral connection — something that bridges two or more of their existing interests in an unexpected way, or comes from a completely different field that a curious generalist would love. Do NOT suggest more of what they've been reading lately. Think: what's the most intellectually surprising topic that could connect threads from their broader interest landscape? It should feel like a genuine "oh, I never thought of that" moment.${excludeClause}`
    : `2. Suggest 1 new topic they haven't explored yet that connects to their recent interests. It should be a natural next curiosity — something they'd find surprising and delightful. Don't suggest something they already have.${excludeClause}`;

  const prompt = `You are helping a curious learner discover what to explore next.

${completionLines ? `Recent completions:\n${completionLines}\n` : ""}
${reflectionLines ? `Recent reflections:\n${reflectionLines}\n` : ""}
Current topics:\n${topicLines || "(none)"}

Do two things:

1. Score each topic 0-30 for how relevant it is to the learner's current momentum and recent activity. Higher = more aligned with what they've been actively exploring. Topics with no recent activity should get low scores. If there's no recent activity data, score all topics 0.

${suggestionInstruction}

Return ONLY a JSON object (no markdown, no explanation):
{
  "suggestedTopic": {
    "title": "Topic title",
    "description": "One-sentence description",
    "rationale": "Why this connects to their interests",
    "tags": ["tag1", "tag2"]
  },
  "topicScores": [
    { "topicId": "the-id", "score": 20 }
  ]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(jsonString);

    // Validate suggestedTopic
    const suggested = parsed.suggestedTopic;
    if (
      !suggested ||
      typeof suggested.title !== "string" ||
      typeof suggested.description !== "string" ||
      typeof suggested.rationale !== "string"
    ) {
      return null;
    }

    // Validate and filter topicScores
    const validTopicIds = new Set(params.topics.map((t) => t.id));
    const topicScores: ExploreInsights["topicScores"] = Array.isArray(parsed.topicScores)
      ? parsed.topicScores
          .filter(
            (s: Record<string, unknown>) =>
              typeof s.topicId === "string" &&
              validTopicIds.has(s.topicId) &&
              typeof s.score === "number" &&
              s.score >= 0 &&
              s.score <= 30
          )
          .map((s: Record<string, unknown>) => ({
            topicId: String(s.topicId),
            score: Math.round(Number(s.score)),
          }))
      : [];

    return {
      suggestedTopic: {
        title: String(suggested.title).trim(),
        description: String(suggested.description).trim(),
        rationale: String(suggested.rationale).trim(),
        tags: Array.isArray(suggested.tags)
          ? suggested.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim().toLowerCase()).slice(0, 5)
          : [],
      },
      topicScores,
    };
  } catch (error) {
    console.error("[ai] suggestExploreInsights failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("AI_REQUEST_FAILED");
  }
}

// ============================================
// REFLECTION PROMPTS
// ============================================

interface TierAdvancementContext {
  type: "tier_advancement";
  topicTitle: string;
  topicDescription?: string;
  tier: string;
  advanceTo: string;
  completedResources: { title: string; keyInsights: string | null }[];
  existingReflections: { title: string; contentSnippet: string }[];
}

interface FreestyleContext {
  type: "freestyle";
  recentTopics: { title: string; description: string | null; status: string; tags: string[] }[];
  recentReflections: { title: string; contentSnippet: string }[];
}

interface TopicSpecificContext {
  type: "topic_specific";
  topicTitle: string;
  topicDescription?: string;
  currentTierLevel: string;
  resources: { title: string; tier: string; completed: boolean; keyInsights: string | null }[];
  existingReflections: { title: string; contentSnippet: string }[];
}

type ReflectionContext = TierAdvancementContext | FreestyleContext | TopicSpecificContext;

function buildReflectionPrompt(ctx: ReflectionContext): string {
  if (ctx.type === "tier_advancement") {
    const resourceList = ctx.completedResources
      .map((r) => `- "${r.title}"${r.keyInsights ? ` (insights: ${r.keyInsights.slice(0, 500)})` : ""}`)
      .join("\n");
    const reflectionList = ctx.existingReflections
      .map((r) => `- "${r.title}": ${r.contentSnippet}`)
      .join("\n");

    const tierLevel = ctx.tier.toLowerCase();

    return `You are helping a learner reflect after completing the ${tierLevel} tier of "${ctx.topicTitle}".
${ctx.topicDescription ? `Topic description: ${ctx.topicDescription}` : ""}

They completed these ${tierLevel} resources:
${resourceList || "(none recorded)"}

${reflectionList ? `Their existing reflections on this tier:\n${reflectionList}\n` : ""}
They are about to advance to the ${ctx.advanceTo.toLowerCase()} tier.

Generate 3 reflection prompts that:
- Challenge them to synthesize what they learned across the completed resources
- Are calibrated to the ${tierLevel} level (${tierLevel === "gateway" ? "foundational understanding" : tierLevel === "intermediate" ? "analytical thinking" : "deep synthesis"})
- Reference specific resources or insights when possible
- Help them articulate what they want from the next tier

${reflectionList ? "- Avoid angles already covered in their existing reflections" : ""}

Return ONLY a JSON array (no markdown, no explanation):
[{ "prompt": "The reflection question/prompt", "suggestedTitle": "A short title for this reflection (3-6 words)" }]`;
  }

  if (ctx.type === "freestyle") {
    const topicList = ctx.recentTopics
      .map((t) => `- "${t.title}" (${t.status.toLowerCase()}${t.tags.length ? `, tags: ${t.tags.join(", ")}` : ""})${t.description ? `: ${t.description.slice(0, 250)}` : ""}`)
      .join("\n");
    const reflectionList = ctx.recentReflections
      .map((r) => `- "${r.title}": ${r.contentSnippet}`)
      .join("\n");

    return `You are helping a learner write a freestyle reflection that connects ideas across their interests.

Their recent topics:
${topicList || "(no topics yet)"}

${reflectionList ? `Their recent reflections:\n${reflectionList}\n` : ""}
Generate 3 interdisciplinary reflection prompts that:
- Draw connections between 2 or more of their topics
- Encourage lateral thinking and unexpected parallels
- Reference specific topic names from their list
- Are open-ended and exploratory (not completion-oriented)

Return ONLY a JSON array (no markdown, no explanation):
[{ "prompt": "The reflection question/prompt", "suggestedTitle": "A short title for this reflection (3-6 words)" }]`;
  }

  // topic_specific
  const resourcesByTier = ctx.resources.reduce<Record<string, typeof ctx.resources>>((acc, r) => {
    (acc[r.tier] ??= []).push(r);
    return acc;
  }, {});

  const resourceList = Object.entries(resourcesByTier)
    .map(([tier, resources]) => {
      const items = resources
        .map((r) => `  - "${r.title}" (${r.completed ? "completed" : "not started"}${r.keyInsights ? `, insights: ${r.keyInsights.slice(0, 400)}` : ""})`)
        .join("\n");
      return `${tier}:\n${items}`;
    })
    .join("\n");

  const reflectionList = ctx.existingReflections
    .map((r) => `- "${r.title}": ${r.contentSnippet}`)
    .join("\n");

  return `You are helping a learner reflect on their study of "${ctx.topicTitle}".
${ctx.topicDescription ? `Topic description: ${ctx.topicDescription}` : ""}
Current level: ${ctx.currentTierLevel.toLowerCase()}

Resources:
${resourceList || "(none yet)"}

${reflectionList ? `Their existing reflections on this topic:\n${reflectionList}\n` : ""}
Generate 3 reflection prompts that:
- Are appropriate for the ${ctx.currentTierLevel.toLowerCase()} level (${ctx.currentTierLevel === "GATEWAY" ? "foundational" : ctx.currentTierLevel === "INTERMEDIATE" ? "analytical" : "synthesis-level"})
- Reference their specific resources or insights when possible
- Are about this topic specifically
${reflectionList ? "- Avoid angles already covered in their existing reflections" : ""}

Return ONLY a JSON array (no markdown, no explanation):
[{ "prompt": "The reflection question/prompt", "suggestedTitle": "A short title for this reflection (3-6 words)" }]`;
}

export async function suggestReflectionPrompts(
  ctx: ReflectionContext
): Promise<ReflectionPromptSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const prompt = buildReflectionPrompt(ctx);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return [];

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const jsonString = jsonMatch ? jsonMatch[0] : text;

    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          typeof item.prompt === "string" &&
          item.prompt.trim() &&
          typeof item.suggestedTitle === "string" &&
          item.suggestedTitle.trim()
      )
      .slice(0, 3)
      .map((item: Record<string, unknown>) => ({
        prompt: String(item.prompt).trim(),
        suggestedTitle: String(item.suggestedTitle).trim(),
      }));
  } catch (error) {
    console.error("[ai] suggestReflectionPrompts failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("AI_REQUEST_FAILED");
  }
}