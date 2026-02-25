import { NavHeader } from "@/components/NavHeader";

export default function InsightsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="insights" />

      <section>
        <h2 className="mb-lg">[INSIGHTS]</h2>

        <div className="grid gap-md md:grid-cols-2">
          <div className="border border-border-subtle p-lg">
            <h3 className="mb-sm text-xs">RECENT ACTIVITY</h3>
            <p className="text-xs text-muted">
              No recent activity to display.
            </p>
          </div>

          <div className="border border-border-subtle p-lg">
            <h3 className="mb-sm text-xs">DISCOVERY PATTERNS</h3>
            <p className="text-xs text-muted">
              Patterns will emerge as you explore more topics.
            </p>
          </div>

          <div className="border border-border-subtle p-lg">
            <h3 className="mb-sm text-xs">CONCEPT CONNECTIONS</h3>
            <p className="text-xs text-muted">
              Cross-cutting themes across your interests.
            </p>
          </div>

          <div className="border border-border-subtle p-lg">
            <h3 className="mb-sm text-xs">REFLECTION PROMPTS</h3>
            <p className="text-xs text-muted">
              Prompts based on your learning journey.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
