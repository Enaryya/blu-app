// app/api/admin/users/route.ts
// GET   /api/admin/users → Paginated user list with optional role filter.
// PATCH /api/admin/users → Update a worker's verification level.
//   Body: { userId, verificationLevel }
// ADMIN only.

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
  const role = searchParams.get("role") ?? undefined;
  const query = searchParams.get("q") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (role && ["CLIENT", "WORKER", "ADMIN"].includes(role)) {
    where.role = role;
  }
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { phoneNumber: { contains: query } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        workerProfile: {
          select: {
            verificationLevel: true,
            averageRating: true,
            totalCompletedJobs: true,
            availabilityStatus: true,
            tradeCategories: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

const patchSchema = z.object({
  userId: z.string().uuid(),
  verificationLevel: z.enum(["BASIC", "CERTIFIED_PRO", "TOP_RATED"]),
});

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { userId, verificationLevel } = parsed.data;

  const profile = await prisma.workerProfile.update({
    where: { userId },
    data: { verificationLevel },
  });

  return NextResponse.json(profile);
}
