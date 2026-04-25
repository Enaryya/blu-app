// app/worker/jobs/[id]/page.tsx
// URL: /worker/jobs/:id
// Worker's detailed view of a job they won (client accepted their quote).
// Shows: job details, booking amount, milestones (if any), and action buttons:
//   - BOOKED     → "Mark as Started"
//   - IN_PROGRESS → "Mark as Completed"
//   - COMPLETED   → Shows completion date and payment note

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  orderIndex: number;
  status: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  locationDescription: string;
  createdAt: string;
  completedAt?: string;
  client: { id: string; name: string; profilePhotoUrl?: string };
  bookings: {
    id: string;
    totalAmount: number;
    commissionAmount: number;
    escrowStatus: string;
    autoReleaseAt?: string;
    quote: {
      paymentStructure: string;
      milestones: Milestone[];
    };
  }[];
}

// ─── Milestone status label ───────────────────────────────────────────────────

const MILESTONE_STATUS: Record<string, string> = {
  PENDING:     "⏳ Not started",
  IN_PROGRESS: "🔄 In progress",
  COMPLETED:   "✅ Done",
  APPROVED:    "💚 Approved & paid",
  DISPUTED:    "⚠️ Disputed",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkerJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) { router.push("/worker/jobs"); return; }
      setJob(await res.json());
    } catch {
      router.push("/worker/jobs");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  async function patchJob(action: string) {
    setActing(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast({
        type: "success",
        message:
          action === "start"
            ? "Job marked as in progress!"
            : "Job marked as complete! The client has been notified.",
      });
      fetchJob();
    } else {
      showToast({ type: "error", message: json.error ?? "Something went wrong" });
    }
    setActing(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!job) return null;

  const cat = TRADE_CATEGORIES.find((t) => t.value === job.category);
  const booking = job.bookings[0];
  const milestones = booking?.quote?.milestones ?? [];
  const workerEarning = booking
    ? booking.totalAmount - booking.commissionAmount
    : 0;

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href="/worker/jobs"
            className="inline-flex items-center gap-1 text-blue-200 text-sm mb-3 hover:text-white"
          >
            ← My Jobs
          </Link>
          <div className="flex items-start gap-2">
            <h1 className="text-white text-xl font-bold flex-1 leading-tight">
              {job.title}
            </h1>
            <StatusBadge status={job.status} size="md" />
          </div>
          <p className="text-blue-200 text-sm mt-1">
            {cat?.emoji} {cat?.label} · {job.locationDescription}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 flex flex-col gap-4">

        {/* Booking summary */}
        {booking && (
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-3">Booking Summary</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-text-secondary">Job price</p>
                <p className="font-bold text-text-primary text-lg">
                  GHS {booking.totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-surface rounded-xl p-3">
                <p className="text-xs text-text-secondary">Your earnings</p>
                <p className="font-bold text-green-600 text-lg">
                  GHS {workerEarning.toLocaleString()}
                </p>
                <p className="text-xs text-text-secondary">(after 10% commission)</p>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-text-secondary">
              <span>Payment</span>
              <span className="font-medium text-text-primary capitalize">
                {booking.quote.paymentStructure === "MILESTONE"
                  ? "By milestone"
                  : "Single payment"}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs text-text-secondary">
              <span>Escrow</span>
              <span className="font-medium text-text-primary">
                {booking.escrowStatus.toLowerCase().replace("_", " ")}
              </span>
            </div>
            {booking.autoReleaseAt && (
              <div className="mt-1 flex justify-between text-xs text-text-secondary">
                <span>Auto-release</span>
                <span className="font-medium text-text-primary">
                  {new Date(booking.autoReleaseAt).toLocaleDateString("en-GH", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {booking.escrowStatus === "RELEASED" ? (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-green-800 font-medium">
                  ✅ Payment released — your earnings have been confirmed.
                </p>
              </div>
            ) : (
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-800">
                  🔒 Funds held in escrow — released once the client confirms the job is complete.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client info */}
        <div className="card">
          <h2 className="font-semibold text-text-primary mb-3">Client</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
              {job.client.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={job.client.profilePhotoUrl}
                  alt={job.client.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-primary font-bold text-xl">
                  {job.client.name[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-semibold text-text-primary">{job.client.name}</p>
              <p className="text-xs text-text-secondary">{job.locationDescription}</p>
            </div>
          </div>
        </div>

        {/* Job description */}
        <div className="card">
          <h2 className="font-semibold text-text-primary mb-2">Job Description</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{job.description}</p>
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            <StatusBadge status={job.urgency} type="urgency" />
          </div>
        </div>

        {/* Milestones (if MILESTONE payment) */}
        {milestones.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-3">Milestones</h2>
            <div className="flex flex-col gap-2">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between p-3 bg-surface rounded-xl gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {m.orderIndex}. {m.title}
                    </p>
                    {m.description && (
                      <p className="text-xs text-text-secondary mt-0.5">{m.description}</p>
                    )}
                    <p className="text-xs text-text-secondary mt-1">
                      {MILESTONE_STATUS[m.status] ?? m.status}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
                    GHS {m.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion info */}
        {job.status === "COMPLETED" && job.completedAt && (
          <div className="card border-green-200 bg-green-50/30">
            <p className="font-semibold text-text-primary mb-1">✅ Job Completed</p>
            <p className="text-sm text-text-secondary">
              You marked this job complete on{" "}
              {new Date(job.completedAt).toLocaleDateString("en-GH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              .
            </p>
            <p className="text-xs text-text-secondary mt-1">
              The client has 72 hours to confirm. After that, payment is automatically
              released to you.
            </p>
          </div>
        )}

        {/* Action buttons */}
        {job.status === "BOOKED" && (
          <Button
            fullWidth
            size="lg"
            onClick={() => patchJob("start")}
            loading={acting}
          >
            Mark as Started
          </Button>
        )}

        {job.status === "IN_PROGRESS" && (
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (
                confirm(
                  "Mark this job as completed? The client will be notified and will have 72 hours to confirm before payment is released."
                )
              ) {
                patchJob("complete");
              }
            }}
            loading={acting}
          >
            Mark as Completed
          </Button>
        )}
      </div>
    </div>
  );
}
