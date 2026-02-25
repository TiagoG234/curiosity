"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavHeader } from "@/components/NavHeader";

const PRESETS = [
  { label: "5 MIN", seconds: 300 },
  { label: "15 MIN", seconds: 900 },
  { label: "30 MIN", seconds: 1800 },
  { label: "60 MIN", seconds: 3600 },
];

export default function CreatePage() {
  const [customMinutes, setCustomMinutes] = useState("");
  const router = useRouter();

  function goWithDuration(seconds: number) {
    router.push(`/reflections/new?explore=1&duration=${seconds}`);
  }

  function handleCustomGo() {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0) {
      goWithDuration(mins * 60);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="create" />

      <section className="flex flex-col gap-xl">
        <h2>[CREATE]</h2>

        <p className="text-sm text-muted">How much time do you have?</p>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-md">
          {PRESETS.map((p) => (
            <Button
              key={p.seconds}
              variant="secondary"
              onClick={() => goWithDuration(p.seconds)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Custom duration */}
        <div className="flex items-center gap-md">
          <span className="text-xs text-muted">CUSTOM:</span>
          <Input
            type="number"
            min={1}
            placeholder="minutes"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomGo();
            }}
            className="w-24"
          />
          <Button
            variant="secondary"
            onClick={handleCustomGo}
            disabled={!customMinutes || parseInt(customMinutes, 10) <= 0}
          >
            GO
          </Button>
        </div>

        {/* No limit */}
        <Link
          href="/reflections/new?explore=1"
          className="text-xs text-muted hover:text-text"
        >
          NO LIMIT →
        </Link>
      </section>
    </main>
  );
}
