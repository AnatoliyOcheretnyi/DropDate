import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MotionPressable } from '../../../../shared/ui/MotionPressable';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import type { TasteKind } from '../../store/tasteStore';

export function TasteRanker({ title, kind, items, onMove, onReset }: { title: string; kind: TasteKind; items: string[]; onMove: (kind: TasteKind, index: number, delta: number) => void; onReset: (kind: TasteKind) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <MotionPressable onPress={() => onReset(kind)}><Text style={styles.reset}>Скинути</Text></MotionPressable>
      </View>
      {items.map((item, index) => (
        <View key={item} style={styles.row}>
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item}</Text>
            <View style={styles.track}><View style={[styles.fill, { width: `${((items.length - index) / items.length) * 100}%` }]} /></View>
          </View>
          <MotionPressable disabled={index === 0} onPress={() => onMove(kind, index, -1)} style={styles.icon}><Ionicons name="chevron-up" color={colors.text} size={18} /></MotionPressable>
          <MotionPressable disabled={index === items.length - 1} onPress={() => onMove(kind, index, 1)} style={styles.icon}><Ionicons name="chevron-down" color={colors.text} size={18} /></MotionPressable>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({ root: { gap: 10, padding: 16, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { color: colors.text, fontSize: 19, fontWeight: '900' }, reset: { color: colors.accent, fontWeight: '700' }, row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }, rank: { width: 24, color: colors.accent, fontWeight: '900', fontSize: 17 }, name: { color: colors.text, fontWeight: '700' }, track: { height: 3, borderRadius: 3, backgroundColor: colors.border, marginTop: 7 }, fill: { height: 3, borderRadius: 3, backgroundColor: colors.accent }, icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.card } });
