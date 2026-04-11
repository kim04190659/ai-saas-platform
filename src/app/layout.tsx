import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ScenarioContextProvider } from "@/contexts/ScenarioContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "霧島市 RunWith | 市民Well-Being向上プラットフォーム",
  description: "霧島市の市民満足度・職員WellBeing・KPIをリアルタイムで可視化。SDL五軸・9KPIに基づくAI政策提言プラットフォーム。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ScenarioContextProvider: カードゲーム→行政OS→RunWith のシナリオ文脈をアプリ全体で共有 */}
        <ScenarioContextProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ScenarioContextProvider>
      </body>
    </html>
  );
}
