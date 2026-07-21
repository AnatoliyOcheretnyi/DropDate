"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Details } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useFriends } from "../../friends/hooks/useFriends";

export function RecommendToFriend({ details }: { details: Details }) {
  const { accessToken, user } = useAuth();
  const { friends, isLoading } = useFriends();
  const [isOpen, setIsOpen] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const selected = friends.find((friend) => friend.user.id === friendId);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previous; };
  }, [isOpen]);

  if (!user || (!isLoading && friends.length === 0)) return null;

  const send = async () => {
    if (!friendId) return;
    setState("sending");
    try {
      const response = await fetch("/api/social/recommendations", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ recipientId: friendId, tmdbId: details.id, mediaType: details.mediaType, title: details.title, posterUrl: details.posterUrl, message }),
      });
      if (!response.ok) throw new Error("send failed");
      setState("sent");
      window.setTimeout(() => { setIsOpen(false); setState("idle"); setFriendId(""); setMessage(""); }, 700);
    } catch { setState("error"); }
  };

  return <>
    <button type="button" className="recommend-friend-trigger" onClick={() => setIsOpen(true)}><span aria-hidden="true">↗</span><span><strong>Порадити другу</strong><small>Надіслати приватну рекомендацію</small></span><b aria-hidden="true">›</b></button>
    {isOpen ? createPortal(<div className="recommend-dialog">
      <button type="button" className="recommend-dialog__backdrop" aria-label="Закрити" onClick={() => setIsOpen(false)} />
      <section role="dialog" aria-modal="true" aria-labelledby="recommend-title" className="recommend-dialog__card">
        <header><div><p className="eyebrow">Персональна рекомендація</p><h2 id="recommend-title">Порадити другу</h2></div><button type="button" aria-label="Закрити" onClick={() => setIsOpen(false)}>×</button></header>
        <div className="recommend-dialog__preview">{details.posterUrl ? <Image src={details.posterUrl} alt="" width={66} height={98} /> : null}<div><strong>{details.title}</strong><span>Друг отримає сповіщення та зможе одразу відкрити тайтл.</span></div></div>
        <div className="recommend-dialog__fields">
          <label><span>Кому</span><select autoFocus value={friendId} onChange={(event) => { setFriendId(event.target.value); setState("idle"); }}><option value="">Обери друга</option>{friends.map((friend) => <option key={friend.user.id} value={friend.user.id}>{friend.user.username || friend.user.email}</option>)}</select></label>
          <label><span>Повідомлення <small>{message.length}/240</small></span><textarea value={message} maxLength={240} rows={3} onChange={(event) => { setMessage(event.target.value); setState("idle"); }} placeholder="Чому це варто подивитися?" /></label>
        </div>
        {state === "error" ? <p role="alert" className="recommend-dialog__error">Не вдалося надіслати. Спробуй ще раз.</p> : null}
        <footer><button type="button" className="secondary" onClick={() => setIsOpen(false)}>Скасувати</button><button type="button" className={state === "sent" ? "is-sent" : ""} disabled={!friendId || state === "sending"} onClick={() => void send()}>{state === "sending" ? "Надсилаємо…" : state === "sent" ? "Надіслано ✓" : `Порадити${selected ? ` ${selected.user.username || "другу"}` : ""}`}</button></footer>
      </section>
    </div>, document.body) : null}
  </>;
}
