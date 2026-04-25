// app/(client)/jobs/page.tsx
// URL: /jobs
// The client's "My Jobs" screen — all the jobs they've posted.
// Tabs let them filter by: Active (open + in-progress) | Completed | Cancelled.
// Tapping a job card goes to the job detail page where they can see quotes.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobSummary {
  id: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  createdAt: string;
  locationDescription: string;
  budgetMin?: number;
  budgetMax?: number;
  _count: { quotes: number };
  quotes: { worker: { name: string } }[];
}

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { label: "Active",    statuses: ["POSTED", "QUOTING", "BOOKED", "IN_PROGRESS"] },
  { label: "Completed", statuses: ["COMPLETED"] },
  { label: "Cancelled", statuses: ["CANCELLED"] },
];

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="card animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single job card ──────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobSummary }) {
  const cat = TRADE_CATEGORIES.find((t) => t.value === job.category);
  const acceptedWorker = job.quotes[0]?.worker;

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="card hover:border-primary/30 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* Category emoji */}
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-xl shrink-0">
            {cat?.emoji ?? "🔧"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-text-primary text-sm leading-tight line-clamp-1">
                {job.title}
              </p>
              <StatusBadge status={job.status} />
            </div>

            <p className="text-xs text-text-secondary mt-0.5">
              {cat?.label ?? job.category} · {job.locationDescription}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={job.urgency} type="urgency" />

              {/* Quote count or assigned worker */}
              {acceptedWorker ? (
                <span className="text-xs text-text-secondary">
                  Assigned to{" "}
                  <span className="font-medium text-text-primary">
                    {acceptedWorker.name}
                  </span>
                </span>
              ) : (
                <span className="text-xs text-text-secondary">
                  {job._count.quotes === 0
                    ? "No quotes yet"
                    : `${job._count.quotes} quote${job._count.quotes !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>

            {(job.budgetMin || job.budgetMax) && (
              <p className="text-xs text-text-secondary mt-1">
                Budget:{" "}
                {job.budgetMin && job.budgetMax
                  ? `GHS ${job.budgetMin} – ${job.budgetMax}`
                  : job.budgetMin
                  ? `From GHS ${job.budgetMin}`
                  : `Up to GHS ${job.budgetMax}`}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1.5">
              Posted{" "}
              {new Date(job.createdAt).toLocaleDateString("en-GH", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>

          {/* Chevron */}
          <svg
            className="w-4 h-4 text-gray-300 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientJobsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs ?? []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const tabStatuses = TABS[activeTab].statuses;
  const filtered = jobs.filter((j) => tabStatuses.includes(j.status));

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-0">
          <h1 className="text-white text-xl font-bold mb-3">My Jobs</h1>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={[
                  "flex-1 py-2 text-sm font-medium rounded-t-xl",
                  activeTab === i
                    ? "bg-white text-primary"
                    : "text-white/80 hover:text-white",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {loading ? (
          <Skeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3" aria-hidden="true">📋</p>
            {activeTab === 0 ? (
              <>
                <p className="font-semibold text-text-primary">No active jobs</p>
                <p className="text-sm text-text-secondary mt-1 mb-5">
                  Post a job and workers will send you quotes.
                </p>
                <Link
                  href="/post-job"
                  className="inline-flex items-center bg-primary text-white font-semibold px-5 py-2.5 rounded-xl"
                >
                  Post a Job
                </Link>
              </>
            ) : (
              <p className="text-text-secondary text-sm">No jobs here yet.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Floating post-job button (only on Active tab) */}
      {activeTab === 0 && !loading && (
        <div className="fixed bottom-20 right-4 z-20">
          <Link
            href="/post-job"
            className="flex items-center gap-2 bg-primary text-white font-semibold px-4 py-3 rounded-2xl shadow-lg"
          >
            <span className="text-lg leading-none">+</span>
            <span className="text-sm">Post Job</span>
          </Link>
        </div>
      )}
    </div>
  );
}
