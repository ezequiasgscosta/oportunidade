"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const analyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const validAnalyticsId = analyticsId && /^G-[A-Z0-9]+$/i.test(analyticsId) ? analyticsId : null;
const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
const validPublisherId = publisherId && /^ca-pub-\d+$/.test(publisherId) ? publisherId : null;

export default function GoogleIntegrations() {
  const pathname = usePathname();

  useEffect(() => {
    if (!validAnalyticsId || !window.gtag) return;
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname]);

  return (
    <>
      {validAnalyticsId && (
        <>
          <Script id="google-analytics-init" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config','${validAnalyticsId}',{send_page_view:false});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${validAnalyticsId}`}
            strategy="afterInteractive"
          />
        </>
      )}
      {validPublisherId && (
        <Script
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${validPublisherId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}
    </>
  );
}