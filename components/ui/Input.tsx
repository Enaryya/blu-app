// components/ui/Input.tsx
// A reusable text input that shows labels, error messages, and optional
// helper text. Used across every form in the app.

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftAddon?: string; // e.g. "+233" prefix for phone number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, leftAddon, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftAddon && (
            // Phone prefix box shown to the left of the input
            <div className="flex items-center px-3 h-12 bg-gray-50 border border-r-0 border-gray-300 rounded-l-xl text-text-secondary text-sm font-medium shrink-0">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full h-12 px-4 text-base text-text-primary bg-white",
              "border border-gray-300 transition-colors duration-150",
              "placeholder:text-gray-400",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              // When showing an error, turn the border red
              error
                ? "border-error focus:border-error focus:ring-error/20"
                : "",
              leftAddon ? "rounded-r-xl" : "rounded-xl",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>

        {/* Error message — shown in red below the input */}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-error">
            {error}
          </p>
        )}

        {/* Helper text — shown in grey below the input (not shown if error present) */}
        {helper && !error && (
          <p className="text-sm text-text-secondary">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
