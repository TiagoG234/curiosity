"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";

interface DormantTopic {
  id: string;
  title: string;
}

interface DormantSectionProps {
  topics: DormantTopic[];
}

function UnshelveButton({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleUnshelve(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) {
        toast("Failed to unshelve topic", "error");
        return;
      }
      toast("Topic reactivated", "success");
      router.refresh();
    } catch {
      toast("Failed to unshelve topic", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUnshelve}
      disabled={loading}
      className="text-xs uppercase tracking-wider text-muted hover:text-text disabled:opacity-50"
    >
      {loading ? "[...]" : "[UNSHELVE]"}
    </button>
  );
}

export function DormantSection({ topics }: DormantSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="border-t border-border-subtle pt-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs uppercase tracking-wider text-dormant hover:text-text transition-colors"
      >
        {expanded ? "[HIDE DORMANT]" : `[SHOW DORMANT TOPICS${topics.length > 0 ? ` (${topics.length})` : ""}]`}
      </button>

      {expanded && (
        <div className="mt-md flex flex-col gap-sm">
          {topics.length === 0 ? (
            <p className="text-xs text-muted">No dormant topics.</p>
          ) : (
            topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/topics/${topic.id}`}
                className="flex items-center justify-between border border-border-subtle px-md py-sm text-sm text-muted hover:text-text transition-colors"
              >
                <span>{topic.title}</span>
                <div className="flex items-center gap-md">
                  <span className="text-xs text-dormant">DORMANT</span>
                  <UnshelveButton topicId={topic.id} />
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </section>
  );
}
