# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In Progress

## Current Goal

- Feature spec 02 (TBD)

## Completed

- `01-design-system.md` — shadcn/ui installed and configured (Tailwind v4); UI primitives added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea); lucide-react installed; `lib/utils.ts` created with `cn()` helper; `app/globals.css` set up with full dark theme CSS tokens and `@theme inline` Tailwind mappings for project design tokens.

## In Progress

- None yet.

## Next Up

- Feature spec 02 (TBD)

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
