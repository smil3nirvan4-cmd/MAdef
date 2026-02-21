import type { Metadata } from "next";
import "./globals.css";

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
        className="antialiased"
        style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
