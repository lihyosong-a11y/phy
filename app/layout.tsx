import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rabbit - 교육용 시뮬레이션 웹 서비스",
  description: "깡총깡총! 교육용 시뮬레이션을 위한 깔끔하고 단순한 웹앱 보일러플레이트입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
