"use client";

import { useState } from "react";

type Props = {
  /** The Wordle-style text to share/copy. */
  text: string;
};

/**
 * Shares a result via the native share sheet when available, otherwise copies
 * it to the clipboard.
 */
export function ShareResultButton({ text }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Cancelled or unsupported payload — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — nothing else to do.
    }
  };

  return (
    <button type="button" className="games-share" onClick={() => void share()}>
      {copied ? "Скопійовано ✓" : "Поділитись результатом"}
    </button>
  );
}
