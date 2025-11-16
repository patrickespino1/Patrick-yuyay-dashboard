import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-yuyay-sans",
});

const plexMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-yuyay-mono",
});

export const metadata: Metadata = {
  title: "Yuyay · Investigador Político",
  description:
    "Panel interno para despachar solicitudes de investigación política y recibir respuestas del agente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${grotesk.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
