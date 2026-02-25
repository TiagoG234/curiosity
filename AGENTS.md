# AGENTS.md - Guide for Autonomous Coding Agents

**Project:** Curiosity  
**Purpose:** Specialized instructions for autonomous agents (Cursor, Windsurf, Aider, etc.)  
**Last Updated:** February 2026

---

## Overview for Agents

This document is specifically for **autonomous coding agents** that will be writing code with minimal human intervention. If you're a conversational assistant helping a developer, see `CLAUDE.md` instead.

Curiosity is a learning tracker with:
- Non-linear branching (gateway → branch OR continue OR satisfied)
- Retro-modern UI (monospace, high-contrast, no shadows)
- Atomic topics (no parent/child dependencies)
- Guilt-free exploration

**Your role:** Write production-ready code that implements this system correctly.

---

## Critical Agent Instructions

### 1. Always Read Specs First

Before writing ANY code:

```bash
# Read these in order:
1. TECHNICAL_SPEC.md  # Database, API, features
2. UI.md              # Design system, components
3. CLAUDE.md          # Implementation patterns
```

**Do not skip this step.** These documents contain critical design decisions that prevent architectural mistakes.

### 2. File Creation Strategy

**Create files directly in the correct location:**

```typescript
// ✓ Good - Correct structure from the start
src/
├── app/
│   ├── (dashboard)/
│   │   └── topics/[id]/page.tsx
│   └── api/
│       └── topics/route.ts
├── components/
│   └── topic/
│       └── TopicCard.tsx
└── lib/
    └── db.ts
```

**Not:**
```
// ✗ Bad - Random organization
src/
├── topics.tsx
├── api-stuff.ts
└── random-components/
```

### 3. Type Safety is Non-Negotiable

**Always define types:**

```typescript
// ✓ Good
interface Topic {
  id: string;
  title: string;
  status: TopicStatus;
  temperature: Temperature;
  parentTopicId?: string;  // Optional
  gatewayComplete: boolean;
}

type TopicStatus = 'ACTIVE' | 'SATISFIED' | 'DORMANT' | 'ARCHIVED';
type Temperature = 'HOT' | 'WARM' | 'COOL';

// ✗ Bad
const topic: any = { /* ... */ };
```

### 4. Test as You Go

**Write tests alongside code:**

```typescript
// src/app/api/topics/route.ts
export async function POST(req) { /* ... */ }

// src/app/api/topics/route.test.ts
describe('POST /api/topics', () => {
  it('creates topic with parentId', async () => { /* ... */ });
});
```

**Run tests after every major change:**
```bash
npm test
```

---

## Agent Coding Standards

### Database Queries

**Always use Prisma's type-safe queries:**

```typescript
// ✓ Good
const topic = await db.topic.findUnique({
  where: { id: topicId },
  include: {
    tags: true,
    resources: {
      where: { tier: 'GATEWAY' },
      include: { completions: true }
    }
  }
});

// ✗ Bad - Raw SQL
const topic = await db.$queryRaw`SELECT * FROM topics WHERE id = ${topicId}`;
```

**Check for null/undefined:**

```typescript
// ✓ Good
const topic = await db.topic.findUnique({ where: { id } });
if (!topic) {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: 'Topic not found' } },
    { status: 404 }
  );
}

// ✗ Bad - Assumes exists
const topic = await db.topic.findUnique({ where: { id } });
topic.title; // Could crash
```

### API Route Pattern

**Use this exact pattern for all API routes:**

```typescript
// src/app/api/topics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  parentTopicId: z.string().optional(),
  temperature: z.enum(['HOT', 'WARM', 'COOL']).optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }
  
  // 2. Parse and validate
  const body = await req.json();
  const result = createTopicSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: result.error.errors } },
      { status: 400 }
    );
  }
  
  const data = result.data;
  
  // 3. Business logic
  try {
    const topic = await db.topic.create({
      data: {
        userId: session.user.id,
        title: data.title,
        description: data.description,
        slug: slugify(data.title),
        temperature: data.temperature ?? 'WARM',
        parentTopicId: data.parentTopicId,
        // ... rest of fields
      },
      include: {
        tags: true
      }
    });
    
    // 4. Success response
    return NextResponse.json({
      data: { topic }
    });
    
  } catch (error) {
    // 5. Error handling
    console.error('Topic creation error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create topic' } },
      { status: 500 }
    );
  }
}
```

### Component Pattern

**Use this pattern for React components:**

```typescript
// components/topic/TopicCard.tsx
'use client';

import { Topic, Tag } from '@prisma/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface TopicCardProps {
  topic: Topic & {
    tags: Tag[];
    _count: {
      resources: number;
    };
  };
  onShelve?: (id: string) => void;
}

export function TopicCard({ topic, onShelve }: TopicCardProps) {
  const tempIcon = {
    HOT: '●',
    WARM: '○',
    COOL: '○'
  }[topic.temperature];
  
  const tempColor = {
    HOT: 'text-c-hot',
    WARM: 'text-c-warm',
    COOL: 'text-c-cool'
  }[topic.temperature];
  
  return (
    <div className="card-minimal">
      <div className="flex justify-between items-start mb-sm">
        <div className="flex items-center gap-sm">
          <span className={tempColor}>{tempIcon}</span>
          <h3 className="font-bold">{topic.title}</h3>
        </div>
      </div>
      
      {topic.parentTopicId && (
        <div className="text-xs text-c-muted mb-sm">
          Parent: {topic.parentTopic?.title} ✓
        </div>
      )}
      
      <div className="text-sm mb-sm">
        {topic.gatewayComplete ? (
          <span>Gateway ✓</span>
        ) : (
          <span>Gateway {topic._count.resources}/3</span>
        )}
      </div>
      
      <div className="flex gap-xs mb-md">
        {topic.tags.map(tag => (
          <span key={tag.id} className="tag">#{tag.name}</span>
        ))}
      </div>
      
      <div className="flex gap-md">
        <Link href={`/topics/${topic.id}`}>
          <Button variant="tertiary">CONTINUE</Button>
        </Link>
        {onShelve && (
          <Button variant="tertiary" onClick={() => onShelve(topic.id)}>
            SHELVE
          </Button>
        )}
      </div>
    </div>
  );
}
```

### Styling Pattern

**Always use Tailwind classes from UI.md spec:**

```tsx
// ✓ Good - Uses defined design tokens
<div className="card">
  <h2 className="heading-2 mb-lg">Title</h2>
  <p className="body-text text-c-muted">Content</p>
  <Button variant="primary">ACTION</Button>
</div>

// ✗ Bad - Arbitrary values
<div style={{ padding: '20px', borderRadius: '8px' }}>
  <h2 style={{ fontSize: '18px', color: '#333' }}>Title</h2>
</div>
```

**Refer to Tailwind config:**
```typescript
// tailwind.config.ts
colors: {
  'c-bg': '#FFFFFF',
  'c-text': '#0A0A0A',
  'c-primary': '#FF3B30',
  // ... (see UI.md)
}
spacing: {
  'sm': '8px',
  'md': '12px',
  'lg': '16px',
  'xl': '24px',
  // ...
}
```

---

## Critical Business Logic Rules

### Rule 1: Topics Are Atomic

**Never make child topics depend on parent state:**

```typescript
// ✗ Bad - Child depends on parent
async function canProgressTopic(topicId: string) {
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: { parentTopic: true }
  });
  
  if (topic.parentTopicId && !topic.parentTopic.gatewayComplete) {
    throw new Error("Complete parent gateway first");
  }
}

// ✓ Good - Child is independent
async function canProgressTopic(topicId: string) {
  // No parent checks - topic is atomic
  return true;
}
```

### Rule 2: Gateway Complete = Decision Point

**After gateway completion, ALWAYS show decision modal:**

```typescript
// src/app/api/resources/[id]/complete/route.ts
export async function POST(req: NextRequest, { params }) {
  // ... create completion ...
  
  // Check gateway status
  const topic = await db.topic.findUnique({
    where: { id: completion.topicId },
    include: {
      resources: {
        where: { tier: 'GATEWAY' },
        include: { completions: true }
      }
    }
  });
  
  const gatewayComplete = topic.resources.every(
    r => r.completions.length > 0
  );
  
  if (gatewayComplete && !topic.gatewayComplete) {
    // Update topic
    await db.topic.update({
      where: { id: topic.id },
      data: { gatewayComplete: true }
    });
    
    // Get AI suggestions
    const suggestions = await getAISubtopicSuggestions(topic.id);
    
    // Return decision prompt
    return NextResponse.json({
      data: {
        completion,
        gatewayComplete: true,
        decisionPrompt: {
          type: 'GATEWAY_COMPLETE',
          options: ['SATISFIED', 'BRANCH', 'CONTINUE', 'SHELVE'],
          suggestions
        }
      }
    });
  }
  
  return NextResponse.json({ data: { completion } });
}
```

### Rule 3: No Completion Percentages

**Track tier progress, not overall completion:**

```typescript
// ✗ Bad
function getProgress(topic: Topic) {
  const total = topic.resources.length;
  const completed = topic.completedResources.length;
  return {
    percentage: (completed / total) * 100,
    isComplete: completed === total
  };
}

// ✓ Good
function getProgress(topic: Topic) {
  const gateway = topic.resources.filter(r => r.tier === 'GATEWAY');
  const intermediate = topic.resources.filter(r => r.tier === 'INTERMEDIATE');
  
  return {
    gateway: {
      completed: gateway.filter(r => r.completions.length > 0).length,
      total: gateway.length,
      isComplete: gateway.every(r => r.completions.length > 0)
    },
    intermediate: {
      completed: intermediate.filter(r => r.completions.length > 0).length,
      total: intermediate.length,
      optional: true  // Always optional
    }
  };
}
```

### Rule 4: Equal Weight Decision Options

**Gateway complete modal must show 4 options with equal visual weight:**

```tsx
// ✓ Good - All options equal
<div className="space-y-lg">
  <OptionCard
    icon="✓"
    title="MARK SATISFIED"
    description="I've learned what I wanted"
    action="satisfied"
  />
  <OptionCard
    icon="→"
    title="CREATE SUBTOPIC"
    description="Focus on specific aspect"
    action="branch"
  />
  <OptionCard
    icon="↓"
    title="CONTINUE TO INTERMEDIATE"
    description="Go deeper on full topic"
    action="continue"
  />
  <OptionCard
    icon="○"
    title="SHELVE FOR NOW"
    description="Come back later"
    action="shelve"
  />
</div>

// ✗ Bad - Primary button pushes one option
<div>
  <Button variant="primary">CONTINUE TO INTERMEDIATE</Button>
  <Button variant="secondary">Branch</Button>
  <Button variant="tertiary">Satisfied</Button>
</div>
```

---

## Agent Testing Protocol

### Before Committing Code

Run this checklist:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Run tests
npm test

# 4. Build check
npm run build
```

**Fix all errors before proceeding.**

### Test Coverage Requirements

**Minimum coverage:**
- API routes: 90%
- Business logic: 85%
- Components: 80%
- Critical paths (auth, topic creation, branching): 100%

**Write tests for:**
1. Happy path (everything works)
2. Error cases (auth fail, validation fail, not found)
3. Edge cases (empty data, null values)

### Example Test Suite

```typescript
// src/app/api/topics/route.test.ts
import { POST } from './route';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('@/lib/db');

describe('POST /api/topics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('creates topic successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user1' }
    });
    
    (db.topic.create as jest.Mock).mockResolvedValue({
      id: 'topic1',
      title: 'English Civil War',
      slug: 'english-civil-war',
      userId: 'user1'
    });
    
    const req = new Request('http://localhost/api/topics', {
      method: 'POST',
      body: JSON.stringify({
        title: 'English Civil War',
        temperature: 'WARM'
      })
    });
    
    const response = await POST(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.data.topic.title).toBe('English Civil War');
    expect(db.topic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'English Civil War',
          temperature: 'WARM'
        })
      })
    );
  });
  
  it('returns 401 if not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const req = new Request('http://localhost/api/topics', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' })
    });
    
    const response = await POST(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });
  
  it('validates input', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user1' }
    });
    
    const req = new Request('http://localhost/api/topics', {
      method: 'POST',
      body: JSON.stringify({
        title: '',  // Invalid
      })
    });
    
    const response = await POST(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## Agent Error Recovery

### Common Errors & Fixes

**1. "Prisma client not generated"**

```bash
npx prisma generate
```

**2. "Module not found: @/lib/db"**

Check `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**3. "Type error: Property 'parentTopic' does not exist"**

Update Prisma query to include relation:
```typescript
const topic = await db.topic.findUnique({
  where: { id },
  include: { parentTopic: true }  // Add this
});
```

**4. "Tailwind class not working"**

Check if class is defined in `tailwind.config.ts`:
```typescript
colors: {
  'c-primary': '#FF3B30',  // Must be defined
}
```

---

## Agent Code Review Checklist

Before marking a feature complete, verify:

### ✓ Architecture
- [ ] Topics are atomic (no parent dependencies)
- [ ] API routes follow standard pattern
- [ ] Types are properly defined
- [ ] Error handling is comprehensive

### ✓ Business Logic
- [ ] Gateway complete triggers decision modal
- [ ] All 4 options have equal weight
- [ ] No completion percentages
- [ ] Branching creates independent topics

### ✓ UI/UX
- [ ] Follows retro-modern aesthetic (monospace, high-contrast)
- [ ] No shadows, gradients, or rounded corners
- [ ] Temperature indicators have icon + label
- [ ] Progress shows tier status, not percentages

### ✓ Code Quality
- [ ] TypeScript with no `any` types
- [ ] Tests written and passing
- [ ] No console errors or warnings
- [ ] Follows ESLint rules

### ✓ Data
- [ ] Database queries are type-safe (Prisma)
- [ ] Null checks on all queries
- [ ] Proper indexes for performance
- [ ] Migrations run successfully

### ✓ Language
- [ ] No "complete" or "finish" language
- [ ] Uses "satisfied", "shelved", "dormant"
- [ ] No guilt-inducing copy
- [ ] Positive framing ("branch" not "quit")

---

## Agent Self-Correction Prompts

If you're unsure about implementation, ask yourself:

**"Does this create a parent-child dependency?"**
- If yes → Refactor to make topics atomic

**"Am I tracking completion percentage?"**
- If yes → Switch to tier-specific progress

**"Does this UI element imply incompletion?"**
- If yes → Reframe as exploration

**"Am I using guilt language?"**
- If yes → Rewrite with positive framing

**"Is this option visually prioritized?"**
- If yes → Make all options equal weight

---

## Agent Communication Protocol

### When to Ask for Clarification

**Ask the user if:**
1. Requirements contradict the spec
2. Edge case not covered in documentation
3. Major architectural decision needed
4. User requests feature that conflicts with philosophy

**Don't ask if:**
1. Answer is in TECHNICAL_SPEC.md or UI.md
2. Pattern is shown in CLAUDE.md examples
3. It's a standard implementation detail
4. You can infer from existing code

### How to Report Progress

**Good progress update:**
```
✓ Created topic API routes (POST, GET, PATCH)
✓ Implemented branching endpoint
✓ Added gateway complete detection
⚠ Need clarification: Should AI suggestions be cached?
```

**Bad progress update:**
```
Working on topics...
```

### How to Report Errors

**Good error report:**
```
Error: Prisma migration failed
File: prisma/migrations/20260215_add_branching/migration.sql
Line: 12
Issue: Column 'whyThisBranch' conflicts with existing schema
Fix: Renamed to 'branchRationale'
Status: Resolved
```

**Bad error report:**
```
Something broke
```

---

## Agent Final Checklist

Before declaring feature complete:

- [ ] Code written and tested
- [ ] All tests passing
- [ ] TypeScript compiles with no errors
- [ ] ESLint passes
- [ ] Follows design spec (UI.md)
- [ ] Follows technical spec (TECHNICAL_SPEC.md)
- [ ] Implements patterns from CLAUDE.md
- [ ] No completion language
- [ ] No parent-child dependencies
- [ ] Gateway complete flow correct
- [ ] Documentation updated (if needed)
- [ ] Git commit with descriptive message

---

## Quick Reference: Key Files

```
docs/
├── TECHNICAL_SPEC.md  # Database, API, features
├── UI.md              # Design system, components  
├── CLAUDE.md          # Implementation patterns
└── AGENTS.md          # This file

src/
├── app/
│   ├── (dashboard)/dashboard/page.tsx
│   ├── (dashboard)/topics/[id]/page.tsx
│   ├── api/topics/route.ts
│   ├── api/topics/[id]/branch/route.ts
│   └── api/resources/[id]/complete/route.ts
├── components/
│   ├── topic/TopicCard.tsx
│   ├── topic/GatewayCompleteModal.tsx
│   └── ui/button.tsx
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── ai.ts
└── types/
    └── index.ts

prisma/
└── schema.prisma
```

---

**You are now ready to build Curiosity autonomously. Follow the specs, respect the philosophy, write clean code, and ship! 🚀**