import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "퍼널리 - 비즈니스 성장 올인원 플랫폼",
  description: "랜딩페이지 제작부터 리드 관리, 트래픽 분석까지. 비즈니스 성장에 필요한 모든 것을 한 곳에서.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
