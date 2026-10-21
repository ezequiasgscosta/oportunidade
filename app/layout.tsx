import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GoogleIntegrations from "./components/google-integrations";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  title: "onda. | Feed de música",
  description: "Descubra sons novos e compartilhe sua música com a comunidade.",
  ...(siteVerification ? { verification: { google: siteVerification } } : {}),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "onda.",
    title: "onda. | Feed de música",
    description: "Descubra sons novos e compartilhe sua música com a comunidade.",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleIntegrations />
        {children}
      </body>
    </html>
  );
}
