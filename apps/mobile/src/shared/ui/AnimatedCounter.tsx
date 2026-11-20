import { useEffect, useRef, useState } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

const DURATION_MS = 620;
/** Ease-out cubic: fast first, so the final number is readable early. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

type Props = {
  value: number;
  style?: StyleProp<TextStyle>;
  /** Rendered around the number, e.g. `(n) => `${n} днів``. */
  format?: (value: number) => string;
  accessibilityLabel?: string;
};

/**
 * A number that rolls up to its new value. Only worth it on the few counters
 * that represent progress — a streak, an achievement tally — where the jump
 * itself is the reward.
 */
export function AnimatedCounter({
  value,
  style,
  format,
  accessibilityLabel,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(value);
  const frame = useRef<number | null>(null);
  // Where the next roll starts: the digit currently on screen, so a value that
  // changes mid-animation continues from there instead of snapping.
  const shownRef = useRef(value);
  shownRef.current = shown;

  useEffect(() => {
    if (reduceMotion || shownRef.current === value) {
      setShown(value);
      return;
    }
    const start = Date.now();
    const origin = shownRef.current;
    const tick = () => {
      const t = Math.min((Date.now() - start) / DURATION_MS, 1);
      setShown(Math.round(origin + (value - origin) * ease(t)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reduceMotion, value]);

  return (
    <Text
      style={style}
      // The rolling digits would be read out on every frame otherwise.
      accessibilityLabel={accessibilityLabel ?? String(value)}
    >
      {format ? format(shown) : String(shown)}
    </Text>
  );
}
