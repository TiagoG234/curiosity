"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/Toast";
import { detectUrlSource, type UrlMetadataResult } from "@/lib/url-metadata";

const RESOURCE_TYPES = [
  "ARTICLE",
  "VIDEO",
  "BOOK",
  "PODCAST",
  "COURSE",
  "WIKIPEDIA",
  "DOCUMENTARY",
  "PAPER",
  "OTHER",
] as const;

type UrlFetchStatus = "idle" | "fetching" | "success" | "not-recognized" | "error";

interface AddResourceFormProps {
  topicId: string;
  tier: string;
  tierComplete?: boolean;
}

export function AddResourceForm({ topicId, tier, tierComplete }: AddResourceFormProps) {
  const [mode, setMode] = useState<"closed" | "confirm" | "form">("closed");
  const [submitting, setSubmitting] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("ARTICLE");
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [targetTier, setTargetTier] = useState(tier);
  const [urlFetchStatus, setUrlFetchStatus] = useState<UrlFetchStatus>("idle");
  const [goodreadsId, setGoodreadsId] = useState("");
  const [isbn, setIsbn] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const fetchUrlMetadata = useCallback(async (inputUrl: string) => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    // Quick client-side check before hitting the API
    if (!detectUrlSource(trimmed)) {
      setUrlFetchStatus("not-recognized");
      return;
    }

    setUrlFetchStatus("fetching");

    try {
      const res = await fetch("/api/url-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        setUrlFetchStatus("error");
        return;
      }

      const { data } = await res.json() as { data: UrlMetadataResult };

      if (!data.source) {
        setUrlFetchStatus("not-recognized");
        return;
      }

      // Only fill empty fields — never overwrite user input
      setTitle((prev) => (!prev.trim() && data.title) ? data.title! : prev);
      setAuthor((prev) => (!prev.trim() && data.author) ? data.author! : prev);
      setDescription((prev) => (!prev.trim() && data.description) ? data.description! : prev);

      // Auto-set type only if still at default
      setType((prev) => (prev === "ARTICLE" && data.resourceType) ? data.resourceType! : prev);

      if (data.goodreadsId) setGoodreadsId(data.goodreadsId);
      if (data.isbn) setIsbn(data.isbn);

      setUrlFetchStatus("success");
    } catch {
      setUrlFetchStatus("error");
    }
  }, []);

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (pasted) {
      // The paste event fires before onChange, so use the pasted value directly
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Small delay to let the input value update
      debounceRef.current = setTimeout(() => fetchUrlMetadata(pasted), 50);
    }
  }

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setUrl(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim()) {
      debounceRef.current = setTimeout(() => fetchUrlMetadata(value), 800);
    } else {
      setUrlFetchStatus("idle");
    }
  }

  if (mode === "closed") {
    return (
      <button
        onClick={() => setMode(tierComplete ? "confirm" : "form")}
        className="text-xs text-muted hover:text-text uppercase tracking-wider"
      >
        [+ ADD RESOURCE]
      </button>
    );
  }

  if (mode === "confirm") {
    async function handleReopen() {
      setReopening(true);
      try {
        // Reopen this tier and cascade: reset all more advanced tiers
        const fields: Record<string, boolean> = {};
        if (tier === "GATEWAY") {
          fields.gatewayComplete = false;
          fields.intermediateStarted = false;
          fields.intermediateComplete = false;
          fields.advancedStarted = false;
          fields.advancedComplete = false;
        } else if (tier === "INTERMEDIATE") {
          fields.intermediateComplete = false;
          fields.advancedStarted = false;
          fields.advancedComplete = false;
        } else {
          fields.advancedComplete = false;
        }

        const res = await fetch(`/api/topics/${topicId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });

        if (!res.ok) {
          toast("Failed to reopen tier", "error");
          return;
        }

        toast(`${tier.charAt(0) + tier.slice(1).toLowerCase()} reopened`, "success");
        setTargetTier(tier);
        setMode("form");
        router.refresh();
      } catch {
        toast("Failed to reopen tier", "error");
      } finally {
        setReopening(false);
      }
    }

    return (
      <div className="border border-border-subtle p-md space-y-sm">
        <div className="text-xs font-bold uppercase tracking-wider">
          {tier.toLowerCase()} is complete
        </div>
        <p className="text-xs text-muted">
          Adding a resource here will reopen this tier. Would you rather add it as a reference instead?
        </p>
        <div className="flex gap-sm">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setTargetTier("REFERENCE");
              setMode("form");
            }}
          >
            ADD AS REFERENCE
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={reopening}
            onClick={handleReopen}
          >
            {reopening ? "REOPENING..." : `REOPEN ${tier}`}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMode("closed")}>
            CANCEL
          </Button>
        </div>
      </div>
    );
  }

  function reset() {
    setTitle("");
    setType("ARTICLE");
    setAuthor("");
    setUrl("");
    setEstimatedMinutes("");
    setDescription("");
    setTargetTier(tier);
    setUrlFetchStatus("idle");
    setGoodreadsId("");
    setIsbn("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setMode("closed");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          tier: targetTier,
          author: author.trim() || undefined,
          url: url.trim() || undefined,
          estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
          description: description.trim() || undefined,
          goodreadsId: goodreadsId.trim() || undefined,
          isbn: isbn.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error?.message || "Failed to add resource", "error");
        return;
      }

      toast(
        targetTier !== tier
          ? `Resource added as reference`
          : "Resource added",
        "success"
      );
      reset();
      router.refresh();
    } catch {
      toast("Failed to add resource", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border-subtle p-md space-y-sm">
      <div className="text-xs font-bold uppercase tracking-wider mb-sm">
        Add {targetTier.toLowerCase()} resource
      </div>

      <div className="relative">
        <Input
          placeholder="URL (optional)"
          value={url}
          onChange={handleUrlChange}
          onPaste={handleUrlPaste}
        />
        {urlFetchStatus === "fetching" && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted animate-pulse">
            fetching...
          </span>
        )}
        {urlFetchStatus === "success" && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent">
            ✓
          </span>
        )}
      </div>

      <Input
        placeholder="Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <Input
        placeholder="Author (optional)"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />

      <div className="flex gap-sm">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 border border-border bg-bg px-md py-sm font-mono text-sm text-text focus:outline-none focus:ring-1 focus:ring-text"
        >
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toLowerCase()}
            </option>
          ))}
        </select>

        <Input
          type="number"
          placeholder="Minutes"
          min={1}
          className="w-24"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
        />
      </div>

      <Textarea
        placeholder="Description (optional)"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-sm">
        <Button type="submit" variant="secondary" size="sm" disabled={submitting}>
          {submitting ? "ADDING..." : "ADD"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
