/** @type {import('tailwindcss').Config} */
const palette = require("./constants/palette.json");

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ...palette,
        // Old turquoise theme, still used by screens not yet redesigned.
        primary: "#40E0D0",
        secondary: "#55B4B0",
        textDark: "#0A2A2A",
      },
      // React Native picks a weight by font file, so each weight is its own family
      // (loaded in app/_layout.tsx).
      fontFamily: {
        body: ["Archivo_400Regular"],
        "body-medium": ["Archivo_500Medium"],
        "body-semibold": ["Archivo_600SemiBold"],
        "body-bold": ["Archivo_700Bold"],
        "body-heavy": ["Archivo_800ExtraBold"],
        display: ["Archivo_800ExtraBold_Italic"],
        logo: ["Archivo_900Black_Italic"],
        mono: ["JetBrainsMono_500Medium"],
        "mono-bold": ["JetBrainsMono_600SemiBold"],
      },
    },
  },
  plugins: [],
};
