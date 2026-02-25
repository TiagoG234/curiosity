"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type Tier = "GATEWAY" | "INTERMEDIATE" | "ADVANCED";
type Action = "SATISFIED" | "EXPLORE_RELATED" | "CONTINUE" | "STAY" | "SHELVE";

interface TierCompleteModalProps {
  topicId: string;
  topicTitle: string;
  tier: Tier;
  open: boolean;
  onClose: () => void;
  onExploreRelated: () => void;
}

const TIER_LABELS: Record<Tier, string> = {
  GATEWAY: "Gateway",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

const TIER_DESCRIPTIONS: Record<Tier, string> = {
  GATEWAY: "You've built a foundation in:",
  INTERMEDIATE: "You've gone deeper into:",
  ADVANCED: "You've reached advanced level in:",
};

export function TierCompleteModal({
  topicId,
  topicTitle,
  tier,
  open,
  onClose,
  onExploreRelated,
}: TierCompleteModalProps) {
  const [acting, setActing] = useState<Action | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  if (!open) return null;

  async function handleAction(action: Action) {
    setActing(action);
    try {
      if (action === "STAY") {
        onClose();
        return;
      }

      if (action === "EXPLORE_RELATED") {
        onClose();
        onExploreRelated();
        return;
      }

      if (action === "SATISFIED") {
        await fetch(`/api/topics/${topicId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SATISFIED" }),
        });
        toast("Topic marked satisfied", "success");
        router.push("/dashboard");
        return;
      }

      if (action === "CONTINUE") {
        const advanceTo = tier === "GATEWAY" ? "INTERMEDIATE" : "ADVANCED";
        router.push(
          `/reflections/new?topicId=${topicId}&tier=${tier}&advanceTo=${advanceTo}`
        );
        onClose();
        return;
      }

      if (action === "SHELVE") {
        await fetch(`/api/topics/${topicId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DORMANT" }),
        });
        toast("Topic shelved for later", "success");
        router.push("/dashboard");
        return;
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setActing(null);
    }
  }

  const nextTierLabel = tier === "GATEWAY" ? "INTERMEDIATE" : "ADVANCED";

  const options: { action: Action; icon: string; label: string; description: string }[] = [
    {
      action: "SATISFIED",
      icon: "\u2713",
      label: "MARK SATISFIED",
      description: "I've learned what I wanted",
    },
    {
      action: "EXPLORE_RELATED",
      icon: "\u2192",
      label: "EXPLORE RELATED",
      description: "Discover connected topics via concepts",
    },
    // Only show CONTINUE if there's a next tier
    ...(tier !== "ADVANCED"
      ? [
          {
            action: "CONTINUE" as Action,
            icon: "\u2193",
            label: `CONTINUE TO ${nextTierLabel}`,
            description: `Go deeper on the full topic`,
          },
        ]
      : []),
    {
      action: "STAY",
      icon: "\u2500",
      label: `STAY AT ${TIER_LABELS[tier].toUpperCase()}`,
      description: "Add more resources at this tier",
    },
    {
      action: "SHELVE",
      icon: "\u25CB",
      label: "SHELVE FOR NOW",
      description: "Come back later",
    },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[600px] border-2 border-border bg-bg p-xl mx-lg">
        <h2 className="mb-lg">{TIER_LABELS[tier].toUpperCase()} COMPLETE</h2>

        <p className="mb-sm text-sm">
          {TIER_DESCRIPTIONS[tier]}
        </p>
        <p className="mb-lg text-sm font-bold">{topicTitle}</p>

        <p className="mb-md text-sm text-muted">What&apos;s next?</p>

        <div className="space-y-md">
          {options.map((opt) => (
            <button
              key={opt.action}
              onClick={() => handleAction(opt.action)}
              disabled={acting !== null}
              className="w-full text-left border border-border p-lg hover:bg-surface transition-colors disabled:opacity-50"
            >
              <div className="font-bold text-sm mb-xs">
                {opt.icon} {opt.label}
              </div>
              <div className="text-xs text-muted">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
