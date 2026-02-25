# Curiosity V1 - Feature Summary

**Version:** 1.0 (MVP)  
**Status:** Ready for Development  
**Last Updated:** February 2026

---

## Project Vision

Curiosity is a **guilt-free learning interest tracker** that respects how curiosity actually works:
- Non-linear exploration (branch when interested, stop when satisfied)
- Lightweight commitment (gateway tier is 30-60 minutes, not months)
- Data ownership (Obsidian sync, JSON export)
- No completion pressure (satisfied ≠ finished)

**Differentiator:** "The only tool that encourages you to stop when you've learned enough"

---

## Core Philosophy

### 1. Modular & Atomic
- Each topic is self-contained
- No dependencies between topics
- Parent-child links are metadata, not requirements

### 2. Gateway-First
- Gateway tier = minimal viable understanding (30-60 min)
- After gateway: satisfied / branch / continue / shelve
- All paths equally valid

### 3. No Guilt
- Progress tracked, not measured
- "Satisfied" is success, not "complete"
- "Dormant" is pausing, not abandonment
- No red indicators, no overdue warnings

### 4. Obsidian Integration
- Flat markdown files (human-readable)
- Bi-directional sync
- User owns their data
- No vendor lock-in

---

## V1 Feature Set

### Core Features ✅

**Topic Management:**
- [x] Create/edit/delete topics
- [x] Temperature system (Hot ● / Warm ○ / Cool)
- [x] Status system (Active / Satisfied / Dormant / Archived)
- [x] Parent-child branching (subtopics)
- [x] Tag system (organization)
- [x] Concept system (cross-cutting themes)
- [x] Initial questions & context

**Resource Tracking:**
- [x] Four tiers: Gateway / Intermediate / Advanced / Reference
- [x] Resource types: Book / Article / Video / Podcast / Course / Wikipedia / Paper / Other
- [x] Completion tracking (lightweight, no percentages)
- [x] Ratings (1-5 stars, optional)
- [x] Key insights capture
- [x] Estimated time & page count
- [x] Goodreads integration (auto-fetch book metadata)
- [x] YouTube integration (auto-fetch video metadata)

**Reflections & Synthesis:**
- [x] Post-gateway reflection prompts (optional)
- [x] AI-generated synthesis questions (optional)
- [x] Tier-based reflections (gateway/intermediate/advanced)
- [x] Free-form reflection text
- [x] Sync to Obsidian

**Focus Sessions:**
- [x] Minimal writing environment
- [x] Optional topic association
- [x] Optional AI-generated prompts
- [x] Live word count & timer
- [x] Post-session reflection (discoveries/questions/connections)
- [x] Obsidian export

**AI Features:**
- [x] Gateway resource suggestions (based on topic/questions)
- [x] Subtopic suggestions (after gateway complete)
- [x] Synthesis questions (optional reflection prompts)
- [x] Focus session prompts (optional writing prompts)
- [x] Explore mode suggestions (time-based discovery)

**Obsidian Sync:**
- [x] Bi-directional sync
- [x] Flat file structure (by status, not hierarchy)
- [x] Markdown + YAML frontmatter
- [x] Conflict resolution (last-write-wins)
- [x] Manual & automatic sync modes

---

### Pages ✅

**Dashboard** (`/dashboard`)
- Active topics grouped by temperature
- Collapsed sections for satisfied/dormant
- Quick actions (continue, shelve, view)
- Stats overview (topics explored, satisfied, graph nodes)

**Topic Detail** (`/topics/:id`)
- Context (why interested, questions)
- Resources by tier with progress
- Reflections inline
- Branching suggestions (after gateway)
- Actions (temperature, status, branch, shelve)

**Complete History** (`/history`)
- Filter-heavy archival view
- Database-style table layout
- Toggle: Topics / Reflections
- Filters: Tags, status, date range
- Sort: Recent / Most explored / Alphabetical

**Focus Session** (`/focus`)
- Minimal writing UI
- Optional topic association
- Optional AI prompt
- Live word count & timer
- Post-session reflection modal
- Obsidian sync option

**Explore Mode** (`/explore`)
- Time-based suggestions (optional)
- Mood selector (focused/exploratory/light)
- AI suggestions: new topic / resume / write
- No forced timer or mandatory actions

**Knowledge Graph** (`/graph`)
- Visual topic/concept network
- Force-directed / tree / circular layouts
- Filter by tags, status, temperature
- Click nodes for quick preview
- Export as PNG
- Show/hide concepts

**Insights & Patterns** (`/insights`)
- Recent activity (neutral observation)
- Learning patterns (preferred formats, active times)
- AI reflection prompts (invitations, not demands)
- Dormant topic check-ins (gentle, not pushy)
- NO guilt metrics (hours spent, gaps, completion %)

**Settings** (`/settings`)
- Account (email, password)
- Notifications (frequency, channels)
- Obsidian sync (vault path, mode)
- Preferences (theme, default temperature)
- Features (AI toggles)

---

### Discovery & Navigation ✅

**Search:**
- [x] Full-text search across topics/resources/reflections/sessions
- [x] Scope filter (all / topics / resources / reflections / sessions)
- [x] Tag & status filters
- [x] Relevance scoring
- [x] Snippet highlighting

**Keyboard Shortcuts:**
- [x] `/` — Focus search
- [x] `g d` — Dashboard
- [x] `g h` — History
- [x] `g g` — Graph
- [x] `g e` — Explore
- [x] `g i` — Insights
- [x] `n` — New topic
- [x] `f` — Focus session
- [x] `?` — Show shortcuts help

**Filters:**
- [x] By tag
- [x] By status (active/satisfied/dormant/archived)
- [x] By temperature (hot/warm/cool)
- [x] By date range
- [x] Multi-select

---

### Data Portability ✅

**Export:**
- [x] JSON export (full data dump)
- [x] Single topic JSON export
- [x] Obsidian markdown export
- [x] Obsidian ZIP export (all topics)

**Import:**
- [x] JSON import (from export)
- [x] Merge strategies (skip/overwrite/merge)
- [x] Error reporting

**External Integrations:**
- [x] Goodreads API (book metadata)
- [x] YouTube API (video metadata)

---

### Infrastructure ✅

**PWA:**
- [x] Installable (desktop, mobile)
- [x] Offline support (cached topics/resources)
- [x] Background sync (completions, reflections)
- [x] Network-first API calls
- [x] Cache-first static assets

**Notifications:**
- [x] Email notifications (gentle reminders)
- [x] Gateway complete prompt
- [x] Interest check (dormant topics)
- [x] Branching suggestions
- [x] Frequency control (daily/weekly/monthly/never)
- [x] Opt-in, never pushy

**UI/UX:**
- [x] Retro-modern brutalist aesthetic
- [x] Monospace typography (IBM Plex Mono)
- [x] High-contrast colors (electric red/blue/green)
- [x] No shadows, gradients, or rounded corners
- [x] Dark mode
- [x] Responsive design (mobile/tablet/desktop)

**Authentication:**
- [x] Email + password
- [x] Google OAuth
- [x] GitHub OAuth (optional)

---

## Explicitly NOT in V1 ❌

**Deferred to V2+:**
- ❌ Topic relations (inspired-by, builds-on, contrasts-with)
- ❌ Collaboration (shared topics, study groups)
- ❌ Templates (custom prompts, pre-defined tags)
- ❌ Voice notes
- ❌ Photo uploads
- ❌ Spaced repetition
- ❌ Public knowledge graphs
- ❌ Browser extension
- ❌ Mobile native apps (iOS/Android)
- ❌ Desktop native app
- ❌ API for third-party integrations
- ❌ Plugin marketplace

**Reasons:**
- V1 focuses on single-user, core workflow
- Complexity can be added based on user feedback
- Ship fast, iterate based on real usage

---

## Technical Stack

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS (custom config)
- shadcn/ui (Radix primitives)
- React Query (server state)
- Zustand (client state)
- React Flow (graph visualization)

**Backend:**
- Next.js API Routes
- PostgreSQL (Supabase/Neon)
- Prisma ORM
- NextAuth.js (authentication)
- BullMQ + Redis (job queue)
- Resend (email)

**AI:**
- Anthropic Claude API
- Resource suggestions
- Synthesis questions
- Subtopic suggestions
- Focus prompts

**Infrastructure:**
- Vercel (hosting)
- Supabase/Neon (database)
- Upstash Redis (queue)
- Sentry (error tracking)
- PostHog (analytics)

---

## Data Models

### Core Tables

**User:**
- Authentication & profile
- Preferences (notifications, theme, Obsidian path)

**Topic:**
- Title, description, slug
- Status, temperature
- Parent topic (optional)
- Gateway/intermediate/advanced flags
- Why interested, initial questions
- Obsidian sync metadata

**Resource:**
- Title, type, tier
- Author, URL, page count, estimated time
- External IDs (Goodreads, YouTube)
- User notes

**Completion:**
- Resource completion record
- Time spent, rating, key insights

**Reflection:**
- Topic reflection
- Tier, content, synthesis answers

**FocusSession:**
- Free-form writing session
- Topic association (optional)
- Prompt, content, word count, duration
- Post-session reflection (discoveries/questions/connections)

**Tag & Concept:**
- Organization & cross-cutting themes

**Notification:**
- Scheduled reminders
- Sent/read status

---

## API Endpoints (Summary)

### Topics
- `GET/POST /api/topics`
- `GET/PATCH/DELETE /api/topics/:id`
- `POST /api/topics/:id/branch`
- `GET /api/topics/:id/suggestions`

### Resources
- `GET/POST /api/topics/:topicId/resources`
- `PATCH/DELETE /api/resources/:id`
- `POST /api/resources/:id/complete`

### Reflections
- `GET/POST /api/reflections`
- `POST /api/ai/synthesis-questions`

### Focus Sessions
- `POST /api/focus-sessions`
- `PATCH /api/focus-sessions/:id`
- `POST /api/focus-sessions/:id/end`

### Search & Discovery
- `GET /api/search`
- `POST /api/explore`

### Graph & Insights
- `GET /api/graph`
- `GET /api/insights`

### History
- `GET /api/history/topics`
- `GET /api/history/reflections`

### Export & Import
- `GET /api/export/json`
- `POST /api/import/json`
- `GET /api/export/obsidian-zip`

### External Integrations
- `GET /api/integrations/goodreads/search`
- `GET /api/integrations/goodreads/book/:id`
- `GET /api/integrations/youtube/video/:id`

### Obsidian
- `POST /api/obsidian/sync`
- `POST /api/obsidian/export/:topicId`

---

## Success Metrics (V1)

**User Engagement:**
- Topics created
- Gateway tiers completed
- Branches created
- Reflections written
- Focus sessions completed

**Retention:**
- Weekly active users
- Topics marked satisfied (success!)
- Dormant topics reactivated

**Philosophy Alignment:**
- Avg topics satisfied vs abandoned (should be high)
- Avg branches per parent topic (should be >0.5)
- Reflection opt-in rate (should be >30%)

**NOT tracking:**
- ❌ Completion percentages
- ❌ Time spent (productivity metric)
- ❌ Streaks (creates pressure)

---

## Development Timeline

### Phase 1: Foundation (Weeks 1-2)
- [x] Project setup (Next.js, Prisma, NextAuth)
- [x] Database schema & migrations
- [x] Authentication (email, Google)
- [x] Basic UI components (retro-modern style)
- [x] Topic CRUD

### Phase 2: Core Features (Weeks 3-5)
- [x] Resource management
- [x] Completion tracking
- [x] Gateway complete decision modal
- [x] Branching system
- [x] Tags & concepts
- [x] Basic search

### Phase 3: Advanced Features (Weeks 6-8)
- [x] Focus sessions
- [x] Reflections & synthesis
- [x] AI integration (Claude API)
- [x] Obsidian sync
- [x] Knowledge graph
- [x] History page
- [x] Explore mode
- [x] Insights page

### Phase 4: Polish & Deploy (Weeks 9-10)
- [x] Keyboard shortcuts
- [x] PWA configuration
- [x] External integrations (Goodreads, YouTube)
- [x] Export/import
- [x] Email notifications
- [x] Error handling & loading states
- [x] Testing (unit, integration, E2E)
- [x] Documentation
- [x] Deployment (Vercel)

**Total:** ~10 weeks for solo developer

---

## Post-V1 Roadmap

### V1.5 (Polish) — +2 months
- Mobile app (React Native or Capacitor)
- Photo/voice notes in focus sessions
- Bulk actions
- Undo/soft deletes
- PDF export
- Additional resource integrations (Spotify, ArXiv)

### V2.0 (Expansion) — +3-4 months
- Optional collaboration (shared topics, study groups)
- Public knowledge graph sharing (opt-in)
- Template system
- Browser extension (capture while browsing)
- Enhanced AI features (Socratic questioning)

### V3.0 (Ecosystem) — +6 months
- Native mobile apps (iOS/Android)
- Desktop app (Tauri)
- Plugin marketplace
- Community templates
- API for integrations

---

## Monetization Strategy

### Free Tier (Generous)
- 50 topics
- 5 AI suggestions per month
- All core features
- Obsidian sync
- JSON export

### Pro Tier ($5/month)
- Unlimited topics
- Unlimited AI suggestions
- Advanced analytics
- Priority support
- Early access to new features

### Team Tier ($15/month) — V2+
- Shared topics
- Team analytics
- Admin controls

**Philosophy:** Free tier is genuinely useful. Pro unlocks scale, not core features.

---

## Open Questions

### Resolved ✅
- ✅ Include REFERENCE tier for resources? **YES** (for parking lot links)
- ✅ Add TopicRelation model? **NO** (concepts + notes sufficient, adds complexity)
- ✅ Soft deletes or hard deletes? **SOFT** (add in V1.5, not critical for V1)
- ✅ Search implementation? **Full-text PostgreSQL** (simple, effective)
- ✅ PWA offline strategy? **Network-first API, cache-first assets**

### Future Considerations (V2+)
- Collaboration features (needs careful design to avoid social pressure)
- Mobile native apps (PWA first, native later)
- Open source? (start closed, potentially open V2)

---

## Final Checklist

### Before Development Starts
- [x] Specs reviewed and approved
- [x] Philosophy clearly documented
- [x] Feature set locked for V1
- [x] Tech stack decisions made
- [x] Development timeline estimated

### Before V1 Launch
- [ ] All V1 features implemented
- [ ] Full test coverage (unit, integration, E2E)
- [ ] User testing with 5-10 beta users
- [ ] Documentation complete (user guide, API docs)
- [ ] Performance optimized
- [ ] Accessibility audited
- [ ] Security reviewed
- [ ] Monitoring configured (Sentry, PostHog)
- [ ] Deployment automated (CI/CD)

---

**Status:** Ready to build. The foundation is solid, the philosophy is sound, and the feature set is complete. Ship V1, gather feedback, iterate. 🚀