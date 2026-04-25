// app/api/quotes/[id]/route.ts
// PATCH /api/quotes/:id  → Change the status of a quote.
//
// Actions:
//   "accept"   (CLIENT only) → Accepts this quote. Creates a Booking.
//                              Rejects all other quotes for the same job.
//                              Payment is STUBBED — Phase 4 adds real Paystack payment.
//   "reject"   (CLIENT only) → Rejects this specific quote.
//   "withdraw" (WORKER only) → Worker takes back their own quote before it's accepted.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMMISSION_RATE } from "@/lib/constants";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { job: true },
  });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const body = await req.json();
  const { action } = body as { action: string };

  // ── CLIENT actions ────────────────────────────────────────────────────────
  if (session.user.role === "CLIENT") {
    // Make sure this client owns the job that the quote is for
    if (quote.job.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (quote.status !== "PENDING") {
      return NextResponse.json(
        { error: "This quote is no longer pending" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      await prisma.quote.update({
        where: { id: params.id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "accept") {
      const commissionAmount = quote.amount * COMMISSION_RATE;

      // Everything must succeed together — if one step fails, nothing is saved
      await prisma.$transaction(async (tx) => {
        // 1. Mark this quote as ACCEPTED
        await tx.quote.update({
          where: { id: params.id },
          data: { status: "ACCEPTED" },
        });

        // 2. Reject all other PENDING quotes for the same job
        await tx.quote.updateMany({
          where: {
            jobId: quote.jobId,
            id: { not: params.id },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });

        // 3. Create a Booking record (payment stub — Phase 4 wires Paystack here)
        await tx.booking.create({
          data: {
            jobId: quote.jobId,
            quoteId: params.id,
            clientId: session.user.id,
            workerId: quote.workerId,
            totalAmount: quote.amount,
            commissionAmount,
            escrowStatus: "HELD",
          },
        });

        // 4. Mark the job as BOOKED and assign the worker
        await tx.job.update({
          where: { id: quote.jobId },
          data: {
            status: "BOOKED",
            assignedWorkerId: quote.workerId,
          },
        });

        // 5. Create a conversation for client + worker to chat about this job
        //    (only if one doesn't already exist for this job)
        const existing = await tx.conversation.findFirst({
          where: { jobId: quote.jobId },
        });
        if (!existing) {
          await tx.conversation.create({
            data: {
              jobId: quote.jobId,
              participantIds: [session.user.id, quote.workerId],
            },
          });
        }
      });

      return NextResponse.json({ success: true });
    }
  }

  // ── WORKER: withdraw their own quote ─────────────────────────────────────
  if (action === "withdraw" && session.user.role === "WORKER") {
    if (quote.workerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (quote.status !== "PENDING") {
      return NextResponse.json(
        { error: "You can only withdraw a pending quote" },
        { status: 400 }
      );
    }
    await prisma.quote.update({
      where: { id: params.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
