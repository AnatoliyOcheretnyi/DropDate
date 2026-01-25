import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../../shared/theme/colors';
import { copy } from '../../../../shared/strings';

export function HomeHero() {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{copy.hero.eyebrow}</Text>
      <Text style={styles.title}>{copy.appName}</Text>
      <Text style={styles.lead}>{copy.hero.mobileLead}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 6,
    color: colors.eyebrow,
    fontSize: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
  },
  lead: {
    color: colors.lead,
    fontSize: 15,
    lineHeight: 22,
  },
});
