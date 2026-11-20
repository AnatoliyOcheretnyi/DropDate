import { Text } from "react-native";
import { useRouter } from "expo-router";
import { FeatureScreen } from "../src/shared/ui/FeatureScreen";
import { MotionPressable } from "../src/shared/ui/MotionPressable";
import { useTheme } from "../src/shared/theme/ThemeProvider";
export default function NotFound() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <FeatureScreen
      title="Цю історію не знайдено"
      subtitle="Посилання могло застаріти. Повернімося до нових відкриттів."
    >
      <MotionPressable
        onPress={() => router.replace("/(tabs)")}
        style={{
          minHeight: 52,
          borderRadius: 16,
          backgroundColor: colors.accent,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: colors.isDark ? "#10281c" : "#fff",
            fontWeight: "700",
          }}
        >
          На головну
        </Text>
      </MotionPressable>
    </FeatureScreen>
  );
}
