# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In Progress

## Current Goal

- Feature spec 10 (next up)

## Completed

- `01-design-system.md` — shadcn/ui installed and configured (Tailwind v4); UI primitives added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea); lucide-react installed; `lib/utils.ts` created with `cn()` helper; `app/globals.css` set up with full dark theme CSS tokens and `@theme inline` Tailwind mappings for project design tokens.
- `02-editor.md` — Editor chrome shell: `EditorNavbar` (fixed top bar, `PanelLeftOpen`/`PanelLeftClose` sidebar toggle, `isSidebarOpen`/`onSidebarToggle` props) and `ProjectSidebar` (fixed floating overlay, slides in from left, My Projects / Shared tabs with empty states, New Project button). Both in `components/editor/`. No TypeScript errors.
- `03-auth.md` — Clerk auth wiring: `@clerk/nextjs` + `@clerk/ui` installed; `ClerkProvider` wraps root layout with dark theme from `@clerk/ui/themes` and CSS variable overrides; `proxy.ts` at project root uses `clerkMiddleware` with public routes from env vars; sign-in and sign-up pages at `/sign-in` and `/sign-up` with two-panel layout (left: logo/tagline/feature list, right: Clerk form; mobile: form only); home page redirects authenticated → `/editor`, unauthenticated → `/sign-in`; `UserButton` added to editor navbar right section.
- `04-project-dialogs.md` — Editor home screen (heading + description + New Project button); `useProjectDialogs` hook managing dialog/form/loading state; Create (live slug preview), Rename (prefilled + auto-focus + Enter submits), Delete (destructive) dialog components in `components/editor/project-dialogs.tsx`; `ProjectDialogsContext` so the editor page can call `openCreate`; sidebar updated with mock project items, hover-reveal Rename/Delete actions for owned projects, mobile backdrop scrim; all wired in `EditorShell`. No TypeScript errors, clean build.
- `05-prisma.md` — `prisma/models/project.prisma` with `Project` and `ProjectCollaborator` models (status enum, cascade delete, unique/index constraints); `lib/prisma.ts` cached singleton branching on `prisma+postgres://` prefix (Accelerate via `accelerateUrl`) vs direct `@prisma/adapter-pg`; `@prisma/adapter-pg` and `pg` installed; initial migration applied (`20260505052102_init`); client regenerated; clean build.
- `06-project-apis.md` — REST API routes for projects: `GET /api/projects` (list owner's projects); `POST /api/projects` (create, defaults name to "Untitled Project"); `PATCH /api/projects/[projectId]` (rename, owner-only); `DELETE /api/projects/[projectId]` (delete, owner-only). Auth via `auth()` from `@clerk/nextjs/server`; 401 for unauthenticated, 403 for non-owner mutations. Clean build.
- `07-wire-editor-home.md` — Wired editor home to real project API. `lib/projects.ts` data helper (`getOwnedProjects`, `getSharedProjects`). `hooks/use-project-actions.ts` manages dialog state + API mutations (create → POST with slug-based roomId → navigate; rename → PATCH → refresh; delete → DELETE → redirect if active, else refresh). `app/editor/layout.tsx` converted to async server component: fetches owned + shared projects server-side via Clerk auth + Prisma, passes to `EditorShell` as props. `POST /api/projects` updated to accept optional `id` so project ID and Liveblocks room ID stay aligned. `CreateProjectDialog` shows full room ID preview (`slug-suffix`). Clean build.
- `08-editor-workspace-shell.md` — Workspace shell at `/editor/[roomId]`. `lib/project-access.ts` with `getCurrentIdentity` (userId + primary email from Clerk) and `getProjectWithAccess` (checks owner or collaborator). `components/editor/access-denied.tsx`: centered lock icon + message + back link. `app/editor/[roomId]/page.tsx`: server component — redirects unauthenticated, shows `AccessDenied` for missing/unauthorized projects, renders `WorkspaceShell`. `components/editor/workspace-shell.tsx`: client component with inner workspace navbar (project name + Share button + AI sidebar toggle), canvas placeholder, and collapsible right AI sidebar placeholder. `ProjectSidebar` updated with `activeProjectId` prop — highlighted via `bg-elevated`; project items are now `Link` elements for navigation. `EditorShell` reads `useParams().roomId` and passes it to `ProjectSidebar` as `activeProjectId`. No TypeScript errors.
- `09-share-dialog.md` — Share dialog wired to the workspace Share button. `app/api/projects/[projectId]/collaborators/route.ts`: GET lists collaborators (owner or collaborator access); POST invites by email (owner only); DELETE removes by email (owner only). All three enrich emails with Clerk display name and avatar via `clerkClient().users.getUserList`. `components/editor/share-dialog.tsx`: Dialog with owner mode (invite input, collaborator list with remove buttons, copy link) and collaborator-only mode (read-only list + copy link). `getProjectWithAccess` in `lib/project-access.ts` updated to return `isOwner` flag. Workspace page passes `isOwner` to `WorkspaceShell`. No local user table. No TypeScript errors.

- Verification (2026-05-05): I reviewed the implementation for the Share dialog and collaborators API. The routes enforce owner-only mutations, list collaborators for owners and collaborators, and enrich collaborator emails using Clerk. The UI `ShareDialog` supports owner invite/remove flows and collaborator read-only view, plus copy-link feedback. No immediate TypeScript or runtime errors were found in the edited files.

## In Progress

- None.

## Next Up

- Feature spec 10

## Open Questions

- None yet.

## Architecture Decisions

- Dark-only theme enforced via CSS custom properties in `globals.css`, mapped to Tailwind v4 utilities via `@theme inline`. No light mode variables or `.dark` class overrides — all values set on `:root`.
- shadcn `--background`, `--foreground`, etc. variables are mapped directly to the project's hex design tokens so shadcn components inherit the correct dark palette without any class toggling.
- `components/ui/*` files are not modified after installation; project-level styling lives in app-level components.

## Session Notes

- Project is a Next.js 16 / React 19 / Tailwind v4 app. Path alias `@/*` maps to project root.
- `globals.css` uses Tailwind v4 `@import "tailwindcss"` syntax (no `tailwind.config.js`).
- shadcn components installed under `components/ui/`. shadcn version 4.6.0.
- `lucide-react@1.14.0` was auto-installed as a shadcn peer dependency.
