import type { Config } from "tailwindcss";

// Blu brand color system
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A56DB",
        secondary: "#3B82F6",
        accent: "#93C5FD",
        surface: "#F0F5FF",
        "text-primary": "#1E293B",
        "text-secondary": "#64748B",
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      // Minimum touch target size for mobile
      minHeight: {
        touch: "48px",
      },
      minWidth: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};
export default config;
