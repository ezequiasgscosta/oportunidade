import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AppButton, Banner } from "../../components";
import { useAppContext } from "../../providers/AppProvider";
import { colors } from "../../theme";

export default function AuthCallbackRoute() {
  const { user, deepLinkError } = useAppContext();

  useEffect(() => {
    if (user) router.replace("/");
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirmação de acesso</Text>
      {deepLinkError ? (
        <>
          <Banner>{deepLinkError}</Banner>
          <AppButton label="Voltar ao feed" onPress={() => router.replace("/")} />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.message}>Validando seu email...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", gap: 18, padding: 22, backgroundColor: colors.background },
  title: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, textAlign: "center" },
});
