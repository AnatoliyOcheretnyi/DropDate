import { useMemo } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FeatureScreen,
  featureStyles as s,
} from "../../../shared/ui/FeatureScreen";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { AnimatedSection } from "../../../shared/ui/AnimatedScreen";
import { colors } from "../../../shared/theme/colors";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useAuthStore } from "../../auth/store/authStore";
import {
  deleteFollow,
  getFollows,
  getPerson,
  getPersonPick,
  saveFollow,
} from "../api/people";
import type { PersonRole } from "../../../shared/types/release";
export function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const authed = useAuthStore((x) => Boolean(x.user && x.accessToken));
  const person = useQuery({
    queryKey: queryKeys.person(personId),
    queryFn: ({ signal }) => getPerson(personId, signal),
    enabled: personId > 0,
  });
  const role: PersonRole = person.data?.knownForDepartment
    ?.toLowerCase()
    .includes("direct")
    ? "director"
    : "actor";
  const follows = useQuery({
    queryKey: queryKeys.followedPeople,
    queryFn: ({ signal }) => getFollows(signal),
    enabled: authed,
  });
  const current = follows.data?.find(
    (x) => x.personId === personId && x.role === role,
  );
  const pick = useQuery({
    queryKey: ["person", personId, "pick", role],
    queryFn: ({ signal }) => getPersonPick(personId, role, signal),
    enabled: authed && Boolean(person.data),
  });
  const mutate = useMutation({
    mutationFn: async (mode: "like" | "subscribe" | "remove") => {
      if (!person.data) return;
      if (mode === "remove") return deleteFollow(personId, role);
      return saveFollow({
        personId,
        role,
        name: person.data.name,
        profileUrl: person.data.profileUrl,
        knownFor: person.data.knownForDepartment,
        liked: true,
        subscribed: mode === "subscribe",
      });
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: queryKeys.followedPeople }),
  });
  const credits = useMemo(
    () =>
      [...(person.data?.credits ?? [])]
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 30),
    [person.data],
  );
  if (person.isLoading)
    return <ScreenState loading title="Завантажуємо профіль" />;
  if (person.isError || !person.data)
    return (
      <ScreenState
        title="Персону не знайдено"
        message={person.error?.message}
        onRetry={() => person.refetch()}
      />
    );
  return (
    <FeatureScreen
      title={person.data.name}
      subtitle={[person.data.knownForDepartment, person.data.placeOfBirth]
        .filter(Boolean)
        .join(" · ")}
    >
      {person.data.profileUrl ? (
        <Image
          source={person.data.profileUrl}
          style={{
            width: "100%",
            aspectRatio: 1,
            borderRadius: 28,
            backgroundColor: colors.card,
          }}
          contentFit="cover"
          transition={300}
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {authed ? (
          <>
            <MotionPressable
              style={[s.option, current?.liked && s.optionSelected]}
              onPress={() => mutate.mutate(current ? "remove" : "like")}
              haptic="success"
            >
              <Text style={s.optionText}>
                {current?.liked ? "Улюблений" : "В улюблені"}
              </Text>
            </MotionPressable>
            <MotionPressable
              style={[s.option, current?.subscribed && s.optionSelected]}
              onPress={() => mutate.mutate("subscribe")}
              haptic="success"
            >
              <Text style={s.optionText}>
                {current?.subscribed ? "Підписано" : "Стежити за релізами"}
              </Text>
            </MotionPressable>
          </>
        ) : (
          <Text style={s.text}>Увійди, щоб підписатися.</Text>
        )}
      </View>
      {person.data.biography ? (
        <View style={s.card}>
          <Text style={s.heading}>Про персону</Text>
          <Text style={s.text}>{person.data.biography}</Text>
        </View>
      ) : null}
      {pick.data ? (
        <MotionPressable
          style={[s.card, { borderColor: colors.accent }]}
          onPress={() =>
            router.push(`/title/${pick.data!.mediaType}/${pick.data!.tmdbId}`)
          }
        >
          <Text style={s.heading}>Рекомендація для тебе</Text>
          <Text style={s.optionText}>
            {pick.data.title} {pick.data.year ? `(${pick.data.year})` : ""}
          </Text>
          <Text style={s.text}>{pick.data.reason}</Text>
        </MotionPressable>
      ) : null}
      <Text style={s.heading}>Фільмографія</Text>
      {credits.map((credit, index) => (
        <AnimatedSection
          key={`${credit.mediaType}:${credit.tmdbId}:${credit.role}`}
          index={index}
        >
          <MotionPressable
            style={s.card}
            onPress={() =>
              router.push(`/title/${credit.mediaType}/${credit.tmdbId}`)
            }
          >
            <Text style={s.optionText}>
              {credit.title} {credit.year ? `(${credit.year})` : ""}
            </Text>
            <Text style={s.text}>
              {credit.character || credit.job || credit.role}
            </Text>
          </MotionPressable>
        </AnimatedSection>
      ))}
    </FeatureScreen>
  );
}
