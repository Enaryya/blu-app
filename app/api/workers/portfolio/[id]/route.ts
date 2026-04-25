// app/api/workers/portfolio/[id]/route.ts
// DELETE /api/workers/portfolio/:id → remove a portfolio item
// We check ownership so workers can only delete their own items.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "WORKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the item first and verify ownership
  const item = await prisma.portfolioItem.findUnique({
    where: { id: params.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Prevent workers from deleting other workers' portfolio items
  if (item.workerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.portfolioItem.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
