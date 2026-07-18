"use client";

import { useState } from "react";
import type { Details } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useFriends } from "../../friends/hooks/useFriends";

export function RecommendToFriend({ details }: { details: Details }) {
  const { accessToken, user } = useAuth();
  const { friends, isLoading } = useFriends();
  const [friendId, setFriendId] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  if (!user || (!isLoading && friends.length === 0)) return null;

  const send = async () => {
    if (!friendId) return;
    setState("sending");
    const response = await fetch("/api/social/recommendations", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ recipientId: friendId, tmdbId: details.id, mediaType: details.mediaType, title: details.title, posterUrl: details.posterUrl, message }),
    });
    if (!response.ok) { setState("error"); return; }
    setState("sent"); setMessage("");
  };

  return <section className="details-section recommend-friend"><div><p className="eyebrow">Від друга краще</p><h2>Порадити цей тайтл</h2><p>Надішли коротку персональну рекомендацію без публічного поста.</p></div><div className="recommend-friend__form"><select value={friendId} onChange={event=>{setFriendId(event.target.value);setState("idle")}}><option value="">Обери друга</option>{friends.map(friend=><option key={friend.user.id} value={friend.user.id}>{friend.user.username||friend.user.email}</option>)}</select><input value={message} maxLength={240} onChange={event=>setMessage(event.target.value)} placeholder="Чому варто подивитися?"/><button disabled={!friendId||state==="sending"} onClick={()=>void send()}>{state==="sending"?"Надсилаємо…":state==="sent"?"Надіслано ✓":"Порадити"}</button>{state==="error"?<span>Не вдалося надіслати.</span>:null}</div></section>;
}
