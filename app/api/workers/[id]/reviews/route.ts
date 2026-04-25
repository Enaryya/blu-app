// app/api/workers/[id]/reviews/route.ts
// GET /api/workers/:id/reviews?page=1
// Returns paginated reviews for a worker. Separate endpoint so the
// detail page can load reviews lazily after the main profile loads.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const page = Math.max(1, parseInt(new URL(req.url).searchParams.get("page") ?? "1"));
  const limit = 10;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { reviewedUserId: params.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
    }),
    prisma.review.count({ where: { reviewedUserId: params.id } }),
  ]);

  return NextResponse.json({ reviews, total, page, limit });
}
