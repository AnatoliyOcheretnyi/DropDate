import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { Palette } from '../theme/palette';
import { copy } from '../strings';
import type { ListType } from '../types/lists';

type Props = {
  visible: boolean;
  value: ListType[];
  onClose: () => void;
  onApply: (value: ListType[]) => void;
};

const LIST_OPTIONS: ListType[] = ['follow', 'watchlist', 'favorite', 'watched', 'disliked'];

export function ListPickerModal({ visible, value, onClose, onApply }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selected, setSelected] = useState<ListType[]>(value);

  useEffect(() => {
    if (visible) {
      setSelected(value);
    }
  }, [value, visible]);

  const items = useMemo(
    () =>
      LIST_OPTIONS.map((item) => ({
        key: item,
        label: copy.lists[item],
        checked: selected.includes(item),
      })),
    [selected]
  );

  const toggle = (key: ListType) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{copy.actions.addToList}</Text>
          <View style={styles.list}>
            {items.map((item) => (
              <Pressable key={item.key} style={styles.row} onPress={() => toggle(item.key)}>
                <View style={[styles.checkbox, item.checked ? styles.checkboxChecked : null]}>
                  {item.checked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.label}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.actionGhost} onPress={onClose}>
              <Text style={styles.actionGhostText}>Скасувати</Text>
            </Pressable>
            <Pressable style={styles.actionPrimary} onPress={() => onApply(selected)}>
              <Text style={styles.actionPrimaryText}>Зберегти</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.isDark ? 'rgba(2,8,6,0.85)' : 'rgba(13,18,32,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: colors.isDark ? 'rgba(16,20,32,0.98)' : '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkmark: {
    color: colors.isDark ? '#001b12' : '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  label: {
    color: colors.text,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionGhost: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionGhostText: {
    color: colors.text,
    fontWeight: '600',
  },
  actionPrimary: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionPrimaryText: {
    color: colors.isDark ? '#001b12' : '#ffffff',
    fontWeight: '700',
  },
});
