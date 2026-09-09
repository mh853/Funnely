import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import AttributionCapture from "@/components/marketing/AttributionCapture";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOMAIN || 'https://funnely.co.kr'),
  title: "퍼널리 - 비즈니스 성장 올인원 플랫폼",
  description: "랜딩페이지 제작부터 리드 관리, 트래픽 분석까지. 비즈니스 성장에 필요한 모든 것을 한 곳에서.",
  // 하위 페이지 공통 Open Graph 기본값 - og:title/og:description은 각 페이지의
  // title/description에서 자동으로 채워진다. 페이지가 openGraph를 직접 정의하면
  // 이 객체는 병합되지 않고 통째로 대체되므로 그 경우 images까지 다시 명시해야 한다.
  openGraph: {
    type: "website",
    siteName: "퍼널리",
    locale: "ko_KR",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  // 검색엔진 사이트 소유권 확인 메타 (노션 39·40번). 구글 서치콘솔은 도메인 속성이라
  // 메타가 아니라 Vercel DNS의 루트 TXT 레코드(google-site-verification=…)로 확인한다(38번).
  verification: {
    other: {
      "naver-site-verification": "1864c764707fe83f0c2a0bf9d3a0d9e054c9860f",
      "msvalidate.01": "75FD0FC4A830F7D63AE00F3A996B79A3",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-2BNPPXME0R" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-2BNPPXME0R');`,
          }}
        />
        {/* End Google tag (gtag.js) */}
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MXRJBRHK');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body className={inter.className}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MXRJBRHK"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        <AttributionCapture />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
