import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mãos Amigas - Cuidadores de Idosos em Toledo",
  description:
    "Cuidadores especializados em Toledo. Sem carência no contrato, profissionais qualificados 24h. Alzheimer, Parkinson, AVC e cuidados especiais.",
  keywords: [
    "cuidadores de idosos Toledo",
    "cuidador domiciliar Toledo PR",
    "home care Toledo",
    "cuidador 24h Toledo",
    "acompanhamento hospitalar Toledo",
    "Alzheimer cuidador",
    "Parkinson cuidador",
    "AVC cuidador",
    "cuidados paliativos Toledo",
    "Mãos Amigas",
  ],
  authors: [{ name: "Mãos Amigas" }],
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Mãos Amigas - Cuidadores de Idosos em Toledo",
    description:
      "Cuidadores profissionais em Toledo, especializados em idosos. Também atendemos outras necessidades de cuidados domiciliares e oferecemos apoio em consultas e exames.",
    type: "website",
    url: "https://maosamigas.com",
    siteName: "Mãos Amigas",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Mãos Amigas Logo" }],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mãos Amigas - Cuidadores de Idosos em Toledo",
    description:
      "Cuidadores especializados em Toledo. Sem carência no contrato, profissionais qualificados 24h.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://wa.me" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://wa.me" />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17704201737"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17704201737');
          `}
        </Script>
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
