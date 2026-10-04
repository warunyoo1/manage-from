import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manage From",
  description: "จัดการเจ้าหนี้และรายการเบิกจ่ายจากหลายโปรเจกต์ในพื้นที่เดียวกัน",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body>{children}</body>
    </html>
  );
}
