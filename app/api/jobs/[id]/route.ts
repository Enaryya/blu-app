// app/api/jobs/[id]/route.ts
// GET   /api/jobs/:id  → Full job detail
//   - Clients see all quotes submitted for the job
//   - Workers see the job info (to decide whether to quote)
//
// PATCH /api/jobs/:id  → Status updates:
//   - Client: action="cancel"   → cancels job (only if POSTED or QUOTING)
//   - Worker: action="start"    → marks job as IN_PROGRESS (only if BOOKED)
//   - Worker: action="complete" → marks job as COMPLETED (only if IN_PROGRESS)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          profilePhotoUrl: true,
          locationDescription: true,
        },
      },
      quotes: {
        include: {
          worker: {
            select: {
              id: true,
              name: true,
              profilePhotoUrl: true,
              locationDescription: true,
              workerProfile: {
                select: {
                  verificationLevel: true,
                  averageRating: true,
                  totalCompletedJobs: true,
                  yearsExperience: true,
                  tradeCategories: true,
                },
              },
            },
          },
          milestones: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      bookings: {
        include: {
          worker: { select: { id: true, name: true, profilePhotoUrl: true } },
          quote: {
            include: { milestones: { orderBy: { orderIndex: "asc" } } },
          },
          reviews: {
            select: { id: true, reviewerId: true, rating: true, comment: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Clients can only view their own jobs
  if (session.user.role === "CLIENT" && job.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await prisma.job.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body as { action: string };

  // ── CLIENT: cancel their own job ─────────────────────────────────────────
  if (action === "cancel" && session.user.role === "CLIENT") {
    if (job.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["POSTED", "QUOTING"].includes(job.status)) {
      return NextResponse.json(
        { error: "You can only cancel a job that hasn't been booked yet" },
        { status: 400 }
      );
    }
    const updated = await prisma.job.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ job: updated });
  }

  // ── WORKER: mark job as started ──────────────────────────────────────────
  if (action === "start" && session.user.role === "WORKER") {
    if (job.assignedWorkerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.status !== "BOOKED") {
      return NextResponse.json({ error: "Job must be BOOKED to start" }, { status: 400 });
    }
    const updated = await prisma.job.update({
      where: { id: params.id },
      data: { status: "IN_PROGRESS" },
    });
    return NextResponse.json({ job: updated });
  }

  // ── WORKER: mark job as completed ────────────────────────────────────────
  if (action === "complete" && session.user.role === "WORKER") {
    if (job.assignedWorkerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (job.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Job must be IN_PROGRESS to mark as complete" },
        { status: 400 }
      );
    }

    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

    await prisma.$transaction([
      prisma.job.update({
        where: { id: params.id },
        data: { status: "COMPLETED", completedAt: now },
      }),
      // Set the 72-hour auto-release timer on the booking
      prisma.booking.updateMany({
        where: { jobId: params.id },
        data: { autoReleaseAt },
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
