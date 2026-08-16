import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speaking Lab | 토익 스피킹 연습",
  description: "실전 모의고사와 한국어 가이드로 연습하는 TOEIC-style speaking practice simulator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
