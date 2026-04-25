// app/(client)/payment/[bookingId]/page.tsx
// URL: /payment/:bookingId
// The payment screen — shown after a client accepts a quote.
//
// Dev mode  (no Paystack key set): shows a "Simulate MoMo Payment" button.
//           Clicking it records the payment instantly in the database.
// Production: shows "Pay with MoMo" → redirects to Paystack hosted checkout page.
//             After paying, Paystack redirects back here with ?ref=xxx for verification.

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDetail {
  id: string;
  totalAmount: number;
  commissionAmount: number;
  paymentReference: string | null;
  escrowStatus: string;
  job: { id: string; title: string; category: string };
  worker: { id: string; name: string; profilePhotoUrl?: string };
  quote: { paymentStructure: string; estimatedDurationDays: number };
}

// ─── Inner component (needs useSearchParams → must be inside Suspense) ────────

function PaymentContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (!res.ok) { router.push("/jobs"); return; }
      const data = await res.json();
      setBooking(data);
      if (data.paymentReference) setPaid(true);
    } catch {
      router.push("/jobs");
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  // Handle return from Paystack (production flow): ?ref=xxx in URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || paid) return;

    async function verifyAfterRedirect() {
      setPaying(true);
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reference: ref }),
      });
      if (res.ok) {
        setPaid(true);
        showToast({ type: "success", message: "Payment confirmed! Your job is now active." });
      } else {
        const json = await res.json();
        showToast({ type: "error", message: json.error ?? "Payment verification failed" });
      }
      setPaying(false);
    }

    verifyAfterRedirect();
  }, [searchParams, bookingId, paid, showToast]);

  async function handlePay() {
    if (!booking) return;
    setPaying(true);

    // Step 1: Initialize payment
    const initRes = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const initData = await initRes.json();

    if (!initRes.ok) {
      showToast({ type: "error", message: initData.error ?? "Could not start payment" });
      setPaying(false);
      return;
    }

    if (initData.dev) {
      // Dev mode: verify immediately without Paystack
      const verifyRes = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, reference: "dev_simulated" }),
      });
      if (verifyRes.ok) {
        setPaid(true);
        showToast({ type: "success", message: "Payment simulated! Your job is now active." });
      } else {
        const json = await verifyRes.json();
        showToast({ type: "error", message: json.error ?? "Simulation failed" });
      }
      setPaying(false);
      return;
    }

    // Production: redirect to Paystack checkout
    window.location.href = initData.authorization_url;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!booking) return null;

  const cat = TRADE_CATEGORIES.find((t) => t.value === booking.job.category);
  const workerReceives = booking.totalAmount - booking.commissionAmount;

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href={`/jobs/${booking.job.id}`}
            className="inline-flex items-center gap-1 text-blue-200 text-sm mb-3 hover:text-white"
          >
            ← Back to job
          </Link>
          <h1 className="text-white text-xl font-bold">
            {paid ? "Payment Complete ✅" : "Complete Payment"}
          </h1>
          <p className="text-blue-200 text-sm mt-0.5">
            {cat?.emoji} {booking.job.title}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 flex flex-col gap-4 pb-20">

        {/* Paid success state */}
        {paid && (
          <div className="card border-green-300 bg-green-50/50 text-center py-6">
            <p className="text-5xl mb-3" aria-hidden="true">✅</p>
            <p className="font-bold text-text-primary text-lg mb-1">Payment Confirmed</p>
            <p className="text-sm text-text-secondary">
              Your payment of{" "}
              <span className="font-semibold text-text-primary">
                GHS {booking.totalAmount.toLocaleString()}
              </span>{" "}
              is held safely in escrow. It will be released to{" "}
              <span className="font-semibold text-text-primary">{booking.worker.name}</span>{" "}
              once the job is complete.
            </p>
            <Link
              href={`/jobs/${booking.job.id}`}
              className="inline-flex mt-4 bg-primary text-white font-semibold px-6 py-3 rounded-xl"
            >
              View Job
            </Link>
          </div>
        )}

        {/* Payment summary card */}
        {!paid && (
          <>
            {/* Worker */}
            <div className="card">
              <h2 className="font-semibold text-text-primary mb-3">Worker</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0">
                  {booking.worker.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={booking.worker.profilePhotoUrl}
                      alt={booking.worker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-bold text-xl">
                      {booking.worker.name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{booking.worker.name}</p>
                  <p className="text-xs text-text-secondary">
                    {booking.quote.paymentStructure === "MILESTONE" ? "Milestone payment" : "Single payment"} ·{" "}
                    Est. {booking.quote.estimatedDurationDays} day
                    {booking.quote.estimatedDurationDays !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount breakdown */}
            <div className="card">
              <h2 className="font-semibold text-text-primary mb-3">Payment Breakdown</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Job price</span>
                  <span className="font-medium text-text-primary">
                    GHS {booking.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Blu platform fee (10%)</span>
                  <span className="text-text-secondary">
                    GHS {booking.commissionAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>Worker receives</span>
                  <span>GHS {workerReceives.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-base">
                  <span className="text-text-primary">You pay</span>
                  <span className="text-primary">GHS {booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Escrow explanation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">🔒 Protected by Escrow</p>
              <p className="text-xs text-blue-700">
                Your money is held securely by Blu and only released to{" "}
                {booking.worker.name} after you confirm the job is complete.
                If anything goes wrong, you can raise a dispute.
              </p>
            </div>

            {/* Dev mode notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                🧪 Development Mode
              </p>
              <p className="text-xs text-yellow-700">
                No real money will be charged. Click the button below to simulate a
                MoMo payment. In production, this redirects to Paystack&apos;s real
                checkout page.
              </p>
            </div>

            <Button fullWidth size="lg" loading={paying} onClick={handlePay}>
              {paying ? "Processing…" : "Simulate MoMo Payment"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js 14
export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner w-8 h-8" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
