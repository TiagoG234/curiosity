"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const TEMPERATURES = ["HOT", "WARM", "COOL"] as const;
type Temperature = (typeof TEMPERATURES)[number];

interface TemperatureToggleProps {
  topicId: string;
  current: string;
}

export function TemperatureToggle({ topicId, current }: TemperatureToggleProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function cycle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const idx = TEMPERATURES.indexOf(current as Temperature);
    const next = TEMPERATURES[(idx + 1) % TEMPERATURES.length];

    setSaving(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature: next }),
      });
      if (!res.ok) {
        toast("Failed to update temperature", "error");
        return;
      }
      router.refresh();
    } catch {
      toast("Failed to update temperature", "error");
    } finally {
      setSaving(false);
    }
  }

  const colorClass =
    current === "HOT"
      ? "text-hot"
      : current === "WARM"
        ? "text-warm"
        : "text-cool";

  return (
    <button
      onClick={cycle}
      disabled={saving}
      className={`text-xs uppercase tracking-wider ${colorClass} hover:opacity-70 disabled:opacity-50`}
      title={`Temperature: ${current} (click to change)`}
    >
      {current === "HOT" ? "●" : "○"} {current}
    </button>
  );
}
