// app/(client)/settings/page.tsx
// URL: /settings
// Client's profile and account settings screen.

"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { TRADE_CATEGORIES } from "@/lib/constants";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  profilePhotoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  locationDescription: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

interface PaymentBooking {
  id: string;
  totalAmount: number;
  paymentReference: string | null;
  createdAt: string;
  job: { id: string; title: string; category: string; status: string };
  worker: { id: string; name: string };
}

export default function ClientSettingsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<"profile" | "account">("profile");
  const [paymentHistory, setPaymentHistory] = useState<PaymentBooking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: session?.user?.name ?? "",
      profilePhotoUrl: session?.user?.profilePhotoUrl ?? "",
      locationDescription: "",
    },
  });

  const photoUrl = watch("profilePhotoUrl");

  // Load current profile to pre-fill form
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        reset({
          name: data.name ?? "",
          profilePhotoUrl: data.profilePhotoUrl ?? "",
          locationDescription: data.locationDescription ?? "",
        });
      })
      .catch(() => {});
  }, [reset]);

  // Load payment history when account tab is active
  useEffect(() => {
    if (activeSection !== "account") return;
    setLoadingHistory(true);
    fetch("/api/bookings")
      .then((r) => r.json())
      .then((data) => setPaymentHistory(data.bookings ?? []))
      .catch(() => setPaymentHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [activeSection]);

  async function onSubmit(data: FormData) {
    const res = await fetch("/api/users/me", {
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

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <h1 className="text-white text-xl font-bold">Settings</h1>
          <p className="text-blue-200 text-sm">{session?.user?.phone}</p>
        </div>
        <div className="max-w-lg mx-auto px-4 flex gap-1 pb-0">
          {(["profile", "account"] as const).map((tab) => (
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
        {activeSection === "profile" && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
            {/* Avatar */}
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
                  helper="Cloudinary upload coming soon"
                  {...register("profilePhotoUrl")}
                />
              </div>
            </div>

            <Input
              label="Full name"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Your area / location"
              placeholder="e.g. Spintex, Accra"
              helper="Helps workers know where you're based"
              error={errors.locationDescription?.message}
              {...register("locationDescription")}
            />

            <Button type="submit" fullWidth size="lg" loading={isSubmitting} disabled={!isDirty}>
              Save Changes
            </Button>
          </form>
        )}

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
                  <span className="font-medium text-text-primary">Client</span>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="card">
              <h3 className="font-semibold text-text-primary mb-3">Payment history</h3>
              {loadingHistory ? (
                <div className="flex justify-center py-6">
                  <div className="spinner w-6 h-6" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2" aria-hidden="true">💳</p>
                  <p className="text-sm text-text-secondary">No payments yet</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100">
                  {paymentHistory.map((b) => {
                    const cat = TRADE_CATEGORIES.find((t) => t.value === b.job.category);
                    return (
                      <Link key={b.id} href={`/jobs/${b.job.id}`}>
                        <div className="flex items-center justify-between py-3 hover:opacity-70 transition-opacity">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {cat?.emoji} {b.job.title}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              {b.worker.name} ·{" "}
                              {new Date(b.createdAt).toLocaleDateString("en-GH", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-bold text-text-primary">
                              GHS {b.totalAmount.toLocaleString()}
                            </p>
                            <p className={["text-xs", b.paymentReference ? "text-green-600" : "text-yellow-600"].join(" ")}>
                              {b.paymentReference ? "Paid" : "Pending"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
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
