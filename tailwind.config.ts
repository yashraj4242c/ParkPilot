import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // High-tech slate / obsidian background palette
        canvas: {
          DEFAULT: "#0B0F17",
          subtle: "#111827",
          panel: "#161F30",
          card: "#1A2438",
        },
        surface: {
          DEFAULT: "#131C2E",
          hover: "#1A2740",
          border: "#23334F",
          muted: "#1E2B45",
        },
        // Precision telemetry accent: Electric Teal / Cyan & Emerald signal
        accent: {
          DEFAULT: "#0EA5E9", // Sky / Electric blue
          glow: "#38BDF8",
          hover: "#0284C7",
          soft: "rgba(14, 165, 233, 0.12)",
          teal: "#14B8A6",
          emerald: "#10B981",
        },
        // Monospace & high-contrast UI ink
        ink: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
          subtle: "#64748B",
          faint: "#475569",
          inverted: "#0B0F17",
        },
        line: {
          subtle: "#1E293B",
          DEFAULT: "#26354D",
          strong: "#3B4E6B",
          glow: "rgba(14, 165, 233, 0.3)",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        hud: "0 0 20px -5px rgba(14, 165, 233, 0.15), 0 1px 2px rgba(0, 0, 0, 0.4)",
        terminal: "0 8px 32px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(38, 53, 77, 0.6)",
        card: "0 4px 20px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        glow: "0 0 16px rgba(14, 165, 233, 0.25)",
      },
      backgroundImage: {
        "grid-pattern": "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
        "radar-radial": "radial-gradient(circle at 50% 0%, rgba(14, 165, 233, 0.15) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
