// components/Providers.tsx
// Wraps the entire app in all the React context providers it needs.
// Currently: NextAuth SessionProvider + our custom ToastProvider.

"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
