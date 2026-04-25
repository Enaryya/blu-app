// app/worker/jobs/page.tsx
// URL: /worker/jobs
// The worker's "My Jobs" screen — shows jobs where the client accepted their quote.
// Tabs: Active (BOOKED + IN_PROGRESS) | Completed.
// Tapping a job goes to the detail screen where they can mark it started/complete.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerJob {
  id: string;
  title: string;
  category: string;
  status: string;
  locationDescription: string;
  createdAt: string;
  client: { name: string; profilePhotoUrl?: string };
  bookings: {
    totalAmount: number;
    quote: { paymentStructure: string };
  }[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((n) => (
        <div key={n} className="card animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function WorkerJobCard({ job }: { job: WorkerJob }) {
  const cat = TRADE_CATEGORIES.find((t) => t.value === job.category);
  const booking = job.bookings[0];

  return (
    <Link href={`/worker/jobs/${job.id}`}>
      <div className="card hover:border-primary/30 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* Client avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
            {job.client.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.client.profilePhotoUrl}
                alt={job.client.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary font-bold">
                {job.client.name[0].toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-text-primary text-sm leading-snug flex-1 line-clamp-2">
                {job.title}
              </p>
              <StatusBadge status={job.status} />
            </div>

            <p className="text-xs text-text-secondary mt-0.5">
              {cat?.emoji} {cat?.label} · {job.locationDescription}
            </p>

            <p className="text-xs text-text-secondary mt-0.5">
              Client:{" "}
              <span className="font-medium text-text-primary">{job.client.name}</span>
            </p>

            {booking && (
              <p className="text-xs font-semibold text-primary mt-1">
                GHS {booking.totalAmount.toLocaleString()} ·{" "}
                {booking.quote.paymentStructure === "MILESTONE" ? "Milestone" : "Single"} payment
              </p>
            )}
          </div>

          <svg
            className="w-4 h-4 text-gray-300 shrink-0 mt-1"
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

const TABS = [
  { label: "Active",    statuses: ["BOOKED", "IN_PROGRESS"] },
  { label: "Completed", statuses: ["COMPLETED"] },
];

export default function WorkerJobsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [jobs, setJobs] = useState<WorkerJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/jobs?assigned=true")
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
            <p className="text-4xl mb-3" aria-hidden="true">
              {activeTab === 0 ? "💼" : "✅"}
            </p>
            {activeTab === 0 ? (
              <>
                <p className="font-semibold text-text-primary">No active jobs</p>
                <p className="text-sm text-text-secondary mt-1 mb-5">
                  Browse the job feed and submit quotes to get work.
                </p>
                <Link
                  href="/feed"
                  className="inline-flex items-center bg-primary text-white font-semibold px-5 py-2.5 rounded-xl"
                >
                  Find Jobs
                </Link>
              </>
            ) : (
              <p className="text-text-secondary text-sm">No completed jobs yet.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => (
              <WorkerJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
