/** All copy lives here so sections stay dumb and a rebrand is one file. */

export const BRAND = "Fizzora";
export const TAGLINE = "Crack the cold.";

export const NAV = [
  { href: "#chill", label: "The fizz" },
  { href: "#flavours", label: "Flavours" },
  { href: "#finale", label: "Find a can" },
] as const;

export const CHILL_LINES = ["Real cherries.", "Half the sugar.", "Twice the fizz."];

export const STATS = [
  { value: 4, suffix: "x", label: "Carbonation of a regular cola" },
  { value: 90, suffix: "kcal", label: "Per can. Cane sugar, never syrup" },
  { value: 0, suffix: "", label: "Artificial colours or preservatives" },
];

/** colours here also drive the label print and the studio glow in the 3D world */
export const FLAVOURS = [
  {
    key: "cherry",
    name: "Cherry Cola",
    tag: "The original",
    note: "Dark cherry, a pinch of vanilla, a bite of cola nut. The one that started the noise.",
    kcal: 90,
    body: "#d0102b",
    deep: "#6e0414",
    ink: "#fff1e0",
    accent: "#ffd2b0",
    glow: "#b40f22",
  },
  {
    key: "orange",
    name: "Blood Orange",
    tag: "Sharp & sunny",
    note: "Sicilian blood orange with a ginger kick at the end. Tastes like the first warm day.",
    kcal: 85,
    body: "#ec4a1c",
    deep: "#8a1e08",
    ink: "#fff3df",
    accent: "#ffc36b",
    glow: "#c4370d",
  },
  {
    key: "zero",
    name: "Raspberry Zero",
    tag: "Zero sugar",
    note: "Tart raspberry, all the bite, zero sugar. Sweetened with stevia leaf, nothing else.",
    kcal: 2,
    body: "#16100f",
    deep: "#050303",
    ink: "#ff2d55",
    accent: "#ff7b98",
    glow: "#a3123f",
  },
] as const;

export const POUR_STEPS = [
  { n: "01", title: "Chill it", note: "Fridge-cold, 4°C. Warm fizz is a crime." },
  { n: "02", title: "Ice high", note: "Fill the glass to the top. More ice, less melt." },
  { n: "03", title: "Pour slow", note: "Tilt the glass. Keep the bubbles in." },
];

export const PACKS = [
  { name: "Single can", size: "330 ml", price: 40 },
  { name: "Six pack", size: "6 × 330 ml", price: 220 },
  { name: "Party crate", size: "24 × 330 ml", price: 840 },
];

export const SHOUTS = ["Ice cold", "Real fruit", "Half the sugar", "Twice the fizz", "Made in India", "No syrup"];
