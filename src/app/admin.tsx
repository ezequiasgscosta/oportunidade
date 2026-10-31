import { router } from "expo-router";
import AdminScreen from "../screens/AdminScreen";
import { useAppContext } from "../providers/AppProvider";
import { supabase } from "../lib/supabase";

export default function AdminRoute() {
  const { user, isAdmin, authLoading, roleLoading, roleError } = useAppContext();
  return (
    <AdminScreen
      isAdmin={isAdmin}
      onHome={() => router.replace("/")}
      roleError={roleError}
      roleLoading={authLoading || roleLoading}
      supabase={supabase}
      user={user}
    />
  );
}
