// app/(client)/post-job/page.tsx
// URL: /post-job
// Clients use this form to post a job — describing what they need done,
// where they are, how urgent it is, and (optionally) their budget.
// After submitting, they are taken straight to the job detail page.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { TRADE_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

// ─── Urgency options with plain-English descriptions ─────────────────────────

const URGENCY_OPTIONS = [
  {
    value: "EMERGENCY",
    label: "🚨 Emergency",
    desc: "Needs fixing today — burst pipe, no power, etc.",
    border: "border-red-300",
    selected: "border-red-500 bg-red-50",
  },
  {
    value: "THIS_WEEK",
    label: "📅 This week",
    desc: "Important but not a crisis — can wait a few days.",
    border: "border-orange-200",
    selected: "border-orange-400 bg-orange-50",
  },
  {
    value: "FLEXIBLE",
    label: "🕐 Flexible",
    desc: "No rush — I'll take the best quote whenever it comes.",
    border: "border-gray-200",
    selected: "border-primary bg-surface",
  },
];

// ─── Form validation ──────────────────────────────────────────────────────────

const schema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Keep the title under 100 characters"),
  category: z.string().min(1, "Please select a trade category"),
  urgency: z.enum(["EMERGENCY", "THIS_WEEK", "FLEXIBLE"], {
    message: "Please select how urgent this is",
  }),
  description: z
    .string()
    .min(20, "Please describe the job in more detail (at least 20 characters)")
    .max(2000),
  locationDescription: z
    .string()
    .min(3, "Please enter your location (e.g. East Legon, Accra)")
    .max(200),
  budgetMin: z.number().min(0, "Budget can't be negative").optional(),
  budgetMax: z.number().min(0, "Budget can't be negative").optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Main component ───────────────────────────────────────────────────────────

export default function PostJobPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // We fetch the user's saved location to use as default lat/lng for the job
  const [userLat, setUserLat] = useState(5.6037);  // Accra default
  const [userLng, setUserLng] = useState(-0.187);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.locationLat) setUserLat(data.locationLat);
        if (data.locationLng) setUserLng(data.locationLng);
      })
      .catch(() => {}); // silently fall back to Accra
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      urgency: "FLEXIBLE",
    },
  });

  const selectedUrgency = watch("urgency");
  const selectedCategory = watch("category");

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        locationLat: userLat,
        locationLng: userLng,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", message: json.error ?? "Failed to post job" });
      return;
    }

    showToast({ type: "success", message: "Job posted! Workers will send quotes soon." });
    router.push(`/jobs/${json.job.id}`);
  }

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href="/home"
            className="inline-flex items-center gap-1 text-blue-200 text-sm mb-3 hover:text-white"
          >
            ← Back
          </Link>
          <h1 className="text-white text-xl font-bold">Post a Job</h1>
          <p className="text-blue-200 text-sm mt-0.5">
            Describe what you need — workers will send you quotes.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="max-w-lg mx-auto px-4 pt-5 flex flex-col gap-5"
      >
        {/* ── Job title ─────────────────────────────────────────── */}
        <Input
          label="Job title"
          placeholder="e.g. Fix a leaking kitchen pipe"
          error={errors.title?.message}
          helper="Keep it short — workers see this first."
          {...register("title")}
        />

        {/* ── Trade category ────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Trade needed
          </label>
          {errors.category && (
            <p className="text-sm text-error">{errors.category.message}</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {TRADE_CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue("category", value, { shouldValidate: true })}
                className={[
                  "flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all",
                  selectedCategory === value
                    ? "border-primary bg-surface"
                    : "border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                <span aria-hidden="true">{emoji}</span>
                <span className="text-sm text-text-primary">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Urgency ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            How urgent is this?
          </label>
          {errors.urgency && (
            <p className="text-sm text-error">{errors.urgency.message}</p>
          )}
          <div className="flex flex-col gap-2">
            {URGENCY_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={[
                  "flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                  selectedUrgency === opt.value ? opt.selected : opt.border,
                ].join(" ")}
              >
                <input
                  type="radio"
                  value={opt.value}
                  className="accent-primary mt-0.5"
                  {...register("urgency")}
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                  <p className="text-xs text-text-secondary">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Description ───────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Describe the job
          </label>
          <p className="text-xs text-text-secondary -mt-0.5">
            What exactly needs to be done? Any known issues or special requirements?
          </p>
          <textarea
            rows={5}
            placeholder="e.g. The pipe under the kitchen sink has been dripping for 3 days. The water shut-off is accessible. I need it fixed urgently."
            className={[
              "w-full px-4 py-3 text-sm text-text-primary bg-white",
              "border border-gray-300 rounded-xl resize-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
              errors.description ? "border-error" : "",
            ].join(" ")}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-sm text-error">{errors.description.message}</p>
          )}
        </div>

        {/* ── Location ──────────────────────────────────────────── */}
        <Input
          label="Your location"
          placeholder="e.g. East Legon, Accra"
          error={errors.locationDescription?.message}
          helper="Workers use this to see if you're in their service area."
          {...register("locationDescription")}
        />

        {/* ── Budget (optional) ─────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-primary">
            Budget{" "}
            <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <p className="text-xs text-text-secondary -mt-0.5">
            Give a rough range in GHS. You don&apos;t have to set one — workers will quote their own price.
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min (GHS)"
                min={0}
                className={[
                  "w-full h-11 px-4 text-sm text-text-primary bg-white",
                  "border border-gray-300 rounded-xl",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                  errors.budgetMin ? "border-error" : "",
                ].join(" ")}
                {...register("budgetMin", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
              />
              {errors.budgetMin && (
                <p className="text-xs text-error mt-1">{errors.budgetMin.message}</p>
              )}
            </div>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Max (GHS)"
                min={0}
                className={[
                  "w-full h-11 px-4 text-sm text-text-primary bg-white",
                  "border border-gray-300 rounded-xl",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                  errors.budgetMax ? "border-error" : "",
                ].join(" ")}
                {...register("budgetMax", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
              />
              {errors.budgetMax && (
                <p className="text-xs text-error mt-1">{errors.budgetMax.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Photo notice ──────────────────────────────────────── */}
        <div className="bg-surface rounded-xl p-4">
          <p className="text-sm font-medium text-text-primary mb-0.5">📷 Photos</p>
          <p className="text-xs text-text-secondary">
            Photo upload (Cloudinary) will be added in Phase 5. For now, describe
            the problem clearly in the text above.
          </p>
        </div>

        {/* ── Payment notice ────────────────────────────────────── */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm font-medium text-yellow-800 mb-0.5">💳 Payment</p>
          <p className="text-xs text-yellow-700">
            You only pay after accepting a quote. Blu holds funds in escrow and
            releases them when the job is complete. MoMo payment is coming in Phase 4.
          </p>
        </div>

        <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
          Post Job
        </Button>
      </form>
    </div>
  );
}
