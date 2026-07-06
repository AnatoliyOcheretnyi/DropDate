"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

// useLayoutEffect on the client, useEffect on the server (avoids SSR warning).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Reveal({ children, className = "", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Base render is visible so content is never stuck hidden if JS is off/broken.
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    // JS is running — enable the entrance animation before the first paint.
    setArmed(true);

    // Reveal right away if the block is already within (or above) the viewport.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const classes = ["reveal"];
  if (armed) {
    classes.push("reveal--armed");
  }
  if (visible) {
    classes.push("reveal--in");
  }
  if (className) {
    classes.push(className);
  }

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
