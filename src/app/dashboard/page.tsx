import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getRelativeTime, topicGradient } from "@/lib/utils";
import { CreateTopicSection, CreateTopicTrigger } from "@/components/CreateTopicToggle";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { DormantSection } from "@/components/DormantSection";
import { DashboardBody } from "@/components/DashboardBody";
import { TopicCardActions } from "@/components/TopicCardActions";
import { TemperatureToggle } from "@/components/TemperatureToggle";
import Link from "next/link";
import { NavHeader } from "@/components/NavHeader";

async function getDashboardData() {
  const userId = await getCurrentUserId();

  const [topics, allTags] = await Promise.all([
    prisma.topic.findMany({
      where: { userId },
      include: {
        tags: {
          include: { tag: true }
        },
        inspirations: {
          include: {
            inspiredByTopic: {
              select: { id: true, title: true }
            }
          }
        },
        resources: {
          where: { archived: false },
          select: {
            id: true,
            tier: true,
            completions: {
              select: { id: true }
            }
          }
        }
      },
      orderBy: [{ temperature: "desc" }, { lastActivityAt: "desc" }],
      take: 50
    }),
    prisma.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return { topics, allTags };
}

function TemperatureDot({ temperature }: { temperature: string }) {
  switch (temperature) {
    case "HOT":
      return <span className="text-hot">●</span>;
    case "WARM":
      return <span className="text-warm">○</span>;
    default:
      return <span className="text-cool">○</span>;
  }
}

interface TopicWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: string;
  temperature: string;
  lastActivityAt: Date;
  gatewayComplete: boolean;
  gatewayDecidedAt: Date | null;
  intermediateStarted: boolean;
  intermediateComplete: boolean;
  advancedStarted: boolean;
  advancedComplete: boolean;
  tags: { tag: { id: string; name: string } }[];
  inspirations: {
    inspiredByTopic: { id: string; title: string } | null;
  }[];
  resources: {
    id: string;
    tier: string;
    completions: { id: string }[];
  }[];
}

function getStage(topic: TopicWithRelations) {
  if (topic.intermediateStarted && !topic.advancedStarted) {
    return {stage: "Intermediate", score: 30}
  }
  else if (topic.intermediateStarted && topic.advancedStarted) {
    return {stage: "Advanced", score: 40}
  }
  else {
    return {stage: "Gateway", score: 10}
  }
}

function getStageProgress(topic: TopicWithRelations, stage: string) {
  const gatewayResources = topic.resources.filter((r) => r.tier === stage.toUpperCase());
  const completed = gatewayResources.filter((r) => r.completions.length > 0).length;
  const decided = topic.gatewayDecidedAt ? true : false
  return { completed, decided, total: gatewayResources.length };
}

function getNextActions(topics: TopicWithRelations[]) {
  const active = topics.filter((t) => t.status === "ACTIVE");
  const tempOrder: Record<string, number> = { HOT: 0, WARM: 1, COOL: 2 };

  const entries = active.map((topic) => {
    const stage = getStage(topic);
    const progress = getStageProgress(topic, stage.stage);
    const remaining = progress.total - progress.completed;

    let reason: string;
    if (progress.total === 0) {
      reason = `${stage.stage} — add resources to get started`;
    } else if (remaining === 0) {
      reason = `${stage.stage} complete — decide what's next`;
    } else {
      reason = `${remaining} ${stage.stage.toLowerCase()} resource${remaining === 1 ? "" : "s"} left`;
    }

    return { topic, remaining, total: progress.total, reason };
  });

  // Sort by: 1. temperature, 2. fewer resources remaining in current stage, 3. recent activity
  entries.sort((a, b) => {
    const tempDiff = (tempOrder[a.topic.temperature] ?? 3) - (tempOrder[b.topic.temperature] ?? 3);
    if (tempDiff !== 0) return tempDiff;

    // Topics with no resources sink to the bottom within their temperature group
    if (a.total === 0 && b.total > 0) return 1;
    if (b.total === 0 && a.total > 0) return -1;

    if (a.remaining !== b.remaining) return a.remaining - b.remaining;

    return new Date(b.topic.lastActivityAt).getTime() - new Date(a.topic.lastActivityAt).getTime();
  });

  return entries.slice(0, 4);
}

function getTopicStage(topic: TopicWithRelations) {
  const stages = [];

  // 1. Helper to calculate progress for any tier
  const getTierProgress = (tier: string) => {
    const resources = topic.resources.filter((r) => r.tier === tier);
    const done = resources.filter((r) => r.completions.length > 0).length;
    
    if (resources.length === 0) return "no resources";
    if (done === resources.length) return "✓";
    return `${done}/${resources.length}`;
  };

  // 2. Always include Gateway (since it's the baseline)
  stages.push({
    label: "Gateway",
    progress: getTierProgress("GATEWAY")
  });

  // 3. Add Intermediate if started (or if Advanced is started)
  if (topic.intermediateStarted || topic.advancedStarted) {
    stages.push({
      label: "Intermediate",
      progress: getTierProgress("INTERMEDIATE")
    });
  }

  // 4. Add Advanced if started
  if (topic.advancedStarted) {
    stages.push({
      label: "Advanced",
      progress: getTierProgress("ADVANCED")
    });
  }

  return stages;
}

function StageRow({ label, progress }: { label: string; progress: string }) {
  return (
    <div className="text-xs text-muted whitespace-nowrap">
      {label}{" "}
      <span className={progress === "✓" ? "text-satisfied" : "font-medium"}>
        ({progress})
      </span>
    </div>
  );
}

function TopicCard({ topic }: { topic: TopicWithRelations }) {
  const sparkedBy = topic.inspirations.find((i) => i.inspiredByTopic)?.inspiredByTopic;
  const stages = getTopicStage(topic);

  return (
    <div className="border border-border p-lg flex flex-col gap-sm hover:bg-surface transition-colors" style={{ backgroundImage: topicGradient(topic.title) }}>
      {/* Row 1: temperature dot + title */}
      <div className="flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <TemperatureDot temperature={topic.temperature} />
          <Link href={`/topics/${topic.id}`} className="font-bold text-sm hover:underline">
            {topic.title}
          </Link>
        </div>
        <TemperatureToggle topicId={topic.id} current={topic.temperature} />
      </div>

      {/* NEW Row: Stage list (Stacked vertically) */}
      <div className="flex flex-col gap-1 ml-6"> 
        {stages.map((stage, index) => (
          <StageRow key={`${stage.label}-${index}`} label={stage.label} progress={stage.progress} />
        ))}
      </div>

      {/* Row 2: sparked by (if exists) */}
      {sparkedBy && (
        <div className="text-xs text-muted">
          Sparked by:{" "}
          <Link href={`/topics/${sparkedBy.id}`} className="underline hover:text-text">
            {sparkedBy.title}
          </Link>
        </div>
      )}

      {/* Row 3: tags */}
      {topic.tags.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {topic.tags.map(({ tag }) => (
            <span key={tag.id} className="border border-border-subtle px-2 py-0.5 text-xs text-muted">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Row 4: last activity + actions */}
      <div className="flex items-center justify-between gap-sm mt-xs">
        <span className="text-xs text-muted">Last: {getRelativeTime(topic.lastActivityAt)}</span>
        <TopicCardActions topicId={topic.id} gatewayComplete={topic.gatewayComplete} />
      </div>
    </div>
  );
}

function CompactTopicRow({
  topic,
  statusLabel,
  statusColor
}: {
  topic: TopicWithRelations;
  statusLabel: string;
  statusColor: string;
}) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-center justify-between border border-border-subtle px-md py-sm text-sm text-muted hover:text-text transition-colors"
    >
      <span>{topic.title}</span>
      <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const { topics, allTags } = await getDashboardData();

  const tempOrder: Record<string, number> = { HOT: 0, WARM: 1, COOL: 2 };
  const activeTopics = topics
    .filter((t) => t.status === "ACTIVE")
    .sort((a, b) => (tempOrder[a.temperature] ?? 3) - (tempOrder[b.temperature] ?? 3));
  const dormantTopics = topics.filter((t) => t.status === "DORMANT");
  const satisfiedTopics = topics.filter((t) => t.status === "SATISFIED");
  const nextActions = getNextActions(activeTopics as TopicWithRelations[]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="dashboard" />

      <DashboardBody
        activeCount={activeTopics.length}
        pickup={
          <CreateTopicSection allTags={allTags}>
            <section>
              <h2 className="mb-md text-muted">[PICK UP WHERE YOU LEFT OFF]</h2>
              <div className="flex flex-col gap-md">
                {nextActions.map(({ topic, reason }) => {
                  const borderColor =
                    topic.temperature === "HOT"
                      ? "border-hot"
                      : topic.temperature === "WARM"
                        ? "border-warm"
                        : "border-border-subtle";
                  const stages = getTopicStage(topic as TopicWithRelations);
                  const sparkedBy = (topic as TopicWithRelations).inspirations.find(
                    (i) => i.inspiredByTopic
                  )?.inspiredByTopic;
                  return (
                    <Link
                      key={topic.id}
                      href={`/topics/${topic.id}`}
                      className={`block border ${borderColor} p-lg hover:bg-surface transition-colors`}
                      style={{ backgroundImage: topicGradient(topic.title) }}
                    >
                      <div className="flex items-start justify-between gap-sm mb-sm">
                        <div className="flex items-center gap-sm">
                          <TemperatureDot temperature={topic.temperature} />
                          <span className="text-sm font-bold">{topic.title}</span>
                        </div>
                        <span className={`text-xs whitespace-nowrap ${
                          topic.temperature === "HOT" ? "text-hot" : topic.temperature === "WARM" ? "text-warm" : "text-cool"
                        }`}>
                          {topic.temperature}
                        </span>
                      </div>

                      <div className="mb-sm text-xs text-secondary font-medium">{reason}</div>

                      {topic.description && (
                        <p className="text-xs text-muted mb-sm line-clamp-2">{topic.description}</p>
                      )}

                      {sparkedBy && (
                        <div className="text-xs text-muted mb-sm">
                          Sparked by: <span className="underline">{sparkedBy.title}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-1 ml-6">
                        {stages.map((stage, index) => (
                          <StageRow key={`${stage.label}-${index}`} label={stage.label} progress={stage.progress} />
                ))}
                        {(topic as TopicWithRelations).tags.length > 0 && (
                          <div className="flex flex-wrap gap-xs justify-end">
                            {(topic as TopicWithRelations).tags.slice(0, 4).map(({ tag }) => (
                              <span key={tag.id} className="border border-border-subtle px-2 py-0.5 text-xs text-muted">
                                #{tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
                <CreateTopicTrigger />
              </div>
            </section>
          </CreateTopicSection>
        }
        activeTopics={
          <div className="flex flex-col gap-md">
            {(activeTopics as TopicWithRelations[]).map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}

            {activeTopics.length === 0 && (
              <p className="text-sm text-muted">No active topics yet. Create your first curiosity below.</p>
            )}
          </div>
        }
        bottom={
          <>
            {satisfiedTopics.length > 0 && (
              <CollapsibleSection title="SATISFIED" count={satisfiedTopics.length}>
                <div className="flex flex-col gap-sm">
                  {(satisfiedTopics as TopicWithRelations[]).map((topic) => (
                    <CompactTopicRow
                      key={topic.id}
                      topic={topic}
                      statusLabel="SATISFIED"
                      statusColor="text-satisfied"
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            <DormantSection topics={dormantTopics as TopicWithRelations[]} />
          </>
        }
      />

    </main>
  );
}
