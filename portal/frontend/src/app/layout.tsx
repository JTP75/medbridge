import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedBridge Portal",
  description: "Search medical imaging metadata across hospital nodes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="site-title">
            MedBridge
          </a>
          <nav className="site-nav">
            <a href="/">Search</a>
            <a href="/reviewer">Hospital Reviewer</a>
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
