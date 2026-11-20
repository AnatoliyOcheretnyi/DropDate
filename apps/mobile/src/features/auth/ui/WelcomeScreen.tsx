import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { useWelcomeScreen } from "../hooks/useWelcomeScreen";

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isLoading, handleSignIn, handleContinueAsGuest } = useWelcomeScreen();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.brand}>
          <Image
            source={require("../../../../assets/images/icon.png")}
            style={s.logo}
          />
          <Text style={[s.wordmark, { color: colors.text }]}>dropdate</Text>
          <Text style={[s.edition, { color: colors.textMuted }]}>
            ТВОЄ КІНО. ТВОЇ ІСТОРІЇ.
          </Text>
        </View>
        <AnimatedSection>
          <View
            style={[
              s.art,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[s.orbit, { borderColor: colors.border }]} />
            <View style={[s.orbitInner, { borderColor: colors.border }]} />
            <View style={[s.ticket, { backgroundColor: colors.accent }]}>
              <Ionicons name="sparkles-outline" size={32} color="#10281c" />
              <Text style={s.ticketLabel}>СЬОГОДНІ У ТВОЄМУ КІНО</Text>
              <Text style={s.ticketTitle}>
                Щось, що{`\n`}залишиться{`\n`}з тобою.
              </Text>
              <View style={s.ticketLine} />
              <Text style={s.ticketFooter}>ОДИН ВЕЧІР · БЕЗЛІЧ ВІДКРИТТІВ</Text>
            </View>
            <View
              style={[
                s.stamp,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="moon-outline" color={colors.gold} size={24} />
              <Text style={[s.stampText, { color: colors.text }]}>
                на твій{`\n`}настрій
              </Text>
            </View>
          </View>
        </AnimatedSection>
        <AnimatedSection index={1}>
          <Text style={[s.title, { color: colors.text }]}>
            Менше пошуку.{`\n`}Більше хорошого кіно.
          </Text>
          <Text style={[s.lead, { color: colors.textMuted }]}>
            Знаходь своє наступне захоплення, збирай списки й не пропускай
            довгоочікувані прем’єри.
          </Text>
        </AnimatedSection>
        <View style={s.actions}>
          <MotionPressable
            style={[s.primary, { backgroundColor: colors.accent }]}
            disabled={isLoading}
            onPress={handleSignIn}
          >
            <Text
              style={[
                s.buttonText,
                { color: colors.isDark ? "#10281c" : "#fff" },
              ]}
            >
              Почати свою історію
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color={colors.isDark ? "#10281c" : "#fff"}
            />
          </MotionPressable>
          <MotionPressable
            style={s.secondary}
            disabled={isLoading}
            onPress={handleContinueAsGuest}
          >
            <Text style={[s.buttonText, { color: colors.text }]}>
              Спочатку роздивитися
            </Text>
          </MotionPressable>
          <MotionPressable
            style={s.legal}
            onPress={() => router.push("/settings")}
          >
            <Text style={[s.legalText, { color: colors.textMuted }]}>
              Конфіденційність та підтримка
            </Text>
          </MotionPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 24,
    gap: 28,
    flexGrow: 1,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  logo: { width: 30, height: 30, borderRadius: 9 },
  wordmark: { fontWeight: "800", fontSize: 22, letterSpacing: -1 },
  edition: { fontSize: 9, letterSpacing: 1.4, marginLeft: "auto" },
  art: {
    minHeight: 300,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 24,
  },
  orbit: {
    position: "absolute",
    width: 340,
    height: 340,
    borderWidth: 1,
    borderRadius: 170,
  },
  orbitInner: {
    position: "absolute",
    width: 250,
    height: 250,
    borderWidth: 1,
    borderRadius: 125,
  },
  ticket: {
    width: 210,
    padding: 22,
    borderRadius: 20,
    transform: [{ rotate: "-7deg" }],
    gap: 12,
  },
  ticketLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: "700",
    color: "#10281c",
  },
  ticketTitle: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "700",
    letterSpacing: -1,
    color: "#10281c",
  },
  ticketLine: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "#10281c50",
  },
  ticketFooter: { fontSize: 7, letterSpacing: 1, color: "#10281c" },
  stamp: {
    position: "absolute",
    right: 14,
    bottom: 24,
    padding: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    transform: [{ rotate: "8deg" }],
  },
  stampText: { fontSize: 12, lineHeight: 16 },
  title: {
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.5,
    fontWeight: "700",
  },
  lead: { fontSize: 16, lineHeight: 24, marginTop: 14 },
  actions: { gap: 8, marginTop: "auto" },
  primary: {
    minHeight: 56,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { minHeight: 50, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 15, fontWeight: "700" },
  legal: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  legalText: { fontSize: 12 },
});
