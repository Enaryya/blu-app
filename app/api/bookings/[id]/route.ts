// app/api/bookings/[id]/route.ts
// GET /api/bookings/:id → Booking details used by the payment page.
// Only the client who owns the booking can fetch it.

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
