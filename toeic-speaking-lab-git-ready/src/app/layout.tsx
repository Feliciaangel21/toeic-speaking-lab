import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speaking Lab",
  description: "TOEIC-style speaking practice simulator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
