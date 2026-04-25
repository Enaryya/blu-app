// app/(worker)/dashboard/page.tsx
// The worker's home screen. URL: /dashboard
// Phase 1 stub — shows summary stats and availability toggle placeholder.
// Full earnings data, active jobs count, rating comes in Phase 3+.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function WorkerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/home");

  const firstName = session.user.name.split(" ")[0];

  return (
    <div className="bg-white min-h-screen">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Welcome back,</p>
              <h1 className="text-white text-2xl font-bold">{firstName}</h1>
            </div>
            <Link
              href="/worker/settings"
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg"
              aria-label="Profile settings"
            >
              {firstName[0].toUpperCase()}
            </Link>
          </div>

          {/* Verification badge */}
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full">
              <span aria-hidden="true">✓</span>
              Verified Worker
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats grid ───────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 pb-28">
        <div className="grid grid-cols-2 gap-3 -mt-3 mb-6">
          {/* Earnings this month */}
          <div className="card">
            <p className="text-xs text-text-secondary mb-1">This month</p>
            <p className="text-2xl font-bold text-text-primary">GH₵ 0</p>
            <p className="text-xs text-text-secondary">Earnings</p>
          </div>

          {/* Active jobs */}
          <div className="card">
            <p className="text-xs text-text-secondary mb-1">Active</p>
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-secondary">Jobs in progress</p>
          </div>

          {/* Rating */}
          <div className="card">
            <p className="text-xs text-text-secondary mb-1">Rating</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-text-primary">—</p>
              <span className="text-warning text-lg">★</span>
            </div>
            <p className="text-xs text-text-secondary">No reviews yet</p>
          </div>

          {/* Jobs completed */}
          <div className="card">
            <p className="text-xs text-text-secondary mb-1">Completed</p>
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-secondary">Total jobs</p>
          </div>
        </div>

        {/* Find Jobs CTA */}
        <div className="bg-surface border border-accent rounded-2xl p-4 mb-6 flex items-center gap-4">
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text-primary">Job Feed</h2>
            <p className="text-sm text-text-secondary">
              Browse jobs matching your trade
            </p>
          </div>
          <Link
            href="/feed"
            className="shrink-0 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl min-h-[40px] flex items-center"
          >
            Browse
          </Link>
        </div>

        {/* Complete your profile nudge */}
        <div className="card border-warning/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">📋</span>
            <div>
              <h3 className="font-semibold text-text-primary text-sm">
                Complete your profile
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Add your trade, experience, and portfolio photos to start
                receiving job requests.
              </p>
              <Link
                href="/worker/settings"
                className="inline-flex items-center mt-2 text-sm font-medium text-primary hover:underline"
              >
                Set up profile →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent activity placeholder */}
        <section className="mt-6">
          <h2 className="font-semibold text-text-primary mb-3">
            Recent Activity
          </h2>
          <div className="bg-surface rounded-2xl p-6 text-center">
            <p className="text-4xl mb-2" aria-hidden="true">📂</p>
            <p className="font-medium text-text-primary">No activity yet</p>
            <p className="text-sm text-text-secondary mt-1">
              Your accepted quotes and active jobs will appear here
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
