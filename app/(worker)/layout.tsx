// app/(worker)/layout.tsx
// Wraps every WORKER page with the bottom navigation bar.
// Same pattern as the client layout — route group keeps URLs clean.

import { BottomNav } from "@/components/BottomNav";

export default function WorkerLayout({
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
