"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { getRelativeTime } from "@/lib/utils";
import type {
  SerializedTopic,
  SerializedResource,
  SerializedReflection,
} from "@/app/history/page";

type Tab = "ALL" | "TOPICS" | "RESOURCES" | "REFLECTIONS";
type SortBy = "recent" | "oldest" | "a-z" | "z-a";

type UnifiedItem =
  | { kind: "topic"; id: string; title: string; date: string; data: SerializedTopic }
  | { kind: "resource"; id: string; title: string; date: string; data: SerializedResource }
  | { kind: "reflection"; id: string; title: string; date: string; data: SerializedReflection };

const STATUSES = ["ACTIVE", "SATISFIED", "DORMANT"];
const TEMPERATURES = ["HOT", "WARM", "COOL"];
const RESOURCE_TYPES = ["BOOK", "ARTICLE", "VIDEO", "PODCAST", "COURSE", "WIKIPEDIA", "DOCUMENTARY", "PAPER", "OTHER"];
const TIERS = ["GATEWAY", "INTERMEDIATE", "ADVANCED", "REFERENCE"];

interface HistoryClientProps {
  topics: SerializedTopic[];
  resources: SerializedResource[];
  reflections: SerializedReflection[];
  allTags: { id: string; name: string }[];
}

function sortItems<T>(
  items: T[],
  sortBy: SortBy,
  getDate: (t: T) => string,
  getTitle: (t: T) => string
): T[] {
  const sorted = [...items];
  switch (sortBy) {
    case "recent":
      return sorted.sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime());
    case "a-z":
      return sorted.sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    case "z-a":
      return sorted.sort((a, b) => getTitle(b).localeCompare(getTitle(a)));
    default:
      return sorted;
  }
}

function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
  renderOption,
  activeClass,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderOption?: (opt: string) => string;
  activeClass?: (opt: string) => string;
}) {
  return (
    <div className="flex items-start gap-md">
      <span className="shrink-0 pt-0.5 w-16 text-xs text-muted">{label}</span>
      <div className="flex flex-wrap gap-xs">
        {options.map((opt) => {
          const active = selected.includes(opt);
          const colorClass = active && activeClass ? activeClass(opt) : "";
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`border px-2 py-0.5 text-xs transition-colors ${
                active
                  ? colorClass || "border-text text-text"
                  : "border-border-subtle text-muted hover:text-text"
              }`}
            >
              {active ? `${renderOption ? renderOption(opt) : opt} ×` : renderOption ? renderOption(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagFilter({
  allTags,
  selected,
  onAdd,
  onRemove,
}: {
  allTags: { id: string; name: string }[];
  selected: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return allTags
      .filter((t) => t.name.toLowerCase().includes(q) && !selected.includes(t.name))
      .slice(0, 8);
  }, [query, allTags, selected]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-start gap-md">
      <span className="shrink-0 pt-0.5 w-16 text-xs text-muted">TAGS</span>
      <div className="flex flex-col gap-xs flex-1 min-w-0">
        {/* Selected tags */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {selected.map((tag) => (
              <button
                key={tag}
                onClick={() => onRemove(tag)}
                className="border border-text text-text px-2 py-0.5 text-xs transition-colors"
              >
                #{tag} ×
              </button>
            ))}
          </div>
        )}
        {/* Search input + dropdown */}
        <div ref={wrapperRef} className="relative">
          <input
            type="text"
            placeholder="Type to filter tags..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query && setOpen(true)}
            className="w-full border border-border-subtle bg-bg px-2 py-0.5 font-mono text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-text"
          />
          {open && suggestions.length > 0 && (
            <div className="absolute z-10 mt-px w-full border border-border bg-bg max-h-40 overflow-y-auto">
              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onAdd(tag.name);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full text-left px-2 py-1 text-xs text-muted hover:bg-surface hover:text-text transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemperatureDot({ temperature }: { temperature: string }) {
  switch (temperature) {
    case "HOT":
      return <span className="text-hot">●</span>;
    case "WARM":
      return <span className="text-warm">○</span>;
    default:
      return <span className="text-cool">○</span>;
  }
}

function TopicRow({ topic }: { topic: SerializedTopic }) {
  const tierLabel = topic.advancedStarted
    ? "Advanced"
    : topic.intermediateStarted
      ? "Intermediate"
      : topic.gatewayComplete
        ? "Gateway ✓"
        : "Gateway";

  return (
    <Link
      href={`/topics/${topic.id}`}
      className="flex items-start justify-between border border-border-subtle px-md py-sm hover:bg-surface transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-sm">
          <TemperatureDot temperature={topic.temperature} />
          <span className="text-sm font-bold truncate">{topic.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-sm text-xs text-muted ml-5">
          <span>{topic.status}</span>
          <span>·</span>
          <span>{tierLabel}</span>
          {topic.tags.length > 0 && (
            <>
              <span>·</span>
              {topic.tags.slice(0, 3).map((tag) => (
                <span key={tag.id}>#{tag.name}</span>
              ))}
            </>
          )}
        </div>
      </div>
      <span className="text-xs text-muted shrink-0 ml-md">
        {getRelativeTime(new Date(topic.lastActivityAt))}
      </span>
    </Link>
  );
}

function ResourceRow({ resource }: { resource: SerializedResource }) {
  const isComplete = !!resource.completion;
  const stars = resource.completion?.rating
    ? "★".repeat(resource.completion.rating) + "☆".repeat(5 - resource.completion.rating)
    : null;

  return (
    <Link
      href={`/topics/${resource.topicId}`}
      className={`flex items-start justify-between border border-border-subtle px-md py-sm hover:bg-surface transition-colors ${resource.archived ? "opacity-60" : ""}`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-sm">
          <span className={isComplete ? "text-satisfied" : "text-muted"}>{isComplete ? "✓" : "○"}</span>
          <span className={`text-sm truncate ${resource.archived ? "line-through" : ""}`}>{resource.title}</span>
          <span className="text-xs text-muted">({resource.type.toLowerCase()})</span>
          {resource.archived && (
            <span className="text-xs border border-border-subtle px-1 py-0 text-muted">ARCHIVED</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-sm text-xs text-muted ml-5">
          <span>{resource.tier.toLowerCase()}</span>
          <span>·</span>
          <span>{resource.topicTitle}</span>
          {stars && (
            <>
              <span>·</span>
              <span className="text-warm">{stars}</span>
            </>
          )}
        </div>
      </div>
      <span className="text-xs text-muted shrink-0 ml-md">
        {getRelativeTime(new Date(resource.completion?.completedAt ?? resource.createdAt))}
      </span>
    </Link>
  );
}

function ReflectionRow({ reflection }: { reflection: SerializedReflection }) {
  const wordCount = reflection.content.split(/\s+/).filter(Boolean).length;

  return (
    <Link
      href={`/reflections/${reflection.id}`}
      className="flex items-start justify-between border border-border-subtle px-md py-sm hover:bg-surface transition-colors"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-sm">
          <span className="text-muted">✎</span>
          <span className="text-sm truncate">{reflection.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-sm text-xs text-muted ml-5">
          {reflection.tier && (
            <>
              <span>{reflection.tier.toLowerCase()}</span>
              <span>·</span>
            </>
          )}
          {reflection.topicTitle && (
            <>
              <span>{reflection.topicTitle}</span>
              <span>·</span>
            </>
          )}
          <span>{wordCount}w</span>
          {reflection.tags.length > 0 && (
            <>
              <span>·</span>
              {reflection.tags.slice(0, 3).map((tag) => (
                <span key={tag.id}>#{tag.name}</span>
              ))}
            </>
          )}
        </div>
      </div>
      <span className="text-xs text-muted shrink-0 ml-md">
        {getRelativeTime(new Date(reflection.updatedAt))}
      </span>
    </Link>
  );
}

export function HistoryClient({ topics, resources, reflections, allTags }: HistoryClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [selectedTemps, setSelectedTemps] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState<null | boolean>(null);
  const [showArchived, setShowArchived] = useState<null | boolean>(null);
  const [sortBy, setSortBy] = useState<SortBy>("recent");

  function toggle(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  const hasFilters =
    searchQuery ||
    selectedTags.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedTypes.length > 0 ||
    selectedTiers.length > 0 ||
    selectedTemps.length > 0 ||
    showCompleted !== null ||
    showArchived !== null;

  function clearFilters() {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedTiers([]);
    setSelectedTemps([]);
    setShowCompleted(null);
    setShowArchived(null);
  }

  // Filter visibility by tab
  const showTags = activeTab === "ALL" || activeTab === "TOPICS" || activeTab === "REFLECTIONS";
  const showStatus = activeTab === "ALL" || activeTab === "TOPICS";
  const showTemp = activeTab === "ALL" || activeTab === "TOPICS";
  const showType = activeTab === "ALL" || activeTab === "RESOURCES";
  const showTier = activeTab === "ALL" || activeTab === "RESOURCES" || activeTab === "REFLECTIONS";
  const showDone = activeTab === "ALL" || activeTab === "RESOURCES";

  const filteredTopics = useMemo(() => {
    let items = topics;

    if (searchQuery) {
      items = items.filter((t) => matchesSearch(searchQuery, t.title, t.description));
    }
    if (selectedTags.length > 0) {
      items = items.filter((t) => selectedTags.some((tag) => t.tags.some((tt) => tt.name === tag)));
    }
    if (selectedStatuses.length > 0) {
      items = items.filter((t) => selectedStatuses.includes(t.status));
    }
    if (selectedTemps.length > 0) {
      items = items.filter((t) => selectedTemps.includes(t.temperature));
    }

    return sortItems(items, sortBy, (t) => t.lastActivityAt, (t) => t.title);
  }, [topics, searchQuery, selectedTags, selectedStatuses, selectedTemps, sortBy]);

  const filteredResources = useMemo(() => {
    let items = resources;

    if (searchQuery) {
      items = items.filter((r) => matchesSearch(searchQuery, r.title, r.author, r.topicTitle));
    }
    if (selectedTypes.length > 0) {
      items = items.filter((r) => selectedTypes.includes(r.type));
    }
    if (selectedTiers.length > 0) {
      items = items.filter((r) => selectedTiers.includes(r.tier));
    }
    if (showCompleted === true) {
      items = items.filter((r) => r.completion !== null);
    } else if (showCompleted === false) {
      items = items.filter((r) => r.completion === null);
    }
    if (showArchived === true) {
      items = items.filter((r) => r.archived);
    } else if (showArchived === false) {
      items = items.filter((r) => !r.archived);
    }

    return sortItems(
      items,
      sortBy,
      (r) => r.completion?.completedAt ?? r.createdAt,
      (r) => r.title
    );
  }, [resources, searchQuery, selectedTypes, selectedTiers, showCompleted, showArchived, sortBy]);

  const filteredReflections = useMemo(() => {
    let items = reflections;

    if (searchQuery) {
      items = items.filter((r) => matchesSearch(searchQuery, r.title, r.topicTitle));
    }
    if (selectedTags.length > 0) {
      items = items.filter((r) => selectedTags.some((tag) => r.tags.some((rt) => rt.name === tag)));
    }
    if (selectedTiers.length > 0) {
      items = items.filter((r) => r.tier !== null && selectedTiers.includes(r.tier));
    }

    return sortItems(items, sortBy, (r) => r.updatedAt, (r) => r.title);
  }, [reflections, searchQuery, selectedTags, selectedTiers, sortBy]);

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const all: UnifiedItem[] = [
      ...filteredTopics.map((t) => ({
        kind: "topic" as const,
        id: t.id,
        title: t.title,
        date: t.lastActivityAt,
        data: t,
      })),
      ...filteredResources.map((r) => ({
        kind: "resource" as const,
        id: r.id,
        title: r.title,
        date: r.completion?.completedAt ?? r.createdAt,
        data: r,
      })),
      ...filteredReflections.map((r) => ({
        kind: "reflection" as const,
        id: r.id,
        title: r.title,
        date: r.updatedAt,
        data: r,
      })),
    ];

    return sortItems(all, sortBy, (i) => i.date, (i) => i.title);
  }, [filteredTopics, filteredResources, filteredReflections, sortBy]);

  const itemCount =
    activeTab === "ALL"
      ? unifiedItems.length
      : activeTab === "TOPICS"
        ? filteredTopics.length
        : activeTab === "RESOURCES"
          ? filteredResources.length
          : filteredReflections.length;

  const tabs: { key: Tab; label: string }[] = [
    { key: "ALL", label: "ALL" },
    { key: "TOPICS", label: "TOPICS" },
    { key: "RESOURCES", label: "RESOURCES" },
    { key: "REFLECTIONS", label: "REFLECTIONS" },
  ];

  // Only show resource types that actually exist in the data
  const availableTypes = useMemo(
    () => RESOURCE_TYPES.filter((t) => resources.some((r) => r.type === t)),
    [resources]
  );

  return (
    <section className="flex flex-col gap-lg">
      <h2>[HISTORY]</h2>

      {/* Tab bar */}
      <div className="flex gap-md text-xs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border px-sm py-xs transition-colors ${
              activeTab === tab.key
                ? "border-border text-text"
                : "border-border-subtle text-muted hover:bg-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <Input
        placeholder="Search titles, descriptions, authors..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {/* Filters */}
      <div className="flex flex-col gap-sm">
        {showTags && allTags.length > 0 && (
          <TagFilter
            allTags={allTags}
            selected={selectedTags}
            onAdd={(tag) => setSelectedTags([...selectedTags, tag])}
            onRemove={(tag) => setSelectedTags(selectedTags.filter((t) => t !== tag))}
          />
        )}

        {showStatus && (
          <FilterGroup
            label="STATUS"
            options={STATUSES}
            selected={selectedStatuses}
            onToggle={(v) => setSelectedStatuses(toggle(selectedStatuses, v))}
            activeClass={(opt) => {
              switch (opt) {
                case "ACTIVE": return "border-warm text-warm";
                case "SATISFIED": return "border-satisfied text-satisfied";
                case "DORMANT": return "border-dormant text-dormant";
                default: return "border-text text-text";
              }
            }}
          />
        )}

        {showTemp && (
          <FilterGroup
            label="TEMP"
            options={TEMPERATURES}
            selected={selectedTemps}
            onToggle={(v) => setSelectedTemps(toggle(selectedTemps, v))}
            renderOption={(opt) =>
              opt === "HOT" ? `● ${opt}` : `○ ${opt}`
            }
            activeClass={(opt) => {
              switch (opt) {
                case "HOT": return "border-hot text-hot";
                case "WARM": return "border-warm text-warm";
                case "COOL": return "border-cool text-cool";
                default: return "border-text text-text";
              }
            }}
          />
        )}

        {showType && availableTypes.length > 0 && (
          <FilterGroup
            label="TYPE"
            options={availableTypes}
            selected={selectedTypes}
            onToggle={(v) => setSelectedTypes(toggle(selectedTypes, v))}
          />
        )}

        {showTier && (
          <FilterGroup
            label="TIER"
            options={TIERS}
            selected={selectedTiers}
            onToggle={(v) => setSelectedTiers(toggle(selectedTiers, v))}
          />
        )}

        {showDone && (
          <div className="flex items-start gap-md">
            <span className="shrink-0 pt-0.5 w-16 text-xs text-muted">DONE</span>
            <div className="flex flex-wrap gap-xs">
              {([
                { value: null, label: "ALL" },
                { value: true, label: "COMPLETED" },
                { value: false, label: "INCOMPLETE" },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setShowCompleted(showCompleted === opt.value ? null : opt.value)}
                  className={`border px-2 py-0.5 text-xs transition-colors ${
                    showCompleted === opt.value && opt.value !== null
                      ? "border-text text-text"
                      : "border-border-subtle text-muted hover:text-text"
                  }`}
                >
                  {showCompleted === opt.value && opt.value !== null ? `${opt.label} ×` : opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showDone && (
          <div className="flex items-start gap-md">
            <span className="shrink-0 pt-0.5 w-16 text-xs text-muted">ARCHIVED</span>
            <div className="flex flex-wrap gap-xs">
              {([
                { value: null, label: "ALL" },
                { value: true, label: "ARCHIVED" },
                { value: false, label: "ACTIVE" },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setShowArchived(showArchived === opt.value ? null : opt.value)}
                  className={`border px-2 py-0.5 text-xs transition-colors ${
                    showArchived === opt.value && opt.value !== null
                      ? "border-text text-text"
                      : "border-border-subtle text-muted hover:text-text"
                  }`}
                >
                  {showArchived === opt.value && opt.value !== null ? `${opt.label} ×` : opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="self-start text-xs text-muted hover:text-text underline"
        >
          CLEAR FILTERS
        </button>
      )}

      {/* Count + Sort */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          Showing {itemCount} item{itemCount !== 1 ? "s" : ""}
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="border border-border-subtle bg-bg px-sm py-xs text-xs text-muted focus:outline-none focus:ring-1 focus:ring-text"
        >
          <option value="recent">RECENT</option>
          <option value="oldest">OLDEST</option>
          <option value="a-z">A-Z</option>
          <option value="z-a">Z-A</option>
        </select>
      </div>

      {/* Results */}
      <div className="flex flex-col gap-xs">
        {itemCount === 0 && (
          <div className="border border-border-subtle p-xl text-center">
            <p className="text-sm text-muted">No items match your filters.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-sm text-xs text-muted hover:text-text underline"
              >
                CLEAR FILTERS
              </button>
            )}
          </div>
        )}

        {activeTab === "ALL" &&
          unifiedItems.map((item) => {
            switch (item.kind) {
              case "topic":
                return <TopicRow key={`t-${item.id}`} topic={item.data} />;
              case "resource":
                return <ResourceRow key={`r-${item.id}`} resource={item.data} />;
              case "reflection":
                return <ReflectionRow key={`f-${item.id}`} reflection={item.data} />;
            }
          })}

        {activeTab === "TOPICS" &&
          filteredTopics.map((t) => <TopicRow key={t.id} topic={t} />)}

        {activeTab === "RESOURCES" &&
          filteredResources.map((r) => <ResourceRow key={r.id} resource={r} />)}

        {activeTab === "REFLECTIONS" &&
          filteredReflections.map((r) => <ReflectionRow key={r.id} reflection={r} />)}
      </div>
    </section>
  );
}
