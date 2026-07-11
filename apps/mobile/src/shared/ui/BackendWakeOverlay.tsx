import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { apiRequest } from '../api/client';
import { queryClient } from '../api/queryClient';
import { colors } from '../theme/colors';
import { MotionPressable } from './MotionPressable';

type WakeState = 'probing' | 'waking' | 'failed' | 'idle';

const GRACE_MS = 1_200;
const MAX_WAIT_MS = 45_000;

export function BackendWakeOverlay() {
  const [state, setState] = useState<WakeState>('probing');
  const stopped = useRef(false);
  const startedAt = useRef(Date.now());

  const dismiss = useCallback(() => {
    stopped.current = true;
    setState('idle');
  }, []);

  const probe = useCallback(async () => {
    stopped.current = false;
    startedAt.current = Date.now();
    setState('probing');
    let attempt = 0;

    while (!stopped.current) {
      try {
        await apiRequest('/health', { timeoutMs: 7_000 });
        if (!stopped.current) {
          await queryClient.invalidateQueries();
          setState('idle');
        }
        return;
      } catch {
        if (stopped.current) return;
        if (Date.now() - startedAt.current >= MAX_WAIT_MS) {
          setState('failed');
          return;
        }
        setState('waking');
        attempt += 1;
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(900 + attempt * 700, 5_000)),
        );
      }
    }
  }, []);

  useEffect(() => {
    stopped.current = false;
    const grace = setTimeout(() => {
      setState((current) => current === 'probing' ? 'waking' : current);
    }, GRACE_MS);
    void probe();
    return () => {
      stopped.current = true;
      clearTimeout(grace);
    };
  }, [probe]);

  if (state === 'idle' || state === 'probing') return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(260)}
      style={styles.root}
    >
      <View style={styles.orbit}><View style={styles.dot} /></View>
      <Text style={styles.title}>
        {state === 'failed' ? 'Сервер поки недоступний' : 'Пробуджуємо DropDate'}
      </Text>
      <Text style={styles.copy}>
        {state === 'failed'
          ? 'Можна продовжити в застосунок і повторити спробу пізніше.'
          : 'Сервер готує рекомендації й релізи. Це може зайняти кілька секунд.'}
      </Text>
      <View style={styles.actions}>
        {state === 'failed' ? (
          <MotionPressable style={styles.primary} onPress={() => void probe()}>
            <Text style={styles.primaryText}>Спробувати ще</Text>
          </MotionPressable>
        ) : null}
        <MotionPressable style={styles.secondary} onPress={dismiss}>
          <Text style={styles.secondaryText}>Продовжити без очікування</Text>
        </MotionPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 999, alignItems: 'center', justifyContent: 'center', padding: 34, backgroundColor: 'rgba(5,6,13,0.96)' },
  orbit: { width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: 'rgba(84,255,182,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.8, shadowRadius: 18 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  copy: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10, maxWidth: 340 },
  actions: { width: '100%', maxWidth: 320, gap: 10, marginTop: 24 },
  primary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.accent },
  primaryText: { color: colors.background, fontWeight: '900' },
  secondary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontWeight: '800' },
});
