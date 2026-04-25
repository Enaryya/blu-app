// app/messages/layout.tsx
// Shared layout for the /messages and /messages/:id pages.
// Both clients and workers use these routes, so this is outside the
// (client) and (worker) route groups. The BottomNav handles showing
// the correct tabs based on the user's role automatically.

import { BottomNav } from "@/components/BottomNav";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
