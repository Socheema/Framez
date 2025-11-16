// Light theme colors
const lightColors = {
  primary: "#00c26f",
  primaryDark: "#00ac62",
  dark: "#3e3e3e",
  darkLight: "#e1e1e1",
  gray: "#e3e3e3",

  background: "#ffffff",
  backgroundSoft: "#f9f9f9",
  surface: "#ffffff",
  surfaceSecondary: "#f5f5f5",
  // Alias used by some components
  surfaceLight: "#f5f5f5",

  text: "#494949",
  textLight: "#7c7c7c",
  textDark: "#1d1d1d",

  border: "#e3e3e3",
  borderLight: "#efefef",

  rose: "#ef4444",
  roseLight: "#f87171",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.5)",

  // Input specific
  inputBackground: "#ffffff",
  inputBorder: "#e3e3e3",
  inputPlaceholder: "#7c7c7c",

  // Card specific
  cardBackground: "#ffffff",
  cardBorder: "#efefef",
};

// Dark theme colors
const darkColors = {
  primary: "#00c26f",
  primaryDark: "#00ac62",
  dark: "#ffffff",
  darkLight: "#2a2a2a",
  gray: "#3a3a3a",

  background: "#121212",
  backgroundSoft: "#1a1a1a",
  surface: "#1e1e1e",
  surfaceSecondary: "#252525",
  // Alias used by some components
  surfaceLight: "#2a2a2a",

  text: "#e5e5e5",
  textLight: "#a0a0a0",
  textDark: "#ffffff",

  border: "#3a3a3a",
  borderLight: "#2a2a2a",

  rose: "#ef4444",
  roseLight: "#f87171",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.7)",

  // Input specific
  inputBackground: "#1e1e1e",
  inputBorder: "#3a3a3a",
  inputPlaceholder: "#6a6a6a",

  // Card specific
  cardBackground: "#1e1e1e",
  cardBorder: "#2a2a2a",
};

// Common properties
const common = {
  fonts: {
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },
  radius: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 18,
    xl: 20,
    xx: 22,
  },
};

// Export light and dark themes
export const LIGHT_THEME = {
  colors: lightColors,
  ...common,
};

export const DARK_THEME = {
  colors: darkColors,
  ...common,
};

// Legacy export for backward compatibility
export const theme = LIGHT_THEME;
