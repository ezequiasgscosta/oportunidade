import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { setAudioModeAsync } from "expo-audio";
import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { supabase } from "../lib/supabase";

type AppContextValue = {
  user: User | null;
  isAdmin: boolean;
  authLoading: boolean;
  roleLoading: boolean;
  roleError: string;
  activeVisitors: number | null;
  deepLinkError: string;
};

const AppContext = createContext<AppContextValue | null>(null);
const visitorStorageKey = "tirando-de-ouvido:visitor-id";
const presenceTopic = "tirando-de-ouvido:active-visitors";
type RoleState = { userId: string; isAdmin: boolean; error: string };

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [roleState, setRoleState] = useState<RoleState | null>(null);
  const [activeVisitors, setActiveVisitors] = useState<number | null>(null);
  const [visitorId, setVisitorId] = useState("");
  const [deepLinkError, setDeepLinkError] = useState("");

  useEffect(() => {
    let active = true;
    if (!supabase) return;

    let receivedAuthEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      if (!active) return;
      setUser(session?.user ?? null);
      setRoleState(null);
      setAuthLoading(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) console.error("Não foi possível restaurar a sessão.", error);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      console.error("Falha ao restaurar a sessão.", error);
      if (active && !receivedAuthEvent) setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!supabase || !user) return;
    void supabase.from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Não foi possível verificar o acesso administrativo.", error);
          setRoleState({
            userId: user.id,
            isAdmin: false,
            error: "Não foi possível verificar seu acesso administrativo. Tente novamente.",
          });
        } else {
          setRoleState({ userId: user.id, isAdmin: Boolean(data), error: "" });
        }
      }, (error: unknown) => {
        if (!active) return;
        console.error("Falha ao verificar o acesso administrativo.", error);
        setRoleState({
          userId: user.id,
          isAdmin: false,
          error: "Não foi possível verificar seu acesso administrativo. Tente novamente.",
        });
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(visitorStorageKey)
      .then(async (existingId) => {
        const id = existingId || Crypto.randomUUID();
        if (!existingId) await AsyncStorage.setItem(visitorStorageKey, id);
        if (active) setVisitorId(id);
      })
      .catch((error: unknown) => {
        console.error("Não foi possível salvar o identificador de visitante.", error);
        if (active) setVisitorId(Crypto.randomUUID());
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase || !visitorId) return;
    const client = supabase;
    const recordVisit = () => {
      void client.rpc("record_site_visit", { p_visitor_id: visitorId })
        .then(({ error }) => {
          if (error) console.error("Não foi possível registrar a visita.", error);
        }, (error: unknown) => console.error("Falha ao registrar a visita.", error));
    };
    recordVisit();

    const channel = client.channel(presenceTopic, {
      config: { presence: { key: visitorId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        setActiveVisitors(Object.keys(channel.presenceState()).length);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ visitor_id: visitorId, online: true });
        }
      });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") recordVisit();
    });

    return () => {
      appStateSubscription.remove();
      void client.removeChannel(channel);
    };
  }, [visitorId]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const handledUrls = new Set<string>();

    async function handleAuthUrl(url: string | null) {
      if (!url || !url.includes("/auth/callback") || handledUrls.has(url)) return;
      handledUrls.add(url);
      try {
        const { error } = await client.auth.exchangeCodeForSession(url);
        if (!active) return;
        if (error) {
          console.error("Não foi possível confirmar a sessão pelo link de email.", error);
          setDeepLinkError("Não foi possível confirmar o acesso. Solicite um novo email e tente outra vez.");
        } else {
          setDeepLinkError("");
        }
      } catch (error) {
        if (!active) return;
        console.error("Falha ao confirmar a sessão pelo link de email.", error);
        setDeepLinkError("Não foi possível confirmar o acesso. Solicite um novo email e tente outra vez.");
      }
    }

    void Linking.getInitialURL()
      .then(handleAuthUrl)
      .catch((error: unknown) => {
        console.error("Não foi possível ler o link de autenticação inicial.", error);
        if (active) setDeepLinkError("Não foi possível abrir o link de confirmação.");
      });
    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true }).catch((error: unknown) => {
      console.error("Não foi possível configurar a reprodução de áudio.", error);
    });
  }, []);

  const value = useMemo(() => ({
    user,
    isAdmin: Boolean(user && roleState?.userId === user.id && roleState?.isAdmin),
    authLoading,
    roleLoading: Boolean(user && roleState?.userId !== user.id),
    roleError: roleState?.userId === user?.id ? roleState?.error ?? "" : "",
    activeVisitors,
    deepLinkError,
  }), [activeVisitors, authLoading, deepLinkError, roleState, user]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used within AppProvider.");
  return value;
}
