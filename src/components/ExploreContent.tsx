"use client";

import { useCallback, useState } from "react";
import { ExploreSuggestion } from "@/components/ExploreSuggestion";
import { ExploreTopicList } from "@/components/ExploreTopicList";
import type { RankedTopic } from "@/lib/explore-types";

export function ExploreContent({
  initialTopics,
}: {
  initialTopics: RankedTopic[];
}) {
  const [aiScores, setAiScores] = useState<Record<string, number> | null>(null);

  const handleScoresLoaded = useCallback(
    (scores: { topicId: string; score: number }[]) => {
      const map: Record<string, number> = {};
      for (const s of scores) {
        map[s.topicId] = s.score;
      }
      setAiScores(map);
    },
    []
  );

  return (
    <div className="flex flex-col gap-md">
      <ExploreSuggestion onScoresLoaded={handleScoresLoaded} />
      <ExploreTopicList initialTopics={initialTopics} aiScores={aiScores} />
    </div>
  );
}
