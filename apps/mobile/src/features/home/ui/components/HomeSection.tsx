import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Suggestion } from "../../../../shared/types/release";
import { useTheme } from "../../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../../shared/theme/palette";
import { PosterRowSkeleton } from "../../../../shared/ui/Shimmer";
import { HomeRow } from "./HomeRow";
import { RankedRow } from "./RankedRow";

type Props = {
  title: string;
  kicker?: string;
  variant?: "rail" | "ranked";
  items: Suggestion[];
  isLoading: boolean;
  onPress: (item: Suggestion) => void;
  onAdd: (item: Suggestion) => void;
  onLongPress: (item: Suggestion) => void;
  isSaved: (item: Suggestion) => boolean;
  reasons?: string[];
};

export function HomeSection({
  title,
  kicker,
  variant = "rail",
  items,
  isLoading,
  onPress,
  onAdd,
  onLongPress,
  isSaved,
  reasons,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.head}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {reasons?.map((reason) => (
        <Text key={reason} style={styles.reason}>
          {reason}
        </Text>
      ))}
      {isLoading ? (
        <PosterRowSkeleton />
      ) : variant === "ranked" ? (
        <RankedRow items={items} onPress={onPress} onLongPress={onLongPress} />
      ) : (
        <HomeRow
          items={items}
          onPress={onPress}
          onAdd={onAdd}
          onLongPress={onLongPress}
          isSaved={isSaved}
        />
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      gap: 12,
    },
    head: {
      gap: 2,
    },
    kicker: {
      textTransform: "uppercase",
      letterSpacing: 2,
      color: colors.accent,
      fontSize: 11.5,
      fontWeight: "800",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
    },
    reason: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  });
