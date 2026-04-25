// components/WorkerCard.tsx
// The card shown in the worker browse list. Tapping it goes to the
// worker's full profile page. Shows name, trades, rating, badge,
// years experience, location, and availability dot.

import Link from "next/link";
import { VerificationBadge } from "@/components/VerificationBadge";
import { RatingStars } from "@/components/RatingStars";
import { TRADE_CATEGORIES } from "@/lib/constants";

// The shape of a worker object returned from GET /api/workers
export interface WorkerSummary {
  id: string;
  name: string;
  profilePhotoUrl: string | null;
  locationDescription: string | null;
  locationLat: number | null;
  locationLng: number | null;
  workerProfile: {
    tradeCategories: string[];
    yearsExperience: number;
    verificationLevel: "BASIC" | "CERTIFIED_PRO" | "TOP_RATED";
    averageRating: number;
    totalCompletedJobs: number;
    availabilityStatus: "AVAILABLE" | "BUSY" | "OFFLINE";
    serviceRadiusKm: number;
  } | null;
}

const AVAILABILITY_DOT: Record<string, string> = {
  AVAILABLE: "bg-success",
  BUSY: "bg-warning",
  OFFLINE: "bg-gray-300",
};

function Avatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="w-14 h-14 rounded-full object-cover shrink-0"
        loading="lazy"
      />
    );
  }
  // Initials avatar when no photo
  return (
    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="text-primary font-bold text-xl">
        {name[0].toUpperCase()}
      </span>
    </div>
  );
}

export function WorkerCard({ worker }: { worker: WorkerSummary }) {
  const profile = worker.workerProfile;
  if (!profile) return null;

  // Turn category slugs ("PLUMBER") into readable labels ("Plumber")
  const tradeLabels = profile.tradeCategories
    .map((slug) => TRADE_CATEGORIES.find((t) => t.value === slug)?.label ?? slug)
    .slice(0, 3); // Show max 3 trades on the card

  return (
    <Link
      href={`/workers/${worker.id}`}
      className="card flex items-start gap-3 hover:border-accent transition-colors active:bg-surface"
    >
      {/* Avatar with availability dot */}
      <div className="relative shrink-0">
        <Avatar name={worker.name} photoUrl={worker.profilePhotoUrl} />
        <span
          className={[
            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
            AVAILABILITY_DOT[profile.availabilityStatus],
          ].join(" ")}
          title={profile.availabilityStatus}
          aria-label={profile.availabilityStatus}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Name + badge row */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-text-primary text-base leading-tight">
            {worker.name}
          </h3>
          <VerificationBadge level={profile.verificationLevel} size="sm" />
        </div>

        {/* Trade pills */}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {tradeLabels.map((label) => (
            <span
              key={label}
              className="text-xs bg-surface text-primary px-2 py-0.5 rounded-full"
            >
              {label}
            </span>
          ))}
          {profile.tradeCategories.length > 3 && (
            <span className="text-xs text-text-secondary">
              +{profile.tradeCategories.length - 3} more
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <RatingStars
            rating={profile.averageRating}
            count={profile.totalCompletedJobs}
          />
          <span className="text-xs text-text-secondary">
            {profile.yearsExperience}yr{profile.yearsExperience !== 1 ? "s" : ""} exp
          </span>
          {worker.locationDescription && (
            <span className="text-xs text-text-secondary truncate">
              📍 {worker.locationDescription}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
