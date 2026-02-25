"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface TagSearchAssignProps {
  topicId: string;
  currentTags: { id: string; name: string }[];
  allTags: { id: string; name: string }[];
}

export function TagSearchAssign({
  topicId,
  currentTags: initialTags,
  allTags: initialAllTags,
}: TagSearchAssignProps) {
  const [tags, setTags] = useState(initialTags);
  const [allTags, setAllTags] = useState(initialAllTags);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tagIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  const suggestions = useMemo(() => {
    const unassigned = allTags.filter((t) => !tagIds.has(t.id));
    if (!query) return unassigned.slice(0, 8);
    const q = query.toLowerCase();
    return unassigned.filter((t) => t.name.includes(q)).slice(0, 8);
  }, [query, allTags, tagIds]);

  const exactMatch = useMemo(() => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    return allTags.some((t) => t.name === q);
  }, [query, allTags]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function addTag(name: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return;
      const { data } = await res.json();
      setTags((prev) => [...prev, { id: data.id, name: data.name }]);
      // Add to allTags if newly created
      setAllTags((prev) =>
        prev.some((t) => t.id === data.id)
          ? prev
          : [...prev, { id: data.id, name: data.name }].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
      );
      setQuery("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(tagId: string) {
    setBusy(true);
    // Optimistic update
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    try {
      await fetch(`/api/topics/${topicId}/tags/${tagId}`, {
        method: "DELETE",
      });
    } catch {
      // Revert on error
      const removed = initialTags.find((t) => t.id === tagId);
      if (removed) setTags((prev) => [...prev, removed]);
    } finally {
      setBusy(false);
    }
  }

  const showDropdown =
    open && (suggestions.length > 0 || (query.trim() && !exactMatch));

  return (
    <div className="flex flex-col gap-xs">
      {/* Current tags as removable pills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => removeTag(tag.id)}
              disabled={busy}
              className="border border-border-subtle px-2 py-0.5 text-xs text-muted hover:border-text hover:text-text transition-colors"
            >
              #{tag.name} ×
            </button>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          placeholder="Add tag..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={busy}
          className="w-full border border-border-subtle bg-bg px-2 py-0.5 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-text"
        />
        {showDropdown && (
          <div className="absolute z-10 mt-px w-full border border-border bg-bg max-h-40 overflow-y-auto">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                onClick={() => addTag(tag.name)}
                className="block w-full text-left px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text transition-colors"
              >
                #{tag.name}
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                onClick={() => addTag(query.trim().toLowerCase())}
                className="block w-full text-left px-2 py-1 text-xs text-text hover:bg-surface transition-colors border-t border-border-subtle"
              >
                + Create &quot;{query.trim().toLowerCase()}&quot;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
