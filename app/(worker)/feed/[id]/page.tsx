// app/(worker)/feed/[id]/page.tsx
// URL: /feed/:id
// A worker's view of a single client job — shown when they tap a job in the feed.
// Shows the full job description, client details, and a quote submission form.
// If the worker already submitted a quote, they see that quote's status instead.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyQuote {
  id: string;
  amount: number;
  estimatedDurationDays: number;
  message?: string;
  paymentStructure: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  milestones: { id: string; title: string; amount: number; orderIndex: number }[];
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
  client: { id: string; name: string };
  quotes: MyQuote[]; // API returns only this worker's quotes for this endpoint
  _count?: { quotes: number };
}

// ─── Quote form schema ────────────────────────────────────────────────────────

const milestoneSchema = z.object({
  title: z.string().min(2, "Title required"),
  amount: z.number().min(1, "Amount required"),
});

const quoteSchema = z.object({
  amount: z.number().min(1, "Please enter your quote amount in GHS"),
  estimatedDurationDays: z.number().int().min(1, "At least 1 day").max(365),
  message: z.string().max(1000).optional(),
  paymentStructure: z.enum(["SINGLE", "MILESTONE"]),
  milestones: z.array(milestoneSchema).optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

// ─── Quote form component ─────────────────────────────────────────────────────

function QuoteForm({ jobId, onSuccess }: { jobId: string; onSuccess: () => void }) {
  const { showToast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      paymentStructure: "SINGLE",
      milestones: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "milestones" });
  const paymentStructure = watch("paymentStructure");
  const amount = watch("amount");
  const milestones = watch("milestones") ?? [];

  // Live validation: milestone amounts must sum to total
  const milestoneTotal = milestones.reduce(
    (sum, m) => sum + (Number(m.amount) || 0),
    0
  );
  const milestoneMismatch =
    paymentStructure === "MILESTONE" &&
    milestones.length > 0 &&
    Math.abs(milestoneTotal - (Number(amount) || 0)) > 0.01;

  async function onSubmit(data: QuoteFormData) {
    const payload = {
      jobId,
      amount: data.amount,
      estimatedDurationDays: data.estimatedDurationDays,
      message: data.message,
      paymentStructure: data.paymentStructure,
      milestones:
        data.paymentStructure === "MILESTONE"
          ? (data.milestones ?? []).map((m, i) => ({
              title: m.title,
              amount: Number(m.amount),
              orderIndex: i + 1,
            }))
          : [],
    };

    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", message: json.error ?? "Failed to submit quote" });
      return;
    }
    showToast({ type: "success", message: "Quote submitted! The client will be notified." });
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <h2 className="font-semibold text-text-primary">Submit Your Quote</h2>

      {/* Amount */}
      <Input
        label="Your price (GHS)"
        type="number"
        min={1}
        placeholder="e.g. 350"
        error={errors.amount?.message as string | undefined}
        helper="Enter the total amount in Ghanaian Cedis."
        {...register("amount", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
      />

      {/* Duration */}
      <Input
        label="Estimated duration (days)"
        type="number"
        min={1}
        max={365}
        placeholder="e.g. 2"
        error={errors.estimatedDurationDays?.message as string | undefined}
        {...register("estimatedDurationDays", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
      />

      {/* Payment structure */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">
          Payment structure
        </label>
        <div className="flex gap-2">
          {(["SINGLE", "MILESTONE"] as const).map((opt) => (
            <label
              key={opt}
              className={[
                "flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                paymentStructure === opt
                  ? "border-primary bg-surface"
                  : "border-gray-200 hover:border-gray-300",
              ].join(" ")}
            >
              <input
                type="radio"
                value={opt}
                className="accent-primary"
                {...register("paymentStructure")}
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {opt === "SINGLE" ? "Single payment" : "By milestone"}
                </p>
                <p className="text-xs text-text-secondary">
                  {opt === "SINGLE"
                    ? "Paid in full when complete"
                    : "Paid in stages as work progresses"}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Milestone rows (only if MILESTONE selected) */}
      {paymentStructure === "MILESTONE" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              Milestones
            </label>
            <button
              type="button"
              onClick={() => append({ title: "", amount: "" as unknown as number })}
              className="text-xs text-primary font-medium"
            >
              + Add milestone
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-xs text-text-secondary">
              Add at least one milestone. Their amounts must add up to your total price.
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={`Milestone ${index + 1} title`}
                  className={[
                    "w-full h-10 px-3 text-sm text-text-primary bg-white",
                    "border border-gray-300 rounded-xl",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                    errors.milestones?.[index]?.title ? "border-error" : "",
                  ].join(" ")}
                  {...register(`milestones.${index}.title`)}
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  placeholder="GHS"
                  min={1}
                  className={[
                    "w-full h-10 px-3 text-sm text-text-primary bg-white",
                    "border border-gray-300 rounded-xl",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                    errors.milestones?.[index]?.amount ? "border-error" : "",
                  ].join(" ")}
                  {...register(`milestones.${index}.amount`, { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-error rounded-xl border border-gray-200"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          ))}

          {/* Milestone sum indicator */}
          {fields.length > 0 && (
            <p className={["text-xs font-medium", milestoneMismatch ? "text-error" : "text-green-600"].join(" ")}>
              Milestone total: GHS {milestoneTotal.toLocaleString()}{" "}
              {Number(amount) > 0 && `/ GHS ${Number(amount).toLocaleString()} total`}
              {milestoneMismatch && " — must match your total price"}
            </p>
          )}
        </div>
      )}

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-primary">
          Message{" "}
          <span className="font-normal text-text-secondary">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Briefly explain why you're the right person for this job…"
          className="w-full px-4 py-3 text-sm text-text-primary bg-white border border-gray-300 rounded-xl resize-none focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
          {...register("message")}
        />
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={isSubmitting}
        disabled={milestoneMismatch}
      >
        Submit Quote
      </Button>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FeedJobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) { router.push("/feed"); return; }
      setJob(await res.json());
    } catch {
      router.push("/feed");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (!job) return null;

  const cat = TRADE_CATEGORIES.find((t) => t.value === job.category);
  // The job API returns ALL quotes (including other workers').
  // We can detect "has this worker quoted?" by checking if quotes array contains
  // a quote with PENDING status — the feed uses ?assigned=false so the API
  // actually includes a quotes[] field filtered to this worker's own quotes.
  // For safety, treat any PENDING quote in the list as ours (the feed endpoint
  // already filtered by workerId on the server in GET /api/jobs).
  const workerOwnQuote = job.quotes.find(
    (q: MyQuote & { workerId?: string }) => q.workerId === session?.user?.id
  ) ?? (job.quotes.length === 1 ? job.quotes[0] : undefined);
  const hasQuoted = !!workerOwnQuote && workerOwnQuote.status === "PENDING";
  const isOpen = ["POSTED", "QUOTING"].includes(job.status);

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href="/feed"
            className="inline-flex items-center gap-1 text-blue-200 text-sm mb-3 hover:text-white"
          >
            ← Feed
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

        {/* Job details card */}
        <div className="card">
          <div className="flex flex-wrap gap-2 mb-3">
            <StatusBadge status={job.urgency} type="urgency" />
            {(job.budgetMin || job.budgetMax) && (
              <span className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full font-medium">
                {job.budgetMin && job.budgetMax
                  ? `GHS ${job.budgetMin} – ${job.budgetMax}`
                  : job.budgetMin
                  ? `From GHS ${job.budgetMin}`
                  : `Up to GHS ${job.budgetMax}`}
              </span>
            )}
          </div>

          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {job.description}
          </p>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-1 text-xs text-text-secondary">
            <p>📍 {job.locationDescription}</p>
            <p>
              👤 Posted by{" "}
              <span className="font-medium text-text-primary">{job.client.name}</span>
            </p>
            <p>
              🕐 Posted{" "}
              {new Date(job.createdAt).toLocaleDateString("en-GH", {
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>

        {/* Already quoted — show quote status */}
        {!isOpen && (
          <div className="card bg-surface text-center py-6">
            <p className="text-3xl mb-2" aria-hidden="true">🔒</p>
            <p className="font-semibold text-text-primary">
              Job is {job.status.toLowerCase().replace("_", " ")}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              This job is no longer accepting quotes.
            </p>
          </div>
        )}

        {isOpen && hasQuoted && workerOwnQuote && (
          <div className="card border-yellow-200 bg-yellow-50/30">
            <p className="font-semibold text-text-primary mb-2">
              Your quote — waiting for response
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
              <div>
                <p className="text-xs text-text-secondary">Your price</p>
                <p className="font-bold text-text-primary">
                  GHS {workerOwnQuote.amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Duration</p>
                <p className="font-bold text-text-primary">
                  {workerOwnQuote.estimatedDurationDays} day
                  {workerOwnQuote.estimatedDurationDays !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Expires{" "}
              {new Date(workerOwnQuote.expiresAt).toLocaleDateString("en-GH", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {/* Quote form (only if job is open and worker hasn't quoted yet) */}
        {isOpen && !hasQuoted && (
          <div className="card">
            <QuoteForm jobId={job.id} onSuccess={fetchJob} />
          </div>
        )}
      </div>
    </div>
  );
}
