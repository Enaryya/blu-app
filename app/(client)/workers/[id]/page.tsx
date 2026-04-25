// app/(client)/workers/[id]/page.tsx
// URL: /workers/:id
// A worker's full public profile — shown to clients browsing for help.
// Shows: photo, name, badge, stats, bio, portfolio gallery, reviews.
// "Request Quote" button is a stub that links to Phase 3's quote flow.

import { notFound } from "next/navigation";
import Link from "next/link";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RatingStars } from "@/components/RatingStars";
import { TRADE_CATEGORIES, VERIFICATION_LEVELS } from "@/lib/constants";

// Fetch the worker data on the server (faster first load, good for SEO)
async function getWorker(id: string) {
  // In production this would use the absolute URL; for now build a relative one
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/workers/${id}`, {
    cache: "no-store", // Always fresh — ratings change frequently
  });
  if (!res.ok) return null;
  return res.json();
}

interface WorkerPageProps {
  params: { id: string };
}

export default async function WorkerDetailPage({ params }: WorkerPageProps) {
  const worker = await getWorker(params.id);
  if (!worker) notFound();

  const profile = worker.workerProfile;
  const verLevel = (profile?.verificationLevel ?? "BASIC") as keyof typeof VERIFICATION_LEVELS;
  const verConfig = VERIFICATION_LEVELS[verLevel];

  const tradeLabels = (profile?.tradeCategories ?? []).map(
    (slug: string) =>
      TRADE_CATEGORIES.find((t) => t.value === slug) ?? { label: slug, emoji: "🔧" }
  );

  const memberSince = new Date(worker.createdAt).toLocaleDateString("en-GH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* ── Back button + header ────────────────────────────────── */}
      <div className="bg-primary pt-safe">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-5">
          <Link
            href="/workers"
            className="inline-flex items-center gap-1 text-blue-200 text-sm mb-4 hover:text-white"
          >
            ← Back to workers
          </Link>

          {/* Profile hero */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {worker.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={worker.profilePhotoUrl}
                alt={worker.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-3xl">
                  {worker.name[0].toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-bold">{worker.name}</h1>
              {worker.locationDescription && (
                <p className="text-blue-200 text-sm mt-0.5">
                  📍 {worker.locationDescription}
                </p>
              )}
              <div className="mt-2">
                <VerificationBadge
                  level={profile?.verificationLevel ?? "BASIC"}
                  size="md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* ── Stats row ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 -mt-3 mb-5">
          <div className="card text-center">
            <p className="text-xl font-bold text-text-primary">
              {profile?.averageRating > 0
                ? profile.averageRating.toFixed(1)
                : "—"}
            </p>
            <p className="text-xs text-warning">★ Rating</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-bold text-text-primary">
              {profile?.totalCompletedJobs ?? 0}
            </p>
            <p className="text-xs text-text-secondary">Jobs done</p>
          </div>
          <div className="card text-center">
            <p className="text-xl font-bold text-text-primary">
              {profile?.yearsExperience ?? 0}
            </p>
            <p className="text-xs text-text-secondary">Yrs exp</p>
          </div>
        </div>

        {/* ── Trades ────────────────────────────────────────────── */}
        <div className="mb-5">
          <h2 className="font-semibold text-text-primary mb-2">Trades</h2>
          <div className="flex flex-wrap gap-2">
            {tradeLabels.map(
              (t: { value?: string; label: string; emoji: string }) => (
                <span
                  key={t.label}
                  className="flex items-center gap-1.5 bg-surface text-primary px-3 py-1.5 rounded-full text-sm"
                >
                  <span aria-hidden="true">{t.emoji}</span>
                  {t.label}
                </span>
              )
            )}
          </div>
        </div>

        {/* ── Bio ───────────────────────────────────────────────── */}
        {profile?.bio && (
          <div className="mb-5">
            <h2 className="font-semibold text-text-primary mb-2">About</h2>
            <p className="text-text-secondary text-sm leading-relaxed">
              {profile.bio}
            </p>
          </div>
        )}

        {/* ── Verification info ─────────────────────────────────── */}
        <div className="card mb-5 bg-surface border-accent/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🛡️</span>
            <div>
              <p className="font-semibold text-text-primary text-sm">
                {verConfig.label}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {verConfig.description}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* ── Portfolio ─────────────────────────────────────────── */}
        {worker.portfolioItems?.length > 0 && (
          <section className="mb-5">
            <h2 className="font-semibold text-text-primary mb-3">
              Portfolio ({worker.portfolioItems.length})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {worker.portfolioItems.map(
                (item: {
                  id: string;
                  title: string;
                  category: string;
                  afterPhotos: string[];
                  beforePhotos: string[];
                  description?: string;
                }) => {
                  const thumb = item.afterPhotos[0] ?? item.beforePhotos[0];
                  return (
                    <div key={item.id} className="rounded-2xl overflow-hidden border border-gray-100">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item.title}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-32 bg-surface flex items-center justify-center">
                          <span className="text-3xl" aria-hidden="true">🖼️</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-text-primary truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-text-secondary">{item.category}</p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* ── Reviews ───────────────────────────────────────────── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text-primary">
              Reviews ({worker.reviewsReceived?.length ?? 0})
            </h2>
            {profile?.averageRating > 0 && (
              <RatingStars rating={profile.averageRating} size="md" />
            )}
          </div>

          {worker.reviewsReceived?.length === 0 ? (
            <div className="bg-surface rounded-2xl p-5 text-center">
              <p className="text-text-secondary text-sm">No reviews yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {worker.reviewsReceived.map(
                (review: {
                  id: string;
                  rating: number;
                  comment?: string;
                  createdAt: string;
                  reviewer: { name: string };
                }) => (
                  <div key={review.id} className="card">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm text-text-primary">
                        {review.reviewer.name}
                      </p>
                      <RatingStars rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm text-text-secondary">
                        {review.comment}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString("en-GH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Sticky bottom CTA ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 pb-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <div className="flex-1">
            <p className="text-xs text-text-secondary">Starting from</p>
            <p className="font-bold text-text-primary">Request a quote</p>
          </div>
          {/* Links to Phase 3's quote flow */}
          <Link
            href={`/post-job?worker=${params.id}`}
            className="bg-primary text-white font-semibold px-6 py-3 rounded-xl text-base min-h-[48px] flex items-center"
          >
            Request Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
