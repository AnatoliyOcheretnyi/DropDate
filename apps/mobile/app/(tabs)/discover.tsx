import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/shared/theme/colors';
import { AnimatedSection, AnimatedScreenContent } from '../../src/shared/ui/AnimatedScreen';
import { MotionPressable } from '../../src/shared/ui/MotionPressable';
import { NotificationBell } from '../../src/shared/ui/NotificationBell';

const items = [
  { title: 'Настрій', copy: 'Підбір під твій стан зараз', route: '/mood', icon: 'sparkles' },
  { title: 'Кінометч', copy: 'Відповідай і звужуй вибір', route: '/match', icon: 'options' },
  { title: 'Кіногра', copy: 'Порівнюй фільми та набирай серію', route: '/games', icon: 'game-controller' },
  { title: 'Сповіщення', copy: 'Нові релізи з твоїх підписок', route: '/notifications', icon: 'notifications' },
  { title: 'Календар', copy: 'Релізи на тиждень або місяць', route: '/calendar', icon: 'calendar' },
  { title: 'Улюблені люди', copy: 'Актори й режисери, за якими стежиш', route: '/people', icon: 'people' },
] as const;

export default function DiscoverScreen() {
  const router = useRouter();
  return <SafeAreaView style={styles.safe}><NotificationBell /><AnimatedScreenContent><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>DROPDATE DISCOVERY</Text><Text style={styles.title}>Знайди своє наступне кіно</Text><Text style={styles.copy}>Нативні інтерактивні способи відкрити щось цікаве.</Text>
    <View style={styles.list}>{items.map((item,index)=><AnimatedSection key={item.route} index={index}><MotionPressable accessibilityLabel={`${item.title}. ${item.copy}`} onPress={()=>router.push(item.route as Href)} style={styles.card}><View style={styles.icon}><Ionicons name={item.icon} color={colors.accent} size={26}/></View><View style={{flex:1}}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.cardCopy}>{item.copy}</Text></View><Ionicons name="chevron-forward" color={colors.textMuted} size={22}/></MotionPressable></AnimatedSection>)}</View>
  </ScrollView></AnimatedScreenContent></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.background},content:{padding:20,paddingTop:52,paddingBottom:148},eyebrow:{color:colors.accent,fontWeight:'900',letterSpacing:1.4},title:{color:colors.text,fontSize:34,lineHeight:40,fontWeight:'900',marginTop:10},copy:{color:colors.textMuted,fontSize:16,lineHeight:23,marginTop:10},list:{gap:14,marginTop:28},card:{minHeight:88,flexDirection:'row',alignItems:'center',gap:15,padding:16,borderRadius:24,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},icon:{width:50,height:50,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(84,255,182,0.1)'},cardTitle:{color:colors.text,fontSize:19,fontWeight:'800'},cardCopy:{color:colors.textMuted,marginTop:4,lineHeight:19}});
