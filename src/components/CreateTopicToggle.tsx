"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { NewTopicForm } from "@/components/NewTopicForm";

export function CreateTopicSection({ children, allTags }: { children: ReactNode; allTags?: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open]);

  return (
    <>
      {/* Trigger — rendered inside the next-actions area via children slot */}
      <CreateTopicContext.Provider value={{ open, toggle: () => setOpen((v) => !v) }}>
        {children}
      </CreateTopicContext.Provider>

      {/* Expanded form */}
      {open && (
        <div ref={panelRef} className="border border-border p-lg">
          <div className="flex items-center justify-between mb-md">
            <h2>[NEW TOPIC]</h2>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted hover:text-text uppercase tracking-wider"
            >
              [CLOSE]
            </button>
          </div>
          <NewTopicForm allTags={allTags} />
        </div>
      )}
    </>
  );
}

import { createContext, useContext } from "react";

const CreateTopicContext = createContext<{ open: boolean; toggle: () => void }>({
  open: false,
  toggle: () => {}
});

export function CreateTopicTrigger() {
  const { toggle } = useContext(CreateTopicContext);

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-between w-full border border-border-subtle px-md py-sm hover:bg-surface transition-colors text-left"
    >
      <span className="text-sm">+ Create new topic</span>
      <span className="text-xs text-muted">Start a new curiosity</span>
    </button>
  );
}
