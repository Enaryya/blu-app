// app/api/paystack/initialize/route.ts
// POST /api/paystack/initialize
// Starts the payment process for a booking.
//
// Dev mode (no PAYSTACK_SECRET_KEY set): returns { dev: true } — no real charge.
// Production: calls Paystack, returns { authorization_url } to redirect the client.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// If the secret key is missing or still the placeholder, we're in dev mode
const isDev =
  !process.env.PAYSTACK_SECRET_KEY ||
  process.env.PAYSTACK_SECRET_KEY.startsWith("your-");

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = await req.json();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      job: { select: { title: true } },
      client: { select: { id: true, name: true, email: true } },
    },
  });

  if (!booking || booking.clientId !== session.user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.paymentReference) {
    return NextResponse.json({ error: "This booking is already paid" }, { status: 400 });
  }

  // ── Dev mode: skip Paystack, let the payment page simulate ───────────────
  if (isDev) {
    return NextResponse.json({ dev: true, bookingId });
  }

  // ── Production: initialize real Paystack transaction ─────────────────────
  const reference = `blu_${bookingId}_${Date.now()}`;
  const amountInPesewas = Math.round(booking.totalAmount * 100); // GHS → pesewas

  // Use real email if available, or build a placeholder (Paystack requires email)
  const email =
    booking.client.email ??
    `${booking.client.name.toLowerCase().replace(/\s+/g, ".")}@blu.gh`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInPesewas,
      currency: "GHS",
      reference,
      metadata: { bookingId, jobTitle: booking.job.title },
      callback_url: `${process.env.NEXTAUTH_URL}/payment/${bookingId}?ref=${reference}`,
    }),
  });

  const result = await paystackRes.json();
  if (!result.status) {
    console.error("[paystack/initialize]", result);
    return NextResponse.json({ error: "Payment initialization failed" }, { status: 500 });
  }

  return NextResponse.json({
    authorization_url: result.data.authorization_url,
    reference: result.data.reference,
  });
}
