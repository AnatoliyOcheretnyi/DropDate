"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Changing this key replays the enter animation for the new round. */
  roundKey: string | number;
  /** `wrong` shakes the stage once; the CSS handles reduced motion. */
  state?: "idle" | "correct" | "wrong";
  className?: string;
};

/**
 * The single place round animations live. Every game used to bring its own
 * wrapper, so "enter" and "missed" behaved slightly differently in each one.
 */
export function GameStage({ children, roundKey, state = "idle", className }: Props) {
  return (
    <div
      key={roundKey}
      className={`game-stage game-stage--enter${
        state === "wrong" ? " game-stage--missed" : ""
      }${state === "correct" ? " game-stage--hit" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
