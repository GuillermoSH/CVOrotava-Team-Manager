# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **jugadores y staff** del club de voleibol **C.V. Orotava / Voleipuerto** (Puerto de la Cruz, Tenerife). They use the app on phone and desktop to check the season calendar, watch match/training videos, see personal or club payments, and (admins) manage data.

Roles confirmed in code: `admin` vs member (`users.role`), with gender preference for default filters.

## Product Purpose

Private **team manager** for the club: centralize matches, videos, payments, league standings import, and stats so authorized members can operate the season without shared spreadsheets or public social channels.

Success means: only allowlisted emails get in; members quickly find next match / videos / cuota status; admins can create and maintain season data reliably.

## Positioning

Access is gated by a club **email allowlist** (`allowed_emails`) plus Google OAuth—not a public SaaS sports product. The mechanism is “private club tooling for this team,” not generic federation software.

## Operating Context

Workflows in the product today: Google login → dashboard; calendar (list/month); match detail/edit; videos (YouTube links + filters + infinite scroll); payments (player vs admin); stats by season; league standings upload (admin). Auth hooks and middleware enforce allowlist. Deployed as a Next.js app (Vercel per README).

## Capabilities and Constraints

- Auth: Google OAuth via Supabase; allowlist required; admin vs member.
- Matches: CRUD, sets, venues (home / away / outside_island), seasons, gender.
- Videos: YouTube URLs, category match/training, competition, gender, season.
- Payments: player view + admin management.
- Stats and league standings import (admin).
- Stack (existing codebase): Next.js App Router, React, Tailwind, Supabase, Framer Motion, Font Awesome.
- Undecided / open: formal accessibility standard beyond current practice; whether all list pages must share one header component forever (design system work).

## Brand Commitments

- Names: **CVOrotava**, **Team Manager**, **Voleipuerto** / C.V. Orotava.
- Voice: Spanish (es), club-operational, concise.
- Assets: club logo under `public/assets/imgs/voleipuerto_*.webp`; accent red in the design tokens.
- Visual UI details belong in DESIGN.md / code tokens—not expanded here.

## Evidence on Hand

- README product description and feature list.
- Live routes under `src/app/(protected)/` and APIs under `src/app/api/`.
- Club logo images; Google logo SVG.
- No fabricated testimonials, pricing, or external press—do not invent them.

## Product Principles

1. **Private by default** — unauthorized accounts never get a usable session.
2. **Season-first** — filters and views orient around temporada, género, and club calendar reality.
3. **Operate fast on phone** — members check matches/videos/pagos on small screens as often as desktop.
4. **Admin power, member clarity** — write actions for admins; read/scan for everyone else.
5. **One club language** — Spanish copy and club terminology over generic SaaS jargon.

## Accessibility & Inclusion

No formal WCAG target recorded yet. Practical needs: usable on mobile browsers, keyboard focus on controls, readable contrast in light/dark themes already shipped in tokens.

<!--
Init note: AskQuestion/decision tools were unavailable this session. User asked to run init immediately (“haz el init ya”). Facts above are from README + codebase; open items are labeled under Capabilities.
-->
