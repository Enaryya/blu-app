// app/(client)/jobs/[id]/page.tsx
// URL: /jobs/:id
// A client's full view of one job they posted.
// Shows: job details, all quotes received, and buttons to accept or reject each quote.
// Once a quote is accepted, the job is BOOKED and this page shows the booking summary.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RatingStars } from "@/components/RatingStars";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  id: string;
  title: string;
  amount: number;
  orderIndex: number;
}

interface QuoteWithWorker {
  id: string;
  amount: number;
  estimatedDurationDays: number;
  message?: string;
  paymentStructure: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  milestones: Milestone[];
  worker: {
    id: string;
    name: string;
    profilePhotoUrl?: string;
    locationDescription?: string;
    workerProfile?: {
      verificationLevel: string;
      averageRating: number;
      totalCompletedJobs: number;
      yearsExperience: number;
    };
  };
}

interface Booking {
  id: string;
  totalAmount: number;
  commissionAmount: number;
  escrowStatus: string;
  paymentReference: string | null;
  clientConfirmed: boolean;
  worker: { id: string; name: string; profilePhotoUrl?: string };
  quote: { paymentStructure: string; milestones: Milestone[] };
  reviews: { id: string; reviewerId: string; rating: number; comment?: string }[];
}

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  locationDescription: string;
  budgetMin?: number;
  budgetMax?: number;
  createdAt: string;
  client: { name: string };
  quotes: QuoteWithWorker[];
  bookings: Booking[];
}

// ─── Quote card ───────────────────────────────────────────────────────────────

function QuoteCard({
  quote,
  jobStatus,
  onAccept,
  onReject,
  accepting,
}: {
  quote: QuoteWithWorker;
  jobStatus: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  accepting: string | null;
}) {
  const profile = quote.worker.workerProfile;
  const canAct = jobStatus === "QUOTING" && quote.status === "PENDING";

  return (
    <div
      className={[
        "card transition-all",
        quote.status === "ACCEPTED"
          ? "border-green-300 bg-green-50/30"
          : quote.status === "REJECTED"
          ? "opacity-60"
          : "",
      ].join(" ")}
    >
      {/* Worker info row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
          {quote.worker.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.worker.profilePhotoUrl}
              alt={quote.worker.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary font-bold text-xl">
              {quote.worker.name[0].toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/workers/${quote.worker.id}`}
              className="font-semibold text-text-primary text-sm hover:text-primary"
            >
              {quote.worker.name}
            </Link>
            {profile && (
              <VerificationBadge
                level={profile.verificationLevel as "BASIC" | "CERTIFIED_PRO" | "TOP_RATED"}
                size="sm"
              />
            )}
            <StatusBadge status={quote.status} type="quote" />
          </div>

          {profile && (
            <div className="flex items-center gap-2 mt-0.5">
              <RatingStars rating={profile.averageRating} count={profile.totalCompletedJobs} />
              {profile.yearsExperience > 0 && (
                <span className="text-xs text-text-secondary">
                  · {profile.yearsExperience} yrs exp
                </span>
              )}
            </div>
          )}
          {quote.worker.locationDescription && (
            <p className="text-xs text-text-secondary mt-0.5">
              📍 {quote.worker.locationDescription}
            </p>
          )}
        </div>
      </div>

      {/* Quote details */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-surface rounded-xl p-3">
          <p className="text-xs text-text-secondary">Quote price</p>
          <p className="font-bold text-text-primary text-lg">
            GHS {quote.amount.toLocaleString()}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-3">
          <p className="text-xs text-text-secondary">Estimated duration</p>
          <p className="font-bold text-text-primary text-lg">
            {quote.estimatedDurationDays}{" "}
            <span className="text-sm font-normal">
              day{quote.estimatedDurationDays !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      </div>

      {/* Payment structure */}
      <p className="text-xs text-text-secondary mb-2">
        Payment:{" "}
        <span className="font-medium text-text-primary">
          {quote.paymentStructure === "MILESTONE" ? "By milestone" : "Single payment on completion"}
        </span>
      </p>

      {/* Milestones */}
      {quote.milestones.length > 0 && (
        <div className="mb-3 bg-surface rounded-xl p-3">
          <p className="text-xs font-medium text-text-primary mb-2">Milestones</p>
          <div className="flex flex-col gap-1.5">
            {quote.milestones.map((m) => (
              <div key={m.id} className="flex justify-between text-xs">
                <span className="text-text-secondary">
                  {m.orderIndex}. {m.title}
                </span>
                <span className="font-medium text-text-primary">
                  GHS {m.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Worker's message */}
      {quote.message && (
        <div className="bg-surface rounded-xl p-3 mb-3">
          <p className="text-xs text-text-secondary mb-1">Message from worker</p>
          <p className="text-sm text-text-primary">{quote.message}</p>
        </div>
      )}

      {/* Quote expires in note */}
      {quote.status === "PENDING" && (
        <p className="text-xs text-gray-400 mb-3">
          Expires:{" "}
          {new Date(quote.expiresAt).toLocaleDateString("en-GH", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {/* Accept / Reject buttons */}
      {canAct && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onReject(quote.id)}
            disabled={!!accepting}
          >
            Decline
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAccept(quote.id)}
            loading={accepting === quote.id}
            disabled={!!accepting && accepting !== quote.id}
          >
            Accept Quote
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { data: session } = useSession();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) { router.push("/jobs"); return; }
      const data = await res.json();
      setJob(data);
    } catch {
      router.push("/jobs");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  async function acceptQuote(quoteId: string) {
    setAccepting(quoteId);
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Quote accepted! The worker has been notified." });
      fetchJob();
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to accept quote" });
    }
    setAccepting(null);
  }

  async function rejectQuote(quoteId: string) {
    await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" }),
    });
    showToast({ type: "success", message: "Quote declined." });
    fetchJob();
  }

  async function cancelJob() {
    if (!confirm("Are you sure you want to cancel this job?")) return;
    setCancelling(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Job cancelled." });
      fetchJob();
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to cancel job" });
    }
    setCancelling(false);
  }

  async function confirmJob(bookingId: string) {
    if (!confirm("Confirm this job is complete? This will release payment to the worker.")) return;
    setConfirming(true);
    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm" }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Job confirmed! Payment released to worker." });
      fetchJob();
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to confirm" });
    }
    setConfirming(false);
  }

  async function submitDispute(bookingId: string) {
    if (disputeReason.length < 10) return;
    setSubmittingDispute(true);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, reason: disputeReason }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Dispute raised — our team will review it within 24 hours." });
      setShowDisputeForm(false);
      fetchJob();
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to raise dispute" });
    }
    setSubmittingDispute(false);
  }

  async function submitReview(bookingId: string) {
    if (reviewRating === 0) return;
    setSubmittingReview(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, rating: reviewRating, comment: reviewComment }),
    });
    if (res.ok) {
      showToast({ type: "success", message: "Review submitted! Thank you." });
      setReviewRating(0);
      setReviewComment("");
      fetchJob();
    } else {
      const json = await res.json();
      showToast({ type: "error", message: json.error ?? "Failed to submit review" });
    }
    setSubmittingReview(false);
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
  const pendingQuotes = job.quotes.filter((q) => q.status === "PENDING");
  const canCancel = ["POSTED", "QUOTING"].includes(job.status);
  const myId = session?.user?.id;
  const hasReviewed = booking?.reviews?.some((r) => r.reviewerId === myId) ?? false;

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href="/jobs"
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

        {/* Booking summary (shown after a quote is accepted) */}
        {booking && (
          <div className="card border-green-300 bg-green-50/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" aria-hidden="true">✅</span>
              <p className="font-semibold text-text-primary">
                Booked — {booking.worker.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-text-secondary">Total</p>
                <p className="font-bold text-text-primary">
                  GHS {booking.totalAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Escrow</p>
                <p className="font-medium text-text-primary capitalize">
                  {booking.escrowStatus.toLowerCase().replace("_", " ")}
                </p>
              </div>
            </div>
            {booking.paymentReference ? (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-green-800 font-medium">
                  ✅ Payment confirmed — funds are held in escrow.
                </p>
              </div>
            ) : (
              <Link
                href={`/payment/${booking.id}`}
                className="mt-3 flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm rounded-xl py-3"
              >
                💳 Pay Now — GHS {booking.totalAmount.toLocaleString()}
              </Link>
            )}

            {/* Confirm job complete (only for COMPLETED jobs not yet confirmed) */}
            {job.status === "COMPLETED" && !booking.clientConfirmed && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900 mb-1">Is the job done?</p>
                <p className="text-xs text-blue-700 mb-3">
                  Confirming releases payment to {booking.worker.name}. Only confirm
                  once you&apos;re satisfied with the work.
                </p>
                <Button
                  fullWidth
                  loading={confirming}
                  onClick={() => confirmJob(booking.id)}
                >
                  Confirm Job Complete
                </Button>
              </div>
            )}

            {/* Review form (shown after confirmed, before review submitted) */}
            {job.status === "COMPLETED" && booking.clientConfirmed && !hasReviewed && (
              <div className="mt-3 border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-3">
                  Rate {booking.worker.name}
                </p>
                {/* Star picker */}
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-2xl leading-none"
                      aria-label={`${star} stars`}
                    >
                      {star <= reviewRating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="What did you think? (optional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                />
                <Button
                  fullWidth
                  disabled={reviewRating === 0}
                  loading={submittingReview}
                  onClick={() => submitReview(booking.id)}
                >
                  Submit Review
                </Button>
              </div>
            )}

            {/* Already reviewed */}
            {job.status === "COMPLETED" && booking.clientConfirmed && hasReviewed && (
              <div className="mt-3 text-center py-3">
                <p className="text-sm text-green-700 font-medium">⭐ Review submitted</p>
              </div>
            )}

            {/* Raise Dispute (only if COMPLETED + not yet confirmed) */}
            {job.status === "COMPLETED" && !booking.clientConfirmed && (
              <div className="mt-2">
                {!showDisputeForm ? (
                  <button
                    onClick={() => setShowDisputeForm(true)}
                    className="w-full text-xs text-error py-2 underline"
                  >
                    Something wrong? Raise a dispute
                  </button>
                ) : (
                  <div className="border border-red-200 bg-red-50/30 rounded-xl p-4 mt-2">
                    <p className="text-sm font-semibold text-red-800 mb-2">Raise a Dispute</p>
                    <p className="text-xs text-red-700 mb-3">
                      Describe the issue. Our team reviews disputes within 24 hours
                      and will contact both parties.
                    </p>
                    <textarea
                      rows={3}
                      placeholder="What went wrong? Be specific…"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-red-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-300/50 mb-3 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDisputeForm(false)}
                        className="flex-1 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={disputeReason.length < 10 || submittingDispute}
                        onClick={() => submitDispute(booking.id)}
                        className="flex-1 py-2 text-sm bg-error text-white font-semibold rounded-xl disabled:opacity-40"
                      >
                        {submittingDispute ? "Submitting…" : "Submit Dispute"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disputed state */}
            {job.status === "DISPUTED" && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs text-red-800 font-medium">
                  ⚠️ Dispute in review — our team will resolve this within 24 hours.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Job details */}
        <div className="card">
          <h2 className="font-semibold text-text-primary mb-3">Job Details</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Urgency</span>
              <StatusBadge status={job.urgency} type="urgency" />
            </div>
            {(job.budgetMin || job.budgetMax) && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Budget</span>
                <span className="text-text-primary font-medium">
                  {job.budgetMin && job.budgetMax
                    ? `GHS ${job.budgetMin} – ${job.budgetMax}`
                    : job.budgetMin
                    ? `From GHS ${job.budgetMin}`
                    : `Up to GHS ${job.budgetMax}`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">Posted</span>
              <span className="text-text-primary">
                {new Date(job.createdAt).toLocaleDateString("en-GH", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-text-secondary leading-relaxed">{job.description}</p>
          </div>
        </div>

        {/* Quotes section */}
        {job.status !== "CANCELLED" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-text-primary">
                Quotes ({job.quotes.length})
              </h2>
              {pendingQuotes.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {pendingQuotes.length} pending
                </span>
              )}
            </div>

            {job.quotes.length === 0 ? (
              <div className="bg-surface rounded-2xl p-6 text-center">
                <p className="text-3xl mb-2" aria-hidden="true">⏳</p>
                <p className="font-medium text-text-primary text-sm">
                  Waiting for quotes
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Workers who can help will send their quotes here.
                  {job.urgency === "EMERGENCY" && " Emergency jobs usually get quotes within the hour."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {job.quotes.map((q) => (
                  <QuoteCard
                    key={q.id}
                    quote={q}
                    jobStatus={job.status}
                    onAccept={acceptQuote}
                    onReject={rejectQuote}
                    accepting={accepting}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cancel job */}
        {canCancel && (
          <Button
            variant="outline"
            fullWidth
            onClick={cancelJob}
            loading={cancelling}
            className="border-error text-error hover:bg-red-50"
          >
            Cancel Job
          </Button>
        )}
      </div>
    </div>
  );
}
