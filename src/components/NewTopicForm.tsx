"use client";

import { useState, useEffect, useRef, useMemo, useCallback, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Temperature = "HOT" | "WARM" | "COOL";

interface CreateTopicPayload {
  title: string;
  description?: string;
  whyInterested?: string;
  initialQuestions?: string[];
  temperature?: Temperature;
  tags?: string[];
}

interface NewTopicFormProps {
  allTags?: { id: string; name: string }[];
}

export function NewTopicForm({ allTags = [] }: NewTopicFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whyInterested, setWhyInterested] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagWrapperRef = useRef<HTMLDivElement>(null);
  const [temperature, setTemperature] = useState<Temperature>("WARM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI meta suggestion state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFetchedForTitle, setAiFetchedForTitle] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const tagSuggestions = useMemo(() => {
    const unselected = allTags.filter((t) => !selectedTags.includes(t.name));
    if (!tagQuery) return unselected.slice(0, 8);
    const q = tagQuery.toLowerCase();
    return unselected.filter((t) => t.name.includes(q)).slice(0, 8);
  }, [tagQuery, allTags, selectedTags]);

  const tagExactMatch = useMemo(() => {
    if (!tagQuery.trim()) return true;
    const q = tagQuery.trim().toLowerCase();
    return allTags.some((t) => t.name === q) || selectedTags.includes(q);
  }, [tagQuery, allTags, selectedTags]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagWrapperRef.current && !tagWrapperRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchAiMeta = useCallback(async (topicTitle: string) => {
    const trimmed = topicTitle.trim();
    if (trimmed.length < 2 || trimmed === aiFetchedForTitle) return;

    setAiLoading(true);
    try {
      const res = await fetch("/api/topics/suggest-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) return;

      const json = await res.json();
      const suggestion = json.data?.suggestion;
      if (!suggestion) return;

      if (suggestion.description) {
        setDescription((prev) => prev || suggestion.description);
      }
      if (Array.isArray(suggestion.tags) && suggestion.tags.length > 0) {
        setSelectedTags((prev) => {
          const merged = [...prev];
          for (const tag of suggestion.tags as string[]) {
            if (!merged.includes(tag)) merged.push(tag);
          }
          return merged;
        });
      }
      setAiFetchedForTitle(trimmed);
    } catch {
      // Silently fail — AI suggestions are best-effort
    } finally {
      setAiLoading(false);
    }
  }, [aiFetchedForTitle]);

  // Debounced AI fetch when title changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = title.trim();
    if (trimmed.length < 2 || trimmed === aiFetchedForTitle) return;

    debounceRef.current = setTimeout(() => {
      fetchAiMeta(trimmed);
    }, 800);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title, aiFetchedForTitle, fetchAiMeta]);

  function addTagName(name: string) {
    const normalized = name.trim().toLowerCase();
    if (normalized && !selectedTags.includes(normalized)) {
      setSelectedTags((prev) => [...prev, normalized]);
    }
    setTagQuery("");
    setTagDropdownOpen(false);
  }

  function removeTagName(name: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== name));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateTopicPayload = {
      title,
      description: description || undefined,
      whyInterested: whyInterested || undefined,
      temperature,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    };

    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        throw new Error(data.error?.message ?? "Failed to create topic");
      }

      setTitle("");
      setDescription("");
      setWhyInterested("");
      setSelectedTags([]);
      setTagQuery("");
      setTemperature("WARM");
      setAiFetchedForTitle(null);
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-md border border-border p-lg"
    >
      <div className="flex items-center justify-end gap-sm">
        <div className="flex items-center gap-lg text-xs">
          <label className="flex items-center gap-xs cursor-pointer">
            <input
              type="radio"
              name="temperature"
              value="HOT"
              checked={temperature === "HOT"}
              onChange={() => setTemperature("HOT")}
              className="sr-only"
            />
            <span className={temperature === "HOT" ? "text-hot" : "text-muted"}>
              {temperature === "HOT" ? "[x]" : "[ ]"}
            </span>
            <span className="text-hot">HOT</span>
          </label>
          <label className="flex items-center gap-xs cursor-pointer">
            <input
              type="radio"
              name="temperature"
              value="WARM"
              checked={temperature === "WARM"}
              onChange={() => setTemperature("WARM")}
              className="sr-only"
            />
            <span className={temperature === "WARM" ? "text-warm" : "text-muted"}>
              {temperature === "WARM" ? "[x]" : "[ ]"}
            </span>
            <span className="text-warm">WARM</span>
          </label>
          <label className="flex items-center gap-xs cursor-pointer">
            <input
              type="radio"
              name="temperature"
              value="COOL"
              checked={temperature === "COOL"}
              onChange={() => setTemperature("COOL")}
              className="sr-only"
            />
            <span className={temperature === "COOL" ? "text-cool" : "text-muted"}>
              {temperature === "COOL" ? "[x]" : "[ ]"}
            </span>
            <span className="text-cool">COOL</span>
          </label>
        </div>
      </div>

      <Input
        type="text"
        placeholder="Topic title (e.g., English Civil War)"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />

      {aiLoading && (
        <div className="text-xs text-muted animate-pulse">
          Generating description and tags...
        </div>
      )}

      <Textarea
        placeholder="Short description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        className="min-h-[60px]"
      />

      <Textarea
        placeholder="Why are you interested? (optional)"
        value={whyInterested}
        onChange={(event) => setWhyInterested(event.target.value)}
        className="min-h-[60px]"
      />

      {/* Tag search / picker */}
      <div className="flex flex-col gap-xs">
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {selectedTags.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => removeTagName(name)}
                className="border border-border-subtle px-2 py-0.5 text-xs text-muted hover:border-text hover:text-text transition-colors"
              >
                #{name} ×
              </button>
            ))}
          </div>
        )}
        <div ref={tagWrapperRef} className="relative">
          <input
            type="text"
            placeholder="Add tag..."
            value={tagQuery}
            onChange={(e) => {
              setTagQuery(e.target.value);
              setTagDropdownOpen(true);
            }}
            onFocus={() => setTagDropdownOpen(true)}
            className="w-full border border-border-subtle bg-bg px-2 py-0.5 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-text"
          />
          {tagDropdownOpen && (tagSuggestions.length > 0 || (tagQuery.trim() && !tagExactMatch)) && (
            <div className="absolute z-10 mt-px w-full border border-border bg-bg max-h-40 overflow-y-auto">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTagName(tag.name)}
                  className="block w-full text-left px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
              {tagQuery.trim() && !tagExactMatch && (
                <button
                  type="button"
                  onClick={() => addTagName(tagQuery)}
                  className="block w-full text-left px-2 py-1 text-xs text-text hover:bg-surface transition-colors border-t border-border-subtle"
                >
                  + Create &quot;{tagQuery.trim().toLowerCase()}&quot;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error ? <p className="text-xs text-primary">{error}</p> : null}

      <Button
        type="submit"
        variant="secondary"
        disabled={submitting}
      >
        {submitting ? "CREATING..." : "CREATE TOPIC"}
      </Button>
    </form>
  );
}
