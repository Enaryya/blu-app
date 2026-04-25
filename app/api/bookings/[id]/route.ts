// app/api/bookings/[id]/route.ts
// GET  /api/bookings/:id → Booking details for the payment page (client only).
// PATCH /api/bookings/:id → Client confirms the job is done.
//   action="confirm" → sets clientConfirmed=true, escrowStatus=RELEASED

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

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { id: true, title: true, category: true } },
      worker: { select: { id: true, name: true, profilePhotoUrl: true } },
      client: { select: { id: true, name: true } },
      quote: {
        select: { paymentStructure: true, estimatedDurationDays: true },
      },
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(booking);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { job: { select: { status: true } } },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = (await req.json()) as { action: string };

  if (action === "confirm") {
    if (booking.job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Job must be COMPLETED before you can confirm" },
        { status: 400 }
      );
    }
    if (booking.clientConfirmed) {
      return NextResponse.json({ error: "Already confirmed" }, { status: 400 });
    }

    await prisma.booking.update({
      where: { id: params.id },
      data: { clientConfirmed: true, escrowStatus: "RELEASED" },
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
