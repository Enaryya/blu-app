// app/api/bookings/route.ts
// GET /api/bookings → Returns all bookings for the logged-in client.
// Used by the payment history tab in /settings.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    where: { clientId: session.user.id },
    include: {
      job: { select: { id: true, title: true, category: true, status: true } },
      worker: { select: { id: true, name: true, profilePhotoUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings });
}
