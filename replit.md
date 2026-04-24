# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a two-phase web game: "Parrot Panic!".

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Parrot Panic! Game (`artifacts/parrot-game`)
- **Preview path**: `/`
- **Type**: react-vite, frontend-only (no backend)
- **Description**: Two-phase web game
  - Phase 1: 8-question multiple choice quiz (+2s per correct answer)
  - Phase 2: Parrot survival game — dodge falling objects until time runs out
  - Final screen with rank based on survival time
- **Key files**:
  - `src/data/questions.ts` — Quiz questions and game constants
  - `src/pages/StartScreen.tsx` — Landing/intro screen
  - `src/pages/QuizScreen.tsx` — Quiz phase
  - `src/pages/GameScreen.tsx` — Survival game (canvas-based with RAF loop)
  - `src/pages/ResultScreen.tsx` — Results and ranking
- **Controls**: Arrow keys / WASD (desktop), tap buttons or swipe (mobile)
- **Ranks**: Legendary Parrot → Ultra Parrot → Super Parrot → Decent Parrot → Rookie Bird → Feathered Mess

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
