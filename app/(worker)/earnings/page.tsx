// app/(worker)/earnings/page.tsx
// URL: /earnings
// Worker's earnings dashboard — shows total earned, pending amount, and
// a full history of all bookings (completed and active).

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TRADE_CATEGORIES } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EarningsBooking {
  id: string;
  totalAmount: number;
  commissionAmount: number;
  escrowStatus: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    category: string;
    status: string;
    completedAt: string | null;
  };
  client: {
    id: string;
    name: string;
    profilePhotoUrl?: string;
  };
  quote: { paymentStructure: string };
}

interface EarningsSummary {
  totalEarned: number;
  pendingAmount: number;
  completedJobs: number;
  activeJobs: number;
  bookings: EarningsBooking[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={["rounded-2xl p-4", accent ? "bg-primary text-white" : "bg-surface"].join(" ")}>
      <p className={["text-xs mb-1", accent ? "text-blue-200" : "text-text-secondary"].join(" ")}>
        {label}
      </p>
      <p className={["text-2xl font-bold", accent ? "text-white" : "text-text-primary"].join(" ")}>
        {value}
      </p>
      {sub && (
        <p className={["text-xs mt-0.5", accent ? "text-blue-200" : "text-text-secondary"].join(" ")}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Booking row ──────────────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: EarningsBooking }) {
  const cat = TRADE_CATEGORIES.find((t) => t.value === booking.job.category);
  const net = booking.totalAmount - booking.commissionAmount;
  const isCompleted = booking.job.status === "COMPLETED";

  const dateStr = isCompleted && booking.job.completedAt
    ? new Date(booking.job.completedAt).toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date(booking.createdAt).toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
      });

  return (
    <Link href={`/worker/jobs/${booking.id}`}>
      <div className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
        {/* Category icon */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
          {cat?.emoji ?? "🔧"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {booking.job.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusBadge status={booking.job.status} size="sm" />
            <span className="text-xs text-text-secondary">{dateStr}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className={["text-sm font-bold", isCompleted ? "text-green-600" : "text-text-primary"].join(" ")}>
            GHS {net.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">
            {isCompleted ? "Paid" : "Pending"}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="bg-gray-100 rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
      <div className="flex flex-col divide-y divide-gray-100 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-3 py-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "completed" | "active">("all");

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data
    ? tab === "completed"
      ? data.bookings.filter((b) => b.job.status === "COMPLETED")
      : tab === "active"
      ? data.bookings.filter((b) => ["BOOKED", "IN_PROGRESS"].includes(b.job.status))
      : data.bookings
    : [];

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <h1 className="text-white text-xl font-bold">Earnings</h1>
        </div>
      </div>

      {loading ? (
        <Skeleton />
      ) : !data ? (
        <div className="text-center py-20 px-4">
          <p className="text-text-secondary text-sm">Could not load earnings.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 px-4 pt-4">
            <div className="col-span-2">
              <StatCard
                label="Total Earned"
                value={`GHS ${data.totalEarned.toLocaleString()}`}
                sub={`${data.completedJobs} job${data.completedJobs !== 1 ? "s" : ""} completed`}
                accent
              />
            </div>
            <StatCard
              label="Pending Payout"
              value={`GHS ${data.pendingAmount.toLocaleString()}`}
              sub="In escrow"
            />
            <StatCard
              label="Active Jobs"
              value={String(data.activeJobs)}
              sub="In progress"
            />
          </div>

          {/* Tab filter */}
          <div className="flex gap-1 px-4 pt-5 pb-2">
            {(["all", "active", "completed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-primary text-white"
                    : "bg-surface text-text-secondary hover:bg-gray-200",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Booking list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-4xl mb-3" aria-hidden="true">
                {tab === "completed" ? "🏆" : tab === "active" ? "🔨" : "💼"}
              </p>
              <p className="font-semibold text-text-primary">
                {tab === "completed"
                  ? "No completed jobs yet"
                  : tab === "active"
                  ? "No active jobs"
                  : "No earnings yet"}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                {tab === "all"
                  ? "Jobs you win will appear here once a client accepts your quote."
                  : "Check back once jobs are booked."}
              </p>
              {tab !== "completed" && (
                <Link
                  href="/feed"
                  className="inline-flex mt-4 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
                >
                  Browse Jobs
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
