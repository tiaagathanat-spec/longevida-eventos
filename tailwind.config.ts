import type { Config } from "tailwindcss";

// Paleta e identidade visual definidas para o Longevida Eventos:
// clean/premium, cantos arredondados, suporte a dark/light mode.
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: "#00A6D6",
            dark: "#007AAE",
          },
          green: {
            DEFAULT: "#7CC242",
            light: "#A6D84A",
          },
        },
      },
      fontFamily: {
        // Definir Poppins/Inter/Montserrat via next/font na implementação
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
