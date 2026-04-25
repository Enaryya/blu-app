// app/admin/page.tsx
// URL: /admin
// Admin overview dashboard — platform stats at a glance.
// Shows users, job pipeline, revenue, and disputed bookings.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  users: { clients: number; workers: number };
  jobs: Record<string, number>;
  totalRevenue: number;
  disputedBookings: number;
  recentJobs: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    client: { name: string };
  }[];
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  sub,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl p-4",
        accent ? "bg-primary text-white" : warn ? "bg-red-50 border border-red-200" : "bg-white border border-gray-200",
      ].join(" ")}
    >
      <p className={["text-xs mb-1", accent ? "text-blue-200" : warn ? "text-red-500" : "text-gray-500"].join(" ")}>
        {label}
      </p>
      <p className={["text-2xl font-bold", accent ? "text-white" : warn ? "text-red-700" : "text-gray-900"].join(" ")}>
        {value}
      </p>
      {sub && (
        <p className={["text-xs mt-0.5", accent ? "text-blue-200" : "text-gray-400"].join(" ")}>
          {sub}
        </p>
      )}
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  POSTED: "bg-blue-100 text-blue-700",
  QUOTING: "bg-yellow-100 text-yellow-700",
  BOOKED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  DISPUTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pt-8 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Blu platform overview</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Sign out
        </button>
      </div>

      {/* Nav links */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/admin/users"
          className="flex-1 text-center bg-white border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          👥 Users
        </Link>
        <Link
          href="/admin/jobs"
          className="flex-1 text-center bg-white border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          🔨 Jobs
        </Link>
        {stats && stats.disputedBookings > 0 && (
          <Link
            href="/admin/jobs?status=DISPUTED"
            className="flex-1 text-center bg-red-600 rounded-xl py-2.5 text-sm font-medium text-white"
          >
            ⚠️ {stats.disputedBookings} Disputed
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !stats ? (
        <p className="text-center text-gray-500 py-16">Could not load stats.</p>
      ) : (
        <>
          {/* User stats */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Users
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Tile label="Clients" value={stats.users.clients} accent />
            <Tile label="Workers" value={stats.users.workers} />
          </div>

          {/* Revenue */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Revenue
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <Tile
              label="Total Blu Commission"
              value={`GHS ${stats.totalRevenue.toLocaleString()}`}
              sub="From completed jobs"
            />
            <Tile
              label="Disputed Bookings"
              value={stats.disputedBookings}
              sub="Needs admin action"
              warn={stats.disputedBookings > 0}
            />
          </div>

          {/* Job pipeline */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Job Pipeline
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {["POSTED", "QUOTING", "BOOKED", "IN_PROGRESS", "COMPLETED", "DISPUTED", "CANCELLED"].map((s) => (
              <div key={s} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{stats.jobs[s] ?? 0}</p>
                <span className={["text-xs px-1.5 py-0.5 rounded-full font-medium", STATUS_COLOR[s]].join(" ")}>
                  {s.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>

          {/* Recent jobs */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent Jobs
          </h2>
          <div className="flex flex-col gap-2">
            {stats.recentJobs.map((job) => (
              <div key={job.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.client.name} · {new Date(job.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}</p>
                </div>
                <span className={["text-xs px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_COLOR[job.status]].join(" ")}>
                  {job.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
