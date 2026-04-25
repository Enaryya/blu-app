// components/StatusBadge.tsx
// A small coloured pill that shows a status label.
// Used on job cards, quote cards, and booking summaries.
// Example: status="BOOKED" type="job" → shows a green "Booked" pill.

const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  POSTED:      { label: "Open",        className: "bg-blue-100 text-blue-700" },
  QUOTING:     { label: "Quoting",     className: "bg-purple-100 text-purple-700" },
  BOOKED:      { label: "Booked",      className: "bg-indigo-100 text-indigo-700" },
  IN_PROGRESS: { label: "In Progress", className: "bg-yellow-100 text-yellow-700" },
  COMPLETED:   { label: "Completed",   className: "bg-green-100 text-green-700" },
  DISPUTED:    { label: "Disputed",    className: "bg-red-100 text-red-700" },
  CANCELLED:   { label: "Cancelled",   className: "bg-gray-100 text-gray-500" },
};

const QUOTE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING:  { label: "Pending",  className: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Accepted", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
  EXPIRED:  { label: "Withdrawn", className: "bg-gray-100 text-gray-500" },
};

const URGENCY_CONFIG: Record<string, { label: string; className: string }> = {
  EMERGENCY: { label: "🚨 Emergency", className: "bg-red-100 text-red-700" },
  THIS_WEEK: { label: "📅 This week",  className: "bg-orange-100 text-orange-700" },
  FLEXIBLE:  { label: "🕐 Flexible",   className: "bg-gray-100 text-gray-600" },
};

type BadgeType = "job" | "quote" | "urgency";

interface StatusBadgeProps {
  status: string;
  type?: BadgeType;
  size?: "sm" | "md";
}

export function StatusBadge({ status, type = "job", size = "sm" }: StatusBadgeProps) {
  const map =
    type === "quote" ? QUOTE_STATUS_CONFIG :
    type === "urgency" ? URGENCY_CONFIG :
    JOB_STATUS_CONFIG;

  const { label, className } = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };

  return (
    <span
      className={[
        "inline-flex items-center font-medium rounded-full whitespace-nowrap",
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
