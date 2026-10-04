import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manage From",
  description: "พื้นที่เริ่มต้นสำหรับระบบ Manage From",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
