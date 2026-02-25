import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "IBM Plex Mono", "Courier New", "monospace"]
      },
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        border: "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        highlight: "var(--color-highlight)",
        warning: "var(--color-warning)",
        muted: "var(--color-muted)",
        "muted-light": "var(--color-muted-light)",
        hot: "var(--color-hot)",
        warm: "var(--color-warm)",
        cool: "var(--color-cool)",
        dormant: "var(--color-dormant)",
        satisfied: "var(--color-satisfied)"
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px"
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px"
      }
    }
  },
  plugins: []
};

export default config;
