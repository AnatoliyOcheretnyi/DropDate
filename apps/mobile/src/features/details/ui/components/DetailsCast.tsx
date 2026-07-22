import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import type { CastMember, CrewMember } from "../../../../shared/types/release";
import { MotionPressable } from "../../../../shared/ui/MotionPressable";
import { colors } from "../../../../shared/theme/colors";
export function DetailsCast({
  cast = [],
  directors = [],
}: {
  cast?: CastMember[];
  directors?: CrewMember[];
}) {
  const router = useRouter();
  const people = [
    ...directors.map((x) => ({ ...x, character: x.job ?? "Режисер" })),
    ...cast,
  ].slice(0, 18);
  if (!people.length) return null;
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Актори й команда</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {people.map((person) => (
          <MotionPressable
            key={person.tmdbId}
            style={styles.person}
            onPress={() => router.push(`/person/${person.tmdbId}` as Href)}
          >
            <Image
              source={person.profileUrl}
              style={styles.image}
              contentFit="cover"
              transition={250}
            />
            <Text style={styles.name} numberOfLines={2}>
              {person.name}
            </Text>
            <Text style={styles.role} numberOfLines={2}>
              {person.character}
            </Text>
          </MotionPressable>
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { marginTop: 24, gap: 14 },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
    paddingHorizontal: 20,
  },
  row: { paddingHorizontal: 20, gap: 12 },
  person: { width: 108, gap: 7 },
  image: {
    width: 108,
    height: 138,
    borderRadius: 20,
    backgroundColor: colors.card,
  },
  name: { color: colors.text, fontWeight: "800", lineHeight: 18 },
  role: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
});
