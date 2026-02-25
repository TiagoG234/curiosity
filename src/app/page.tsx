import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-lg">
      <div className="max-w-2xl">
        <h1 className="mb-lg text-lg">CURIOSITY_</h1>
        <p className="mb-md text-sm text-muted">
          A modular learning interest tracker with non-linear exploration,
          lightweight gateway tiers, and guilt-free discovery.
        </p>
        <p className="mb-xl text-sm text-muted">
          Track what you want to learn. Explore when curiosity leads you.
          Stop when you are satisfied.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center border border-border bg-transparent px-md py-sm text-xs font-medium uppercase tracking-wider text-text hover:bg-text hover:text-bg transition-colors"
        >
          [ENTER]
        </Link>
      </div>
    </main>
  );
}
