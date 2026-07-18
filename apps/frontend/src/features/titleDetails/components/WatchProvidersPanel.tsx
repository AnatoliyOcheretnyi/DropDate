"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { WatchAvailability, WatchProvider } from "../../../shared/lib/release";

const COUNTRY_KEY = "dropdate:watch-country";
const SERVICES_KEY = "dropdate:watch-services";
const COUNTRIES = [["UA","Україна"],["PL","Польща"],["DE","Німеччина"],["GB","Британія"],["US","США"],["FR","Франція"]] as const;

function ProviderRow({title,items,preferred,onToggle}:{title:string;items?:WatchProvider[];preferred:number[];onToggle:(id:number)=>void}) {
  if(!items?.length)return null;
  const sorted=[...items].sort((a,b)=>Number(preferred.includes(b.id))-Number(preferred.includes(a.id)));
  return <div className="watch-providers__row"><strong>{title}</strong><div>{sorted.map(item=><button type="button" className={preferred.includes(item.id)?"is-preferred":""} key={item.id} title={`${item.name} · натисни, щоб змінити пріоритет`} onClick={()=>onToggle(item.id)}>{item.logoUrl?<Image src={item.logoUrl} alt={item.name} width={42} height={42}/>:null}<small>{item.name}</small></button>)}</div></div>;
}

export function WatchProvidersPanel({providers}:{providers?:Record<string,WatchAvailability>}) {
  const[country,setCountry]=useState("UA");const[preferred,setPreferred]=useState<number[]>([]);
  useEffect(()=>{setCountry(window.localStorage.getItem(COUNTRY_KEY)||"UA");try{setPreferred(JSON.parse(window.localStorage.getItem(SERVICES_KEY)||"[]"))}catch{}},[]);
  const selectCountry=(value:string)=>{setCountry(value);window.localStorage.setItem(COUNTRY_KEY,value)};
  const toggle=(id:number)=>setPreferred(current=>{const next=current.includes(id)?current.filter(item=>item!==id):[...current,id];window.localStorage.setItem(SERVICES_KEY,JSON.stringify(next));return next});
  const availability=providers?.[country];
  return <section className="watch-providers details-section"><div className="watch-providers__head"><div><p className="eyebrow">Доступність</p><h2>Де дивитися</h2></div><select aria-label="Країна доступності" value={country} onChange={event=>selectCountry(event.target.value)}>{COUNTRIES.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></div>
    {availability?<><p className="watch-providers__hint">Натисни сервіс, щоб зробити його улюбленим.</p><ProviderRow title="За підпискою" items={availability.stream} preferred={preferred} onToggle={toggle}/><ProviderRow title="Безкоштовно" items={availability.free} preferred={preferred} onToggle={toggle}/><ProviderRow title="Оренда" items={availability.rent} preferred={preferred} onToggle={toggle}/><ProviderRow title="Купівля" items={availability.buy} preferred={preferred} onToggle={toggle}/>{availability.link?<a href={availability.link} target="_blank" rel="noreferrer">Перевірити всі варіанти на TMDB ↗</a>:null}</>:<p className="watch-providers__empty">Для вибраної країни TMDB поки не має інформації про доступність.</p>}
    <small className="watch-providers__credit">Дані про доступність надає JustWatch через TMDB.</small>
  </section>;
}
