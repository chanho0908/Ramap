import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ramap - 라멘 지도',
  description: '라멘 오타쿠를 위한 전국 라멘 지도 서비스',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kakaoMapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {kakaoMapKey ? (
          <script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false`}
            defer
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `console.error('NEXT_PUBLIC_KAKAO_MAP_KEY is not set');`,
            }}
          />
        )}
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
