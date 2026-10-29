"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

const visitorStorageKey = "canta-igreja:visitor-id";
const presenceTopic = "canta-igreja:active-visitors";
const ActiveVisitorsContext = createContext<number | null>(null);

function getVisitorId() {
  try {
    const existingId = window.localStorage.getItem(visitorStorageKey);
    if (existingId) return existingId;

    const newId = window.crypto.randomUUID();
    window.localStorage.setItem(visitorStorageKey, newId);
    return newId;
  } catch {
    return window.crypto.randomUUID();
  }
}

export function ActiveVisitorsProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const visitorId = getVisitorId();
    const channel = supabase.channel(presenceTopic, {
      config: { presence: { key: visitorId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        if (active) setActiveVisitors(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ visitor_id: visitorId, online: true });
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/")) return;

    void supabase.rpc("record_site_visit", { p_visitor_id: getVisitorId() }).then(({ error }) => {
      if (error) console.error("Não foi possível registrar a visita ao site.", error);
    });
  }, [supabase]);

  return (
    <ActiveVisitorsContext.Provider value={activeVisitors}>
      {children}
    </ActiveVisitorsContext.Provider>
  );
}

export function useActiveVisitors() {
  return useContext(ActiveVisitorsContext);
}