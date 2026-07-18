"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useFriends } from "../hooks/useFriends";

type Activity = { type:string; actorId:string; actorName:string; title:string; tmdbId:number; mediaType:string; rating?:number; createdAt:string };
type SharedList = { ID:string; Name:string; Visibility:string; ItemCount:number; MemberCount:number; ShareToken:string };

export function FriendsActivityScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { savedCount } = useSavedReleases();
  const { friends } = useFriends();
  const client = useQueryClient();
  const [tab, setTab] = useState<"activity" | "lists">("activity");
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [invite, setInvite] = useState("");

  const activity = useQuery({
    queryKey: ["friend-activity", user?.id], enabled: Boolean(user && accessToken),
    queryFn: async () => { const r=await fetch("/api/social/activity",{headers:{authorization:`Bearer ${accessToken}`}});const p=await r.json();if(!r.ok)throw new Error(p.message);return p.items as Activity[]; },
  });
  const lists = useQuery({
    queryKey: ["shared-lists", user?.id], enabled: Boolean(user && accessToken),
    queryFn: async () => { const r=await fetch("/api/social/lists",{headers:{authorization:`Bearer ${accessToken}`}});const p=await r.json();if(!r.ok)throw new Error(p.message);return p.items as SharedList[]; },
  });
  const create = useMutation({
    mutationFn: async () => { const r=await fetch("/api/social/lists",{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":"application/json"},body:JSON.stringify({name,visibility})});if(!r.ok)throw new Error("Не вдалося створити список"); },
    onSuccess: () => { setName(""); void client.invalidateQueries({queryKey:["shared-lists",user?.id]}); },
  });
  const activityText = (item: Activity) => item.type === "rating" ? `оцінив(ла) «${item.title}» на ${item.rating}/10` : item.type === "save" ? `додав(ла) «${item.title}» до колекції` : item.type === "recommendation" ? `порадив(ла) тобі «${item.title}»` : "тепер у твоїх друзях";
  const addMember = async (listId:string) => { if(!invite)return;await fetch("/api/social/lists/members",{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":"application/json"},body:JSON.stringify({listId,userId:invite,role:"editor"})});setInvite("");void client.invalidateQueries({queryKey:["shared-lists",user?.id]}); };

  return <main className="page page--friends"><AppPageShell active="home" savedCount={savedCount} onChange={view=>router.push(view==="saved"?"/saved":"/")} isSearchOpen={false} onSearchToggle={()=>undefined} onSearchClose={()=>undefined}>
    <section className="friends-shell social-hub">
      <div className="friends-hero"><div className="friends-hero__copy"><p className="eyebrow">Разом дивитись цікавіше</p><h1>Активність друзів</h1><p>Рекомендації, оцінки та спільні списки без зайвого соціального шуму.</p></div></div>
      <div className="friend-seg"><button className={tab==="activity"?"is-active":""} onClick={()=>setTab("activity")}>Активність</button><button className={tab==="lists"?"is-active":""} onClick={()=>setTab("lists")}>Спільні списки</button></div>
      {!user ? <div className="friends-empty">Увійди, щоб бачити активність друзів.</div> : tab === "activity" ? <div className="social-feed">
        {activity.isLoading ? <div className="friends-empty">Завантажуємо…</div> : (activity.data??[]).map(item=><button key={`${item.type}-${item.actorId}-${item.createdAt}`} onClick={()=>item.tmdbId>0&&router.push(`/title/${item.mediaType}/${item.tmdbId}`)}><strong>{item.actorName}</strong><span>{activityText(item)}</span><time>{new Date(item.createdAt).toLocaleDateString("uk-UA")}</time></button>)}
      </div> : <>
        <form className="social-list-create" onSubmit={event=>{event.preventDefault();if(name.trim())create.mutate();}}><input value={name} onChange={event=>setName(event.target.value)} placeholder="Наприклад, Вечір п'ятниці"/><select value={visibility} onChange={event=>setVisibility(event.target.value)}><option value="private">Приватний</option><option value="friends">Для друзів</option><option value="public">Публічний</option></select><button disabled={create.isPending}>Створити</button></form>
        <div className="social-list-grid">{(lists.data??[]).map(list=><article key={list.ID}><p className="eyebrow">{list.Visibility}</p><h3>{list.Name}</h3><span>{list.ItemCount} тайтлів · {list.MemberCount} учасників</span>{list.Visibility==="public"?<a href={`/shared/${list.ShareToken}`}>Публічне посилання</a>:null}<div className="social-list-invite"><select value={invite} onChange={event=>setInvite(event.target.value)}><option value="">Додати друга</option>{friends.map(friend=><option key={friend.user.id} value={friend.user.id}>{friend.user.username||friend.user.email}</option>)}</select><button disabled={!invite} onClick={()=>void addMember(list.ID)}>+</button></div></article>)}</div>
      </>}
    </section>
  </AppPageShell></main>;
}
