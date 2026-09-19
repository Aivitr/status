import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muxi Status",
  description: "GitHub Live Telemetry Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
