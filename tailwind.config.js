/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // ── M3 Design System Tokens (Editorial Financial Intelligence) ──────────
      colors: {
        // Surfaces
        "background":               "#08080f",
        "surface":                  "#13131a",
        "surface-dim":              "#13131a",
        "surface-bright":           "#393841",
        "surface-variant":          "#34343c",
        "surface-container-lowest": "#0e0d15",
        "surface-container-low":    "#1b1b23",
        "surface-container":        "#1f1f27",
        "surface-container-high":   "#2a2931",
        "surface-container-highest":"#34343c",
        "surface-tint":             "#c3c0ff",

        // On-surface
        "on-surface":         "#e4e1ec",
        "on-surface-variant": "#c7c4d8",
        "on-background":      "#e4e1ec",
        "inverse-surface":    "#e4e1ec",
        "inverse-on-surface": "#303038",

        // Primary
        "primary":               "#c3c0ff",
        "primary-container":     "#4f46e5",
        "primary-fixed":         "#e2dfff",
        "primary-fixed-dim":     "#c3c0ff",
        "on-primary":            "#1d00a5",
        "on-primary-container":  "#dad7ff",
        "on-primary-fixed":      "#0f0069",
        "on-primary-fixed-variant": "#3323cc",
        "inverse-primary":       "#4d44e3",

        // Secondary
        "secondary":                 "#d0bcff",
        "secondary-container":       "#571bc1",
        "secondary-fixed":           "#e9ddff",
        "secondary-fixed-dim":       "#d0bcff",
        "on-secondary":              "#3c0091",
        "on-secondary-container":    "#c4abff",
        "on-secondary-fixed":        "#23005c",
        "on-secondary-fixed-variant":"#5516be",

        // Tertiary (cyan)
        "tertiary":                  "#4cd7f6",
        "tertiary-container":        "#006a7c",
        "tertiary-fixed":            "#acedff",
        "tertiary-fixed-dim":        "#4cd7f6",
        "on-tertiary":               "#003640",
        "on-tertiary-container":     "#93e8ff",
        "on-tertiary-fixed":         "#001f26",
        "on-tertiary-fixed-variant": "#004e5c",

        // Error
        "error":             "#ffb4ab",
        "error-container":   "#93000a",
        "on-error":          "#690005",
        "on-error-container":"#ffdad6",

        // Outline
        "outline":         "#918fa1",
        "outline-variant": "#464555",

        // ── Legacy tokens (páginas aún no migradas) ─────────────────────────
        dark: {
          50:  "#f0f0f5",
          100: "#e0e0eb",
          200: "#c2c2d6",
          300: "#9999b3",
          400: "#6b6b8a",
          500: "#4a4a66",
          600: "#2d2d44",
          700: "#1e1e32",
          800: "#151524",
          900: "#0d0d1a",
          950: "#08080f",
        },
        accent: {
          blue:    "#6366f1",
          purple:  "#a855f7",
          pink:    "#ec4899",
          cyan:    "#06b6d4",
          emerald: "#10b981",
        },
      },

      // ── Border Radius (M3 scale) ────────────────────────────────────────────
      borderRadius: {
        DEFAULT: "1rem",
        sm:      "0.5rem",
        md:      "1.5rem",
        lg:      "2rem",
        xl:      "3rem",
        "2xl":   "3rem",
        "3xl":   "3rem",
        full:    "9999px",
      },

      // ── Font family ─────────────────────────────────────────────────────────
      fontFamily: {
        sans:     ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        headline: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body:     ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        label:    ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      // ── Background images ───────────────────────────────────────────────────
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },

      // ── Animations ──────────────────────────────────────────────────────────
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer:      "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}
