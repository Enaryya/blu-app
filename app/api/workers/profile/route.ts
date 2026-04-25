// app/api/workers/profile/route.ts
// GET  /api/workers/profile  → returns the logged-in worker's own profile
// PATCH /api/workers/profile → updates the logged-in worker's own profile
// Only accessible to users with the WORKER role.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for the profile update form
const updateSchema = z.object({
  // User-level fields
  profilePhotoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  locationDescription: z.string().max(200).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),

  // WorkerProfile fields
  tradeCategories: z
    .array(z.string())
    .min(1, "Select at least one trade category"),
  yearsExperience: z
    .number({ message: "Enter a number" })
    .int()
    .min(0)
    .max(60),
  bio: z.string().max(1000, "Bio must be under 1000 characters").optional(),
  serviceRadiusKm: z.number().int().min(1).max(200),
  availabilityStatus: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]),
});

// GET — return own profile (used to pre-fill the settings form)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { workerProfile: true },
  });

  return NextResponse.json(user);
}

// PATCH — save profile changes
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Update both User and WorkerProfile in a single database transaction
    // (either both succeed or both fail — no partial updates)
    const [user, workerProfile] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          profilePhotoUrl: data.profilePhotoUrl || null,
          locationDescription: data.locationDescription,
          locationLat: data.locationLat,
          locationLng: data.locationLng,
        },
      }),
      prisma.workerProfile.update({
        where: { userId: session.user.id },
        data: {
          tradeCategories: data.tradeCategories,
          yearsExperience: data.yearsExperience,
          bio: data.bio,
          serviceRadiusKm: data.serviceRadiusKm,
          availabilityStatus: data.availabilityStatus,
        },
      }),
    ]);

    return NextResponse.json({ user, workerProfile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("[workers/profile PATCH]", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
