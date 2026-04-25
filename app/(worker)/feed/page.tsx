// app/(worker)/feed/page.tsx
// URL: /feed
// The worker's "Find Jobs" screen — shows all open jobs from clients.
// Workers can filter by trade category and urgency, then tap a job to view it
// and submit a quote.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedJob {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  locationDescription: string;
  budgetMin?: number;
  budgetMax?: number;
  createdAt: string;
  client: { name: string; locationDescription?: string };
  _count: { quotes: number };
  quotes: { id: string; status: string; amount: number }[]; // worker's own quotes on this job
}

// ─── Urgency filter options ───────────────────────────────────────────────────

const URGENCY_FILTERS = [
  { value: "", label: "Any urgency" },
  { value: "EMERGENCY", label: "🚨 Emergency" },
  { value: "THIS_WEEK", label: "📅 This week" },
  { value: "FLEXIBLE", label: "🕐 Flexible" },
];

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="card animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-gray-200 rounded-full w-20" />
            <div className="h-5 bg-gray-200 rounded-full w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single job card ──────────────────────────────────────────────────────────

function FeedJobCard({ job }: { job: FeedJob }) {
  const cat = TRADE_CATEGORIES.find((t) => t.value === job.category);
  // If the worker already submitted a quote for this job, show a badge
  const myQuote = job.quotes[0];

  return (
    <Link href={`/feed/${job.id}`}>
      <div className="card hover:border-primary/30 hover:shadow-sm transition-all">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-text-primary text-sm leading-snug flex-1">
            {job.title}
          </p>
          {myQuote ? (
            <StatusBadge status={myQuote.status} type="quote" />
          ) : (
            <span className="text-xs text-primary font-medium whitespace-nowrap">
              View →
            </span>
          )}
        </div>

        {/* Category + location */}
        <p className="text-xs text-text-secondary mb-2">
          {cat?.emoji} {cat?.label ?? job.category} · {job.locationDescription}
        </p>

        {/* Tags row */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={job.urgency} type="urgency" />

          <span className="text-xs text-text-secondary">
            {job._count.quotes === 0
              ? "No quotes yet — be first!"
              : `${job._count.quotes} quote${job._count.quotes !== 1 ? "s" : ""} so far`}
          </span>
        </div>

        {/* Budget */}
        {(job.budgetMin || job.budgetMax) && (
          <p className="text-xs text-text-secondary mt-1.5">
            Client budget:{" "}
            {job.budgetMin && job.budgetMax
              ? `GHS ${job.budgetMin} – ${job.budgetMax}`
              : job.budgetMin
              ? `From GHS ${job.budgetMin}`
              : `Up to GHS ${job.budgetMax}`}
          </p>
        )}

        {/* Posted time */}
        <p className="text-xs text-gray-400 mt-1.5">
          Posted{" "}
          {new Date(job.createdAt).toLocaleDateString("en-GH", {
            day: "numeric",
            month: "short",
          })}
        </p>

        {/* Already quoted notice */}
        {myQuote && myQuote.status === "PENDING" && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-xl p-2">
            <p className="text-xs text-yellow-800">
              ✓ You quoted GHS {myQuote.amount.toLocaleString()} — waiting for client response.
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkerFeedPage() {
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (urgency) params.set("urgency", urgency);

    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [category, urgency]);

  return (
    <div className="bg-white min-h-screen">
      {/* Sticky header + filters */}
      <div className="bg-primary pt-safe sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-3">
          <h1 className="text-white font-bold text-xl mb-3">Find Jobs</h1>

          {/* Urgency filter pills */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 w-max">
              {URGENCY_FILTERS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUrgency(urgency === opt.value ? "" : opt.value)}
                  className={[
                    "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px]",
                    urgency === opt.value
                      ? "bg-white text-primary"
                      : "bg-white/20 text-white",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trade category chips */}
        <div className="max-w-lg mx-auto px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => setCategory("")}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px]",
                !category ? "bg-white text-primary" : "bg-white/20 text-white",
              ].join(" ")}
            >
              All Trades
            </button>
            {TRADE_CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setCategory(category === value ? "" : value)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px]",
                  category === value
                    ? "bg-white text-primary"
                    : "bg-white/20 text-white",
                ].join(" ")}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 pt-3 pb-28">
        <p className="text-sm text-text-secondary mb-3">
          {loading ? "Searching…" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} available`}
        </p>

        {loading ? (
          <Skeleton />
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
            <p className="font-semibold text-text-primary">No jobs found</p>
            <p className="text-sm text-text-secondary mt-1">
              Try a different trade or check back later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <FeedJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
