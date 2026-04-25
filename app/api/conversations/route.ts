// app/api/conversations/route.ts
// GET  /api/conversations → List all conversations the logged-in user is part of.
// POST /api/conversations → Create a new conversation (or return existing one).
//
// Conversations are automatically created when a booking is accepted.
// Both clients and workers can access their own conversations.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { participantIds: { has: session.user.id } },
    include: {
      job: { select: { id: true, title: true, category: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { lastMessageAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  // For each conversation, look up the other participant's profile
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const otherId = conv.participantIds.find((id) => id !== session.user.id);
      const otherUser = otherId
        ? await prisma.user.findUnique({
            where: { id: otherId },
            select: { id: true, name: true, profilePhotoUrl: true, role: true },
          })
        : null;

      // Count unread messages (messages not from me that I haven't read)
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: session.user.id },
          isRead: false,
        },
      });

      return { ...conv, otherUser, unreadCount };
    })
  );

  return NextResponse.json({ conversations: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, otherUserId } = await req.json();

  // Return existing conversation if one already exists for this job+pair
  const existing = await prisma.conversation.findFirst({
    where: {
      jobId,
      participantIds: { hasEvery: [session.user.id, otherUserId] },
    },
  });
  if (existing) return NextResponse.json({ conversation: existing });

  const conversation = await prisma.conversation.create({
    data: {
      jobId,
      participantIds: [session.user.id, otherUserId],
    },
  });

  return NextResponse.json({ conversation }, { status: 201 });
}
