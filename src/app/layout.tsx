import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mãos Amigas | Cuidadores e Home Care",
  description: "Conectamos famílias a cuidadores qualificados para atendimento domiciliar e acompanhamento hospitalar. Profissionais verificados, atendimento 24 horas.",
  keywords: ["cuidador", "home care", "cuidado domiciliar", "acompanhamento hospitalar", "idosos", "enfermagem"],
  authors: [{ name: "Mãos Amigas" }],
  openGraph: {
    title: "Mãos Amigas | Cuidadores e Home Care",
    description: "Cuidado humanizado para quem você ama. Conectamos famílias a profissionais qualificados.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
