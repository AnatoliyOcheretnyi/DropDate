"use client";

import { useEffect, useRef, useState } from "react";
import type { PersonRole } from "../../../shared/lib/release";
import type { ToastTone } from "../../../shared/hooks/useToasts";
import type { RoleFollow } from "../hooks/usePersonDetails";

type Props = {
  activeRole: PersonRole;
  roleFollows: RoleFollow[];
  onToggleLikeFor: (role: PersonRole) => void;
  onToggleSubscribeFor: (role: PersonRole) => void;
  onToast: (message: string, tone: ToastTone, undo: () => void) => void;
};

type MenuAction = "like" | "subscribe";

export function PersonFollowControls({
  activeRole,
  roleFollows,
  onToggleLikeFor,
  onToggleSubscribeFor,
  onToast,
}: Props) {
  const [open, setOpen] = useState<MenuAction | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const multiRole = roleFollows.length > 1;
  const anyLiked = roleFollows.some((entry) => entry.liked);
  const anySubscribed = roleFollows.some((entry) => entry.subscribed);
  const soleRole = roleFollows[0]?.role ?? activeRole;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isOn = (action: MenuAction, entry: RoleFollow) =>
    action === "like" ? entry.liked : entry.subscribed;

  const toggleRole = (action: MenuAction, role: PersonRole) =>
    action === "like" ? onToggleLikeFor(role) : onToggleSubscribeFor(role);

  const message = (action: MenuAction, turningOn: boolean, scope: string) => {
    if (action === "like") {
      return turningOn
        ? `Додано в улюблені — ${scope}`
        : `Прибрано з улюблених — ${scope}`;
    }
    return turningOn
      ? `Стежиш за новинками — ${scope}`
      : `Підписку скасовано — ${scope}`;
  };

  // Applying a choice collapses the pill and offers an undo: every affected role
  // is a plain toggle, so replaying the same flip reverses it.
  const commit = (
    action: MenuAction,
    roles: PersonRole[],
    turningOn: boolean,
    scope: string
  ) => {
    const flip = () => roles.forEach((role) => toggleRole(action, role));
    flip();
    setOpen(null);
    onToast(message(action, turningOn, scope), turningOn ? "success" : "warning", flip);
  };

  const commitRole = (action: MenuAction, entry: RoleFollow) =>
    commit(action, [entry.role], !isOn(action, entry), entry.label);

  // "Both" drives every role to the same state: off if all are on, on otherwise.
  const commitBoth = (action: MenuAction) => {
    const allOn = roleFollows.every((entry) => isOn(action, entry));
    const roles = roleFollows
      .filter((entry) => allOn || !isOn(action, entry))
      .map((entry) => entry.role);
    commit(action, roles, !allOn, "обидві ролі");
  };

  // A click either toggles the sole role directly, or splits the button open.
  const press = (action: MenuAction) => {
    if (multiRole) {
      setOpen((prev) => (prev === action ? null : action));
      return;
    }
    const entry = roleFollows[0];
    const label =
      entry?.label ?? (soleRole === "director" ? "Режисер" : "Актор");
    commit(action, [soleRole], entry ? !isOn(action, entry) : true, label);
  };

  const renderSplit = (action: MenuAction) => {
    const allOn = roleFollows.every((entry) => isOn(action, entry));

    return (
      <div
        className="person-follow__split"
        role="group"
        aria-label={action === "like" ? "Улюблений як" : "Стежити як"}
      >
        <span className="person-follow__split-label" aria-hidden="true">
          {action === "like" ? "♥" : "🔔"}
        </span>

        {roleFollows.map((entry, index) => {
          const on = isOn(action, entry);
          return (
            <button
              key={entry.role}
              type="button"
              aria-pressed={on}
              className={`person-follow__chip${on ? " is-on" : ""}`}
              style={{ "--i": index } as React.CSSProperties}
              onClick={() => commitRole(action, entry)}
            >
              {entry.label}
              {entry.role === activeRole ? (
                <span className="person-follow__chip-tag">зараз</span>
              ) : null}
              <span className="person-follow__chip-check" aria-hidden="true">
                {on ? "✓" : ""}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={allOn}
          className={`person-follow__chip person-follow__chip--both${
            allOn ? " is-on" : ""
          }`}
          style={{ "--i": roleFollows.length } as React.CSSProperties}
          onClick={() => commitBoth(action)}
        >
          І так, і так
        </button>

        <button
          type="button"
          className="person-follow__close"
          aria-label="Згорнути"
          style={{ "--i": roleFollows.length + 1 } as React.CSSProperties}
          onClick={() => setOpen(null)}
        >
          ✕
        </button>
      </div>
    );
  };

  const renderButton = (action: MenuAction) => {
    const on = action === "like" ? anyLiked : anySubscribed;
    const label =
      action === "like"
        ? on
          ? "У колекції"
          : "Улюблений"
        : on
          ? "Стежу за новинками"
          : "Стежити за новинками";

    return (
      <button
        type="button"
        className={`${action === "like" ? "person-like" : "person-subscribe"}${
          on ? " is-active" : ""
        }${open && open !== action ? " is-muted" : ""}`}
        aria-pressed={multiRole ? undefined : on}
        aria-expanded={multiRole ? false : undefined}
        onClick={() => press(action)}
      >
        <span aria-hidden="true">
          {action === "like" ? (on ? "♥" : "♡") : "🔔"}
        </span>
        {label}
      </button>
    );
  };

  return (
    <div className="person-hero__actions" ref={rootRef}>
      {open === "like" ? renderSplit("like") : renderButton("like")}
      {open === "subscribe"
        ? renderSplit("subscribe")
        : renderButton("subscribe")}
    </div>
  );
}
