"use client";

import { useState, type ReactNode } from "react";

interface DashboardBodyProps {
  pickup: ReactNode;
  activeTopics: ReactNode;
  activeCount: number;
  bottom: ReactNode;
}

export function DashboardBody({
  pickup,
  activeTopics,
  activeCount,
  bottom,
}: DashboardBodyProps) {
  const [showActive, setShowActive] = useState(false);

  if (!showActive) {
    return (
      <div className="flex flex-1 flex-col">
        {/* Centered pickup section */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full">{pickup}</div>
        </div>

        {/* Toggle + bottom sections pinned below */}
        <div className="flex flex-col gap-xl">
          <button
            onClick={() => setShowActive(true)}
            className="text-xs uppercase tracking-wider text-muted hover:text-text transition-colors self-start"
          >
            [SHOW ACTIVE TOPICS ({activeCount})]
          </button>
          {bottom}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-xl">
      {pickup}

      {/* Active Topics with hide toggle in the header */}
      <section>
        <div className="flex items-center justify-between mb-md">
          <h2>[ACTIVE TOPICS] ({activeCount})</h2>
          <button
            onClick={() => setShowActive(false)}
            className="text-xs uppercase tracking-wider text-muted hover:text-text transition-colors"
          >
            [HIDE]
          </button>
        </div>
        {activeTopics}
      </section>

      {bottom}
    </div>
  );
}
