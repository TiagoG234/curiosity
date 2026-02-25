"use client";

import Link from "next/link";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function FocusPage() {
  const [content, setContent] = useState("");
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-xl px-xl py-xl">
      <header className="flex items-center justify-between">
        <h1>CURIOSITY_</h1>
        <nav className="flex gap-lg text-xs">
          <Link href="/dashboard" className="text-muted hover:text-text">
            [DASHBOARD]
          </Link>
          <Link href="/focus" className="border-b border-text pb-xs">
            [FOCUS]
          </Link>
          <Link href="/settings" className="text-muted hover:text-text">
            [SETTINGS]
          </Link>
        </nav>
      </header>

      <section>
        <h2 className="mb-lg">[FOCUS SESSION]</h2>

        <div className="mb-md flex items-center justify-between text-xs text-muted">
          <span>TOPIC: None selected</span>
          <span>{wordCount} words</span>
        </div>

        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing freely. Capture what you are thinking about..."
          className="min-h-[400px] border-border"
        />

        <div className="mt-md flex gap-md">
          <Button variant="secondary" disabled>
            END SESSION
          </Button>
        </div>
      </section>
    </main>
  );
}
