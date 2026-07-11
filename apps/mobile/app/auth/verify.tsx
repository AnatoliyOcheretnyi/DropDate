import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FeatureScreen, featureStyles as s } from '../../src/shared/ui/FeatureScreen';
import { ScreenState } from '../../src/shared/ui/ScreenState';
import { MotionPressable } from '../../src/shared/ui/MotionPressable';
import { apiRequest } from '../../src/shared/api/client';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const run = useCallback(async () => {
    if (!token) { setState('error'); return; }
    setState('loading');
    try {
      await apiRequest(`/auth/verify?token=${encodeURIComponent(token)}`);
      setState('success');
    } catch { setState('error'); }
  }, [token]);
  useEffect(() => { void run(); }, [run]);
  if (state === 'loading') return <ScreenState loading title="Підтверджуємо email" />;
  return <FeatureScreen title={state === 'success' ? 'Email підтверджено' : 'Посилання не спрацювало'} subtitle={state === 'success' ? 'Тепер можна увійти в DropDate.' : 'Посилання могло застаріти або вже бути використане.'}><View style={s.card}>
    {state === 'error' ? <MotionPressable style={s.option} onPress={() => void run()}><Text style={s.optionText}>Спробувати ще</Text></MotionPressable> : null}
    <MotionPressable style={s.button} onPress={() => router.replace('/auth')}><Text style={s.buttonText}>Перейти до входу</Text></MotionPressable>
  </View></FeatureScreen>;
}
