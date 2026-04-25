// app/messages/page.tsx
// URL: /messages
// The inbox — shows all conversations for the logged-in user.
// Works for both clients and workers (same page, both roles have access).
// Tapping a conversation opens the chat view at /messages/:id.

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TRADE_CATEGORIES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationSummary {
  id: string;
  jobId: string;
  lastMessageAt: string | null;
  createdAt: string;
  job: { id: string; title: string; category: string };
  messages: {
    content: string;
    sender: { id: string; name: string };
    createdAt: string;
  }[];
  otherUser: {
    id: string;
    name: string;
    profilePhotoUrl?: string;
    role: string;
  } | null;
  unreadCount: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col divide-y divide-gray-100">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 px-4 py-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Conversation row ─────────────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: ConversationSummary }) {
  const other = conv.otherUser;
  const lastMsg = conv.messages[0];
  const cat = TRADE_CATEGORIES.find((t) => t.value === conv.job.category);

  const timeStr = lastMsg?.createdAt
    ? new Date(lastMsg.createdAt).toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
      })
    : "";

  return (
    <Link href={`/messages/${conv.id}`}>
      <div className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
            {other?.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.profilePhotoUrl}
                alt={other.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary font-bold text-lg">
                {other?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          {conv.unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-xs rounded-full flex items-center justify-center font-bold">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={["text-sm truncate", conv.unreadCount > 0 ? "font-bold text-text-primary" : "font-medium text-text-primary"].join(" ")}>
              {other?.name ?? "Unknown"}
            </p>
            <p className="text-xs text-gray-400 shrink-0">{timeStr}</p>
          </div>
          <p className="text-xs text-text-secondary truncate mt-0.5">
            {cat?.emoji} {conv.job.title}
          </p>
          {lastMsg && (
            <p className={["text-xs truncate mt-0.5", conv.unreadCount > 0 ? "font-medium text-text-primary" : "text-text-secondary"].join(" ")}>
              {lastMsg.content}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => setConversations(data.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-primary pt-safe sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 pt-5 pb-4">
          <h1 className="text-white text-xl font-bold">Messages</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto pb-28">
        {loading ? (
          <Skeleton />
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-5xl mb-3" aria-hidden="true">💬</p>
            <p className="font-semibold text-text-primary">No messages yet</p>
            <p className="text-sm text-text-secondary mt-1">
              Conversations with clients or workers appear here once a job is booked.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
