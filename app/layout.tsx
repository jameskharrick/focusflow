import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FocusFlow — AI Ambient Focus Sessions",
  description: "AI-generated ambient music and visuals for deep focus work sessions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-gray-950">{children}</body>
    </html>
  );
}
