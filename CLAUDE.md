# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Neto Bastos is a barbershop booking system: a Turborepo monorepo (Yarn 1.x workspaces) with three apps sharing one domain package:

- `apps/backend` — NestJS + Prisma/PostgreSQL (Neon), deployed to Render.
- `apps/frontend` — Next.js 14 (App Router) + Tailwind, deployed to Render.
- `apps/mobile` — Expo/React Native (SDK 54), distributed via EAS Build/Update.
- `packages/core` (`@neto-bastos/core`) — shared domain types and utils (agendamento/profissional/servico/usuario models, `AgendaUtils`, `DataUtils`, `TelefoneUtils`) consumed by all three apps.

`packages/ui`, `packages/eslint-config`, `packages/typescript-config` are unused Turborepo scaffolding — not wired into any app.

## Critical: rebuild `packages/core` after editing it

Backend, frontend and mobile all import `@neto-bastos/core` from its **compiled** `dist/` output, not from source. Any change under `packages/core/src` is invisible to the other apps until you rebuild:

```bash
yarn workspace @neto-bastos/core build
```

(Mobile's own `eas-build-post-install` script runs this automatically before a native build, but local `dev`/`build` in backend/frontend do not — rebuild manually after touching shared code.)

## Commands

Install once at the repo root: `yarn install`.

```bash
yarn build              # turbo build (all apps)
yarn dev                # turbo dev (all apps, persistent/uncached)
yarn lint                # turbo lint (all apps)
yarn dev:clean           # Windows only: kills stale processes stuck on ports 3000/3001/8081
```

Per-workspace (run from repo root as `yarn workspace <name> <script>`, or `cd` into the app):

```bash
# backend (apps/backend)
yarn workspace backend start:dev        # nest start --watch
yarn workspace backend build            # nest build
yarn workspace backend test             # jest (unit, *.spec.ts)
yarn workspace backend test -- <pattern>  # run a single test file/name
yarn workspace backend test:e2e         # jest --config ./test/jest-e2e.json
yarn workspace backend prisma generate  # regenerate Prisma client after schema/env changes
yarn workspace backend exec prisma migrate dev   # NOTE: `yarn workspace <ws> exec <cmd>` cannot find local binaries in Yarn Classic — prefer `yarn workspace backend prisma migrate dev` (no `exec`)

# frontend (apps/frontend)
yarn workspace frontend dev             # next dev -p 3000
yarn workspace frontend build           # next build
yarn workspace frontend lint            # next lint

# mobile (apps/mobile)
yarn workspace mobile start             # expo start
yarn workspace mobile android           # expo start --android
yarn workspace mobile test              # jest --watchAll (jest-expo preset)
cd apps/mobile && npx tsc --noEmit -p . # typecheck (no dedicated script; run this before shipping)
```

Mobile shipping:
- JS-only changes: OTA update, `npx eas-cli update --branch preview --message "..."`. Verify it actually published with `npx eas-cli update:list --branch preview --limit 1 --json` (the CLI's own success output is unreliable in some sandboxes).
- Changes to native config (`app.json` `android`/`ios` keys, new native modules): full rebuild via `eas build`, needed on both platforms' native runtime.

## Backend architecture

Modules under `apps/backend/src`: `auth`, `agendamento`, `profissional`, `servico`, `notificacao`, `imagem`, `db`.

Most modules go straight from controller to `PrismaService` (`src/db/prisma.service.ts`) with no separate service/repository layer. `agendamento` is the exception — it has its own `agendamento.repository.ts` for its more complex, timezone-sensitive queries, while `agendamento.controller.ts` still holds business logic (status transitions, push notification dispatch) directly.

**Auth/roles**: JWT-based (`auth.guard.ts`), with a `@Roles(...)` decorator (`roles.decorator.ts`) + `roles.guard.ts` checking `RoleUsuario`: `CLIENTE`, `BARBEIRO`, `DONO`, `FUNCIONARIO`.
- `DONO` has full access everywhere.
- `BARBEIRO` manages their own agenda (working days, lunch break, slot duration) and their own appointments.
- `FUNCIONARIO` can view/confirm/cancel/create appointments for *any* professional (agenda management across barbers) but cannot delete appointments and cannot edit professional/service registrations — that stays `DONO`-only.
- A professional (`Profissional`) is linked to a `Usuario` account that may itself have role `DONO` or `FUNCIONARIO` (not just `BARBEIRO`) — code that needs "is this user a professional" must not filter on `role === BARBEIRO` alone, or it will silently exclude professionals whose linked account is DONO/FUNCIONARIO. Filter by `profissionalId` presence, or include all three roles, as appropriate.

**Timezone**: date-only strings (`"YYYY-MM-DD"`) parsed with plain `new Date(...)` land on UTC midnight, which is the *previous* day in `America/Sao_Paulo`. Always anchor incoming date params via `parseDataBrasilia` (in `agendamento.controller.ts`) and compute day boundaries via `DataUtils.limitesDoDiaNoFuso` (in `packages/core`) rather than mixing local/UTC getters.

**Slot generation**: `AgendaUtils.horariosPorIntervalo` (in `packages/core`) generates a professional's bookable time slots from their `tempoSlotMinutos`, lunch break, and working hours — it is not assumed to produce multiples of any fixed number (e.g. 15); UI code must not hardcode that assumption.

## Frontend architecture (`apps/frontend`)

Next.js App Router under `src/app/(paginas)/`, split into `(landing)` (public home), `(usuario)` (login), and `(internas)` (authenticated: `agendamento`, `meus-agendamentos`, `minha-agenda`, `admin`). Shared state lives in `src/data/contexts` (e.g. `ContextoAgendamento`, `ContextoUsuario`) consumed via `src/data/hooks`.

The booking flow (`ProfissionalInput` → `ServicosInput` → `DataInput`) and the admin appointment-creation flow share the same wizard components (`Passos`, `Sumario`, `ClienteInput`) — the admin flow reuses the public wizard rather than duplicating it.

## Mobile architecture (`apps/mobile`)

`src/App.tsx` wraps the app in `SafeAreaProvider`. `src/screens/Principal.tsx` is a custom **top** menu bar (not React Navigation's bottom tabs — deliberately avoided due to Android gesture-nav overlap), switching between `Inicio`, `Agendamento`, `MinhaAgenda` (shown to anyone with a linked `profissionalId` or role `FUNCIONARIO`), and `Usuario` (shown to `DONO`/`BARBEIRO`/`FUNCIONARIO`). State lives in `src/data/contexts` (mirrors the frontend's contexts), consumed via `src/data/hooks`.

Push notifications use Expo + Firebase FCM V1: `google-services.json` (client config, committed) is referenced from `app.json`'s `android.googleServicesFile`; the Firebase Admin service-account key is a server secret uploaded once to EAS credentials, never committed (`apps/mobile/.gitignore` blocks `firebase-adminsdk*.json`). A push token is requested once ever (gated by a local-storage flag) — a user who denies/never grants the OS permission needs to enable it manually in system settings and reopen the app; there's no in-app re-request path.

## Booking wizard UX rule

Both platforms' booking wizards (`Passos` component) have **no manual "next" button** — selecting a value at each step auto-advances to the next step, and completing the final step auto-navigates to the summary/finalize screen. Don't reintroduce a "Próximo"/"Finalizar" button when touching this flow.

## Deployment

- Backend + frontend: Render, auto-deploy on push to `main`. Backend availability is helped by two overlapping keep-alive pings: a GitHub Actions workflow and an external cron-job.org job (every 10 min, 7:00–23:59 America/Bahia) — both are kept intentionally redundant.
- Database: Neon Postgres.
- Mobile: EAS Build (native) / EAS Update (OTA), branch `preview`.
