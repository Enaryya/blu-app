// app/api/workers/[id]/route.ts
// GET /api/workers/:id
// Returns a worker's full public profile including portfolio and recent reviews.
// Shown on the worker detail page that clients browse.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const worker = await prisma.user.findUnique({
    where: { id: params.id, role: "WORKER", isActive: true },
    select: {
      id: true,
      name: true,
      profilePhotoUrl: true,
      locationLat: true,
      locationLng: true,
      locationDescription: true,
      createdAt: true,
      workerProfile: true, // Full profile including verification level
      portfolioItems: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          rating: true,
          comment: true,
          photos: true,
          createdAt: true,
          reviewer: {
            select: { id: true, name: true, profilePhotoUrl: true },
          },
        },
      },
    },
  });

  if (!worker) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  return NextResponse.json(worker);
}
