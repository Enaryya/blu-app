// app/page.tsx
// The root "/" route. It reads the session and silently redirects the user
// to the correct home screen based on their role.
// No visible UI — just a router.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Not logged in → send to login screen
    redirect("/login");
  }

  // Logged in → route by role
  switch (session.user.role) {
    case "WORKER":
      redirect("/dashboard");
    case "ADMIN":
      redirect("/admin/dashboard");
    default:
      redirect("/home");
  }
}
