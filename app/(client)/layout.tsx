// app/(client)/layout.tsx
// Wraps every CLIENT page with the bottom navigation bar.
// The (client) folder name is a "route group" — the parentheses mean it
// doesn't add "/client" to the URL. So (client)/home/page.tsx → /home.

import { BottomNav } from "@/components/BottomNav";

export default function ClientLayout({
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
