// app/api/disputes/route.ts
// POST /api/disputes → Client raises a dispute on a completed job.
// This freezes the escrow (prevents auto-release) and flags the job for admin review.
// Admin resolves disputes from the admin panel — either releasing to the worker
// or refunding to the client.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().min(10, "Please describe the issue (at least 10 characters)").max(1000),
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

  const { bookingId, reason } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { job: { select: { id: true, status: true } } },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (booking.job.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "You can only dispute a completed job" },
      { status: 400 }
    );
  }
  if (booking.clientConfirmed) {
    return NextResponse.json(
      { error: "You already confirmed this job — it cannot be disputed" },
      { status: 400 }
    );
  }
  if (booking.escrowStatus === "DISPUTED") {
    return NextResponse.json({ error: "Dispute already raised" }, { status: 400 });
  }

  // Mark job and booking as disputed
  await prisma.$transaction([
    prisma.job.update({
      where: { id: booking.job.id },
      data: { status: "DISPUTED" },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        escrowStatus: "DISPUTED",
        // Store the dispute reason in a note field (we'll use the existing schema)
        // Since there's no DisputeReason field, we store in autoReleaseAt = null
        // to cancel the auto-release timer
        autoReleaseAt: null,
      },
    }),
  ]);

  // In production: send notification to admin + worker here (Twilio / email)
  console.log(`[DISPUTE] Booking ${bookingId} disputed by ${session.user.id}: ${reason}`);

  return NextResponse.json({ success: true });
}
