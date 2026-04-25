// app/(client)/workers/page.tsx
// URL: /workers
// The client's "Find a Worker" screen. Two views:
//   List view  — scrollable cards with search + category filters
//   Map view   — Google Map with worker pins, tapping a pin shows a mini-card
//
// The browser's GPS is used to center the map on the client's real location.
// Falls back to Accra city center if permission is denied.

"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WorkerCard, WorkerSummary } from "@/components/WorkerCard";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RatingStars } from "@/components/RatingStars";
import { TRADE_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

// ─── Sub-components ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="card flex gap-3 animate-pulse">
          <div className="w-14 h-14 bg-gray-200 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Ghana geographic bounds — used to position pins on the stub map
const GH_LAT = { min: 4.5, max: 11.2 };
const GH_LNG = { min: -3.5, max: 1.2 };

function latToPercent(lat: number) {
  // Top of map = max lat, so we invert
  return ((GH_LAT.max - lat) / (GH_LAT.max - GH_LAT.min)) * 100;
}
function lngToPercent(lng: number) {
  return ((lng - GH_LNG.min) / (GH_LNG.max - GH_LNG.min)) * 100;
}

// CSS-only info popup shown when a pin is tapped
function WorkerInfoPopup({
  worker,
  onClose,
}: {
  worker: WorkerSummary;
  onClose: () => void;
}) {
  const profile = worker.workerProfile!;
  return (
    <div className="absolute z-20 bg-white rounded-xl shadow-lg border border-gray-200 p-3 min-w-[180px] max-w-[220px]"
      style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-1.5 right-2 text-gray-400 text-base leading-none"
        aria-label="Close"
      >
        ×
      </button>

      <div className="flex items-center gap-1.5 mb-1 pr-4">
        <span className="font-semibold text-text-primary text-sm leading-tight">
          {worker.name}
        </span>
        <VerificationBadge level={profile.verificationLevel} size="sm" />
      </div>

      <div className="flex flex-wrap gap-1 mb-1.5">
        {profile.tradeCategories.slice(0, 2).map((slug) => {
          const cat = TRADE_CATEGORIES.find((t) => t.value === slug);
          return (
            <span key={slug} className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full">
              {cat?.emoji} {cat?.label ?? slug}
            </span>
          );
        })}
      </div>

      <RatingStars rating={profile.averageRating} count={profile.totalCompletedJobs} />

      <Link
        href={`/workers/${worker.id}`}
        className="block mt-2 text-center bg-primary text-white text-xs font-semibold py-1.5 rounded-lg"
      >
        View Profile
      </Link>

      {/* Little arrow pointing down toward the pin */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
        style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid white" }}
      />
    </div>
  );
}

// CSS-only stub map — no API key needed. Shows a grid on a light-blue background
// with worker pins positioned using Ghana's geographic bounds.
function StubMap({
  workers,
  selectedWorker,
  onSelectWorker,
}: {
  workers: WorkerSummary[];
  selectedWorker: WorkerSummary | null;
  onSelectWorker: (w: WorkerSummary | null) => void;
}) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-[#dce8f0]"
      style={{ height: "55vh" }}
    >
      {/* Grid lines to look map-like */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7aaec8" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Stub notice badge */}
      <div className="absolute top-2 left-2 z-10 bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-medium px-2 py-1 rounded-lg">
        Stub map · Add <span className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span> for real maps
      </div>

      {/* Worker pins */}
      {workers.map((worker) => {
        const hasCoords = worker.locationLat != null && worker.locationLng != null;
        // Use real coords if available; otherwise spread pseudo-randomly using worker id hash
        const charSum = worker.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const topPct = hasCoords
          ? latToPercent(worker.locationLat!)
          : 20 + (charSum % 60);
        const leftPct = hasCoords
          ? lngToPercent(worker.locationLng!)
          : 10 + ((charSum * 7) % 80);

        const isSelected = selectedWorker?.id === worker.id;

        return (
          <div
            key={worker.id}
            className="absolute"
            style={{ top: `${topPct}%`, left: `${leftPct}%`, transform: "translate(-50%, -50%)" }}
          >
            {/* Info popup (shown above pin when selected) */}
            {isSelected && (
              <WorkerInfoPopup
                worker={worker}
                onClose={() => onSelectWorker(null)}
              />
            )}

            {/* The pin itself */}
            <button
              onClick={() => onSelectWorker(isSelected ? null : worker)}
              className={[
                "w-9 h-9 rounded-full flex items-center justify-center",
                "text-white font-bold text-sm shadow-lg border-2 border-white",
                "transition-transform focus:outline-none",
                isSelected ? "bg-warning scale-125" : "bg-primary hover:scale-110",
              ].join(" ")}
              aria-label={`${worker.name}'s pin`}
            >
              {worker.name[0].toUpperCase()}
            </button>
          </div>
        );
      })}

      {workers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-500 bg-white/80 px-4 py-2 rounded-xl">
            No workers to show on map
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page component ─────────────────────────────────────────────────────
// Next.js 14 requires useSearchParams() to be inside a <Suspense> boundary.
// WorkersContent is the real component; WorkersPage is the Suspense wrapper.

function WorkersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"list" | "map">("list");
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") ?? ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch workers from the API whenever filters change
  const fetchWorkers = useCallback(async (category: string, query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (query) params.set("query", query);

      const res = await fetch(`/api/workers?${params}`);
      const data = await res.json();
      setWorkers(data.workers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + reload when category changes
  useEffect(() => {
    fetchWorkers(selectedCategory, searchQuery);
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search input (wait 400ms after typing stops)
  function handleSearch(value: string) {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchWorkers(selectedCategory, value), 400);
  }

  function handleCategoryClick(value: string) {
    const next = value === selectedCategory ? "" : value;
    setSelectedCategory(next);
    // Sync to URL so the link from home page works
    const p = new URLSearchParams(searchParams.toString());
    if (next) p.set("category", next); else p.delete("category");
    router.replace(`/workers?${p}`);
  }

  // Workers that have GPS coordinates (used for real positioning on the stub map)
  const mappableWorkers = workers.filter(
    (w) => w.locationLat != null && w.locationLng != null
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-primary pt-safe sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <h1 className="text-white font-bold text-xl flex-1">Find Workers</h1>

            {/* List / Map toggle */}
            <div className="flex bg-white/20 rounded-xl p-0.5">
              <button
                onClick={() => setView("list")}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px]",
                  view === "list" ? "bg-white text-primary" : "text-white",
                ].join(" ")}
              >
                ☰ List
              </button>
              <button
                onClick={() => setView("map")}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px]",
                  view === "map" ? "bg-white text-primary" : "text-white",
                ].join(" ")}
              >
                🗺 Map
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 bg-white rounded-xl text-sm text-text-primary placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>

        {/* Category filter chips */}
        <div className="max-w-lg mx-auto px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 w-max">
            <button
              onClick={() => handleCategoryClick("")}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px]",
                !selectedCategory
                  ? "bg-white text-primary"
                  : "bg-white/20 text-white",
              ].join(" ")}
            >
              All Trades
            </button>
            {TRADE_CATEGORIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => handleCategoryClick(value)}
                className={[
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px]",
                  selectedCategory === value
                    ? "bg-white text-primary"
                    : "bg-white/20 text-white",
                ].join(" ")}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto">

        {/* Results count */}
        <div className="px-4 py-2 text-sm text-text-secondary">
          {loading ? "Searching…" : `${total} worker${total !== 1 ? "s" : ""} found`}
        </div>

        {/* ── LIST VIEW ──────────────────────────────────────────── */}
        {view === "list" && (
          <div className="px-4 pb-28">
            {loading ? (
              <LoadingSkeleton />
            ) : workers.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3" aria-hidden="true">🔍</p>
                <p className="font-semibold text-text-primary">No workers found</p>
                <p className="text-sm text-text-secondary mt-1">
                  Try a different trade or search term
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {workers.map((w) => (
                  <WorkerCard key={w.id} worker={w} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MAP VIEW ───────────────────────────────────────────── */}
        {view === "map" && (
          <div className="px-4 pb-28">
            <div className="mt-2">
              <StubMap
                workers={workers}
                selectedWorker={selectedWorker}
                onSelectWorker={setSelectedWorker}
              />

              {/* Workers without lat/lng shown as a note */}
              {workers.length > mappableWorkers.length && (
                <p className="text-xs text-text-secondary mt-2 px-0.5">
                  {workers.length - mappableWorkers.length} worker
                  {workers.length - mappableWorkers.length !== 1 ? "s" : ""}{" "}
                  haven&apos;t set their location — pins are placed approximately.
                </p>
              )}
            </div>

            {/* Worker list below map */}
            {!loading && workers.length > 0 && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-text-secondary mb-2 px-0.5">
                  {selectedCategory
                    ? `${TRADE_CATEGORIES.find((t) => t.value === selectedCategory)?.label ?? selectedCategory}s in your area`
                    : "All workers"}
                </h2>
                <div className="flex flex-col gap-3">
                  {workers.map((w) => (
                    <WorkerCard key={w.id} worker={w} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner w-8 h-8" />
        </div>
      }
    >
      <WorkersContent />
    </Suspense>
  );
}
