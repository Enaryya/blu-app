// app/api/paystack/verify/route.ts
// POST /api/paystack/verify
// Confirms a payment and marks the booking as paid.
//
// Dev mode: accepts any bookingId and immediately confirms (simulated).
// Production: checks the reference with Paystack before confirming.
//
// On success:
//   - Sets booking.paymentReference
//   - Creates a Transaction record (the official payment receipt)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const isDev =
  !process.env.PAYSTACK_SECRET_KEY ||
  process.env.PAYSTACK_SECRET_KEY.startsWith("your-");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId, reference } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true } },
      worker: { select: { id: true } },
    },
  });

  if (!booking || booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Already paid — idempotent, just return success
  if (booking.paymentReference) {
    return NextResponse.json({ success: true });
  }

  let confirmedReference: string;

  if (isDev) {
    // Dev: generate a fake reference, no Paystack call needed
    confirmedReference = `dev_${Date.now()}`;
  } else {
    // Production: verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data?.status !== "success") {
      return NextResponse.json({ error: "Payment not confirmed by Paystack" }, { status: 400 });
    }
    confirmedReference = verifyData.data.reference;
  }

  // Record the payment atomically
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { paymentReference: confirmedReference },
    }),
    prisma.transaction.create({
      data: {
        bookingId,
        amount: booking.totalAmount,
        commissionAmount: booking.commissionAmount,
        paymentMethod: "MOMO_MTN", // default; Phase 5 lets user choose
        paystackReference: confirmedReference,
        status: "COMPLETED",
        payerId: booking.clientId,
        payeeId: booking.workerId,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
