"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface TopicStatusToggleProps {
  topicId: string;
  currentStatus: string;
}

export function TopicStatusToggle({ topicId, currentStatus }: TopicStatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isDormant = currentStatus === "DORMANT";
  const newStatus = isDormant ? "ACTIVE" : "DORMANT";
  const label = isDormant ? "[UNSHELVE]" : "[SHELVE]";
  const successMessage = isDormant ? "Topic reactivated" : "Topic shelved";

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast(`Failed to ${isDormant ? "unshelve" : "shelve"} topic`, "error");
        return;
      }
      toast(successMessage, "success");
      router.refresh();
    } catch {
      toast(`Failed to ${isDormant ? "unshelve" : "shelve"} topic`, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="text-xs uppercase tracking-wider text-muted hover:text-text disabled:opacity-50"
    >
      {loading ? "[...]" : label}
    </button>
  );
}
