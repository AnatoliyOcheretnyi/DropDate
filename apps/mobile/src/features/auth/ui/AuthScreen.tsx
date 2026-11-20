import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { AuthFormPanel } from "./components/AuthFormPanel";
import { useAuthScreen } from "../hooks/useAuthScreen";

export default function AuthScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const form = useAuthScreen();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <MotionPressable
            accessibilityLabel="Назад"
            style={[s.back, { backgroundColor: colors.elevated }]}
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/welcome")
            }
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </MotionPressable>
          <View style={s.intro}>
            <Text style={[s.kicker, { color: colors.accent }]}>
              ТВІЙ ОСОБИСТИЙ КІНОПРОСТІР
            </Text>
            <Text style={[s.title, { color: colors.text }]}>
              {form.mode === "login"
                ? "Раді бачити\nтебе знову."
                : "Хороше кіно\nпочинається тут."}
            </Text>
            <Text style={[s.lead, { color: colors.textMuted }]}>
              Улюблені історії, списки й відкриття — завжди поруч.
            </Text>
          </View>
          <AnimatedSection>
            <AuthFormPanel
              {...form}
              onChangeEmail={form.setEmail}
              onChangePassword={form.setPassword}
              onChangeConfirm={form.setConfirm}
              onSubmit={form.handleSubmit}
              onToggleMode={form.toggleMode}
            />
          </AnimatedSection>
          <MotionPressable
            style={s.legal}
            onPress={() => router.push("/settings")}
          >
            <Text
              style={{
                color: colors.textMuted,
                textAlign: "center",
                fontSize: 12,
              }}
            >
              Конфіденційність · Умови · Допомога
            </Text>
          </MotionPressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  back: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  intro: { gap: 14, paddingVertical: 14 },
  kicker: { fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -1.5,
  },
  lead: { fontSize: 16, lineHeight: 24 },
  legal: { minHeight: 44, justifyContent: "center" },
});
