// app/api/quotes/route.ts
// POST /api/quotes  → Worker submits a price quote for an open job.
//
// What happens when a quote is submitted:
//   1. A Quote record is created (expires in 48 hours if client doesn't respond)
//   2. If the worker chose MILESTONE payment, Milestone records are also created
//   3. The job's status changes from POSTED → QUOTING (so others know quotes arrived)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { QUOTE_EXPIRY_HOURS } from "@/lib/constants";

const milestoneSchema = z.object({
  title: z.string().min(2, "Each milestone needs a title").max(100),
  description: z.string().max(500).optional(),
  amount: z.number().min(1, "Each milestone must have an amount greater than 0"),
  orderIndex: z.number().int().min(1),
});

const quoteSchema = z.object({
  jobId: z.string().min(1, "Job ID required"),
  amount: z.number().min(1, "Please enter your quote amount"),
  estimatedDurationDays: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 day")
    .max(365),
  message: z.string().max(1000).optional(),
  paymentStructure: z.enum(["SINGLE", "MILESTONE"]).default("SINGLE"),
  milestones: z.array(milestoneSchema).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Only workers can submit quotes" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = quoteSchema.parse(body);

    // Make sure the job exists and is still open for quotes
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!["POSTED", "QUOTING"].includes(job.status)) {
      return NextResponse.json(
        { error: "This job is no longer accepting quotes" },
        { status: 400 }
      );
    }

    // Check this worker hasn't already quoted on this job
    const existingQuote = await prisma.quote.findFirst({
      where: { jobId: data.jobId, workerId: session.user.id, status: "PENDING" },
    });
    if (existingQuote) {
      return NextResponse.json(
        { error: "You already submitted a quote for this job. Withdraw it first if you want to change it." },
        { status: 409 }
      );
    }

    // For MILESTONE quotes: milestone amounts must sum to the total
    if (data.paymentStructure === "MILESTONE" && data.milestones?.length) {
      const milestoneTotal = data.milestones.reduce((sum, m) => sum + m.amount, 0);
      if (Math.abs(milestoneTotal - data.amount) > 0.01) {
        return NextResponse.json(
          {
            error: `Milestone amounts (GHS ${milestoneTotal.toFixed(2)}) must add up to your total quote (GHS ${data.amount.toFixed(2)})`,
          },
          { status: 400 }
        );
      }
    }

    const expiresAt = new Date(Date.now() + QUOTE_EXPIRY_HOURS * 60 * 60 * 1000);

    // Use a transaction so the quote + milestones + job status update all succeed together
    const quote = await prisma.$transaction(async (tx) => {
      const newQuote = await tx.quote.create({
        data: {
          jobId: data.jobId,
          workerId: session.user.id,
          amount: data.amount,
          estimatedDurationDays: data.estimatedDurationDays,
          message: data.message,
          paymentStructure: data.paymentStructure,
          expiresAt,
          status: "PENDING",
        },
      });

      if (data.milestones?.length) {
        await tx.milestone.createMany({
          data: data.milestones.map((m) => ({
            quoteId: newQuote.id,
            title: m.title,
            description: m.description,
            amount: m.amount,
            orderIndex: m.orderIndex,
          })),
        });
      }

      // Move job from POSTED → QUOTING once the first quote arrives
      if (job.status === "POSTED") {
        await tx.job.update({
          where: { id: data.jobId },
          data: { status: "QUOTING" },
        });
      }

      return newQuote;
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[quotes POST]", error);
    return NextResponse.json({ error: "Failed to submit quote" }, { status: 500 });
  }
}
