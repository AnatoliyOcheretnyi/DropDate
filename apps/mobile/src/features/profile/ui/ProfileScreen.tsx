import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../shared/theme/palette';
import { copy } from '../../../shared/strings';
import { ProfileCard } from './components/ProfileCard';
import { ProfileActions } from './components/ProfileActions';
import { useProfileScreen } from '../hooks/useProfileScreen';
import { MotionPressable } from '../../../shared/ui/MotionPressable';
import { ThemeToggle } from '../../../shared/ui/ThemeToggle';
import { NotificationBell } from '../../../shared/ui/NotificationBell';
import { useSaved } from '../../saved/hooks/useSaved';
import { useTasteStore } from '../store/tasteStore';
import { TasteRanker } from './components/TasteRanker';
import { UsernameEditor } from './components/UsernameEditor';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { saved } = useSaved();
  const taste = useTasteStore();
  const {
    user,
    isGuest,
    initials,
    handleSignIn,
    handleResetGuest,
    handleSignOut,
  } = useProfileScreen();

  return (
    <View style={styles.wrapper}>
      <NotificationBell />
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>{copy.auth.profile}</Text>
      <ProfileCard initials={initials} email={user?.email} verified={user?.verified} />
      {user ? <UsernameEditor /> : null}
      <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>{saved.length}</Text><Text style={styles.statLabel}>У списках</Text></View><View style={styles.stat}><Text style={styles.statValue}>{saved.filter(x=>x.listTypes.includes('watched')).length}</Text><Text style={styles.statLabel}>Переглянуто</Text></View><View style={styles.stat}><Text style={styles.statValue}>{saved.filter(x=>x.mediaType==='tv').length}</Text><Text style={styles.statLabel}>Серіали</Text></View></View>
      <ThemeToggle />
      {user ? <View style={styles.menu}>
        <MotionPressable style={styles.menuItem} onPress={() => router.push('/notifications' as Href)}><Ionicons name="notifications-outline" color={colors.accent} size={23}/><Text style={styles.menuText}>Сповіщення</Text><Ionicons name="chevron-forward" color={colors.textMuted} size={20}/></MotionPressable>
        <MotionPressable style={styles.menuItem} onPress={() => router.push('/friends' as Href)}><Ionicons name="people-circle-outline" color={colors.accent} size={23}/><Text style={styles.menuText}>Друзі</Text><Ionicons name="chevron-forward" color={colors.textMuted} size={20}/></MotionPressable>
        <MotionPressable style={styles.menuItem} onPress={() => router.push('/achievements' as Href)}><Ionicons name="trophy-outline" color={colors.accent} size={23}/><Text style={styles.menuText}>Досягнення</Text><Ionicons name="chevron-forward" color={colors.textMuted} size={20}/></MotionPressable>
        <MotionPressable style={styles.menuItem} onPress={() => router.push('/people' as Href)}><Ionicons name="people-outline" color={colors.accent} size={23}/><Text style={styles.menuText}>Улюблені люди</Text><Ionicons name="chevron-forward" color={colors.textMuted} size={20}/></MotionPressable>
        <MotionPressable style={styles.menuItem} onPress={() => router.push('/calendar' as Href)}><Ionicons name="calendar-outline" color={colors.accent} size={23}/><Text style={styles.menuText}>Календар релізів</Text><Ionicons name="chevron-forward" color={colors.textMuted} size={20}/></MotionPressable>
      </View> : null}
      <ProfileActions
        isGuest={isGuest}
        hasUser={Boolean(user)}
        onSignIn={handleSignIn}
        onResetGuest={handleResetGuest}
        onSignOut={handleSignOut}
      />
      {user ? <><TasteRanker title="Жанри" kind="genre" items={taste.genres} onMove={taste.move} onReset={taste.reset}/><TasteRanker title="Країни" kind="country" items={taste.countries} onMove={taste.move} onReset={taste.reset}/></> : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 148,
    gap: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  menu: { gap: 10 },
  menuItem: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  menuText: { flex: 1, color: colors.text, fontWeight: '700', fontSize: 16 },
  stats:{flexDirection:'row',gap:10},stat:{flex:1,padding:14,borderRadius:18,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},statValue:{color:colors.accent,fontSize:24,fontWeight:'900'},statLabel:{color:colors.textMuted,fontSize:12,marginTop:4},
});
