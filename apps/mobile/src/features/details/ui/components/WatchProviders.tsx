import { useMemo, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { WatchAvailability, WatchProvider } from '../../../../shared/types/release';
import { useTheme } from '../../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../../shared/theme/palette';
import { MotionPressable } from '../../../../shared/ui/MotionPressable';

const countries = [['UA', 'Україна'], ['PL', 'Польща'], ['DE', 'Німеччина'], ['GB', 'Британія'], ['US', 'США'], ['FR', 'Франція']] as const;

export function WatchProviders({ providers }: { providers?: Record<string, WatchAvailability> }) {
  const { colors } = useTheme(); const styles = useMemo(() => makeStyles(colors), [colors]);
  const [country, setCountry] = useState('UA'); const [picker, setPicker] = useState(false);
  const value = providers?.[country];
  const rows: [string, WatchProvider[] | undefined][] = [['За підпискою', value?.stream], ['Безкоштовно', value?.free], ['Оренда', value?.rent], ['Купівля', value?.buy]];
  const hasItems = rows.some(([, items]) => items?.length);
  return <View style={styles.section}><View style={styles.head}><View style={styles.grow}><Text style={styles.eyebrow}>ДОСТУПНІСТЬ</Text><Text style={styles.title}>Де дивитися</Text></View><MotionPressable style={styles.country} onPress={() => setPicker(true)}><Text style={styles.countryText}>{countries.find(x => x[0] === country)?.[1]}</Text><Ionicons name="chevron-down" size={16} color={colors.textMuted}/></MotionPressable></View>
    {hasItems ? rows.map(([label, items]) => items?.length ? <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><View style={styles.providers}>{items.map(item => <MotionPressable key={item.id} style={styles.provider} accessibilityLabel={item.name} onPress={() => value?.link && void Linking.openURL(value.link)}>{item.logoUrl ? <Image source={{ uri: item.logoUrl }} style={styles.logo}/> : <Text style={styles.fallback}>{item.name[0]}</Text>}<Text numberOfLines={1} style={styles.providerName}>{item.name}</Text></MotionPressable>)}</View></View> : null) : <Text style={styles.empty}>Для цього регіону поки немає даних. Спробуй іншу країну.</Text>}
    <Text style={styles.credit}>Дані JustWatch через TMDB можуть змінюватися.</Text>
    <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}><MotionPressable style={styles.backdrop} onPress={() => setPicker(false)}><View style={styles.sheet} onStartShouldSetResponder={() => true}><Text style={styles.sheetTitle}>Обери країну</Text>{countries.map(([code, name]) => <MotionPressable key={code} style={[styles.choice, code === country && styles.choiceActive]} onPress={() => { setCountry(code); setPicker(false); }}><Text style={styles.choiceText}>{name}</Text>{code === country ? <Ionicons name="checkmark" color={colors.accent} size={20}/> : null}</MotionPressable>)}</View></MotionPressable></Modal>
  </View>;
}
const makeStyles = (c: Palette) => StyleSheet.create({ section:{marginHorizontal:20,marginTop:18,padding:18,gap:16,borderRadius:24,borderWidth:1,borderColor:c.border,backgroundColor:c.card},head:{flexDirection:'row',alignItems:'center',gap:12},grow:{flex:1},eyebrow:{color:c.eyebrow,fontSize:11,fontWeight:'800',letterSpacing:2},title:{color:c.text,fontSize:25,fontWeight:'900',marginTop:5},country:{minHeight:44,flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:13,borderRadius:15,backgroundColor:c.elevated},countryText:{color:c.text,fontWeight:'700'},row:{gap:9},label:{color:c.text,fontWeight:'800'},providers:{flexDirection:'row',flexWrap:'wrap',gap:10},provider:{width:72,alignItems:'center',gap:6},logo:{width:48,height:48,borderRadius:13},fallback:{width:48,height:48,borderRadius:13,textAlign:'center',textAlignVertical:'center',fontSize:20,fontWeight:'900',color:c.accent,backgroundColor:c.accentSoft},providerName:{color:c.textMuted,fontSize:11,textAlign:'center',width:'100%'},empty:{color:c.textMuted,lineHeight:21},credit:{color:c.textMuted,fontSize:11},backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.55)'},sheet:{padding:20,paddingBottom:36,gap:8,borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:c.elevated},sheetTitle:{color:c.text,fontSize:22,fontWeight:'900',marginBottom:8},choice:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,borderRadius:16},choiceActive:{backgroundColor:c.accentSoft},choiceText:{color:c.text,fontSize:16,fontWeight:'700'} });
