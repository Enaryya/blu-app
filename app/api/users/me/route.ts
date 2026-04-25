// app/api/users/me/route.ts
// Returns the currently logged-in user's full profile from the database.
// Useful when you need more detail than what's stored in the session token
// (e.g., worker profile, location, profile photo URL).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // getServerSession reads the JWT cookie and returns the decoded session
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      workerProfile: true, // Include the worker profile if it exists
    },
    // Don't return any sensitive fields (we have none, but good practice)
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
