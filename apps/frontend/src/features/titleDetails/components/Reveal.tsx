"use client";

import type { CSSProperties, ReactNode } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra delay (ms) applied once the element enters the viewport. */
  delay?: number;
};

export function Reveal({ children, className, delay }: Props) {
  const { ref, shown } = useScrollReveal<HTMLDivElement>();
  const style = delay
    ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
    : undefined;

  return (
    <div
      ref={ref}
      className={`reveal${shown ? " is-in" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
