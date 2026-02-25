# Plan: Reflections Feature

## Context

Reflections are first-class writing entities. Currently the Reflection model exists with basic CRUD APIs, but lacks a title field, requires a topic, has no tag support, and the `ReflectionSection` component is imported but never rendered. The goal is to:

- Make reflections standalone entities with titles, tags, and optional topic association
- Gate tier advancement behind writing a reflection (Gateway→Intermediate, Intermediate→Advanced)
- Show reflections as cards in a right-side column on the topic detail page
- Create dedicated reflection writing/editing pages with a writing timer and word count

## Implementation Order

### 1. Prisma Schema
**File:** `prisma/schema.prisma`

Modify the `Reflection` model:
- Add `title String` (required; use `@default("Untitled")` temporarily for migration, remove after)
- Make `topicId String?` (optional)
- Make `topic Topic?` (optional relation)
- Make `tier ResourceTier?` (optional)
- Add `writingTimeSeconds Int @default(0)`
- Add `tags ReflectionTag[]`

Add new model:
```prisma
model ReflectionTag {
  reflectionId String
  reflection   Reflection @relation(fields: [reflectionId], references: [id], onDelete: Cascade)
  tagId        String
  tag          Tag        @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([reflectionId, tagId])
  @@index([tagId])
}
```

Update `Tag` model: add `reflections ReflectionTag[]` relation field.

Run `npx prisma db push` to apply.

### 2. Validation Schemas
**File:** `src/lib/validations.ts`

Replace `createReflectionSchema`:
```typescript
z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(50000),
  topicId: z.string().min(1).optional(),
  tier: z.enum(["GATEWAY", "INTERMEDIATE", "ADVANCED", "REFERENCE"]).optional(),
  writingTimeSeconds: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(100)).optional(),
  advanceTo: z.enum(["INTERMEDIATE", "ADVANCED"]).optional(),
})
```

Replace `updateReflectionSchema`:
```typescript
z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  writingTimeSeconds: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(100)).optional(),
})
```

### 3. API Routes

#### 3a. POST /api/reflections
**File:** `src/app/api/reflections/route.ts`

Rewrite POST handler:
- Accept optional `topicId`, `tier`, `tags`, `writingTimeSeconds`, `advanceTo`
- If `topicId` provided, verify ownership
- Create reflection with tag `connectOrCreate` (same pattern as topic creation in `NewTopicForm`)
- If `topicId` present, update `topic.lastActivityAt`
- If `advanceTo` AND `topicId` present, set `intermediateStarted: true` or `advancedStarted: true` on the topic
- Return `{ reflection, tierAdvanced: boolean }`

Add GET handler (same file):
- List all user reflections, optionally filtered by `?topicId=X`
- Include tags and topic select

#### 3b. GET + PATCH /api/reflections/[id]
**File:** `src/app/api/reflections/[id]/route.ts`

Add GET handler:
- Fetch single reflection by id, verify ownership
- Include `tags: { include: { tag: true } }` and `topic: { select: { id, title } }`

Rewrite PATCH handler:
- Accept optional `title`, `content`, `writingTimeSeconds`, `tags`
- Tags: delete-all-then-recreate strategy (`deleteMany` + upsert/create)
- **Critical fix:** guard `topic.update` with `if (reflection.topicId)` — currently crashes if topicId is null

#### 3c. GET /api/topics/[id]/reflections
**File:** `src/app/api/topics/[id]/reflections/route.ts`

Add `include: { tags: { include: { tag: true } } }` to the query.

### 4. Extract `getRelativeTime` to utils
**File:** `src/lib/utils.ts`

Move `getRelativeTime` from `src/app/dashboard/page.tsx:44-56` into `src/lib/utils.ts`. Update dashboard import. This function is needed by reflection cards.

### 5. ReflectionEditor Component (new)
**File:** `src/components/ReflectionEditor.tsx`

Shared client component for both create and edit pages.

**Props:**
```typescript
{
  mode: "create" | "edit";
  topicId?: string | null;
  topicTitle?: string | null;
  tier?: "GATEWAY" | "INTERMEDIATE" | "ADVANCED" | null;
  advanceTo?: "INTERMEDIATE" | "ADVANCED" | null;
  reflectionId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialWritingTimeSeconds?: number;
  initialTags?: string[];
  existingTags: { id: string; name: string }[];
}
```

**UI layout (top to bottom):**
1. **Back link** — to `/topics/[topicId]` if topic-linked, else `/dashboard`
2. **Header** — "NEW REFLECTION" or "EDIT REFLECTION", topic/tier context below if applicable
3. **AI prompt slot** — shown only when `advanceTo` is present; static text for now: "Reflect on what you learned during the {tier} tier. What surprised you? What do you want to explore next?"
4. **Title** — `<Input>` placeholder "Reflection title..."
5. **Writing area** — `<Textarea>` with `min-h-[400px]`, placeholder "Write freely..."
6. **Status bar** — flex row: timer (`MM:SS` format) left, word count right
7. **Tags** — comma-separated `<Input>` (same pattern as `NewTopicForm.tsx:145-150`), existing user tags as clickable chips below
8. **Actions** — SAVE button (disabled until title+content non-empty), CANCEL button

**Writing timer:** `useEffect` with `setInterval` every 1s, incrementing `elapsedSeconds` state. In edit mode, initialize from `initialWritingTimeSeconds`. Accumulated time sent on save.

**Word count:** `content.trim() ? content.trim().split(/\s+/).length : 0`

**Save flow (create with advanceTo):**
1. POST /api/reflections with `{ title, content, topicId, tier, writingTimeSeconds, tags, advanceTo }`
2. On success: toast "Reflection saved. {NextTier} tier unlocked." → `router.push(/topics/[topicId])`

**Save flow (create without advanceTo):**
1. POST /api/reflections
2. On success: toast "Reflection saved" → navigate to `/topics/[topicId]` or `/dashboard`

**Save flow (edit):**
1. PATCH /api/reflections/[id]
2. On success: toast "Reflection saved" → `router.refresh()`

### 6. Reflection Pages (new)

#### 6a. New page
**File:** `src/app/reflections/new/page.tsx`

Server component. Reads `searchParams`: `topicId?`, `tier?`, `advanceTo?`. Fetches topic info (if topicId) and user's existing tags. Renders `<ReflectionEditor mode="create" ... />`.

#### 6b. Edit page
**File:** `src/app/reflections/[id]/page.tsx`

Server component. Fetches reflection by id with tags and topic. Fetches user's existing tags. Renders `<ReflectionEditor mode="edit" ... />`.

### 7. TierCompleteModal — Gate Advancement
**File:** `src/components/TierCompleteModal.tsx`

Change the CONTINUE action handler from:
```typescript
// OLD: directly advance tier
const field = tier === "GATEWAY" ? { intermediateStarted: true } : { advancedStarted: true };
await fetch(`/api/topics/${topicId}`, { method: "PATCH", body: JSON.stringify(field) });
```
To:
```typescript
// NEW: navigate to reflection page
const advanceTo = tier === "GATEWAY" ? "INTERMEDIATE" : "ADVANCED";
router.push(`/reflections/new?topicId=${topicId}&tier=${tier}&advanceTo=${advanceTo}`);
onClose();
```

The CONTINUE button label stays the same. No other options change.

### 8. TopicDetailClient — Two-Column Layout + Reflection Cards
**File:** `src/components/TopicDetailClient.tsx`

**Cleanup first:**
- Remove `import { id } from "zod/v4/locales"` (spurious linter auto-import, line 10)
- Remove `import { ReflectionSection } from "@/components/ReflectionSection"` (line 9)
- Remove `const gatewayReflection = ...` (line 116, unused)

**Update `ReflectionData` interface:**
- Add `title: string`
- Change `tier` to `string | null` (now optional)
- Add `writingTimeSeconds: number`

**Two-column layout:** Change outer `<main>` from `max-w-4xl flex-col` to:
```tsx
<main className="mx-auto min-h-screen max-w-6xl px-xl py-xl lg:flex lg:gap-xl">
  <div className="flex flex-1 flex-col gap-xl lg:max-w-4xl">
    {/* all existing content */}
  </div>
  <aside className="mt-xl w-full shrink-0 lg:mt-0 lg:w-[280px]">
    {/* reflection cards */}
  </aside>
</main>
```

**Reflection sidebar content:**
- Header: "REFLECTIONS" + `[WRITE]` link to `/reflections/new?topicId={id}`
- Empty state: "No reflections yet. Write one when you're ready."
- List of `<ReflectionCard>` components (or inline `<Link>` blocks)

**ReflectionCard** (inline or separate component):
```tsx
<Link href={`/reflections/${r.id}`} className="block border border-border-subtle p-md hover:bg-surface">
  <div className="text-sm font-bold mb-xs">{r.title}</div>
  <div className="flex justify-between text-xs text-muted">
    <span>{wordCount} words</span>
    <span>{getRelativeTime(new Date(r.updatedAt))}</span>
  </div>
  {r.tier && <div className="mt-xs text-xs text-muted">{r.tier}</div>}
</Link>
```

Uses `getRelativeTime` from `src/lib/utils.ts` (extracted in step 4).

### 9. Topic Server Page — Pass New Fields
**File:** `src/app/topics/[id]/page.tsx`

Update reflection serialization (line 90-96) to include:
```typescript
title: r.title,
writingTimeSeconds: r.writingTimeSeconds,
```

And change `tier: r.tier` to handle nullable tier.

### 10. Middleware
**File:** `src/middleware.ts`

Add `"/reflections"` to `protectedPaths` array (line 4-13).

### 11. Cleanup
- **Delete** `src/components/ReflectionSection.tsx` — fully replaced by dedicated pages + sidebar cards
- **Delete** `src/components/GatewayCompleteModal.tsx` — not imported anywhere since `TierCompleteModal` replaced it

## Files Summary

| File | Action |
|------|--------|
| `prisma/schema.prisma` | MODIFY — Reflection model + ReflectionTag + Tag relation |
| `src/lib/validations.ts` | MODIFY — create/update reflection schemas |
| `src/lib/utils.ts` | MODIFY — extract `getRelativeTime` |
| `src/app/api/reflections/route.ts` | MODIFY — rewrite POST, add GET |
| `src/app/api/reflections/[id]/route.ts` | MODIFY — add GET, rewrite PATCH (null guard) |
| `src/app/api/topics/[id]/reflections/route.ts` | MODIFY — include tags |
| `src/components/ReflectionEditor.tsx` | **CREATE** — shared editor with timer/word count/tags |
| `src/app/reflections/new/page.tsx` | **CREATE** — new reflection page |
| `src/app/reflections/[id]/page.tsx` | **CREATE** — edit reflection page |
| `src/components/TierCompleteModal.tsx` | MODIFY — CONTINUE navigates to reflection page |
| `src/components/TopicDetailClient.tsx` | MODIFY — two-column layout, reflection cards, cleanup |
| `src/app/topics/[id]/page.tsx` | MODIFY — serialize title + writingTimeSeconds |
| `src/app/dashboard/page.tsx` | MODIFY — import `getRelativeTime` from utils |
| `src/middleware.ts` | MODIFY — add /reflections to protected paths |
| `src/components/ReflectionSection.tsx` | **DELETE** |
| `src/components/GatewayCompleteModal.tsx` | **DELETE** |

## Verification

1. **Schema**: `npx prisma db push` succeeds, `npx tsc --noEmit` passes
2. **Create reflection via tier advancement**: Complete all gateway resources → modal appears → click CONTINUE → navigated to `/reflections/new?topicId=X&tier=GATEWAY&advanceTo=INTERMEDIATE` → write title + content → SAVE → reflection created, intermediate tier unlocked, redirected to topic page with intermediate section visible
3. **Reflection cards sidebar**: Topic detail page shows right column with reflection cards showing title, word count, relative time
4. **Click card → edit page**: Click a reflection card → navigated to `/reflections/[id]` → title, content, tags, timer pre-filled → edit and save → changes persisted
5. **Standalone reflection**: Navigate to `/reflections/new` directly (no query params) → create reflection without topic → saved successfully
6. **Timer**: Timer starts counting on page load, displayed as `MM:SS`, persisted on save as `writingTimeSeconds`
7. **Tags**: Type comma-separated tags → shown as chips → existing user tags shown as clickable suggestions → tags saved and visible on edit page
8. **Modal not re-shown after advancement**: After saving reflection and advancing tier, returning to topic page does NOT re-show the tier complete modal (because `intermediateStarted` is now true)
9. **Mobile**: On screens < 1024px, reflections sidebar stacks below main content
10. **Null guard**: Create a standalone reflection (no topic), then edit it → PATCH succeeds without crashing on `topic.update`
