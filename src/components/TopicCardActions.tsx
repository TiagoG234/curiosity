"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import Link from "next/link";

interface TopicCardActionsProps {
  topicId: string;
  gatewayComplete: boolean;
}

export function TopicCardActions({ topicId, gatewayComplete }: TopicCardActionsProps) {
  const [shelving, setShelving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleShelve(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShelving(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DORMANT" }),
      });
      if (!res.ok) {
        toast("Failed to shelve topic", "error");
        return;
      }
      toast("Topic shelved", "success");
      router.refresh();
    } catch {
      toast("Failed to shelve topic", "error");
    } finally {
      setShelving(false);
    }
  }

  return (
    <div className="flex gap-md">
      <Link
        href={`/topics/${topicId}`}
        className="text-xs uppercase tracking-wider hover:underline"
      >
        [CONTINUE]
      </Link>
      {gatewayComplete && (
        <Link
          href={`/topics/${topicId}#explore`}
          className="text-xs uppercase tracking-wider text-muted hover:text-text hover:underline"
        >
          [EXPLORE]
        </Link>
      )}
      <button
        onClick={handleShelve}
        disabled={shelving}
        className="text-xs uppercase tracking-wider text-muted hover:text-text hover:underline disabled:opacity-50"
      >
        {shelving ? "[...]" : "[SHELVE]"}
      </button>
    </div>
  );
}
