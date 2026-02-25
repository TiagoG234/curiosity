import { z } from "zod";

export const createTopicSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  whyInterested: z.string().max(5000).optional(),
  initialQuestions: z.array(z.string()).optional(),
  temperature: z.enum(["HOT", "WARM", "COOL"]).optional(),
  tags: z.array(z.string().max(100)).optional(),
  concepts: z.array(z.string().max(100)).optional(),
  inspiration: z
    .object({
      inspiredByTopicId: z.string().optional(),
      context: z.string().max(2000).optional()
    })
    .optional()
});

export const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  whyInterested: z.string().max(5000).nullable().optional(),
  status: z.enum(["ACTIVE", "SATISFIED", "DORMANT", "ARCHIVED"]).optional(),
  temperature: z.enum(["HOT", "WARM", "COOL"]).optional(),
  gatewayComplete: z.boolean().optional(),
  intermediateStarted: z.boolean().optional(),
  intermediateComplete: z.boolean().optional(),
  advancedStarted: z.boolean().optional(),
  advancedComplete: z.boolean().optional()
});

export const createResourceSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  type: z.enum([
    "BOOK", "ARTICLE", "VIDEO", "PODCAST", "COURSE",
    "WIKIPEDIA", "DOCUMENTARY", "PAPER", "OTHER"
  ]),
  tier: z.enum(["GATEWAY", "INTERMEDIATE", "ADVANCED", "REFERENCE"]),
  author: z.string().max(200).optional(),
  url: z.string().max(2000).optional(),
  pageCount: z.number().int().positive().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  description: z.string().max(5000).optional(),
  goodreadsId: z.string().max(50).optional(),
  isbn: z.string().max(20).optional()
});

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  type: z.enum([
    "BOOK", "ARTICLE", "VIDEO", "PODCAST", "COURSE",
    "WIKIPEDIA", "DOCUMENTARY", "PAPER", "OTHER"
  ]).optional(),
  tier: z.enum(["GATEWAY", "INTERMEDIATE", "ADVANCED", "REFERENCE"]).optional(),
  author: z.string().max(200).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  pageCount: z.number().int().positive().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  userNotes: z.string().max(10000).nullable().optional()
});

export const completeResourceSchema = z.object({
  completedAt: z.string().datetime().optional(),
  timeSpentMinutes: z.number().int().positive().optional(),
  keyInsights: z.string().max(10000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  quick: z.boolean().optional()
});

export const createReflectionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(50000),
  topicId: z.string().min(1).optional(),
  tier: z.enum(["GATEWAY", "INTERMEDIATE", "ADVANCED", "REFERENCE"]).optional(),
  writingTimeSeconds: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(100)).optional(),
  advanceTo: z.enum(["INTERMEDIATE", "ADVANCED"]).optional(),
});

export const updateReflectionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  writingTimeSeconds: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(100)).optional(),
});

export const updateSettingsSchema = z.object({
  obsidianVaultPath: z.string().max(1000).nullable().optional(),
  theme: z.enum(["LIGHT", "DARK", "AUTO"]).optional(),
  notificationFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "NEVER"]).optional(),
  timezone: z.string().max(100).optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const addTagSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim().toLowerCase())
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type CompleteResourceInput = z.infer<typeof completeResourceSchema>;
export const reflectionPromptsSchema = z.object({
  context: z.enum(["tier_advancement", "freestyle", "topic_specific"]),
  topicId: z.string().min(1).optional(),
  tier: z.enum(["GATEWAY", "INTERMEDIATE", "ADVANCED"]).optional(),
  advanceTo: z.enum(["INTERMEDIATE", "ADVANCED"]).optional(),
}).refine(
  (data) => {
    if (data.context === "tier_advancement") {
      return !!data.topicId && !!data.tier && !!data.advanceTo;
    }
    if (data.context === "topic_specific") {
      return !!data.topicId;
    }
    return true;
  },
  {
    message: "tier_advancement requires topicId, tier, and advanceTo; topic_specific requires topicId",
  }
);

export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type UpdateReflectionInput = z.infer<typeof updateReflectionSchema>;
export type ReflectionPromptsInput = z.infer<typeof reflectionPromptsSchema>;
