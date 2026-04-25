// app/admin/users/page.tsx
// URL: /admin/users
// Lists all platform users. Admin can filter by role, search by name/phone,
// and promote workers to CERTIFIED_PRO or TOP_RATED.

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useToast } from "@/components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
  profilePhotoUrl?: string;
  workerProfile?: {
    verificationLevel: "BASIC" | "CERTIFIED_PRO" | "TOP_RATED";
    averageRating: number;
    totalCompletedJobs: number;
    tradeCategories: string[];
  } | null;
}

const VERIFICATION_OPTIONS = [
  { value: "BASIC", label: "Basic" },
  { value: "CERTIFIED_PRO", label: "Certified Pro" },
  { value: "TOP_RATED", label: "Top Rated" },
] as const;

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onVerificationChange,
}: {
  user: AdminUser;
  onVerificationChange: (userId: string, level: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);

  async function handleVerification(level: string) {
    setUpdating(true);
    await onVerificationChange(user.id, level);
    setUpdating(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary">
          {user.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.profilePhotoUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            user.name[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-900">{user.name}</p>
            <span className={["text-xs px-2 py-0.5 rounded-full font-medium", user.role === "CLIENT" ? "bg-blue-100 text-blue-700" : user.role === "WORKER" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"].join(" ")}>
              {user.role}
            </span>
            {user.workerProfile && (
              <VerificationBadge level={user.workerProfile.verificationLevel} size="sm" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{user.phoneNumber}</p>
          {user.workerProfile && (
            <p className="text-xs text-gray-400 mt-0.5">
              ★ {user.workerProfile.averageRating.toFixed(1)} · {user.workerProfile.totalCompletedJobs} jobs
            </p>
          )}
        </div>

        <p className="text-xs text-gray-400 shrink-0">
          {new Date(user.createdAt).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
        </p>
      </div>

      {/* Verification level control (workers only) */}
      {user.workerProfile && (
        <div className="mt-3 flex gap-1.5">
          {VERIFICATION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              disabled={updating || user.workerProfile?.verificationLevel === value}
              onClick={() => handleVerification(value)}
              className={[
                "flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors",
                user.workerProfile?.verificationLevel === value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [query, setQuery] = useState("");

  const fetchUsers = useCallback(async (role: string, q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (q) params.set("q", q);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(roleFilter, query); }, [roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  let searchTimer: ReturnType<typeof setTimeout>;
  function handleSearch(val: string) {
    setQuery(val);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchUsers(roleFilter, val), 400);
  }

  async function handleVerificationChange(userId: string, level: string) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, verificationLevel: level }),
    });
    if (res.ok) {
      showToast({ type: "success", message: `Verification updated to ${level}` });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId && u.workerProfile
            ? { ...u, workerProfile: { ...u.workerProfile, verificationLevel: level as "BASIC" | "CERTIFIED_PRO" | "TOP_RATED" } }
            : u
        )
      );
    } else {
      showToast({ type: "error", message: "Failed to update verification" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 pt-8 pb-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
          ← Dashboard
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Users</h1>
        <p className="text-sm text-gray-500">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          type="search"
          placeholder="Search name or phone…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All roles</option>
          <option value="CLIENT">Clients</option>
          <option value="WORKER">Workers</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No users found</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <UserRow key={u.id} user={u} onVerificationChange={handleVerificationChange} />
          ))}
        </div>
      )}
    </div>
  );
}
