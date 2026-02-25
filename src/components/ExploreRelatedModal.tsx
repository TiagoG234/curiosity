"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/Toast";

interface ExploreRelatedModalProps {
  inspiringTopicId: string;
  inspiringTopicTitle: string;
  inspiringTopicTags: string[];
  open: boolean;
  onClose: () => void;
}

export function ExploreRelatedModal({
  inspiringTopicId,
  inspiringTopicTitle,
  inspiringTopicTags,
  open,
  onClose,
}: ExploreRelatedModalProps) {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(inspiringTopicTags)
  );
  const [markSatisfied, setMarkSatisfied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  if (!open) return null;

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      // Create connected topic
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          temperature: "WARM",
          tags: Array.from(selectedTags),
          inspiration: {
            inspiredByTopicId: inspiringTopicId,
            context: context.trim() || undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error?.message || "Failed to create topic", "error");
        return;
      }

      const { data: newTopic } = await res.json();

      // Optionally mark inspiring topic as satisfied
      if (markSatisfied) {
        await fetch(`/api/topics/${inspiringTopicId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SATISFIED" }),
        });
      }

      toast(`Connected topic created: ${newTopic.title}`, "success");
      onClose();
      router.push(`/topics/${newTopic.id}`);
    } catch {
      toast("Failed to create topic", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[600px] border-2 border-border bg-bg p-xl mx-lg">
        <h2 className="mb-lg">EXPLORE RELATED</h2>

        <p className="mb-lg text-sm text-muted">
          Inspired by: <span className="font-bold text-text">{inspiringTopicTitle}</span>
        </p>

        {/* Connected concepts */}
        {inspiringTopicTags.length > 0 && (
          <div className="mb-lg">
            <div className="text-xs uppercase text-muted mb-sm tracking-wider">
              Connected concepts
            </div>
            <div className="flex flex-wrap gap-xs">
              {inspiringTopicTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`border px-2 py-0.5 text-xs transition-colors ${
                    selectedTags.has(tag)
                      ? "border-border text-text"
                      : "border-border-subtle text-muted"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="text-xs uppercase text-muted mb-sm tracking-wider">
            Create connected topic
          </div>

          <Input
            placeholder="Topic title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            placeholder="Inspiration context — e.g. &quot;While reading about X, I got curious about Y...&quot;"
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />

          <label className="flex items-center gap-sm text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={markSatisfied}
              onChange={(e) => setMarkSatisfied(e.target.checked)}
              className="accent-satisfied"
            />
            Mark &quot;{inspiringTopicTitle}&quot; as satisfied
          </label>

          <div className="flex gap-sm">
            <Button type="submit" variant="secondary" disabled={submitting}>
              {submitting ? "CREATING..." : "CREATE TOPIC"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
