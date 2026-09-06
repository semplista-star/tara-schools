import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FA",
        panel: "#FFFFFF",
        surface: "#EFF3F8",
        border: "rgba(20, 30, 45, 0.12)",
        "border-strong": "rgba(20, 30, 45, 0.22)",
        ink: "#16202B",
        inksoft: "#4B5A68",
        muted: "#7C8B99",
        accent: "#2a78d6",
        "accent-light": "#E7F0FB",
        "accent-dark": "#1E5CAD",
        success: "#008300",
        "success-light": "#E4F4E4",
        warning: "#eda100",
        "warning-light": "#FCF2DE",
        danger: "#e34948",
        "danger-light": "#FBE7E7"
      },
      fontFamily: {
        sans: ["Work Sans", "system-ui", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"]
      },
      boxShadow: {
        none: "none"
      }
    }
  },
  plugins: []
};

export default config;
