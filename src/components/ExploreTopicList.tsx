"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getRelativeTime, topicGradient } from "@/lib/utils";
import type { RankedTopic } from "@/lib/explore-types";

function getStageProgress(
  topic: RankedTopic,
  stage: string
): { completed: number; total: number } {
  const resources = topic.resources.filter(
    (r) => r.tier === stage.toUpperCase()
  );
  const completed = resources.filter((r) => r.completions.length > 0).length;
  return { completed, total: resources.length };
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

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    ACTIVE: "text-text",
    DORMANT: "text-muted",
    SATISFIED: "text-satisfied",
  };
  return (
    <span className={`text-xs ${colorMap[status] ?? "text-muted"}`}>
      {status}
    </span>
  );
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

function getTopicStages(topic: RankedTopic) {
  const stages: { label: string; progress: string }[] = [];

  function tierProgress(tier: string) {
    const { completed, total } = getStageProgress(topic, tier);
    if (total === 0) return "no resources";
    if (completed === total) return "✓";
    return `${completed}/${total}`;
  }

  stages.push({ label: "Gateway", progress: tierProgress("Gateway") });

  if (topic.intermediateStarted || topic.advancedStarted) {
    stages.push({ label: "Intermediate", progress: tierProgress("Intermediate") });
  }

  if (topic.advancedStarted) {
    stages.push({ label: "Advanced", progress: tierProgress("Advanced") });
  }

  return stages;
}

function ExploreTopicCard({ topic }: { topic: RankedTopic }) {
  const stages = getTopicStages(topic);

  return (
    <div
      className="border border-border p-lg flex flex-col gap-sm hover:bg-surface transition-all duration-300"
      style={{ backgroundImage: topicGradient(topic.title) }}
    >
      <div className="flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <TemperatureDot temperature={topic.temperature} />
          <Link
            href={`/topics/${topic.id}`}
            className="font-bold text-sm hover:underline"
          >
            {topic.title}
          </Link>
        </div>
        <StatusBadge status={topic.status} />
      </div>

      <div className="flex flex-col gap-1 ml-6">
        {stages.map((stage, i) => (
          <StageRow key={`${stage.label}-${i}`} label={stage.label} progress={stage.progress} />
        ))}
      </div>

      {topic.tags.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {topic.tags.map(({ tag }) => (
            <span
              key={tag.id}
              className="border border-border-subtle px-2 py-0.5 text-xs text-muted"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-muted">
        Last: {getRelativeTime(topic.lastActivityAt)}
      </div>
    </div>
  );
}

export function ExploreTopicList({
  initialTopics,
  aiScores,
}: {
  initialTopics: RankedTopic[];
  aiScores: Record<string, number> | null;
}) {
  const sortedTopics = useMemo(() => {
    if (!aiScores) return initialTopics;

    return [...initialTopics]
      .map((t) => ({
        ...t,
        score: t.score + (aiScores[t.id] ?? 0),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
        );
      });
  }, [initialTopics, aiScores]);

  if (sortedTopics.length === 0) {
    return <p className="text-sm text-muted">No topics to explore yet.</p>;
  }

  return (
    <div className="flex flex-col gap-md">
      {sortedTopics.map((topic) => (
        <ExploreTopicCard key={topic.id} topic={topic} />
      ))}
    </div>
  );
}
