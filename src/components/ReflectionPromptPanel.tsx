"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface PromptSuggestion {
  prompt: string;
  suggestedTitle: string;
}

interface ReflectionPromptPanelProps {
  context: "tier_advancement" | "freestyle" | "topic_specific";
  topicId?: string;
  tier?: string;
  advanceTo?: string;
  onAccept: (prompt: string, suggestedTitle: string) => void;
  onDismiss: () => void;
}

type Status = "idle" | "loading" | "showing" | "error" | "empty";

export function ReflectionPromptPanel({
  context,
  topicId,
  tier,
  advanceTo,
  onAccept,
  onDismiss,
}: ReflectionPromptPanelProps) {
  const [prompts, setPrompts] = useState<PromptSuggestion[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPrompts = useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/reflections/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, topicId, tier, advanceTo }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setErrorMessage(json?.error?.message ?? `Request failed (${res.status})`);
        setStatus("error");
        return;
      }

      const json = await res.json();
      const data: PromptSuggestion[] = json.data?.prompts ?? [];

      if (data.length === 0) {
        setStatus("empty");
        return;
      }

      setPrompts(data);
      setStatus("showing");
    } catch {
      setErrorMessage("Network error");
      setStatus("error");
    }
  }, [context, topicId, tier, advanceTo]);

  useEffect(() => {
    if (status === "idle") {
      fetchPrompts();
    }
  }, [status, fetchPrompts]);

  useEffect(() => {
    if (status === "empty") {
      onDismiss();
    }
  }, [status, onDismiss]);

  if (status === "idle" || status === "empty") {
    return null;
  }

  if (status === "loading") {
    return (
      <div className="border border-dashed border-border-subtle p-md text-xs text-muted animate-pulse">
        Generating prompts...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="border border-dashed border-border-subtle p-md">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">
            {errorMessage ?? "Failed to generate prompts"}
          </span>
          <button
            onClick={fetchPrompts}
            className="text-xs text-muted hover:text-text uppercase tracking-wider"
          >
            [RETRY]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-sm">
      <div className="text-xs text-muted uppercase tracking-wider">
        Suggested prompts
      </div>

      {prompts.map((p, i) => (
        <div
          key={i}
          className="border border-dashed border-border-subtle px-md py-sm"
        >
          <div className="flex items-start justify-between gap-md">
            <div className="flex-1 min-w-0">
              <p className="text-sm">{p.prompt}</p>
              <p className="mt-xs text-xs text-muted">{p.suggestedTitle}</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => onAccept(p.prompt, p.suggestedTitle)}
            >
              USE
            </Button>
          </div>
        </div>
      ))}

      <div className="flex gap-md">
        <button
          onClick={() => {
            setStatus("idle");
          }}
          className="text-xs text-muted hover:text-text uppercase tracking-wider"
        >
          [REGENERATE]
        </button>
        <button
          onClick={onDismiss}
          className="text-xs text-muted hover:text-text uppercase tracking-wider"
        >
          [WRITE FREELY]
        </button>
      </div>
    </div>
  );
}
