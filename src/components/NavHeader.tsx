import Link from "next/link";

type Page = "dashboard" | "history" | "graph" | "explore" | "create" | "insights" | "settings";

const NAV_ITEMS: { page: Page; href: string; label: string }[] = [
  { page: "dashboard", href: "/dashboard", label: "[DASHBOARD]" },
  { page: "history", href: "/history", label: "[HISTORY]" },
  { page: "graph", href: "/graph", label: "[GRAPH]" },
  { page: "explore", href: "/explore", label: "[EXPLORE]" },
  { page: "create", href: "/create", label: "[CREATE]" },
  { page: "settings", href: "/settings", label: "[SETTINGS]" },
];

export function NavHeader({ activePage }: { activePage: Page }) {
  return (
    <header className="flex items-center justify-between">
      <h1>CURIOSITY_</h1>
      <nav className="flex items-center gap-lg text-xs">
        {NAV_ITEMS.map(({ page, href, label }) => (
          <Link
            key={page}
            href={href}
            className={
              page === activePage
                ? "border-b border-text pb-xs"
                : "text-muted hover:text-text"
            }
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
