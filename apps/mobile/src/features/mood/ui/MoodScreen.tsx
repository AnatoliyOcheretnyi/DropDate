import { Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  FeatureScreen,
  featureStyles as s,
} from "../../../shared/ui/FeatureScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { useMoodSession } from "../hooks/useMoodSession";

export function MoodScreen() {
  const session = useMoodSession();
  const router = useRouter();
  if (session.status === "loading")
    return <ScreenState loading title="Підбираємо наступний крок" />;
  if (session.status === "error")
    return (
      <ScreenState
        title="Не вдалося продовжити"
        message="Перевір з’єднання й спробуй знову."
        onRetry={() => session.start(session.depth)}
      />
    );
  return (
    <FeatureScreen
      title="Підбір за настроєм"
      subtitle={
        session.status === "asking"
          ? `Крок ${session.step} з ~${session.total}`
          : "Адаптивний підбір під цей момент."
      }
    >
      {session.status === "config" ? (
        <View style={s.card}>
          <Text style={s.heading}>Наскільки детально шукаємо?</Text>
          <MotionPressable
            style={s.option}
            onPress={() => session.start("quick")}
          >
            <Text style={s.optionText}>Швидко · близько 5 питань</Text>
          </MotionPressable>
          <MotionPressable
            style={s.option}
            onPress={() => session.start("standard")}
          >
            <Text style={s.optionText}>Точно · адаптивна глибина</Text>
          </MotionPressable>
        </View>
      ) : session.status === "asking" && session.current ? (
        <View style={s.card}>
          <Text style={s.heading}>{session.current.title}</Text>
          {session.current.options.map((option) => (
            <MotionPressable
              key={option.id}
              style={s.option}
              onPress={() => session.answer(option.id)}
            >
              <Text style={s.optionText}>
                {option.emoji ? `${option.emoji} ` : ""}
                {option.label}
              </Text>
            </MotionPressable>
          ))}
          {session.history.length ? (
            <MotionPressable style={s.option} onPress={session.back}>
              <Text style={s.optionText}>Назад</Text>
            </MotionPressable>
          ) : null}
        </View>
      ) : session.status === "results" ? (
        <>
          {session.picks.map((item, index) => (
            <AnimatedSection key={item.tmdbId} index={index}>
              <View style={s.card}>
                <MotionPressable
                  onPress={() =>
                    router.push(
                      `/title/${item.mediaType}/${item.tmdbId}` as Href,
                    )
                  }
                >
                  <Text style={s.heading}>
                    {item.title} {item.year ? `(${item.year})` : ""}
                  </Text>
                  {item.reason ? (
                    <Text style={s.text}>{item.reason}</Text>
                  ) : null}
                </MotionPressable>
                <MotionPressable
                  style={s.option}
                  onPress={() =>
                    router.push({
                      pathname: "/similar",
                      params: {
                        tmdbId: String(item.tmdbId),
                        mediaType: item.mediaType,
                        title: item.title,
                      },
                    } as Href)
                  }
                >
                  <Text style={s.optionText}>Показати схожі</Text>
                </MotionPressable>
              </View>
            </AnimatedSection>
          ))}
          <MotionPressable style={s.button} onPress={session.more}>
            <Text style={s.buttonText}>Показати інші</Text>
          </MotionPressable>
          <MotionPressable style={s.option} onPress={session.reset}>
            <Text style={s.optionText}>Почати заново</Text>
          </MotionPressable>
        </>
      ) : (
        <View style={s.card}>
          <Text style={s.heading}>Нічого точного не знайшлося</Text>
          <MotionPressable style={s.button} onPress={session.reset}>
            <Text style={s.buttonText}>Змінити відповіді</Text>
          </MotionPressable>
        </View>
      )}
    </FeatureScreen>
  );
}
