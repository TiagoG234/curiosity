"use client";

import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-sm text-muted hover:text-text transition-colors w-full text-left"
      >
        <h2 className="text-muted">
          {title} ({count})
        </h2>
        <span className="text-xs">{open ? "[HIDE]" : "[SHOW]"}</span>
      </button>
      {open && <div className="mt-md">{children}</div>}
    </section>
  );
}
