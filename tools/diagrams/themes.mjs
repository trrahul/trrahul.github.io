// Theme palettes for diagrams. Each scene receives a palette (`t`) and
// references semantic tokens like `t.text`, `t.accent`. Adding a new theme
// is just adding another export here and registering it in index.mjs.

export const light = {
  name: "light",
  text: "#34343c",
  heading: "#2a2a2a",
  muted: "#757575",

  accent: "#0056b2",
  accentSoft: "#e8f0fa",

  surface: "#ffffff",
  surfaceMuted: "#f3f3f3",

  ok: "#2f6f3a",
  okSoft: "#eef7ee",
  warn: "#a05a00",
  warnSoft: "#fff5e6",

  // Semantic stream colors (used by HTTP/2 multiplexing diagram, etc.)
  s1: "#1e7a4d",
  s1Soft: "#e6f3ec",
  s2: "#a05a00",
  s2Soft: "#fff1dc",
  s3: "#7a3aa0",
  s3Soft: "#f1e8f7",
};

export const dark = {
  name: "dark",
  text: "#cdd0d6",
  heading: "#e6e6e8",
  muted: "#9aa0aa",

  accent: "#6ba9e8",
  accentSoft: "#1d2a3a",

  // Surface colours kept distinct so boxes still pop on the dark page bg.
  surface: "#1e2128",
  surfaceMuted: "#16181d",

  ok: "#7fc890",
  okSoft: "#1c2a20",
  warn: "#e0a060",
  warnSoft: "#2a2118",

  s1: "#7fc890",
  s1Soft: "#1c2a20",
  s2: "#e0a060",
  s2Soft: "#2a2118",
  s3: "#c08adb",
  s3Soft: "#241a2c",
};

export const themes = { light, dark };
