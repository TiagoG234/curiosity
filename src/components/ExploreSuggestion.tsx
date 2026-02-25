"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SuggestedTopic {
  title: string;
  description: string;
  rationale: string;
  tags: string[];
}

interface TopicScore {
  topicId: string;
  score: number;
}

type Status = "loading" | "showing" | "refreshing" | "dismissed" | "empty";

export function ExploreSuggestion({
  onScoresLoaded,
}: {
  onScoresLoaded: (scores: TopicScore[]) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [suggestion, setSuggestion] = useState<SuggestedTopic | null>(null);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [isSpicy, setIsSpicy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function fetchInsights(excludeTitles: string[], spicy: boolean) {
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeTitles, spicy }),
      });
      if (!res.ok) {
        setStatus("empty");
        return;
      }
      const json = await res.json();

      const { suggestedTopic, topicScores } = json.data ?? {};

      if (topicScores?.length) {
        onScoresLoaded(topicScores);
      }

      if (suggestedTopic?.title) {
        setSuggestion(suggestedTopic);
        setIsSpicy(spicy);
        setStatus("showing");
      } else {
        setStatus("empty");
      }
    } catch {
      setStatus("empty");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialFetch() {
      try {
        const res = await fetch("/api/explore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ excludeTitles: [] }),
        });
        if (!res.ok) {
          if (!cancelled) setStatus("empty");
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        const { suggestedTopic, topicScores } = json.data ?? {};

        if (topicScores?.length) {
          onScoresLoaded(topicScores);
        }

        if (suggestedTopic?.title) {
          setSuggestion(suggestedTopic);
          setStatus("showing");
        } else {
          setStatus("empty");
        }
      } catch {
        if (!cancelled) setStatus("empty");
      }
    }

    initialFetch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSuggestAnother() {
    if (!suggestion) return;
    const newSeen = [...seenTitles, suggestion.title];
    setSeenTitles(newSeen);
    setSuggestion(null);
    setStatus("refreshing");
    fetchInsights(newSeen, true);
  }

  async function handleCreateTopic() {
    if (!suggestion) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description || undefined,
          whyInterested: suggestion.rationale || undefined,
          temperature: "WARM",
          tags: suggestion.tags.length > 0 ? suggestion.tags : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? "Failed to create topic");
      }
      const json = await res.json() as { data: { id: string } };
      router.push(`/topics/${json.data.id}`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (status === "loading" || status === "refreshing") {
    return (
      <div className="relative p-[2px] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-highlight), var(--color-primary))",
            backgroundSize: "400% 100%",
            animation: "shimmer-gradient 3s linear infinite",
          }}
        />
        <div className="relative bg-bg p-lg">
          <div className="flex flex-col gap-sm animate-pulse">
            <div className="h-3 w-32 bg-surface" />
            <div className="h-4 w-48 bg-surface" />
            <div className="h-3 w-64 bg-surface" />
            <div className="h-3 w-40 bg-surface" />
          </div>
        </div>
      </div>
    );
  }

  if (status !== "showing" || !suggestion) return null;

  return (
    <div className="relative p-[2px] overflow-hidden">
      {/* Animated gradient border */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-highlight), var(--color-primary))",
          backgroundSize: "400% 100%",
          animation: "shimmer-gradient 3s linear infinite",
        }}
      />
      {/* Card content */}
      <div className="relative bg-bg p-lg flex flex-col gap-sm">
        <div className="text-xs uppercase tracking-wider text-muted">
          {isSpicy ? "↯ SOMETHING DIFFERENT" : "✦ SUGGESTED FOR YOU"}
        </div>
        <div className="font-bold text-sm">{suggestion.title}</div>
        <div className="text-sm text-muted">{suggestion.description}</div>
        <div className="text-xs text-muted italic">{suggestion.rationale}</div>

        {suggestion.tags.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {suggestion.tags.map((tag) => (
              <span
                key={tag}
                className="border border-border-subtle px-2 py-0.5 text-xs text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-md mt-sm flex-wrap items-center">
          <button
            onClick={handleCreateTopic}
            disabled={creating}
            className="border border-border px-3 py-1 text-xs uppercase hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "CREATING..." : "CREATE TOPIC"}
          </button>
          <button
            onClick={handleSuggestAnother}
            className="border border-dashed border-secondary px-3 py-1 text-xs uppercase text-secondary hover:bg-secondary hover:text-bg transition-colors"
          >
            ↯ SPICE IT UP
          </button>
          <button
            onClick={() => setStatus("dismissed")}
            className="text-xs text-muted uppercase hover:text-text transition-colors"
          >
            DISMISS
          </button>
        </div>

        {createError && (
          <div className="text-xs text-primary">{createError}</div>
        )}
      </div>
    </div>
  );
}
