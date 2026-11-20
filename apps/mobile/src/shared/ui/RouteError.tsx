import { StyleSheet, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";
import { MotionPressable } from "./MotionPressable";
// Self-contained: this fallback must work even if theme/bootstrap failed.
export function RouteError({ retry, error }: ErrorBoundaryProps) {
  return (
    <View style={s.root}>
      <Text style={s.title}>Спробуємо ще раз?</Text>
      <Text style={s.body}>
        Цей екран не вдалося відкрити. Твої серверні дані залишилися на місці.
      </Text>
      {__DEV__ ? (
        <Text selectable style={s.body}>
          {error.message}
        </Text>
      ) : null}
      <MotionPressable onPress={() => void retry()} style={s.button}>
        <Text style={s.buttonText}>Відкрити знову</Text>
      </MotionPressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#101412",
    padding: 28,
    justifyContent: "center",
    gap: 18,
  },
  title: { fontSize: 30, fontWeight: "700", color: "#f2f6f8" },
  body: { fontSize: 16, lineHeight: 24, color: "#bcc8c0" },
  button: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#a4ebc1",
    alignItems: "center",
  },
  buttonText: { fontWeight: "700", color: "#10281c" },
});
