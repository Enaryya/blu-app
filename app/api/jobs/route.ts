// app/api/jobs/route.ts
// GET  /api/jobs           → Returns jobs based on who is asking:
//                             CLIENT → their own posted jobs
//                             WORKER (no params) → available jobs to bid on (feed)
//                             WORKER + ?assigned=true → their booked/active jobs
// POST /api/jobs           → Client creates a new job listing

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100),
  description: z
    .string()
    .min(20, "Please describe the job in more detail (at least 20 characters)")
    .max(2000),
  category: z.string().min(1, "Please select a trade category"),
  urgency: z.enum(["EMERGENCY", "THIS_WEEK", "FLEXIBLE"]),
  locationDescription: z.string().min(3, "Please enter your location").max(200),
  locationLat: z.number(),
  locationLng: z.number(),
  budgetMin: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0).optional()
  ),
  budgetMax: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().min(0).optional()
  ),
  photos: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? "";
  const urgency = searchParams.get("urgency") ?? "";
  const status = searchParams.get("status") ?? "";
  const assigned = searchParams.get("assigned") === "true";

  // ── CLIENT: see their own jobs ────────────────────────────────────────────
  if (session.user.role === "CLIENT") {
    const where: Record<string, unknown> = { clientId: session.user.id };
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        _count: { select: { quotes: { where: { status: "PENDING" } } } },
        quotes: {
          where: { status: "ACCEPTED" },
          include: {
            worker: { select: { id: true, name: true, profilePhotoUrl: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ jobs });
  }

  // ── WORKER: their own assigned jobs ──────────────────────────────────────
  if (session.user.role === "WORKER" && assigned) {
    const where: Record<string, unknown> = { assignedWorkerId: session.user.id };
    if (status) where.status = status;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, profilePhotoUrl: true } },
        bookings: {
          include: { quote: { select: { amount: true, paymentStructure: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ jobs });
  }

  // ── WORKER: browse the job feed (open jobs) ───────────────────────────────
  if (session.user.role === "WORKER") {
    const where: Record<string, unknown> = { status: { in: ["POSTED", "QUOTING"] } };
    if (category) where.category = category;
    if (urgency) where.urgency = urgency;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, profilePhotoUrl: true, locationDescription: true },
        },
        _count: { select: { quotes: true } },
        // Show if this worker already submitted a quote (so we can show a "Quoted" badge)
        quotes: {
          where: { workerId: session.user.id },
          select: { id: true, status: true, amount: true },
        },
      },
      orderBy: [
        { urgency: "asc" }, // EMERGENCY declared first in schema → sorts first
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json({ jobs });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can post jobs" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const job = await prisma.job.create({
      data: {
        clientId: session.user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        urgency: data.urgency,
        locationDescription: data.locationDescription,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        photos: data.photos ?? [],
        status: "POSTED",
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("[jobs POST]", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
