import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ActiveVisitorsProvider } from "./components/active-visitors";
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
const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
const validPublisherId = publisherId && /^ca-pub-\d+$/.test(publisherId) ? publisherId : null;

export const metadata: Metadata = {
  title: "Canta Igreja | Louvores da comunidade",
  description: "Ouça e compartilhe hinos da Harpa, hinos avulsos e covers.",
  ...(siteVerification ? { verification: { google: siteVerification } } : {}),
  ...(validPublisherId ? { other: { "google-adsense-account": validPublisherId } } : {}),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Canta Igreja",
    title: "Canta Igreja | Louvores da comunidade",
    description: "Ouça e compartilhe hinos da Harpa, hinos avulsos e covers.",
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
        <ActiveVisitorsProvider>
          {validPublisherId && (
            <Script
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${validPublisherId}`}
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          )}
          <GoogleIntegrations />
          {children}
        </ActiveVisitorsProvider>
      </body>
    </html>
  );
}
