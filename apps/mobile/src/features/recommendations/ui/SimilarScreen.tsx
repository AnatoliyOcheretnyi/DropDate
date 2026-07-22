import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import {
  FeatureScreen,
  featureStyles as s,
} from "../../../shared/ui/FeatureScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { getSimilar } from "../api/recommendations";
export default function SimilarScreen() {
  const p = useLocalSearchParams<{
    tmdbId: string;
    mediaType: "movie" | "tv";
    title?: string;
  }>();
  const id = Number(p.tmdbId);
  const router = useRouter();
  const q = useQuery({
    queryKey: ["similar", p.mediaType, id],
    enabled: id > 0 && Boolean(p.mediaType),
    queryFn: ({ signal }) => getSimilar(id, p.mediaType, signal),
  });
  return (
    <FeatureScreen
      title="Ще в цьому настрої"
      subtitle={p.title ? `Схоже на «${p.title}»` : "Добірка схожих тайтлів."}
    >
      {q.isLoading ? (
        <ScreenState loading title="Шукаємо схоже" />
      ) : q.data?.length ? (
        q.data.map((item) => (
          <MotionPressable
            key={`${item.mediaType}-${item.id}`}
            style={s.card}
            onPress={() =>
              router.push(`/title/${item.mediaType}/${item.id}` as Href)
            }
          >
            <Text style={s.heading}>
              {item.title} {item.year ? `(${item.year})` : ""}
            </Text>
            <Text style={s.optionText}>Відкрити деталі →</Text>
          </MotionPressable>
        ))
      ) : (
        <ScreenState title="Схожих варіантів не знайдено" />
      )}
    </FeatureScreen>
  );
}
