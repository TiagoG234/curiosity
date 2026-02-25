import { NavHeader } from "@/components/NavHeader";

export default function GraphPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="graph" />

      <section>
        <h2 className="mb-lg">[KNOWLEDGE GRAPH]</h2>

        <div className="border border-border-subtle p-3xl text-center">
          <p className="text-sm text-muted">
            Your knowledge network will be visualized here.
          </p>
          <p className="mt-sm text-xs text-muted-light">
            Topics as nodes, shared concepts as connections.
          </p>
          <p className="mt-md text-xs text-muted-light">
            Requires React Flow integration.
          </p>
        </div>
      </section>
    </main>
  );
}
