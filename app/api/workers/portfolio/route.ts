// app/api/workers/portfolio/route.ts
// GET  /api/workers/portfolio → list own portfolio items
// POST /api/workers/portfolio → add a new portfolio item

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  category: z.string().min(1, "Category is required"),
  description: z.string().max(500).optional(),
  // URLs of before/after photos (Cloudinary URLs in production)
  beforePhotos: z.array(z.string()).max(5),
  afterPhotos: z.array(z.string()).min(1, "Add at least one after photo").max(5),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.portfolioItem.findMany({
    where: { workerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const item = await prisma.portfolioItem.create({
      data: {
        workerId: session.user.id,
        title: data.title,
        category: data.category,
        description: data.description,
        beforePhotos: data.beforePhotos,
        afterPhotos: data.afterPhotos,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to add portfolio item" }, { status: 500 });
  }
}
