import { getCurrentUserId } from "@/lib/auth";
import { getExploreTopics } from "@/lib/explore-ranking";
import { NavHeader } from "@/components/NavHeader";
import { ExploreContent } from "@/components/ExploreContent";

export default async function ExplorePage() {
  const userId = await getCurrentUserId();
  const { topics, recentTagNames } = await getExploreTopics(userId);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="explore" />

      <section className="flex flex-col gap-lg">
        <h2>[EXPLORE]</h2>

        {/* Recent interests */}
        {recentTagNames.length > 0 && (
          <div>
            <div className="text-xs text-muted mb-xs">RECENT INTERESTS</div>
            <div className="flex flex-wrap gap-xs">
              {recentTagNames.map((name) => (
                <span
                  key={name}
                  className="border border-border-subtle px-2 py-0.5 text-xs text-muted"
                >
                  #{name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI suggestion + topic list (client-side) */}
        <ExploreContent initialTopics={topics} />
      </section>
    </main>
  );
}
