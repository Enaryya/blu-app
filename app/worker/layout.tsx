// app/worker/layout.tsx
// Layout for /worker/* routes (e.g. /worker/settings, /worker/jobs).
// These are worker-only routes that need a prefix to avoid URL conflicts
// with the equivalent client routes (/settings, /jobs).

import { BottomNav } from "@/components/BottomNav";

export default function WorkerSubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main>{children}</main>
      <BottomNav />
    </>
  );
}
