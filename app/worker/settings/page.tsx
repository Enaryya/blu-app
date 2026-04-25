// app/worker/settings/page.tsx
// URL: /worker/settings
// Workers use this page to:
//   - Set their trade categories, bio, experience, service radius
//   - Set their location
//   - Toggle availability (Available / Busy / Offline)
//   - See their verification status and how to level up
//   - Upload profile photo URL (Cloudinary wired in Phase X)

"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useToast } from "@/components/ui/Toast";
import {
  TRADE_CATEGORIES,
  AVAILABILITY_OPTIONS,
  VERIFICATION_LEVELS,
} from "@/lib/constants";

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  profilePhotoUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  locationDescription: z.string().max(200).optional(),
  tradeCategories: z.array(z.string()).min(1, "Select at least one trade"),
  yearsExperience: z.number().int().min(0).max(60),
  bio: z.string().max(1000, "Keep bio under 1000 characters").optional(),
  serviceRadiusKm: z.number().int().min(1).max(200),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]),
});

type FormData = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function WorkerSettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [profileData, setProfileData] = useState<{ workerProfile: { verificationLevel: "BASIC" | "CERTIFIED_PRO" | "TOP_RATED" } } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeSection, setActiveSection] = useState<"profile" | "verification" | "account">("profile");

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tradeCategories: [],
      yearsExperience: 0,
      serviceRadiusKm: 15,
      availabilityStatus: "AVAILABLE",
    },
  });

  const photoUrl = watch("profilePhotoUrl");

  // Load current profile data to pre-fill the form
  useEffect(() => {
    fetch("/api/workers/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfileData(data);
        if (data.workerProfile) {
          reset({
            profilePhotoUrl: data.profilePhotoUrl ?? "",
            locationDescription: data.locationDescription ?? "",
            tradeCategories: data.workerProfile.tradeCategories ?? [],
            yearsExperience: data.workerProfile.yearsExperience ?? 0,
            bio: data.workerProfile.bio ?? "",
            serviceRadiusKm: data.workerProfile.serviceRadiusKm ?? 15,
            availabilityStatus: data.workerProfile.availabilityStatus ?? "AVAILABLE",
          });
        }
      })
      .finally(() => setLoadingProfile(false));
  }, [reset]);

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/workers/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      showToast({ type: "error", message: json.error ?? "Failed to save" });
      return;
    }
    showToast({ type: "success", message: "Profile saved!" });
  }

  if (loadingProfile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  const verLevel = (profileData?.workerProfile?.verificationLevel ?? "BASIC") as "BASIC" | "CERTIFIED_PRO" | "TOP_RATED";
  const verConfig = VERIFICATION_LEVELS[verLevel];

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <h1 className="text-white text-xl font-bold">My Profile</h1>
          <p className="text-blue-200 text-sm">{session?.user?.phone}</p>
        </div>

        {/* Section tabs */}
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-0">
          {(["profile", "verification", "account"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSection(tab)}
              className={[
                "flex-1 py-2 text-sm font-medium rounded-t-xl capitalize",
                activeSection === tab
                  ? "bg-white text-primary"
                  : "text-white/80 hover:text-white",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5">

        {/* ── PROFILE SECTION ────────────────────────────────────── */}
        {activeSection === "profile" && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

            {/* Photo preview + URL input */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-2xl">
                    {session?.user?.name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  label="Profile photo URL"
                  placeholder="https://example.com/photo.jpg"
                  error={errors.profilePhotoUrl?.message}
                  helper="Paste an image URL (Cloudinary upload coming soon)"
                  {...register("profilePhotoUrl")}
                />
              </div>
            </div>

            {/* Availability status */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary">
                Availability
              </label>
              <div className="flex flex-col gap-2">
                {AVAILABILITY_OPTIONS.map(({ value, label, dot }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-primary/30"
                  >
                    <input
                      type="radio"
                      value={value}
                      className="accent-primary"
                      {...register("availabilityStatus")}
                    />
                    <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Trade categories */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-primary">
                My trades{" "}
                <span className="text-text-secondary font-normal">
                  (select all that apply)
                </span>
              </label>
              {errors.tradeCategories && (
                <p className="text-sm text-error">{errors.tradeCategories.message}</p>
              )}
              <Controller
                name="tradeCategories"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {TRADE_CATEGORIES.map(({ value, label, emoji }) => {
                      const isChecked = field.value.includes(value);
                      return (
                        <label
                          key={value}
                          className={[
                            "flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all",
                            isChecked
                              ? "border-primary bg-surface"
                              : "border-gray-200 hover:border-gray-300",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...field.value, value]);
                              } else {
                                field.onChange(field.value.filter((v: string) => v !== value));
                              }
                            }}
                            className="accent-primary"
                          />
                          <span aria-hidden="true">{emoji}</span>
                          <span className="text-sm text-text-primary">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Years experience */}
            <Input
              label="Years of experience"
              type="number"
              min={0}
              max={60}
              error={errors.yearsExperience?.message}
              {...register("yearsExperience", { valueAsNumber: true })}
            />

            {/* Service radius */}
            <Input
              label="Service radius (km)"
              type="number"
              min={1}
              max={200}
              helper="How far are you willing to travel for jobs?"
              error={errors.serviceRadiusKm?.message}
              {...register("serviceRadiusKm", { valueAsNumber: true })}
            />

            {/* Location */}
            <Input
              label="Location / area"
              placeholder="e.g. East Legon, Accra"
              helper="Where you're based (clients see this)"
              error={errors.locationDescription?.message}
              {...register("locationDescription")}
            />

            {/* Bio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Bio</label>
              <textarea
                rows={4}
                placeholder="Describe your experience, specialties, and why clients should hire you…"
                className={[
                  "w-full px-4 py-3 text-sm text-text-primary bg-white",
                  "border border-gray-300 rounded-xl resize-none",
                  "focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none",
                  errors.bio ? "border-error" : "",
                ].join(" ")}
                {...register("bio")}
              />
              {errors.bio && (
                <p className="text-sm text-error">{errors.bio.message}</p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              disabled={!isDirty}
            >
              Save Profile
            </Button>
          </form>
        )}

        {/* ── VERIFICATION SECTION ────────────────────────────────── */}
        {activeSection === "verification" && (
          <div className="flex flex-col gap-4">
            {/* Current level */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-text-primary">Current level</h2>
                <VerificationBadge level={verLevel} size="md" />
              </div>
              <p className="text-sm text-text-secondary">{verConfig.description}</p>
            </div>

            {/* What's next */}
            {verLevel !== "TOP_RATED" && (
              <div className="card border-warning/30 bg-yellow-50/50">
                <h3 className="font-semibold text-text-primary text-sm mb-1">
                  To level up:
                </h3>
                <p className="text-sm text-text-secondary">{verConfig.next}</p>
              </div>
            )}

            {/* ID / certificate upload stubs */}
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Documents</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Ghana Card</p>
                    <p className="text-xs text-text-secondary">Required for Basic verification</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                    Coming soon
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Trade Certificate</p>
                    <p className="text-xs text-text-secondary">NVTI / COTVET — for Certified Pro</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded-full">
                    Coming soon
                  </span>
                </div>
              </div>
              <p className="text-xs text-text-secondary mt-3">
                Document upload (Cloudinary) will be enabled in Phase X. Your admin
                can manually update your verification level in the meantime.
              </p>
            </div>
          </div>
        )}

        {/* ── ACCOUNT SECTION ─────────────────────────────────────── */}
        {activeSection === "account" && (
          <div className="flex flex-col gap-4">
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Account info</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Name</span>
                  <span className="font-medium text-text-primary">{session?.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Phone</span>
                  <span className="font-medium text-text-primary">{session?.user?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Role</span>
                  <span className="font-medium text-text-primary">Worker</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              fullWidth
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
