// app/api/admin/jobs/route.ts
// GET   /api/admin/jobs → All jobs with optional status filter. ADMIN only.
// PATCH /api/admin/jobs → Resolve a disputed booking.
//   action="release" → pays worker (escrowStatus=RELEASED)
//   action="refund"  → refunds client (escrowStatus=REFUNDED)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phoneNumber: true } },
        bookings: {
          select: {
            id: true,
            totalAmount: true,
            commissionAmount: true,
            escrowStatus: true,
            clientConfirmed: true,
            paymentReference: true,
            worker: { select: { id: true, name: true, phoneNumber: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ jobs, total, page, pages: Math.ceil(total / limit) });
}

const resolveSchema = z.object({
  bookingId: z.string().uuid(),
  action: z.enum(["release", "refund"]),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { bookingId, action } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { escrowStatus: true, jobId: true },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.escrowStatus !== "DISPUTED") {
    return NextResponse.json({ error: "Booking is not disputed" }, { status: 400 });
  }

  const newEscrow = action === "release" ? "RELEASED" : "REFUNDED";
  const newJobStatus = action === "release" ? "COMPLETED" : "CANCELLED";

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { escrowStatus: newEscrow },
    }),
    prisma.job.update({
      where: { id: booking.jobId },
      data: { status: newJobStatus },
    }),
  ]);

  return NextResponse.json({ success: true });
}
