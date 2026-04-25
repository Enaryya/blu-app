// app/api/conversations/[id]/messages/route.ts
// GET  /api/conversations/:id/messages → Fetch all messages in a conversation.
//                                        Also marks unread messages as read.
// POST /api/conversations/:id/messages → Send a new message.
//
// Only participants of the conversation can access it.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      job: { select: { id: true, title: true } },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!conversation.participantIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    include: {
      sender: { select: { id: true, name: true, profilePhotoUrl: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Mark all incoming messages as read
  await prisma.message.updateMany({
    where: {
      conversationId: params.id,
      senderId: { not: session.user.id },
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ messages, conversation });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!conversation.participantIds.includes(session.user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: params.id,
        senderId: session.user.id,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, profilePhotoUrl: true } },
      },
    }),
    prisma.conversation.update({
      where: { id: params.id },
      data: { lastMessageAt: now },
    }),
  ]);

  return NextResponse.json({ message }, { status: 201 });
}
