// app/api/admin/stats/route.ts
// GET /api/admin/stats → Platform-wide summary for the admin dashboard.
// Returns user counts, job counts by status, revenue, and disputed jobs.
// ADMIN only.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    totalClients,
    totalWorkers,
    jobsByStatus,
    completedBookings,
    disputedBookings,
    recentJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "WORKER" } }),
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.findMany({
      where: { job: { status: "COMPLETED" } },
      select: { commissionAmount: true },
    }),
    prisma.booking.count({ where: { escrowStatus: "DISPUTED" } }),
    prisma.job.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    }),
  ]);

  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.commissionAmount, 0);

  const jobCounts = Object.fromEntries(
    jobsByStatus.map((g) => [g.status, g._count._all])
  );

  return NextResponse.json({
    users: { clients: totalClients, workers: totalWorkers },
    jobs: jobCounts,
    totalRevenue,
    disputedBookings,
    recentJobs,
  });
}
