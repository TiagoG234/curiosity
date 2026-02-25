"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

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

function getLinkLabel(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes("wikipedia.org")) {
      const page = decodeURIComponent(u.pathname.split("/wiki/")[1] || "").replace(/_/g, " ");
      return page || "Wikipedia";
    }
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
    return host;
  } catch {
    return url;
  }
}

interface ResourceListProps {
  resources: ResourceData[];
  tier: string;
  onTierComplete?: () => void;
}

export function ResourceList({ resources, tier, onTierComplete }: ResourceListProps) {
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [insights, setInsights] = useState("");
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function handleComplete(resourceId: string) {
    setWorkingId(resourceId);
    try {
      const body: Record<string, string> = {};
      if (insights.trim()) {
        body.keyInsights = insights.trim();
      }

      const res = await fetch(`/api/resources/${resourceId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        toast("Failed to mark complete", "error");
        return;
      }

      const json = await res.json();
      toast("Resource marked complete", "success");
      setExpandedId(null);
      setInsights("");
      router.refresh();

      if (json.data?.showDecisionModal && onTierComplete) {
        onTierComplete();
      }
    } catch {
      toast("Failed to mark complete", "error");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleArchive(resourceId: string) {
    setArchivingId(resourceId);
    try {
      const res = await fetch(`/api/resources/${resourceId}/archive`, {
        method: "PATCH",
      });

      if (!res.ok) {
        toast("Failed to archive resource", "error");
        return;
      }

      toast("Resource archived", "success");
      router.refresh();
    } catch {
      toast("Failed to archive resource", "error");
    } finally {
      setArchivingId(null);
    }
  }

  if (resources.length === 0) {
    return (
      <p className="text-xs text-muted">
        {tier === "GATEWAY"
          ? "No gateway resources yet. Add resources to get started."
          : `Optional — add ${tier.toLowerCase()} resources when ready.`}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-sm">
      {resources.map((resource) => {
        const completion = resource.completions[0];
        const isCompleted = !!completion;

        return (
          <li
            key={resource.id}
            className="flex items-start justify-between gap-md border border-border-subtle px-md py-sm"
          >
            <div className="flex-1">
              <div className="flex items-center gap-sm">
                <span className={isCompleted ? "text-satisfied" : "text-muted"}>
                  {isCompleted ? "✓" : "○"}
                </span>
                <span className="text-sm font-medium">
                  {resource.url ? (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-border-subtle hover:decoration-text"
                      title={getLinkLabel(resource.url)}
                    >
                      {resource.title}
                    </a>
                  ) : (
                    resource.title
                  )}
                  {resource.author && (
                    <span className="font-normal text-muted"> — {resource.author}</span>
                  )}
                </span>
              </div>

              <div className="mt-xs flex flex-wrap items-center gap-sm text-xs text-muted">
                <span className="border border-border-subtle px-2 py-0.5">
                  {resource.url ? getLinkLabel(resource.url) : resource.type.toLowerCase()}
                </span>
                {resource.estimatedMinutes && (
                  <span>{resource.estimatedMinutes} min</span>
                )}
                {isCompleted && completion.completedAt && (
                  <span>
                    completed {new Date(completion.completedAt).toLocaleDateString()}
                  </span>
                )}
                {isCompleted && completion.rating && (
                  <span>{"★".repeat(completion.rating)}{"☆".repeat(5 - completion.rating)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-sm shrink-0">
              {!isCompleted && expandedId !== resource.id && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setExpandedId(resource.id);
                    setInsights("");
                  }}
                >
                  COMPLETE
                </Button>
              )}
              <button
                onClick={() => handleArchive(resource.id)}
                disabled={archivingId === resource.id}
                className="text-xs text-muted hover:text-text"
                title="Archive this resource"
              >
                {archivingId === resource.id ? "..." : "[ARCHIVE]"}
              </button>
            </div>

            {expandedId === resource.id && (
              <div className="mt-sm border-t border-border-subtle pt-sm flex flex-col gap-sm w-full">
                <label className="text-xs text-muted">
                  What did you learn? (optional — saved as a reflection)
                </label>
                <textarea
                  value={insights}
                  onChange={(e) => setInsights(e.target.value)}
                  placeholder="Key insights, takeaways, questions that came up..."
                  className="w-full border border-border-subtle bg-bg px-sm py-xs text-sm font-mono resize-y min-h-[60px]"
                  rows={3}
                />
                <div className="flex gap-sm">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={workingId === resource.id}
                    onClick={() => handleComplete(resource.id)}
                  >
                    {workingId === resource.id ? "..." : "SAVE"}
                  </Button>
                  <button
                    type="button"
                    className="text-xs text-muted hover:text-text"
                    onClick={() => {
                      setExpandedId(null);
                      setInsights("");
                    }}
                  >
                    [CANCEL]
                  </button>
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
