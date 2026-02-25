# Network Model Migration - From Hierarchy to Knowledge Graph

**Date:** February 2026  
**Status:** Core architectural change  
**Impact:** Database schema, API endpoints, UI language

---

## Summary of Changes

### Core Philosophy Update

**Old (Hierarchical):**
- Topics branch into subtopics (parent-child)
- Implied hierarchy and progression
- Tree structure

**New (Network):**
- Topics are independent nodes
- Connect via shared concepts
- Optional inspiration links (metadata only)
- Graph structure

---

## Database Schema Changes

### Removed (Hierarchical Model)

```prisma
model Topic {
  parentTopicId     String?  // ❌ REMOVED
  parentTopic       Topic?   // ❌ REMOVED
  childTopics       Topic[]  // ❌ REMOVED
  whyThisBranch     String?  // ❌ REMOVED (was for subtopics)
}
```

### Added (Network Model)

```prisma
model Topic {
  // Relations changed to use inspiration model
  inspirations      TopicInspiration[]  @relation("TopicInspirations")
  inspiredTopics    TopicInspiration[]  @relation("InspirationSource")
}

// NEW MODEL
model TopicInspiration {
  id                String    @id @default(cuid())
  topicId           String
  topic             Topic     @relation("TopicInspirations")
  inspiredByTopicId String?
  inspiredByTopic   Topic?    @relation("InspirationSource")
  context           String?   @db.Text  // Story of how curiosity emerged
  createdAt         DateTime  @default(now())
}
```

**Key Differences:**

| Aspect | Old (Hierarchy) | New (Network) |
|--------|----------------|---------------|
| Structure | Parent → Child | Node ↔ Node |
| Connection type | Structural dependency | Optional metadata |
| Primary links | Parent-child | Shared concepts |
| Deletion | Cascade to children | Independent |
| Navigation | Tree traversal | Graph traversal |

---

## API Endpoint Changes

### Removed Endpoints

```
❌ POST /api/topics/:id/branch
❌ GET /api/topics/:id/suggestions (subtopic suggestions)
```

### Added/Updated Endpoints

```
✅ GET /api/topics/:id/related        # Topics connected by concepts
✅ GET /api/topics/:id/explore        # AI suggestions based on concepts engaged

✅ POST /api/topics                   # Now includes inspiration object
```

### Updated POST /api/topics

**Old:**
```typescript
{
  title: string,
  parentTopicId?: string,     // ❌ Removed
  whyThisBranch?: string,     // ❌ Removed
  autoSatisfyParent?: boolean // ❌ Removed
}
```

**New:**
```typescript
{
  title: string,
  inspiration?: {             // ✅ Added (optional)
    topicId: string,
    context: string           // "While reading X, I got curious about Y"
  },
  concepts?: string[]         // Inherited from inspiring topic
}
```

---

## UI Language Changes

### Terminology Updates

| Old (Hierarchical) | New (Network) |
|-------------------|---------------|
| ❌ "Parent topic" | ✅ "Sparked by" or "Inspired by" |
| ❌ "Child topic" | ✅ "Related topic" or "Connected topic" |
| ❌ "Subtopic" | ✅ "Connected topic" |
| ❌ "Branch into subtopic" | ✅ "Explore related" |
| ❌ "Create branch" | ✅ "Create connected topic" |
| ❌ "Branching system" | ✅ "Network exploration" |

### Gateway Complete Modal

**Old:**
```
[SATISFIED] [BRANCH] [CONTINUE] [SHELVE]
```

**New:**
```
[SATISFIED] [EXPLORE RELATED] [CONTINUE] [SHELVE]
```

**"Explore Related" shows:**
- Concepts user engaged with
- Topics sharing those concepts
- Option to create new connected topic
- No "subtopic" language

---

## Knowledge Graph Visualization

### Old (Tree Structure)

```
     [English Civil War]
            |
    [Cromwellian Republic]
            |
        [Levellers]
```

**Issues:**
- Implies linear progression
- Suggests hierarchy
- One connection per topic

### New (Network Structure)

```
[Republicanism] ─────────┐
       |                 |
       |          [Cromwellian]
       |            /    |    \
[Roman Republic]   /     |     [English Civil War]
       |          /      |              |
[French Revolution] ─ [Governance] ─────┘
```

**Benefits:**
- Multiple connections
- No hierarchy
- Concepts visible
- Interdisciplinary clear

**Visual Encoding:**
- `───` Solid line = Shared concept
- `- -` Dashed line = Inspiration (one-way)
- Node size = Equal (no parent/child sizing)
- Node color = Status/Temperature

---

## User Flow Changes

### Creating Connected Topics

**Old Flow (Branching):**
```
Gateway complete → [BRANCH]
  ↓
"Create subtopic"
  ↓
Enter subtopic title
  ↓
Parent-child relationship created
  ↓
Subtopic shows "Parent: X"
```

**New Flow (Network Exploration):**
```
Gateway complete → [EXPLORE RELATED]
  ↓
Shows:
- Concepts engaged (#republicanism, #governance)
- Topics sharing these concepts
- AI suggestions
  ↓
User selects or creates topic
  ↓
Optional: "Sparked by X" context
  ↓
Independent topic created
  ↓
Connected via concepts, not hierarchy
```

---

## Obsidian Integration Changes

### Old (Hierarchical)

```markdown
---
curiosity_id: abc123
parent_topic: "[[English Civil War]]"
why_this_branch: "Wanted to understand republican governance"
---

# Cromwellian Republic

Parent: [[English Civil War]]
```

### New (Network)

```markdown
---
curiosity_id: abc123
sparked_by: "[[English Civil War]]"
inspiration_context: "While reading about the civil war, I got curious about how republicans actually governed"
concepts:
  - republicanism
  - governance
  - 17th-century
---

# Cromwellian Republic

Sparked by: [[English Civil War]]
Connected concepts: #republicanism #governance

Related topics:
- [[French Revolution]] (shares #republicanism)
- [[Roman Republic]] (shares #republicanism)
```

---

## Benefits of Network Model

### 1. Reflects How Knowledge Actually Works

**Reality:**
- Cromwellian Republic connects to French Revolution (same concept, different context)
- Also connects to Constitutional Theory (concept application)
- Also connects to Military History (New Model Army)
- NOT just "subset of English Civil War"

### 2. Enables Interdisciplinary Discovery

**Old (Hierarchical):**
```
Can only branch within the tree
Civil War → Cromwell → Army
Stuck in history domain
```

**New (Network):**
```
Civil War (#republicanism) → 
  → Cromwell (governance)
  → French Revolution (#republicanism)
  → Political Theory (#governance)
  → Roman Republic (historical parallel)

Crosses disciplines naturally
```

### 3. No False Prerequisites

**Old:** "Cromwellian Republic" implies you must study "English Civil War" first

**New:** Both are independent; connection is metadata, not requirement

### 4. Multiple Connection Types

**Old:** One relationship type (parent-child)

**New:**
- Shared concepts (primary)
- Inspiration (metadata)
- Can add more in future (contrasts-with, builds-on, etc.) without breaking model

---

## Migration Strategy

### For Existing Users (If V1 shipped with hierarchy)

```sql
-- Step 1: Convert parent-child to inspiration
INSERT INTO TopicInspiration (topicId, inspiredByTopicId, context)
SELECT 
  id as topicId,
  parentTopicId as inspiredByTopicId,
  COALESCE(whyThisBranch, 'Branched from parent topic') as context
FROM Topic
WHERE parentTopicId IS NOT NULL;

-- Step 2: Remove hierarchical columns
ALTER TABLE Topic DROP COLUMN parentTopicId;
ALTER TABLE Topic DROP COLUMN whyThisBranch;

-- Step 3: Ensure all topics have at least one concept
-- (Concepts are now primary connection mechanism)
```

**User Impact:** 
- Zero (just metadata restructuring)
- Graph visualization improves
- No functionality lost
- Gains: multiple connections now possible

---

## Implementation Checklist

### Database
- [x] Remove `parentTopicId`, `childTopics` from Topic model
- [x] Add `TopicInspiration` model
- [x] Add inspiration relations to Topic
- [x] Remove `whyThisBranch` field
- [x] Update indexes (remove parentTopicId index)

### API
- [ ] Remove `/api/topics/:id/branch` endpoint
- [ ] Add `/api/topics/:id/explore` endpoint
- [ ] Add `/api/topics/:id/related` endpoint
- [ ] Update POST `/api/topics` to accept inspiration object
- [ ] Update graph endpoint to return network structure

### UI
- [ ] Update gateway complete modal (BRANCH → EXPLORE RELATED)
- [ ] Update topic creation flow
- [ ] Update topic detail page (remove "Parent:", add "Sparked by:")
- [ ] Update dashboard topic cards
- [ ] Update knowledge graph visualization (tree → network)
- [ ] Update all language (subtopic → connected topic, etc.)

### Documentation
- [x] Update TECHNICAL_SPEC.md
- [ ] Update UI.md
- [ ] Update CLAUDE.md
- [ ] Update AGENTS.md
- [ ] Create migration guide

### Testing
- [ ] Test topic creation with inspiration link
- [ ] Test topic creation without inspiration (standalone)
- [ ] Test explore related flow
- [ ] Test concept-based connections
- [ ] Test graph visualization
- [ ] Test Obsidian export with new structure

---

## Philosophical Alignment

### Core Principles Maintained

✅ **No Guilt:** Topics can be satisfied at any point  
✅ **Non-Linear:** No forced progression  
✅ **Modular:** Topics are independent  
✅ **User Ownership:** All data portable

### Principles Enhanced

✅ **Knowledge as Network:** Now structurally enforced, not just conceptual  
✅ **Interdisciplinary:** Concept connections make this natural  
✅ **No Prerequisites:** Explicitly removed structural dependencies  
✅ **Exploration:** "Explore related" is more inviting than "branch"

---

## Key Takeaway

**Before:** Knowledge organized as a tree (hierarchical, implied progression)  
**After:** Knowledge organized as a network (interconnected, fluid discovery)

This change makes the system architecture match how curiosity actually works.

---

**Status:** Ready for implementation ✅