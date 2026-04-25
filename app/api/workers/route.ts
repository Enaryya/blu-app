// app/api/workers/route.ts
// GET /api/workers?category=PLUMBER&query=kwame&page=1
// Returns a paginated list of workers, filterable by trade category and name.
// Used by the client's Browse Workers page.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category"); // e.g. "PLUMBER"
  const query = searchParams.get("query");       // name search
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  // Build the filter dynamically — only add conditions when parameters are provided
  const where: Prisma.UserWhereInput = {
    role: "WORKER",
    isActive: true,
  };

  if (query) {
    where.name = { contains: query, mode: "insensitive" };
  }

  if (category) {
    where.workerProfile = { tradeCategories: { has: category } };
  }

  const [workers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        profilePhotoUrl: true,
        locationLat: true,
        locationLng: true,
        locationDescription: true,
        workerProfile: {
          select: {
            tradeCategories: true,
            yearsExperience: true,
            bio: true,
            verificationLevel: true,
            averageRating: true,
            totalCompletedJobs: true,
            availabilityStatus: true,
            serviceRadiusKm: true,
          },
        },
      },
      // Show top-rated first, then by rating
      orderBy: [
        { workerProfile: { verificationLevel: "desc" } },
        { workerProfile: { averageRating: "desc" } },
        { workerProfile: { totalCompletedJobs: "desc" } },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ workers, total, page, limit });
}
