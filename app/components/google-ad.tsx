"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

const publisherId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_PUBLISHER_ID;
const slotId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_ID;
const validPublisherId = publisherId && /^ca-pub-\d+$/.test(publisherId) ? publisherId : null;
const validSlotId = slotId && /^\d+$/.test(slotId) ? slotId : null;

export default function GoogleAd() {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    const ad = adRef.current;
    if (!validPublisherId || !validSlotId || !ad || ad.dataset.adInitialized) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      ad.dataset.adInitialized = "true";
    } catch {
      ad.dataset.adInitialized = "error";
    }
  }, []);

  if (!validPublisherId || !validSlotId) return null;

  return (
    <aside className="google-ad-region" aria-label="Publicidade">
      <span className="google-ad-label">PUBLICIDADE</span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        data-ad-client={validPublisherId}
        data-ad-slot={validSlotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}