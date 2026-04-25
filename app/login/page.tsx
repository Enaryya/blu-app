// app/login/page.tsx
// The first screen users see. Works in two steps:
//   Step 1 – Enter phone number → tap "Send Code"
//   Step 2 – Enter the 6-digit OTP code → tap "Verify & Continue"
//
// In DEVELOPMENT: always enter 123456 as the code.
// The code is printed in the terminal where you run `npm run dev`.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

// ─── Form schemas ─────────────────────────────────────────────────────────────

const phoneSchema = z.object({
  phoneLocal: z
    .string()
    .regex(/^0[0-9]{9}$/, "Enter a valid 10-digit Ghana phone number (e.g. 0201234567)"),
});

const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^[0-9]+$/, "Code must contain only numbers"),
});

type PhoneForm = z.infer<typeof phoneSchema>;
type OtpForm = z.infer<typeof otpSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Which step of the login flow we're on
  const [step, setStep] = useState<"phone" | "otp">("phone");
  // Stores the full E.164 phone number after step 1
  const [fullPhone, setFullPhone] = useState("");

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
  });

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────

  async function handleSendOtp(data: PhoneForm) {
    // Convert local format "0201234567" → international "+233201234567"
    const phone = "+233" + data.phoneLocal.slice(1);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const json = await res.json();

      if (!res.ok) {
        phoneForm.setError("phoneLocal", { message: json.error });
        return;
      }

      // Move to step 2
      setFullPhone(phone);
      setStep("otp");
      showToast({
        type: "success",
        message:
          process.env.NODE_ENV === "development"
            ? "Dev mode: enter 123456 as your code"
            : "Code sent to your phone",
      });
    } catch {
      showToast({ type: "error", message: "Network error. Check your connection." });
    }
  }

  // ── Step 2: Verify OTP and sign in ────────────────────────────────────────

  async function handleVerifyOtp(data: OtpForm) {
    const result = await signIn("phone-otp", {
      phone: fullPhone,
      code: data.code,
      redirect: false, // We'll redirect manually so we can control where to go
    });

    if (result?.error === "USER_NOT_FOUND") {
      // New user — store their phone so the register page can read it
      sessionStorage.setItem(
        "pendingRegistration",
        JSON.stringify({ phone: fullPhone, code: data.code })
      );
      router.push("/register");
      return;
    }

    if (result?.error === "ACCOUNT_SUSPENDED") {
      showToast({
        type: "error",
        message: "Your account has been suspended. Contact support.",
      });
      return;
    }

    if (!result?.ok || result?.error) {
      otpForm.setError("code", {
        message: "Incorrect code. Please try again.",
      });
      return;
    }

    // Successful login — go to root which redirects based on role
    router.push("/");
    router.refresh(); // Forces the session to update
  }

  // ─── UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-6 pt-12 pb-8">
          {/* Blu Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-xl">B</span>
            </div>
            <span className="text-white font-bold text-2xl">Blu</span>
          </div>

          <h1 className="text-white text-3xl font-bold leading-tight">
            {step === "phone" ? "Welcome back" : "Enter your code"}
          </h1>
          <p className="text-blue-200 mt-2 text-base">
            {step === "phone"
              ? "Enter your Ghana phone number to continue"
              : `We sent a 6-digit code to ${fullPhone}`}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-4 relative z-10">
        <div className="max-w-lg mx-auto px-6 pt-8 pb-12">

          {step === "phone" ? (
            /* ── Phone number form ── */
            <form
              onSubmit={phoneForm.handleSubmit(handleSendOtp)}
              noValidate
              className="flex flex-col gap-6"
            >
              <Input
                label="Phone number"
                type="tel"
                inputMode="numeric"
                placeholder="0201234567"
                leftAddon="+233"
                autoFocus
                error={phoneForm.formState.errors.phoneLocal?.message}
                helper="Enter your 10-digit number starting with 0"
                {...phoneForm.register("phoneLocal")}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={phoneForm.formState.isSubmitting}
              >
                Send Code
              </Button>

              <p className="text-center text-sm text-text-secondary">
                Don&apos;t have an account?{" "}
                <span className="text-primary font-medium">
                  We&apos;ll create one for you automatically.
                </span>
              </p>

              {process.env.NODE_ENV === "development" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                  <strong>Development mode:</strong> Any phone number works.
                  After clicking &quot;Send Code&quot;, enter{" "}
                  <strong>123456</strong> as your code.
                </div>
              )}
            </form>
          ) : (
            /* ── OTP code form ── */
            <form
              onSubmit={otpForm.handleSubmit(handleVerifyOtp)}
              noValidate
              className="flex flex-col gap-6"
            >
              <Input
                label="Verification code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                autoFocus
                autoComplete="one-time-code"
                error={otpForm.formState.errors.code?.message}
                helper="Enter the 6-digit code from the SMS"
                {...otpForm.register("code")}
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={otpForm.formState.isSubmitting}
              >
                Verify &amp; Continue
              </Button>

              {/* Let user go back to change their number */}
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  otpForm.reset();
                }}
                className="text-center text-sm text-text-secondary hover:text-primary"
              >
                ← Change phone number
              </button>

              {process.env.NODE_ENV === "development" && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                  <strong>Development:</strong> Enter <strong>123456</strong>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-lg mx-auto px-6 py-4 text-center">
        <p className="text-xs text-text-secondary">
          By continuing, you agree to Blu&apos;s{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
