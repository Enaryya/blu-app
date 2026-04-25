// app/messages/[id]/page.tsx
// URL: /messages/:conversationId
// The chat screen — shows the full conversation between a client and worker.
// Messages from me appear on the right (blue), theirs on the left (gray).
// Polls for new messages every 3 seconds so it stays up to date.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender: {
    id: string;
    name: string;
    profilePhotoUrl?: string;
  };
}

interface ConversationInfo {
  id: string;
  jobId: string;
  job: { id: string; title: string };
  participantIds: string[];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (!res.ok) { router.push("/messages"); return; }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setConversation(data.conversation ?? null);
    } catch {
      if (!silent) router.push("/messages");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, router]);

  // Initial load
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Poll every 3 seconds for new messages
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText("");

    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Send on Enter (not Shift+Enter which adds a new line)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  // Find the other person (not the logged-in user)
  const myId = session?.user?.id;

  // Format time for message timestamps
  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-primary pt-safe shrink-0">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-3 flex items-center gap-3">
          <Link
            href="/messages"
            className="text-blue-200 hover:text-white p-1 -ml-1"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="flex-1 min-w-0">
            {conversation && (
              <>
                <p className="text-white font-semibold text-sm truncate">
                  {conversation.job.title}
                </p>
                <Link
                  href={`/jobs/${conversation.jobId}`}
                  className="text-blue-200 text-xs hover:text-white"
                >
                  View job →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages scroll area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-lg w-full mx-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-2" aria-hidden="true">👋</p>
            <p className="text-text-secondary text-sm">
              No messages yet. Say hello!
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.sender.id === myId;
          const showDate =
            idx === 0 ||
            new Date(msg.createdAt).toDateString() !==
              new Date(messages[idx - 1].createdAt).toDateString();

          return (
            <div key={msg.id}>
              {/* Date divider */}
              {showDate && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <p className="text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleDateString("en-GH", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              {/* Message bubble */}
              <div className={["flex gap-2", isMe ? "flex-row-reverse" : "flex-row"].join(" ")}>
                {/* Avatar (only shown for other person) */}
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0 self-end">
                    {msg.sender.profilePhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={msg.sender.profilePhotoUrl}
                        alt={msg.sender.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-primary font-bold text-xs">
                        {msg.sender.name[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <div className={["max-w-[75%]", isMe ? "items-end" : "items-start"].join(" ")}>
                  <div
                    className={[
                      "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                      isMe
                        ? "bg-primary text-white rounded-tr-sm"
                        : "bg-gray-100 text-text-primary rounded-tl-sm",
                    ].join(" ")}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-1">
                    {formatTime(msg.createdAt)}
                    {isMe && (
                      <span className="ml-1">{msg.isRead ? "✓✓" : "✓"}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Invisible div we scroll to */}
        <div ref={bottomRef} />
      </div>

      {/* Message input */}
      <div className="shrink-0 border-t border-gray-100 bg-white pb-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 resize-none px-4 py-2.5 text-sm text-text-primary bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32 leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            aria-label="Send"
          >
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
