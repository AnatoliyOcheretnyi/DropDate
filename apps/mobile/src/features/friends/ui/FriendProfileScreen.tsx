import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import type { ListType } from '../../../shared/types/lists';
import { queryKeys } from '../../../shared/api/queryKeys';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import type { Palette } from '../../../shared/theme/palette';
import { FeatureScreen } from '../../../shared/ui/FeatureScreen';
import { MotionPressable } from '../../../shared/ui/MotionPressable';
import { ScreenState } from '../../../shared/ui/ScreenState';
import { AchievementsList } from '../../achievements/ui/AchievementsList';
import type { SavedItem } from '../../saved/store/savedStore';
import { useSaved } from '../../saved/hooks/useSaved';
import { getFriendSaved, getFriends } from '../api/friends';

const listTabs: { key: ListType; label: string }[] = [
  { key: 'watchlist', label: 'Хочу подивитись' }, { key: 'favorite', label: 'Улюблене' },
  { key: 'watched', label: 'Переглянуто' }, { key: 'liked', label: 'Сподобалось' },
  { key: 'disliked', label: 'Не сподобалось' }, { key: 'follow', label: 'Підписка' },
];

export function FriendProfileScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(); const router = useRouter();
  const { colors } = useTheme(); const styles = useMemo(() => makeStyles(colors), [colors]);
  const [view, setView] = useState<'lists' | 'awards'>('lists'); const [list, setList] = useState<ListType>('watchlist');
  const { saved: mine } = useSaved();
  const friends = useQuery({ queryKey: queryKeys.friends, queryFn: ({ signal }) => getFriends(signal), staleTime: 30_000 });
  const saved = useQuery({ queryKey: queryKeys.friendSaved(id), queryFn: ({ signal }) => getFriendSaved(id, signal), enabled: Boolean(id), staleTime: 30_000 });
  const friendship = friends.data?.friends.find(item => item.user.id === id);
  const items = useMemo(() => saved.data ?? [], [saved.data]);
  const counts = useMemo(() => { const result = new Map<ListType, number>(); items.forEach(item => item.listTypes?.forEach(type => result.set(type, (result.get(type) ?? 0) + 1))); return result; }, [items]);
  const mineIds = useMemo(() => new Set(mine.map(item => `${item.mediaType}:${item.tmdbId}`)), [mine]);
  const mutual = items.filter(item => mineIds.has(`${item.mediaType}:${item.tmdbId}`));
  const active = items.filter(item => item.listTypes?.includes(list));
  if (friends.isLoading) return <ScreenState loading title="Відкриваємо профіль" />;
  if (!friendship) return <ScreenState title="Профіль недоступний" message="Можливо, запит у друзі ще не прийнято." onRetry={() => void friends.refetch()} />;
  const label = friendship.user.username || friendship.user.email;
  return <FeatureScreen title={`@${friendship.user.username || 'без нікнейму'}`} subtitle={friendship.user.email}>
    <View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>{label.slice(0, 2).toUpperCase()}</Text></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>Ваш кінопростір</Text><Text style={styles.heroHint}>{friendship.respondedAt ? `Друзі з ${new Date(friendship.respondedAt).toLocaleDateString('uk-UA')}` : 'Друзі у DropDate'}</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stats}><Stat value={items.length} label="у бібліотеці"/><Stat value={items.filter(x=>x.mediaType==='movie').length} label="фільмів"/><Stat value={items.filter(x=>x.mediaType==='tv').length} label="серіалів"/><Stat value={mutual.length} label="спільних"/></ScrollView>
    {mutual.length ? <View style={styles.mutual}><Text style={styles.sectionTitle}>Спільні з тобою</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>{mutual.slice(0, 10).map(item => <Poster key={`${item.mediaType}:${item.tmdbId}`} item={item} onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}` as Href)}/>)}</ScrollView></View> : null}
    <View accessibilityRole="tablist" style={styles.segment}><Segment label="Списки" active={view==='lists'} onPress={()=>setView('lists')}/><Segment label="Нагороди" active={view==='awards'} onPress={()=>setView('awards')}/></View>
    {view === 'awards' ? <AchievementsList friendId={id}/> : <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{listTabs.map(entry => <MotionPressable key={entry.key} style={[styles.chip,list===entry.key&&styles.chipActive]} onPress={()=>setList(entry.key)} accessibilityState={{selected:list===entry.key}}><Text style={[styles.chipText,list===entry.key&&styles.chipTextActive]}>{entry.label} · {counts.get(entry.key)??0}</Text></MotionPressable>)}</ScrollView>{saved.isLoading?<ScreenState loading title="Завантажуємо список"/>:active.length?<View style={styles.grid}>{active.map(item=><Poster key={`${item.mediaType}:${item.tmdbId}`} item={item} wide onPress={()=>router.push(`/title/${item.mediaType}/${item.tmdbId}` as Href)}/>)}</View>:<View style={styles.empty}><Text style={styles.emptyTitle}>Тут поки порожньо</Text><Text style={styles.heroHint}>Друг ще нічого не додав до цього списку.</Text></View>}</>}
  </FeatureScreen>;
}
function Stat({value,label}:{value:number;label:string}){const{colors}=useTheme();return <View style={[base.stat,{backgroundColor:colors.card,borderColor:colors.border}]}><Text style={[base.statValue,{color:colors.accent}]}>{value}</Text><Text style={[base.statLabel,{color:colors.textMuted}]}>{label}</Text></View>}
function Segment({label,active,onPress}:{label:string;active:boolean;onPress:()=>void}){const{colors}=useTheme();return <MotionPressable accessibilityRole="tab" accessibilityState={{selected:active}} style={[base.segmentButton,active&&{backgroundColor:colors.elevated}]} onPress={onPress}><Text style={{color:active?colors.text:colors.textMuted,fontWeight:'800'}}>{label}</Text></MotionPressable>}
function Poster({item,onPress,wide}:{item:SavedItem;onPress:()=>void;wide?:boolean}){const{colors}=useTheme();return <MotionPressable style={[base.poster,wide&&base.posterWide,{backgroundColor:colors.card}]} onPress={onPress} accessibilityLabel={item.title}>{item.posterUrl?<Image source={{uri:item.posterUrl}} style={StyleSheet.absoluteFill}/>:<Text style={[base.fallback,{color:colors.text}]}>{item.title.slice(0,1)}</Text>}<View style={base.posterShade}/><View style={base.posterCopy}><Text numberOfLines={2} style={base.posterTitle}>{item.title}</Text>{item.userRating?<Text style={base.posterRating}>★ {item.userRating}/10</Text>:null}</View></MotionPressable>}
const base=StyleSheet.create({stat:{width:116,padding:14,borderWidth:1,borderRadius:18},statValue:{fontSize:23,fontWeight:'900'},statLabel:{fontSize:11,marginTop:3},segmentButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14},poster:{width:104,height:154,borderRadius:17},posterWide:{width:'47%',height:220},fallback:{fontSize:34,fontWeight:'900',textAlign:'center',marginTop:50},posterShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.18)'},posterCopy:{position:'absolute',left:10,right:10,bottom:10},posterTitle:{color:'#fff',fontWeight:'900',textShadowColor:'#000',textShadowRadius:5},posterRating:{color:'#54ffb6',fontSize:11,fontWeight:'800',marginTop:3}});
const makeStyles=(c:Palette)=>StyleSheet.create({hero:{flexDirection:'row',alignItems:'center',gap:14,padding:16,borderRadius:22,backgroundColor:c.card,borderWidth:1,borderColor:c.border},avatar:{width:68,height:68,borderRadius:23,alignItems:'center',justifyContent:'center',backgroundColor:c.accentSoft},avatarText:{color:c.accent,fontWeight:'900',fontSize:22},heroCopy:{flex:1},heroTitle:{color:c.text,fontSize:18,fontWeight:'900'},heroHint:{color:c.textMuted,lineHeight:19,marginTop:4},stats:{gap:10},mutual:{gap:10},sectionTitle:{color:c.text,fontSize:20,fontWeight:'900'},posterRow:{gap:10},segment:{flexDirection:'row',gap:6,padding:5,borderRadius:18,backgroundColor:c.card},chips:{gap:8},chip:{minHeight:42,justifyContent:'center',paddingHorizontal:14,borderRadius:99,borderWidth:1,borderColor:c.border},chipActive:{backgroundColor:c.accentSoft,borderColor:c.accent},chipText:{color:c.textMuted,fontWeight:'700'},chipTextActive:{color:c.accent},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},empty:{alignItems:'center',padding:28,borderRadius:20,backgroundColor:c.card},emptyTitle:{color:c.text,fontSize:18,fontWeight:'900'}});
