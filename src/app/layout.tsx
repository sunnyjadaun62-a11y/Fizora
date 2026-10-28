import type { Metadata, Viewport } from "next";
import { Anton, Instrument_Sans } from "next/font/google";
import "./globals.css";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--nf-display", adjustFontFallback: false, display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-sans", adjustFontFallback: false, display: "swap" });

export const metadata: Metadata = {
  title: "Fizzora — Crack the cold",
  description: "Fizzora sparkling soda: real cherries, half the sugar, twice the fizz. Cherry Cola, Blood Orange and Raspberry Zero.",
  openGraph: {
    title: "Fizzora — Crack the cold",
    description: "Real cherries. Half the sugar. Twice the fizz.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0203",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
