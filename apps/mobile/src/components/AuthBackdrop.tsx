import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { colors } from '../theme/colors';

export function AuthBackdrop() {
  const glowOne = useRef(new Animated.Value(0)).current;
  const glowTwo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (value: Animated.Value, duration: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );

    const loopOne = animate(glowOne, 7200);
    const loopTwo = animate(glowTwo, 8200, 500);
    loopOne.start();
    loopTwo.start();
    return () => {
      loopOne.stop();
      loopTwo.stop();
    };
  }, [glowOne, glowTwo]);

  const glowOneStyle = {
    transform: [
      {
        translateX: glowOne.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -90],
        }),
      },
      {
        translateY: glowOne.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 70],
        }),
      },
      {
        scale: glowOne.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  const glowTwoStyle = {
    transform: [
      {
        translateX: glowTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 110],
        }),
      },
      {
        translateY: glowTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -80],
        }),
      },
      {
        scale: glowTwo.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };

  return (
    <>
      <Animated.View style={[styles.glowTop, glowOneStyle]} pointerEvents="none" />
      <Animated.View style={[styles.glowBottom, glowTwoStyle]} pointerEvents="none" />
    </>
  );
}

const styles = StyleSheet.create({
  glowTop: {
    position: 'absolute',
    top: -160,
    right: -120,
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: 'rgba(91, 255, 200, 0.09)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -180,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
});
