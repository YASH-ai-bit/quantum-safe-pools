import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            "box-shadow": "0 0 20px rgba(180, 100%, 45%, 0.4)",
          },
          "50%": {
            "box-shadow": "0 0 40px rgba(180, 100%, 45%, 0.8)",
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        "glitch": {
          "0%": {
            transform: "translate(0px, 0px)",
            opacity: "1",
          },
          "20%": {
            transform: "translate(-2px, 2px)",
            opacity: "0.8",
          },
          "40%": {
            transform: "translate(-2px, -2px)",
            opacity: "0.9",
          },
          "60%": {
            transform: "translate(2px, 2px)",
            opacity: "0.85",
          },
          "80%": {
            transform: "translate(2px, -2px)",
            opacity: "0.95",
          },
          "100%": {
            transform: "translate(0px, 0px)",
            opacity: "1",
          },
        },
        "cypher": {
          "0%": {
            textShadow: "0 0 10px hsl(90 100% 50% / 0.5)",
            letterSpacing: "0.15em",
          },
          "50%": {
            textShadow: "0 0 20px hsl(90 100% 50% / 0.8), 0 0 40px hsl(90 100% 50% / 0.4)",
            letterSpacing: "0.05em",
          },
          "100%": {
            textShadow: "0 0 10px hsl(90 100% 50% / 0.5)",
            letterSpacing: "0.1em",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glitch": "glitch 0.3s ease-out",
        "cypher": "cypher 0.6s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
