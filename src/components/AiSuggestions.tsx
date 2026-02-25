"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

interface Suggestion {
  title: string;
  author: string | null;
  type: string;
  url: string | null;
  estimatedMinutes: number | null;
  description: string | null;
}

interface AiSuggestionsProps {
  topicId: string;
  tier: string;
  existingCount: number;
}

export function AiSuggestions({ topicId, tier, existingCount }: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/topics/${topicId}/suggestions?tier=${tier}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErrorMessage(json?.error?.message ?? `Request failed (${res.status})`);
        setStatus("error");
        return;
      }
      const json = await res.json();
      const data = json.data ?? [];
      setSuggestions(data);
      setStatus("done");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  }, [topicId, tier]);

  // Auto-fetch when tier has no resources
  useEffect(() => {
    if (existingCount === 0 && status === "idle") {
      fetchSuggestions();
    }
  }, [existingCount, status, fetchSuggestions]);

  async function handleAdd(suggestion: Suggestion) {
    const key = suggestion.title;
    setAddingId(key);
    try {
      const res = await fetch(`/api/topics/${topicId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestion.title,
          type: suggestion.type,
          tier,
          author: suggestion.author || undefined,
          url: suggestion.url || undefined,
          estimatedMinutes: suggestion.estimatedMinutes || undefined,
          description: suggestion.description || undefined,
        }),
      });

      if (!res.ok) {
        toast("Failed to add resource", "error");
        return;
      }

      toast("Resource added", "success");
      setSuggestions((prev) => prev.filter((s) => s.title !== key));
      router.refresh();
    } catch {
      toast("Failed to add resource", "error");
    } finally {
      setAddingId(null);
    }
  }

  function handleDismiss(title: string) {
    setSuggestions((prev) => prev.filter((s) => s.title !== title));
  }

  // Don't render anything for REFERENCE tier
  if (tier === "REFERENCE") return null;

  if (status === "idle") {
    return (
      <button
        onClick={fetchSuggestions}
        className="text-xs text-muted hover:text-text uppercase tracking-wider"
      >
        [GET AI SUGGESTIONS]
      </button>
    );
  }

  if (status === "loading") {
    return (
      <div className="text-xs text-muted animate-pulse">
        Searching for resources...
      </div>
    );
  }

  if (status === "error" || (status === "done" && suggestions.length === 0)) {
    return (
      <div className="flex items-center gap-md">
        <span className="text-xs text-muted">
          {errorMessage ?? "No suggestions available right now."}
        </span>
        <button
          onClick={fetchSuggestions}
          className="text-xs text-muted hover:text-text uppercase tracking-wider"
        >
          [RETRY]
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">AI Suggestions</span>
        <button
          onClick={fetchSuggestions}
          className="text-xs text-muted hover:text-text uppercase tracking-wider"
        >
          [REFRESH]
        </button>
      </div>
      <ul className="flex flex-col gap-sm">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.title}
            className="border border-dashed border-border-subtle px-md py-sm"
          >
            <div className="flex items-start justify-between gap-md">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm text-sm">
                  <span className="text-muted">+</span>
                  <span>
                    {suggestion.url ? (
                      <a
                        href={suggestion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-border-subtle hover:decoration-text"
                      >
                        {suggestion.title}
                      </a>
                    ) : (
                      suggestion.title
                    )}
                  </span>
                  {suggestion.author && (
                    <span className="text-muted text-xs"> — {suggestion.author}</span>
                  )}
                </div>
                <div className="mt-xs flex flex-wrap items-center gap-sm text-xs text-muted">
                  <span className="border border-border-subtle px-2 py-0.5">
                    {suggestion.type.toLowerCase()}
                  </span>
                  {suggestion.estimatedMinutes && (
                    <span>{suggestion.estimatedMinutes} min</span>
                  )}
                </div>
                {suggestion.description && (
                  <p className="mt-xs text-xs text-muted">{suggestion.description}</p>
                )}
              </div>
              <div className="flex gap-sm shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={addingId === suggestion.title}
                  onClick={() => handleAdd(suggestion)}
                >
                  {addingId === suggestion.title ? "..." : "+ ADD"}
                </Button>
                <button
                  onClick={() => handleDismiss(suggestion.title)}
                  className="text-xs text-muted hover:text-text"
                >
                  [DISMISS]
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
