// components/VerificationBadge.tsx
// Displays the colored badge that shows a worker's verification tier.
// Used on worker cards, profiles, and the worker's own settings page.

import { VERIFICATION_LEVELS } from "@/lib/constants";

type Level = "BASIC" | "CERTIFIED_PRO" | "TOP_RATED";

const STYLES: Record<Level, string> = {
  BASIC: "bg-blue-50 text-primary border-blue-100",
  CERTIFIED_PRO: "bg-indigo-50 text-indigo-700 border-indigo-100",
  TOP_RATED: "bg-yellow-50 text-warning border-yellow-100",
};

interface Props {
  level: Level;
  size?: "sm" | "md";
}

export function VerificationBadge({ level, size = "sm" }: Props) {
  const config = VERIFICATION_LEVELS[level];
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 border rounded-full font-medium",
        textSize,
        size === "sm" ? "px-2 py-0.5" : "px-3 py-1",
        STYLES[level],
      ].join(" ")}
    >
      {config.badge}
    </span>
  );
}
