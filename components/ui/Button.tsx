// components/ui/Button.tsx
// A reusable button that handles: loading spinners, disabled states,
// and all the visual variants (primary blue, outline, ghost, danger).
// Every button in the app imports this instead of using raw <button>.

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300",
  secondary:
    "bg-secondary text-white hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-200",
  outline:
    "bg-white border-2 border-primary text-primary hover:bg-surface active:bg-blue-100 disabled:opacity-50",
  ghost:
    "bg-transparent text-primary hover:bg-surface active:bg-blue-100 disabled:opacity-50",
  danger:
    "bg-error text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-300",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-2 text-sm min-h-[40px]",
  md: "px-5 py-3 text-base min-h-[48px]",
  lg: "px-6 py-4 text-lg min-h-[56px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2",
          "rounded-xl font-semibold",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading && (
          // Loading spinner — appears inside the button while async work runs
          <span className="spinner w-4 h-4 shrink-0" aria-hidden="true" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
