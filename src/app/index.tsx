import { router } from "expo-router";
import HomeScreen from "../screens/HomeScreen";
import { useAppContext } from "../providers/AppProvider";
import { supabase } from "../lib/supabase";
import type { AppPage } from "../lib/types";

export default function HomeRoute() {
  const { user, isAdmin, activeVisitors } = useAppContext();
  const profileName = user?.user_metadata?.display_name;
  const userLabel = typeof profileName === "string" && profileName.trim()
    ? profileName.trim()
    : user?.email;

  function navigate(page: AppPage) {
    if (page === "home") {
      router.replace("/");
    } else if (page === "admin") {
      router.push("/admin");
    } else {
      router.push(`/info/${page}`);
    }
  }

  return (
    <HomeScreen
      activeVisitors={activeVisitors}
      isAdmin={isAdmin}
      onNavigate={navigate}
      supabase={supabase}
      user={user}
      userLabel={userLabel}
    />
  );
}
