// app/register/page.tsx
// Shown when a new user has verified their phone but hasn't created an
// account yet. They enter their name and choose whether they're a CLIENT
// (wants work done) or WORKER (does the work).

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

// ─── Form schema ──────────────────────────────────────────────────────────────

const schema = z.object({
  name: z
    .string()
    .min(2, "Please enter your full name (at least 2 characters)")
    .max(100),
  role: z.enum(["CLIENT", "WORKER"], {
    message: "Please choose one",
  }),
});

type FormData = z.infer<typeof schema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // The phone number + OTP code we stored in sessionStorage on the login page
  const [pendingPhone, setPendingPhone] = useState("");
  const [pendingCode, setPendingCode] = useState("");

  // Read the pending registration data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingRegistration");
    if (!raw) {
      // If there's no pending data, the user navigated here directly — go back
      router.replace("/login");
      return;
    }
    const { phone, code } = JSON.parse(raw) as { phone: string; code: string };
    setPendingPhone(phone);
    setPendingCode(code);
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedRole = watch("role");

  async function onSubmit(data: FormData) {
    try {
      // Step 1: Create the user account in the database
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: pendingPhone,
          name: data.name.trim(),
          role: data.role,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        showToast({ type: "error", message: json.error });
        return;
      }

      // Step 2: Sign in automatically (OTP already verified in login step)
      const result = await signIn("phone-otp", {
        phone: pendingPhone,
        code: pendingCode,
        redirect: false,
      });

      if (!result?.ok) {
        // Fallback: send the user back to login if sign-in fails
        showToast({
          type: "error",
          message: "Account created! Please log in to continue.",
        });
        sessionStorage.removeItem("pendingRegistration");
        router.push("/login");
        return;
      }

      // Clean up and redirect to the app
      sessionStorage.removeItem("pendingRegistration");
      showToast({ type: "success", message: `Welcome to Blu, ${data.name}!` });
      router.push("/");
      router.refresh();
    } catch {
      showToast({ type: "error", message: "Something went wrong. Please try again." });
    }
  }

  // Show nothing while we're reading sessionStorage (avoids flash)
  if (!pendingPhone) return null;

  // ─── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-6 pt-12 pb-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-xl">B</span>
            </div>
            <span className="text-white font-bold text-2xl">Blu</span>
          </div>

          <h1 className="text-white text-3xl font-bold">Create your account</h1>
          <p className="text-blue-200 mt-2">
            Phone verified: {pendingPhone}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10">
        <div className="max-w-lg mx-auto px-6 pt-8 pb-12">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            {/* Name */}
            <Input
              label="Your full name"
              type="text"
              placeholder="e.g. Kwame Mensah"
              autoFocus
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />

            {/* Role selection */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-text-primary">
                I am joining as a…
              </p>
              {errors.role && (
                <p className="text-sm text-error">{errors.role.message}</p>
              )}

              {/* CLIENT card */}
              <label
                className={[
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedRole === "CLIENT"
                    ? "border-primary bg-surface"
                    : "border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                <input
                  type="radio"
                  value="CLIENT"
                  className="mt-1 accent-primary"
                  {...register("role")}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🏠</span>
                    <span className="font-semibold text-text-primary">
                      I need work done
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    Post jobs, hire verified tradespeople, pay safely via escrow.
                  </p>
                </div>
              </label>

              {/* WORKER card */}
              <label
                className={[
                  "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedRole === "WORKER"
                    ? "border-primary bg-surface"
                    : "border-gray-200 hover:border-gray-300",
                ].join(" ")}
              >
                <input
                  type="radio"
                  value="WORKER"
                  className="mt-1 accent-primary"
                  {...register("role")}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">🔧</span>
                    <span className="font-semibold text-text-primary">
                      I&apos;m a tradesperson
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    Find jobs near you, get paid safely, build your verified
                    profile.
                  </p>
                </div>
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              disabled={!selectedRole}
            >
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
