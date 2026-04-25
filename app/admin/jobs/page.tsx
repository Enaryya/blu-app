// app/admin/jobs/page.tsx
// URL: /admin/jobs
// Lists all jobs on the platform. Admin can filter by status and resolve
// disputed bookings (release payment to worker OR refund to client).

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminJob {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  client: { id: string; name: string; phoneNumber: string };
  bookings: {
    id: string;
    totalAmount: number;
    commissionAmount: number;
    escrowStatus: string;
    clientConfirmed: boolean;
    paymentReference: string | null;
    worker: { id: string; name: string; phoneNumber: string };
  }[];
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

const ALL_STATUSES = ["POSTED", "QUOTING", "BOOKED", "IN_PROGRESS", "COMPLETED", "DISPUTED", "CANCELLED"];

// ─── Job row ──────────────────────────────────────────────────────────────────

function JobRow({
  job,
  onResolve,
}: {
  job: AdminJob;
  onResolve: (bookingId: string, action: "release" | "refund") => Promise<void>;
}) {
  const [resolving, setResolving] = useState<"release" | "refund" | null>(null);
  const booking = job.bookings[0];
  const isDisputed = job.status === "DISPUTED";

  return (
    <div className={["bg-white border rounded-xl px-4 py-3", isDisputed ? "border-red-300 bg-red-50/30" : "border-gray-200"].join(" ")}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{job.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Client: {job.client.name} ({job.client.phoneNumber}) ·{" "}
            {new Date(job.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <span className={["text-xs px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_COLOR[job.status] ?? "bg-gray-100 text-gray-500"].join(" ")}>
          {job.status.replace("_", " ")}
        </span>
      </div>

      {booking && (
        <div className="text-xs text-gray-500 mt-1">
          Worker: {booking.worker.name} ({booking.worker.phoneNumber}) ·
          GHS {booking.totalAmount.toLocaleString()} ·
          Escrow: <span className="font-medium">{booking.escrowStatus}</span>
          {booking.paymentReference ? " · Paid" : " · Unpaid"}
        </div>
      )}

      {/* Dispute resolution controls */}
      {isDisputed && booking && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={!!resolving}
            onClick={async () => {
              setResolving("release");
              await onResolve(booking.id, "release");
              setResolving(null);
            }}
            className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 hover:bg-green-700 transition-colors"
          >
            {resolving === "release" ? "Releasing…" : "✅ Release to Worker"}
          </button>
          <button
            disabled={!!resolving}
            onClick={async () => {
              setResolving("refund");
              await onResolve(booking.id, "refund");
              setResolving(null);
            }}
            className="flex-1 bg-red-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {resolving === "refund" ? "Refunding…" : "↩ Refund Client"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Content (needs useSearchParams → inside Suspense) ────────────────────────

function AdminJobsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");

  const fetchJobs = useCallback(async (status: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/admin/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(statusFilter); }, [statusFilter, fetchJobs]);

  async function handleResolve(bookingId: string, action: "release" | "refund") {
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, action }),
    });
    if (res.ok) {
      showToast({ type: "success", message: action === "release" ? "Payment released to worker." : "Refund issued to client." });
      fetchJobs(statusFilter);
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to resolve dispute" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 pt-8 pb-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Jobs</h1>
        <p className="text-sm text-gray-500">{total} total</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setStatusFilter("")}
          className={["px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap", !statusFilter ? "bg-primary text-white" : "bg-gray-100 text-gray-600"].join(" ")}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={["px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap", statusFilter === s ? "bg-primary text-white" : s === "DISPUTED" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"].join(" ")}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No jobs found</div>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="spinner w-8 h-8" /></div>}>
      <AdminJobsContent />
    </Suspense>
  );
}
