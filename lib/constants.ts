// lib/constants.ts
// Shared lookup tables used across API routes, forms, and pages.
// Define once here so they never get out of sync.

export const TRADE_CATEGORIES = [
  { value: "PLUMBER", label: "Plumber", emoji: "🔧" },
  { value: "ELECTRICIAN", label: "Electrician", emoji: "⚡" },
  { value: "MASON", label: "Mason", emoji: "🧱" },
  { value: "PAINTER", label: "Painter", emoji: "🖌️" },
  { value: "CARPENTER", label: "Carpenter", emoji: "🪵" },
  { value: "TILER", label: "Tiler", emoji: "⬜" },
  { value: "ROOFER", label: "Roofer", emoji: "🏠" },
  { value: "WELDER", label: "Welder", emoji: "🔩" },
] as const;

export type TradeValue = (typeof TRADE_CATEGORIES)[number]["value"];

export const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Available for new jobs", dot: "bg-success" },
  { value: "BUSY", label: "Currently busy", dot: "bg-warning" },
  { value: "OFFLINE", label: "Not taking jobs", dot: "bg-gray-400" },
] as const;

export const VERIFICATION_LEVELS = {
  BASIC: {
    label: "Verified Worker",
    badge: "✓ Verified",
    description: "Phone verified + Ghana Card uploaded",
    next: "Upload a trade certificate to become Certified Pro",
  },
  CERTIFIED_PRO: {
    label: "Certified Pro",
    badge: "🏅 Certified Pro",
    description: "Trade certificate verified by Blu admin",
    next: "Complete 20 jobs with 4.5+ rating to become Top Rated",
  },
  TOP_RATED: {
    label: "Blu Top Rated",
    badge: "⭐ Blu Top Rated",
    description: "Top 20 completed jobs with 4.5+ average rating",
    next: "You've reached the highest level!",
  },
} as const;

// Blu's commission rate — enforced in every payment calculation
export const COMMISSION_RATE = 0.1; // 10%

// Maximum upfront deposit % — only for TOP_RATED workers
export const MAX_UPFRONT_PERCENTAGE = 30;

// Hours before auto-releasing escrow after worker marks job complete
export const AUTO_RELEASE_HOURS = 72;

// Hours before an unresponded quote expires
export const QUOTE_EXPIRY_HOURS = 48;
