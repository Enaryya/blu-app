// app/api/reviews/route.ts
// POST /api/reviews → Client submits a star rating + comment for a worker
// after a job is marked COMPLETED.
//
// Side effects:
//   - Recalculates the worker's averageRating in WorkerProfile
//   - Auto-promotes worker to TOP_RATED if they hit the threshold
//     (CERTIFIED_PRO + 20+ completed jobs + 4.5+ average)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { bookingId, rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { job: { select: { status: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.job.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Job must be completed before leaving a review" },
      { status: 400 }
    );
  }

  // Block duplicate reviews
  const existing = await prisma.review.findFirst({
    where: { bookingId, reviewerId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({ error: "You already reviewed this job" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create the review
    await tx.review.create({
      data: {
        bookingId,
        reviewerId: session.user.id,
        reviewedUserId: booking.workerId,
        rating,
        comment,
        photos: [],
      },
    });

    // 2. Recalculate worker's average rating across all their reviews
    const allReviews = await tx.review.findMany({
      where: { reviewedUserId: booking.workerId },
      select: { rating: true },
    });
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    const totalJobs = allReviews.length;

    // 3. Auto-promote to TOP_RATED if eligible
    const workerProfile = await tx.workerProfile.findUnique({
      where: { userId: booking.workerId },
      select: { verificationLevel: true },
    });
    const shouldPromote =
      workerProfile?.verificationLevel === "CERTIFIED_PRO" &&
      totalJobs >= 20 &&
      avg >= 4.5;

    await tx.workerProfile.update({
      where: { userId: booking.workerId },
      data: {
        averageRating: Math.round(avg * 10) / 10,
        totalCompletedJobs: totalJobs,
        ...(shouldPromote ? { verificationLevel: "TOP_RATED" } : {}),
      },
    });
  });

  return NextResponse.json({ success: true });
}
