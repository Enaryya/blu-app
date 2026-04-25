// app/api/earnings/route.ts
// GET /api/earnings → Worker earnings summary.
// Returns total earned, pending amount, job counts, and booking history.
// Only accessible to workers.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { workerId: session.user.id },
    include: {
      job: {
        select: { id: true, title: true, category: true, status: true, completedAt: true },
      },
      client: { select: { id: true, name: true, profilePhotoUrl: true } },
      quote: { select: { paymentStructure: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Money already in pocket = completed jobs that have been paid
  const completedBookings = bookings.filter((b) => b.job.status === "COMPLETED");
  const totalEarned = completedBookings.reduce(
    (sum, b) => sum + (b.totalAmount - b.commissionAmount),
    0
  );

  // Money on its way = booked or in-progress jobs
  const activeBookings = bookings.filter((b) =>
    ["BOOKED", "IN_PROGRESS"].includes(b.job.status)
  );
  const pendingAmount = activeBookings.reduce(
    (sum, b) => sum + (b.totalAmount - b.commissionAmount),
    0
  );

  return NextResponse.json({
    totalEarned,
    pendingAmount,
    completedJobs: completedBookings.length,
    activeJobs: activeBookings.length,
    bookings,
  });
}
