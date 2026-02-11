# Project Context & Rules

## Stack

- Nuxt 4 (Files in /app, Server in /server)
- Prisma + Neon (PostgreSQL)
- CUID2 for IDs (generated in server/utils/prisma.ts)
- Shadcn Nuxt

## Database Rules

- ALWAYS handle Soft Delete: check for `deletedAt: null` in all queries.
- Primary keys are Strings (CUID2).
- Audit fields: `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`, `deletedBy`.

## Code Style

- Vue 3 Composition API (<script setup>).
- Standard UI Components from `app/components/ui`.
- Use `prisma` from `server/utils/prisma.ts`.
