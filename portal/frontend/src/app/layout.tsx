import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedBridge | Federated Imaging Discovery",
  description:
    "Privacy-safe medical imaging discovery and hospital-controlled data access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
