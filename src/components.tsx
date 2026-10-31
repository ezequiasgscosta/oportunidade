import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "./theme";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  disabled?: boolean;
  loading?: boolean;
};

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && !loading && styles.buttonPressed,
      ]}
    >
      {loading ? <ActivityIndicator color={variant === "primary" ? colors.background : colors.text} /> : (
        <Text style={[styles.buttonText, variant === "primary" && styles.buttonTextPrimary]}>{label}</Text>
      )}
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words";
};

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  multiline = false,
  maxLength,
  autoCapitalize = "sentences",
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
      />
    </View>
  );
}

export function Banner({ children, variant = "error" }: { children: ReactNode; variant?: "error" | "success" | "info" }) {
  return (
    <View style={[styles.banner, styles[`banner_${variant}`]]}>
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ title, count, note }: { title: string; count?: number; note?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {count !== undefined && <Text style={styles.count}>{count}</Text>}
      </View>
      {note ? <Text style={styles.sectionNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  button_primary: { backgroundColor: colors.primary },
  button_secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  button_quiet: { backgroundColor: "transparent" },
  button_danger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerBorder },
  buttonDisabled: { opacity: 0.55 },
  buttonPressed: { opacity: 0.78 },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: "700" },
  buttonTextPrimary: { color: colors.background },
  field: { gap: 7 },
  fieldLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  input: {
    minHeight: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 112, paddingTop: 12, textAlignVertical: "top" },
  banner: { padding: 12, borderRadius: 8, borderWidth: 1 },
  banner_error: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder },
  banner_success: { backgroundColor: colors.successSoft, borderColor: colors.successBorder },
  banner_info: { backgroundColor: colors.card, borderColor: colors.border },
  bannerText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  sectionTitle: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionTitleText: { color: colors.text, fontSize: 17, fontWeight: "700" },
  count: { overflow: "hidden", color: colors.muted, fontSize: 12, fontWeight: "700" },
  sectionNote: { color: colors.muted, fontSize: 10, letterSpacing: 0.7 },
});
