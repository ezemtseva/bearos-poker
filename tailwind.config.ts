/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
	  "app/**/*.{ts,tsx}",
	  "components/**/*.{ts,tsx}",
	  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
	  "./components/**/*.{js,ts,jsx,tsx,mdx}",
	  "./app/**/*.{js,ts,jsx,tsx,mdx}",
	  "*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
	  extend: {
		fontFamily: {
		  sans: ["Geist", "system-ui", "sans-serif"],
		  mono: ["'Geist Mono'", "ui-monospace", "monospace"],
		  display: ["Unbounded", "system-ui", "sans-serif"],
		  // Playing cards keep their original font
		  card: ["var(--font-card)", "system-ui", "sans-serif"],
		},
		colors: {
		  // Bearos design tokens (see design-handoff/HANDOFF.md)
		  bp: {
			bg: "#0B0C0F",
			band: "#0F1014",
			surface: "#121419",
			surface2: "#15171C",
			surface3: "#1F2229",
			border: "#22252C",
			strong: "#2E323B",
			divider: "#1C1F25",
			text: "#F4F4F2",
			text2: "#C9CBD1",
			muted: "#9A9DA6",
			dim: "#8E929B",
			future: "#3A3E47",
			accent: "#D7FF3F",
			accentHover: "#E8FF8A",
			warning: "#FFB547",
			negative: "#FF5C66",
		  },
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
		},
		borderRadius: {
		  lg: "var(--radius)",
		  md: "calc(var(--radius) - 2px)",
		  sm: "calc(var(--radius) - 4px)",
		},
	  },
	},
	plugins: [require("tailwindcss-animate")],
  }

