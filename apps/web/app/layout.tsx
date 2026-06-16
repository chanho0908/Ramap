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
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
