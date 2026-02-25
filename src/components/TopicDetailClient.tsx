"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ResourceList } from "@/components/ResourceList";
import { AddResourceForm } from "@/components/AddResourceForm";
import { TierCompleteModal } from "@/components/TierCompleteModal";
import { ExploreRelatedModal } from "@/components/ExploreRelatedModal";
import { TemperatureToggle } from "@/components/TemperatureToggle";
import { getRelativeTime } from "@/lib/utils";
import { TagSearchAssign } from "@/components/TagSearchAssign";
import { AiSuggestions } from "@/components/AiSuggestions";
import { TopicStatusToggle } from "@/components/TopicStatusToggle";

interface CompletionData {
  id: string;
  resourceId: string;
  completedAt: string;
  timeSpentMinutes: number | null;
  rating: number | null;
}

interface ResourceData {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  type: string;
  tier: string;
  estimatedMinutes: number | null;
  url: string | null;
  completions: CompletionData[];
}

interface ReflectionData {
  id: string;
  title: string;
  tier: string | null;
  content: string;
  writingTimeSeconds: number;
  createdAt: string;
  updatedAt: string;
}

interface InspirationData {
  inspiredByTopic: { id: string; title: string } | null;
  context: string | null;
}

type CompletableTier = "GATEWAY" | "INTERMEDIATE" | "ADVANCED";

interface TopicDetailProps {
  topic: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    temperature: string;
    whyInterested: string | null;
    gatewayComplete: boolean;
    intermediateStarted: boolean;
    intermediateComplete: boolean;
    advancedStarted: boolean;
    advancedComplete: boolean;
    tags: { tag: { id: string; name: string } }[];
    inspirations: InspirationData[];
    reflections: ReflectionData[];
  };
  gatewayResources: ResourceData[];
  intermediateResources: ResourceData[];
  advancedResources: ResourceData[];
  referenceResources: ResourceData[];
  allTags: { id: string; name: string }[];
}

/**
 * Determine if a tier completion modal should be shown on page load.
 * Checks actual resource completion data — not just DB flags — so that
 * reopened tiers with previously-completed resources are detected.
 */
function getInitialCompletedTier(
  topic: TopicDetailProps["topic"],
  gatewayResources: ResourceData[],
  intermediateResources: ResourceData[],
  advancedResources: ResourceData[],
): CompletableTier | null {
  if (topic.status !== "ACTIVE") return null;

  function allDone(resources: ResourceData[]) {
    return resources.length > 0 && resources.every((r) => r.completions.length > 0);
  }

  // Check tiers in reverse order so the most recent completion takes priority
  if (topic.advancedStarted && allDone(advancedResources)) {
    return "ADVANCED";
  }

  if (topic.intermediateStarted && !topic.advancedStarted && allDone(intermediateResources)) {
    return "INTERMEDIATE";
  }

  if (!topic.intermediateStarted && allDone(gatewayResources)) {
    return "GATEWAY";
  }

  return null;
}

function ReflectionCard({ reflection }: { reflection: ReflectionData }) {
  const wordCount = reflection.content.trim()
    ? reflection.content.trim().split(/\s+/).length
    : 0;

  return (
    <Link
      href={`/reflections/${reflection.id}`}
      className="block border border-border-subtle p-md hover:bg-surface transition-colors"
    >
      <div className="text-sm font-bold mb-xs">{reflection.title}</div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{wordCount} words</span>
        <span>{getRelativeTime(new Date(reflection.updatedAt))}</span>
      </div>
      {reflection.tier && (
        <div className="mt-xs text-xs text-muted">{reflection.tier}</div>
      )}
    </Link>
  );
}

export function TopicDetailClient({
  topic,
  gatewayResources,
  intermediateResources,
  advancedResources,
  referenceResources,
  allTags,
}: TopicDetailProps) {
  const [completedTier, setCompletedTier] = useState<CompletableTier | null>(
    getInitialCompletedTier(topic, gatewayResources, intermediateResources, advancedResources)
  );
  const [showExploreModal, setShowExploreModal] = useState(false);

  // Sync the DB completion flag when we detect a tier is actually complete
  useEffect(() => {
    if (!completedTier) return;
    const flagMap: Record<CompletableTier, string> = {
      GATEWAY: "gatewayComplete",
      INTERMEDIATE: "intermediateComplete",
      ADVANCED: "advancedComplete",
    };
    const flag = flagMap[completedTier];
    const alreadySet = topic[flag as keyof typeof topic];
    if (!alreadySet) {
      fetch(`/api/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [flag]: true }),
      });
    }
  }, [completedTier, topic]);

  const sparkedBy = topic.inspirations.find((i) => i.inspiredByTopic)?.inspiredByTopic;
  const tagNames = topic.tags.map((t) => t.tag.name);

  function tierDone(resources: ResourceData[]) {
    const completed = resources.filter((r) => r.completions.length > 0).length;
    return { completed, total: resources.length, allDone: resources.length > 0 && completed === resources.length };
  }

  const gateway = tierDone(gatewayResources);
  const intermediate = tierDone(intermediateResources);
  const advanced = tierDone(advancedResources);

  return (
    <>
      <main className="mx-auto min-h-screen max-w-6xl px-xl py-xl lg:flex lg:gap-xl">
        {/* Left column: main content */}
        <div className="flex flex-1 flex-col gap-xl lg:max-w-4xl">
          {/* Header */}
          <header className="flex flex-col gap-md">
            <Link href="/dashboard" className="text-xs text-muted hover:text-text">
              ← BACK
            </Link>

            <div className="flex items-start justify-between gap-md">
              <div>
                <h1 className="text-lg">{topic.title}</h1>
                <div className="mt-xs flex items-center gap-md text-xs text-muted">
                  <TemperatureToggle topicId={topic.id} current={topic.temperature} />
                  <span>{topic.status}</span>
                  {(topic.status === "ACTIVE" || topic.status === "DORMANT") && (
                    <TopicStatusToggle topicId={topic.id} currentStatus={topic.status} />
                  )}
                </div>
              </div>
            </div>

            {sparkedBy && (
              <div className="text-xs text-muted">
                Sparked by:{" "}
                <Link
                  href={`/topics/${sparkedBy.id}`}
                  className="underline hover:text-text"
                >
                  {sparkedBy.title}
                </Link>
              </div>
            )}

            {topic.description && (
              <p className="text-sm text-muted">{topic.description}</p>
            )}

            {topic.whyInterested && (
              <div className="text-xs text-muted">
                <span className="font-bold">WHY:</span> {topic.whyInterested}
              </div>
            )}

            <TagSearchAssign
              topicId={topic.id}
              currentTags={topic.tags.map(({ tag }) => ({ id: tag.id, name: tag.name }))}
              allTags={allTags}
            />
          </header>

          {/* Progress */}
          <section className="border border-border-subtle p-md">
            <h2 className="mb-sm">PROGRESS</h2>
            <div className="space-y-xs text-sm">
              <div className="flex items-center gap-sm">
                <span>Gateway</span>
                {gateway.total === 0 ? (
                  <span className="text-muted">— no resources</span>
                ) : gateway.allDone ? (
                  <span className="text-satisfied">✓ {gateway.completed}/{gateway.total} complete</span>
                ) : (
                  <span className="text-muted">{gateway.completed}/{gateway.total}</span>
                )}
              </div>
              <div className="flex items-center gap-sm text-muted">
                <span>Intermediate</span>
                {topic.intermediateStarted ? (
                  intermediate.allDone ? (
                    <span className="text-satisfied">✓ {intermediate.completed}/{intermediate.total} complete</span>
                  ) : (
                    <span>{intermediate.completed}/{intermediate.total}</span>
                  )
                ) : (
                  <span>— Optional (not started)</span>
                )}
              </div>
              <div className="flex items-center gap-sm text-muted">
                <span>Advanced</span>
                {topic.advancedStarted ? (
                  advanced.allDone ? (
                    <span className="text-satisfied">✓ {advanced.completed}/{advanced.total} complete</span>
                  ) : (
                    <span>{advanced.completed}/{advanced.total}</span>
                  )
                ) : (
                  <span>— Optional (not started)</span>
                )}
              </div>
            </div>
          </section>

          {/* Gateway Resources */}
          <section className="space-y-md">
            <h2>
              [GATEWAY]{" "}
              {gateway.allDone ? (
                <span className="text-satisfied">✓ {gateway.completed}/{gateway.total}</span>
              ) : (
                <span>{gateway.completed}/{gateway.total}</span>
              )}
            </h2>
            <ResourceList
              resources={gatewayResources}
              tier="GATEWAY"
              onTierComplete={() => setCompletedTier("GATEWAY")}
            />
            <AddResourceForm topicId={topic.id} tier="GATEWAY" tierComplete={topic.gatewayComplete} />
            <AiSuggestions topicId={topic.id} tier="GATEWAY" existingCount={gatewayResources.length} />
          </section>

          {/* Intermediate Resources — only after unlocked */}
          {topic.intermediateStarted && (
            <section className="space-y-md">
              <h2>[INTERMEDIATE]</h2>
              <ResourceList
                resources={intermediateResources}
                tier="INTERMEDIATE"
                onTierComplete={() => setCompletedTier("INTERMEDIATE")}
              />
              <AddResourceForm topicId={topic.id} tier="INTERMEDIATE" tierComplete={topic.intermediateComplete} />
              <AiSuggestions topicId={topic.id} tier="INTERMEDIATE" existingCount={intermediateResources.length} />
            </section>
          )}

          {/* Advanced Resources — only after unlocked */}
          {topic.advancedStarted && (
            <section className="space-y-md">
              <h2>[ADVANCED]</h2>
              <ResourceList
                resources={advancedResources}
                tier="ADVANCED"
                onTierComplete={() => setCompletedTier("ADVANCED")}
              />
              <AddResourceForm topicId={topic.id} tier="ADVANCED" tierComplete={topic.advancedComplete} />
              <AiSuggestions topicId={topic.id} tier="ADVANCED" existingCount={advancedResources.length} />
            </section>
          )}

          {/* Reference Resources */}
          <section className="space-y-md">
            <h2>[REFERENCE]</h2>
            <ResourceList resources={referenceResources} tier="REFERENCE" />
            <AddResourceForm topicId={topic.id} tier="REFERENCE" />
          </section>
        </div>

        {/* Right column: reflections sidebar */}
        <aside className="mt-xl w-full shrink-0 lg:mt-0 lg:w-[280px]">
          <div className="flex items-center justify-between mb-md">
            <h2>REFLECTIONS</h2>
            <Link
              href={`/reflections/new?topicId=${topic.id}`}
              className="text-xs text-muted hover:text-text uppercase tracking-wider"
            >
              [WRITE]
            </Link>
          </div>

          {topic.reflections.length === 0 ? (
            <p className="text-xs text-muted">
              No reflections yet. Write one when you&apos;re ready.
            </p>
          ) : (
            <div className="flex flex-col gap-sm">
              {topic.reflections.map((reflection) => (
                <ReflectionCard key={reflection.id} reflection={reflection} />
              ))}
            </div>
          )}
        </aside>
      </main>

      {/* Modals */}
      {completedTier && (
        <TierCompleteModal
          topicId={topic.id}
          topicTitle={topic.title}
          tier={completedTier}
          open={true}
          onClose={() => setCompletedTier(null)}
          onExploreRelated={() => {
            setCompletedTier(null);
            setShowExploreModal(true);
          }}
        />
      )}

      <ExploreRelatedModal
        inspiringTopicId={topic.id}
        inspiringTopicTitle={topic.title}
        inspiringTopicTags={tagNames}
        open={showExploreModal}
        onClose={() => setShowExploreModal(false)}
      />
    </>
  );
}
