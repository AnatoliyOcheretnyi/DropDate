# Frontend Learning Checklist (Next.js / Web)

Це список тем, які **відрізняються від React Native** і потрібні для веб‑фронта в цьому проєкті.
Став галочки, щоб відмічати прогрес.

## 1) База веб‑платформи (на відміну від RN)
- [ ] HTML семантика: `header`, `main`, `section`, `button`, `nav`
- [ ] Форми: `form`, `input`, `button`, submit‑поведінка
- [ ] Доступність: `aria-label`, focus, клавіатурна навігація
- [ ] SEO основи: title/description, robots/sitemap

## 2) CSS (веб‑відмінності)
- [ ] Box model, margin/padding, `display: flex/grid`
- [ ] `position`, z‑index, stacking context
- [ ] Responsive: media queries, `clamp()`, `min()/max()`
- [ ] Hover/focus стилі, transitions/animations
- [ ] Scroll behaviors: overflow, sticky, smooth scrolling

## 3) Next.js (App Router)
- [ ] `app/` структура, `layout.tsx`, `page.tsx`
- [ ] Server vs Client components (`"use client"`)
- [ ] Routing: dynamic routes `[id]`
- [ ] `next/navigation` (router, search params)
- [ ] Metadata API (SEO)
- [ ] `app/api/*` (Route Handlers)

## 4) SSR/CSR/Static
- [ ] SSR vs CSR vs SSG (коли що використовується)
- [ ] `force-dynamic`, `revalidate`, кешування fetch
- [ ] Hydration issues + `Suspense`

## 5) Data fetching patterns
- [ ] Next Route Handlers (proxy до бекенду)
- [ ] Client fetch + state management (hooks)
- [ ] Debounce (suggestions)
- [ ] Pagination (search results)

## 6) Стан і кеш
- [ ] `localStorage` на вебі
- [ ] Кеш на клієнті vs на сервері
- [ ] Взаємодія з cookies (httpOnly)

## 7) Web‑Auth різниця з mobile
- [ ] httpOnly cookies + SameSite/CSRF
- [ ] CORS / reverse proxy через `/api`

## 8) Інструменти/практики
- [ ] ESLint + autofix
- [ ] Debugging DevTools (Network, Console, Lighthouse)
- [ ] Performance: LCP, CLS, bundle size

## 9) Для цього проєкту (конкретно)
- [ ] Trending grid / carousel
- [ ] Search + filters
- [ ] Details page
- [ ] Saved list + localStorage sync
- [ ] Shared strings module (libs/shared/src/strings.ts)
