// app/api/users/me/route.ts
// GET   /api/users/me → Full profile of the logged-in user.
// PATCH /api/users/me → Update name, profile photo URL, or location.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
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

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  profilePhotoUrl: z.string().url().optional().or(z.literal("")),
  locationDescription: z.string().max(200).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, profilePhotoUrl, locationDescription } = parsed.data;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(profilePhotoUrl !== undefined ? { profilePhotoUrl: profilePhotoUrl || null } : {}),
      ...(locationDescription !== undefined ? { locationDescription } : {}),
    },
  });

  return NextResponse.json(updated);
}
