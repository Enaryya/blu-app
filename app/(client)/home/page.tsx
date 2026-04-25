// app/(client)/home/page.tsx
// The client's home screen. URL: /home
// Phase 1 stub — shows the structure and welcome message.
// Full discovery UI (worker search, categories, featured workers) is Phase 2.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

// Trade categories with emoji icons
const CATEGORIES = [
  { label: "Plumber", emoji: "🔧", slug: "PLUMBER" },
  { label: "Electrician", emoji: "⚡", slug: "ELECTRICIAN" },
  { label: "Mason", emoji: "🧱", slug: "MASON" },
  { label: "Painter", emoji: "🖌️", slug: "PAINTER" },
  { label: "Carpenter", emoji: "🪵", slug: "CARPENTER" },
  { label: "Tiler", emoji: "⬜", slug: "TILER" },
  { label: "Roofer", emoji: "🏠", slug: "ROOFER" },
  { label: "Welder", emoji: "🔩", slug: "WELDER" },
];

export const metadata = { title: "Home" };

export default async function ClientHomePage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  // If a worker somehow lands here, send them to their screen
  if (session.user.role === "WORKER") redirect("/dashboard");

  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="bg-white min-h-screen">
      {/* ── Top header ────────────────────────────────────────────────── */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-sm">Good day,</p>
              <h1 className="text-white text-2xl font-bold">{firstName} 👋</h1>
            </div>
            {/* Profile avatar */}
            <Link
              href="/settings"
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg"
              aria-label="Profile settings"
            >
              {firstName[0].toUpperCase()}
            </Link>
          </div>

          {/* Search bar (non-functional stub — Phase 2) */}
          <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
            <svg
              className="w-5 h-5 text-blue-200 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <span className="text-blue-200 text-sm">
              Search for plumbers, electricians…
            </span>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-28 -mt-3">
        {/* Post a Job CTA */}
        <div className="bg-surface border border-accent rounded-2xl p-4 mb-6 flex items-center gap-4 mt-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text-primary">Post a Job</h2>
            <p className="text-sm text-text-secondary">
              Describe your project and get quotes
            </p>
          </div>
          <Link
            href="/post-job"
            className="shrink-0 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl min-h-[40px] flex items-center"
          >
            Start
          </Link>
        </div>

        {/* Trade categories grid */}
        <section className="mb-6">
          <h2 className="font-semibold text-text-primary mb-3">
            What do you need?
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/workers?category=${cat.slug}`}
                className="flex flex-col items-center gap-1.5 p-3 bg-surface rounded-2xl hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl" aria-hidden="true">
                  {cat.emoji}
                </span>
                <span className="text-xs text-text-secondary text-center leading-tight">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Phase 2 coming-soon placeholder */}
        <section>
          <h2 className="font-semibold text-text-primary mb-3">
            Featured Workers
          </h2>
          <div className="bg-surface rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2" aria-hidden="true">
              🔨
            </p>
            <p className="font-medium text-text-primary">Coming in Phase 2</p>
            <p className="text-sm text-text-secondary mt-1">
              Verified worker profiles will appear here
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
