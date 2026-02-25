import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-lg">
      <div className="w-full max-w-sm">
        <h1 className="mb-xl text-lg">CURIOSITY_</h1>
        <div className="border border-border p-xl">
          <h2 className="mb-lg">[SIGN IN]</h2>
          <p className="mb-xl text-xs text-muted">
            Sign in to track your learning interests.
          </p>

          <div className="flex flex-col gap-md">
            <a
              href="/api/auth/signin/google"
              className="flex items-center justify-center border border-border px-md py-sm text-xs uppercase tracking-wider hover:bg-text hover:text-bg transition-colors"
            >
              SIGN IN WITH GOOGLE
            </a>
            <a
              href="/api/auth/signin/github"
              className="flex items-center justify-center border border-border px-md py-sm text-xs uppercase tracking-wider hover:bg-text hover:text-bg transition-colors"
            >
              SIGN IN WITH GITHUB
            </a>
          </div>

          <div className="mt-xl text-xs text-muted">
            <Link href="/" className="underline hover:text-text">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
