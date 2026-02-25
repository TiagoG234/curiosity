"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { ReflectionPromptPanel } from "@/components/ReflectionPromptPanel";

type Tier = "GATEWAY" | "INTERMEDIATE" | "ADVANCED";
type AdvanceTo = "INTERMEDIATE" | "ADVANCED";

interface ReflectionEditorProps {
  mode: "create" | "edit";
  topicId?: string | null;
  topicTitle?: string | null;
  tier?: Tier | null;
  advanceTo?: AdvanceTo | null;
  reflectionId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialWritingTimeSeconds?: number;
  initialTags?: string[];
  existingTags: { id: string; name: string }[];
  countdownSeconds?: number | null;
  fromExplore?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ReflectionEditor({
  mode,
  topicId,
  topicTitle,
  tier,
  advanceTo,
  reflectionId,
  initialTitle = "",
  initialContent = "",
  initialWritingTimeSeconds = 0,
  initialTags = [],
  existingTags,
  countdownSeconds = null,
  fromExplore = false,
}: ReflectionEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tagInput, setTagInput] = useState(initialTags.join(", "));
  const [saving, setSaving] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(initialWritingTimeSeconds);
  const [remaining, setRemaining] = useState<number | null>(countdownSeconds ?? null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [acceptedPrompt, setAcceptedPrompt] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const promptContext = advanceTo
    ? ("tier_advancement" as const)
    : fromExplore
      ? ("freestyle" as const)
      : topicId
        ? ("topic_specific" as const)
        : null;

  const showPromptPanel =
    mode === "create" &&
    promptContext !== null &&
    !promptDismissed &&
    acceptedPrompt === null;

  const isCountdown = countdownSeconds != null && countdownSeconds > 0;
  const timeUp = isCountdown && remaining === 0;

  // Writing timer — starts on mount, accumulates from initial value
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      if (isCountdown) {
        setRemaining((r) => (r !== null && r > 0 ? r - 1 : r));
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCountdown]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const backUrl = fromExplore ? "/create" : topicId ? `/topics/${topicId}` : "/dashboard";

  function parseTags(): string[] {
    return tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  function addTag(name: string) {
    const current = parseTags();
    if (!current.includes(name)) {
      const updated = [...current, name];
      setTagInput(updated.join(", "));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const tags = parseTags();

      if (mode === "create") {
        const res = await fetch("/api/reflections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            topicId: topicId ?? undefined,
            tier: tier ?? undefined,
            writingTimeSeconds: elapsedSeconds,
            tags: tags.length > 0 ? tags : undefined,
            advanceTo: advanceTo ?? undefined,
          }),
        });

        if (!res.ok) {
          toast("Failed to save reflection", "error");
          return;
        }

        if (advanceTo && topicId) {
          const nextTierLabel = advanceTo === "INTERMEDIATE" ? "Intermediate" : "Advanced";
          toast(`Reflection saved. ${nextTierLabel} tier unlocked.`, "success");
          router.push(`/topics/${topicId}`);
        } else if (topicId) {
          toast("Reflection saved", "success");
          router.push(`/topics/${topicId}`);
        } else if (fromExplore) {
          toast("Reflection saved", "success");
          router.push("/create");
        } else {
          const json = await res.json();
          toast("Reflection saved", "success");
          router.push(`/reflections/${json.data.reflection.id}`);
        }
      } else {
        const res = await fetch(`/api/reflections/${reflectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            writingTimeSeconds: elapsedSeconds,
            tags,
          }),
        });

        if (!res.ok) {
          toast("Failed to save reflection", "error");
          return;
        }

        toast("Reflection saved", "success");
        router.refresh();
      }
    } catch {
      toast("Failed to save reflection", "error");
    } finally {
      setSaving(false);
    }
  }

  // Filter out tags already in the input from suggestions
  const currentTags = parseTags();
  const suggestions = existingTags.filter((t) => !currentTags.includes(t.name));

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-xl px-xl py-xl">
      {/* Header */}
      <header className="flex flex-col gap-md">
        <Link href={backUrl} className="text-xs text-muted hover:text-text">
          ← BACK
        </Link>
        <h1>{mode === "create" ? "NEW REFLECTION" : "EDIT REFLECTION"}</h1>
        {topicTitle && (
          <div className="text-xs text-muted">
            Topic:{" "}
            <Link href={`/topics/${topicId}`} className="underline hover:text-text">
              {topicTitle}
            </Link>
            {tier && <span> / {tier}</span>}
          </div>
        )}
      </header>

      {/* AI reflection prompts */}
      {showPromptPanel && (
        <ReflectionPromptPanel
          context={promptContext}
          topicId={topicId ?? undefined}
          tier={tier ?? undefined}
          advanceTo={advanceTo ?? undefined}
          onAccept={(prompt, suggestedTitle) => {
            setAcceptedPrompt(prompt);
            setTitle(suggestedTitle);
          }}
          onDismiss={() => setPromptDismissed(true)}
        />
      )}
      {acceptedPrompt && (
        <div className="border border-border-subtle p-md text-xs text-muted flex items-start justify-between gap-md">
          <div>
            <span className="font-bold">[PROMPT]</span> {acceptedPrompt}
          </div>
          <button
            type="button"
            onClick={() => {
              setAcceptedPrompt(null);
              setPromptDismissed(false);
            }}
            className="shrink-0 text-xs text-muted hover:text-text uppercase tracking-wider"
          >
            [CHANGE]
          </button>
        </div>
      )}

      {/* Title */}
      <Input
        placeholder="Reflection title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Time's up banner */}
      {timeUp && (
        <div className="border border-border-subtle p-md text-xs text-satisfied">
          TIME&apos;S UP — keep writing or save when ready
        </div>
      )}

      {/* Writing area */}
      <Textarea
        placeholder="Write freely. What did you learn? What surprised you? What connections did you notice?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[400px] flex-1"
      />

      {/* Status bar: timer + word count */}
      <div className="flex items-center justify-between text-xs text-muted">
        {isCountdown ? (
          <span
            className={
              remaining === 0
                ? "text-satisfied"
                : remaining !== null && remaining <= 60
                  ? "text-warm"
                  : ""
            }
          >
            {remaining === 0 ? "TIME'S UP " : ""}
            {formatTime(remaining ?? 0)}
            <span className="ml-md text-muted">({formatTime(elapsedSeconds)} elapsed)</span>
          </span>
        ) : (
          <span>{formatTime(elapsedSeconds)}</span>
        )}
        <span>{wordCount} words</span>
      </div>

      {/* Tags */}
      <div>
        <Input
          placeholder="Tags (comma-separated)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="mt-xs flex flex-wrap gap-xs">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addTag(t.name)}
                className="border border-border-subtle px-2 py-0.5 text-xs text-muted hover:text-text"
              >
                #{t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-md">
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={saving || !title.trim() || !content.trim()}
        >
          {saving ? "SAVING..." : "SAVE REFLECTION"}
        </Button>
        <Button variant="ghost" onClick={() => router.push(backUrl)}>
          CANCEL
        </Button>
      </div>
    </main>
  );
}
