import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

type Props = {
  title: string;
  titleSize?: number;
  leadSize?: number;
};

export function AuthHero({ title, titleSize = 32, leadSize = 14 }: Props) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
      <Text style={[styles.title, { fontSize: titleSize }]}>{title}</Text>
      <Text style={[styles.lead, { fontSize: leadSize }]}>{copy.hero.mobileLead}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    maxWidth: 320,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 5,
    color: colors.eyebrow,
    fontSize: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 14,
    lineHeight: 20,
  },
});
