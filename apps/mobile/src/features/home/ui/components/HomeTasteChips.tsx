import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import { MotionPressable } from '../../../../shared/ui/MotionPressable';

type Chip = { id: string; label: string; icon: string };

const GENRES: Chip[] = [
  { id: 'action', label: 'Бойовик', icon: '💥' },
  { id: 'comedy', label: 'Комедія', icon: '😂' },
  { id: 'drama', label: 'Драма', icon: '🎭' },
  { id: 'scifi', label: 'Фантастика', icon: '🛸' },
  { id: 'horror', label: 'Жахи', icon: '👻' },
  { id: 'thriller', label: 'Трилер', icon: '🔪' },
  { id: 'romance', label: 'Романтика', icon: '💘' },
  { id: 'animation', label: 'Анімація', icon: '🎨' },
  { id: 'fantasy', label: 'Фентезі', icon: '🐉' },
];

const COUNTRIES: Chip[] = [
  { id: 'us', label: 'США', icon: '🇺🇸' },
  { id: 'gb', label: 'Британія', icon: '🇬🇧' },
  { id: 'kr', label: 'Корея', icon: '🇰🇷' },
  { id: 'jp', label: 'Японія', icon: '🇯🇵' },
  { id: 'ua', label: 'Україна', icon: '🇺🇦' },
  { id: 'fr', label: 'Франція', icon: '🇫🇷' },
];

function ChipRow({
  items,
  selected,
  onToggle,
  styles,
}: {
  items: Chip[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((chip) => {
        const active = selected.has(chip.id);
        return (
          <MotionPressable
            key={chip.id}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(chip.id)}
            accessibilityLabel={chip.label}
          >
            <Text style={styles.chipIcon}>{chip.icon}</Text>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
          </MotionPressable>
        );
      })}
    </ScrollView>
  );
}

export function HomeTasteChips() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());

  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
    void Haptics.selectionAsync();
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Text style={styles.kicker}>Під твій смак</Text>
      <Text style={styles.heading}>Обери жанр чи країну</Text>
      <ChipRow items={GENRES} selected={genres} onToggle={toggle(setGenres)} styles={styles} />
      <ChipRow items={COUNTRIES} selected={countries} onToggle={toggle(setCountries)} styles={styles} />
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 4,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipIcon: {
    fontSize: 15,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.text,
  },
});
