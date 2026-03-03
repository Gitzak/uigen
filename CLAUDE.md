# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run setup        # First-time setup: install deps, generate Prisma client, run migrations
npm run dev          # Start dev server (Turbopack) at http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run all tests (Vitest)
npx vitest run src/path/to/__tests__/file.test.tsx  # Run a single test file
npm run db:reset     # Reset the SQLite database (destructive)
npx prisma migrate dev  # Apply new schema migrations
npx prisma generate  # Regenerate Prisma client after schema changes
```

## Architecture

### Virtual File System (VFS)

The core abstraction is a **virtual, in-memory file system** (`src/lib/file-system.ts` — `VirtualFileSystem` class). No component files are ever written to disk. The VFS is serialized to/from JSON for transport (API requests) and database persistence (`Project.data` column).

The VFS state lives in `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`), which wraps the whole app and exposes file CRUD operations plus a `refreshTrigger` counter that signals consumers to re-render.

### AI Generation Pipeline

1. **Chat context** (`src/lib/contexts/chat-context.tsx`) calls `POST /api/chat` via Vercel AI SDK `useChat`. It serializes the current VFS and sends it with each request.
2. **API route** (`src/app/api/chat/route.ts`) deserializes the VFS, calls Claude (`claude-haiku-4-5` by default via `src/lib/provider.ts`), and streams back responses.
3. Claude uses two tools:
   - `str_replace_editor` — create/edit files in the VFS (view, create, str_replace, insert commands)
   - `file_manager` — rename/delete files
4. Tool calls stream back to the client; `FileSystemContext.handleToolCall` applies them to the local VFS instance in real time.

When no `ANTHROPIC_API_KEY` is set, `MockLanguageModel` (`src/lib/provider.ts`) is used instead, returning static Counter/Form/Card components.

### Live Preview

`PreviewFrame` (`src/components/preview/PreviewFrame.tsx`) re-renders whenever `refreshTrigger` changes. It calls `createImportMap` from `src/lib/transform/jsx-transformer.ts`, which:
- Transforms all JSX/TSX files via `@babel/standalone`
- Creates blob URLs for each file
- Builds an ES module import map (third-party imports resolved via `https://esm.sh/`)
- Generates a full HTML document injected into a sandboxed `<iframe>` via `srcdoc`

The preview entrypoint defaults to `/App.jsx`. The generation prompt (`src/lib/prompts/generation.tsx`) instructs Claude to always create `/App.jsx` as the root and use `@/` path aliases for local imports.

### Authentication & Persistence

- **Auth**: JWT sessions via `jose`, stored in an httpOnly `auth-token` cookie. Logic in `src/lib/auth.ts`. Middleware (`src/middleware.ts`) protects project routes.
- **Database**: Prisma with SQLite (`prisma/dev.db`). The schema is defined in `prisma/schema.prisma` — reference it whenever you need to understand the structure of data stored in the database. Two models: `User` and `Project`. `Project.messages` stores the full chat history as JSON; `Project.data` stores the serialized VFS.
- **Anonymous users**: Work is tracked client-side via `src/lib/anon-work-tracker.ts` (localStorage). On sign-up, anonymous work can be preserved.
- **Authenticated flow**: `src/app/page.tsx` redirects authenticated users to their most recent project or creates a new one automatically. Project pages live at `src/app/[projectId]/page.tsx`.

### Key Conventions

- Use comments sparingly. Only comment complex or non-obvious code.
- All generated component files should use the `@/` alias for local imports (e.g., `@/components/Button`).
- UI primitives are in `src/components/ui/` (shadcn/Radix-based).
- Server actions are in `src/actions/`.
- The Prisma client is generated into `src/generated/prisma/` (not `node_modules`).
- `node-compat.cjs` is required via `NODE_OPTIONS` for all Next.js commands to polyfill Node.js APIs needed on Windows.
