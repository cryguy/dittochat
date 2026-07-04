# UI Revamp Plan — "Storyforge" visual language

**Scope (locked):** Frontend-only **visual reskin** + a real **appearance system**.
No backend / DB / API changes. The `chats` / `messages` / `prompts` domain stays exactly as-is.

**Reference design:** `design/story-editor-explorations/Story Editor Explorations.dc.html`
(imported from claude.ai/design project `810ff676…`, "AI novel writing platform").

**Architecture decision:** keep the existing plain-CSS + `:root`-token approach in
`frontend/src/styles/index.css`. Do **not** migrate to Tailwind / CSS-modules — no payoff,
high churn, and the design's `var(--accent)` / `var(--prose-*)` model maps 1:1 onto the
current token structure.

---

## Design language (extracted from the mockup)

- **Palette:** OKLCH, warm dark violet-gray. Canvas `oklch(0.13 0.008 285)`, surfaces
  `0.155 → 0.235`, borders `0.24 → 0.31`, text `0.93 / 0.72 / 0.5`. Accent violet
  `oklch(0.58 0.2 292)`.
- **Type (the signature move — prose-first):**
  - `Newsreader` (serif) — **AI prose / message body**
  - `Instrument Sans` — UI chrome
  - `JetBrains Mono` — small uppercase labels ("RECENT STORIES", mode tags)
- **Icons:** thin 2px-stroke line icons (Lucide-style), not Font Awesome solids.
- **Shape:** 9–16px radii, asymmetric message bubbles (`16px 16px 5px 16px`), soft accent
  shadows on filled elements.
- **Theming controls the design ships:** narrative voice (font), reading density (prose
  scale), accent mood — all driven by three CSS vars.

---

## Key decisions (recommendations — flag any you want changed)

1. **Fonts → self-host via `@fontsource`** (`@fontsource/newsreader`,
   `@fontsource/instrument-sans`, `@fontsource/jetbrains-mono`) rather than a Google Fonts
   `<link>`. Rationale: the app is self-hostable (README), so a runtime CDN dependency for
   the *core* typography is a liability; self-hosting works offline and avoids FOUT.
   (Font Awesome is already CDN-loaded, but fonts are more load-bearing.)
2. **Icons → introduce `lucide-react`** for restyled surfaces; matches the design's stroke
   weight exactly and is tree-shakeable. Keep Font Awesome during the transition and migrate
   opportunistically rather than in one big-bang. *Alternative:* stay on FA (lowest churn,
   heavier look).
3. **OKLCH used directly** — supported in all evergreen browsers since ~2023. No hex
   fallback unless we must support old browsers.
4. **Sidebar list subline = relative date only** (`Today`, `Jun 30`). The
   "date · model · persona" subline from the mockup needs a backend field on the chats-list
   endpoint → **deferred** (out of frontend-only scope).
5. **Mode chips (Story / Do / Say / See) — OMIT for now.** They're behavioral (they change
   how input is framed to the model = Tier 2), and dead/disabled controls are bad UX.
   Composer still gets the new styling. *Open question:* keep them as purely-visual anchors?
6. **Appearance state → localStorage**, via a new `AppearanceProvider` that writes the three
   CSS vars onto `document.documentElement`. No backend round-trip.

---

## Phase 0 — Design foundation (tokens, fonts, appearance vars)

Global recolor + typography before touching a single component.

- `frontend/src/styles/index.css` `:root`: **keep token names, swap values to OKLCH.**
  | token | new value |
  |---|---|
  | `--bg-primary` (main pane) | `oklch(0.155 0.008 285)` |
  | `--bg-secondary` (sidebar) | `oklch(0.175 0.01 285)` |
  | `--bg-tertiary` / `--input-bg` | `oklch(0.205 0.012 285)` |
  | `--bg-hover` | `oklch(0.215 0.014 285)` |
  | `--bg-active` | `oklch(0.235 0.014 285)` |
  | `--border-color` | `oklch(0.24 0.012 285)` |
  | `--text-primary/secondary/muted` | `0.93 / 0.72 / 0.5 (0.012 285)` |
  | `--accent` | `oklch(0.58 0.2 292)` |
  | `--sidebar-width` | `260px → 296px` |
  - **Add:** `--bg-canvas` (outer), `--font-ui`, `--font-prose`, `--font-mono`, and the
    three design-driven vars `--prose-font` (voice), `--prose-scale` (density),
    `--accent` (accent) with sensible defaults.
- Fonts: add `@fontsource/*` imports (in `main.tsx` or top of `index.css`), `font-display: swap`.
- `body { font-family: var(--font-ui) }`.
- **New** `frontend/src/contexts/AppearanceContext.tsx` — `{ voice, density, accent }`,
  reads/writes localStorage, applies to `:root` via effect. Add to the provider tree in
  `frontend/src/App.tsx`.
- ✅ Outcome: whole app recolors + retypes for free via existing class rules.

## Phase 1 — Shell (sidebar + header)

- `sidebar/Sidebar.tsx` — brand row (Lucide `Sparkles` + app name), **search input**
  (client-side filter), restyled New Chat / Import.
- `sidebar/ChatList.tsx` — "RECENT" mono-uppercase label, filter by search query, item =
  title + relative-date subline, active item with accent left-bar.
- `sidebar/SidebarFooter.tsx` — restyled user card (gradient avatar + name + role/plan) and
  action row.
- `layout/Header.tsx` — current-chat title + subtitle, restyle `ModelDropdown` +
  `PromptDropdown` to the pill style, keep hamburger, optional right-side avatar.

## Phase 2 — Conversation (messages, thinking, composer)

- `chat/MessageItem.tsx` + `chat/MessageList.tsx` — assistant avatar tile (accent rounded
  square + sparkle); user message = accent bubble, right-aligned, asymmetric radius;
  assistant = full-width **serif prose**; header line `Assistant · {model} · {preset} · time`;
  action row **adds Copy** (keep Edit / Retry); generating indicator = blinking accent caret
  + "…is writing" pulse (replaces the current text-only growth).
- `chat/MessageContent.tsx` — `.assistant-content` renders in `var(--prose-font)` at
  `calc(var(--prose-scale) * 18px)`.
- `chat/ThinkingBlock.tsx` — restyle to a bordered card: chevron + "Thinking" + optional
  duration. (Feature already works; CSS-only.)
- `chat/ChatInput.tsx` — restyle input + send button (per decision 5 re: mode chips).
- ⚠️ **virtua:** item heights change with serif + density. `VList` measures dynamically, but
  verify no clipping and that a **density change forces re-measure** (may need a cache reset /
  key bump on `--prose-scale` change).

## Phase 3 — Appearance UI + modal polish

- `settings/SettingsModal.tsx` — **new "Appearance" section**: three segmented controls
  bound to `AppearanceContext` — Voice (Literary / Modern / Typewriter), Density (Cozy /
  Comfortable / Spacious), Accent (Native / Ember / Violet / Aqua / Rose).
- Restyle remaining surfaces to the new tokens (mostly inherited): `import/ImportModal`,
  `admin/AdminPanel`, `auth/AuthScreen`, `settings/PromptSettings`.
- Welcome/empty state, scrollbars, `@media (max-width: 768px)` responsive pass.
- `frontend/index.html` — update `<title>`, decide FA keep/remove.

---

## Risks / things to verify

- OKLCH browser support (fine on evergreen; flag if old targets matter).
- virtua re-measurement on font/density change (Phase 2).
- Accent contrast/a11y — light text on filled accent (design already tuned the 5 accents for this).
- Font FOUT — `font-display: swap` + self-host.

## Explicitly deferred (Tier 2/3 — NOT in this plan)

- Renaming `chats → stories` in domain / routes / DB.
- Personas as first-class entities, World Bible (lorebook), Do/Say/See behavior,
  chapters / autosave.
- Per-chat model+persona metadata in the sidebar list (needs a backend list-endpoint field).

## Rough effort

Phase 0 small · Phase 1 medium · Phase 2 medium-large (message rendering is the heart) ·
Phase 3 small-medium. Each phase is independently shippable and reviewable.
