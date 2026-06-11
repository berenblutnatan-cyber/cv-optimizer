# Level-Up Plan — Builder & Optimizer

Ruthless audit, June 2026. Ordered by (revenue risk × user impact) / effort.
"Done" items shipped with the chat-first builder PR.

## P0 — Stop the bleeding (trust & money)

1. **AI endpoints are an open Claude proxy.** `/api/optimize` and
   `/api/optimize-text` have **no auth and no rate limit** — anyone can curl
   them and burn Anthropic spend. `/api/analyze` is explicitly public in
   `proxy.ts`. Fix: require Clerk auth (or KV per-IP limit for the
   try-before-signup flows) on every route that calls Claude.
   *(The new `/api/chat/build` ships auth + KV-limited from day one — use it
   as the template.)*

2. **Billing is client-trust.** Credits are decremented by a separate
   client-side call to `/api/use-credit`; the expensive routes themselves
   never check or charge. Skip the client call → free optimizations forever.
   Fix: move check+decrement into `/api/analyze` / `/api/optimize` inside the
   same transaction, exactly like `/api/voice/finalize` already does (it's
   the one route that got this right).

3. **`/api/optimize` parses raw model output with `JSON.parse`.** No
   balanced-JSON extraction, no truncation detection — the same 500-storm
   that was fixed for `/api/analyze` in #40 is still live here. Fix: share
   `extractBalancedJson` + truncation check.

## P1 — Builder: chat-first is the product

- ✅ **Done:** `/build/chat` — streaming interviewer that patches the CV live
  via tool calls (`lib/chat/cvTools.ts` reducer, shared server/client),
  type-or-talk composer (Web Speech dictation), completeness meter,
  persisted transcript, finish → existing review/export. Entry points
  (dashboard, /start, sidebar) now lead with chat; `/build` → `/build/chat`.
- **Upload into chat.** Drop an old CV / LinkedIn PDF into the conversation;
  parse (unpdf is already a dep) and let the agent mine it in one turn. This
  merges the "upload" and "build" funnels into one interface.
- **Tailor while building.** "Paste a job post" chip → agent reorders
  emphasis, injects matching keywords into bullets it already wrote, and
  explains the gap. This is the bridge to the optimizer.
- **Port live-patching back to voice.** The voice call only builds the CV at
  finalize; reuse the chat tool layer so the preview grows *during* the call
  (same `applyCvToolCall`, fed from a realtime tool-call channel).
- **FloatingAIAssistant is fake.** It returns `[Improved] ${text}` after a
  1.5s sleep (components/builder/FloatingAIAssistant.tsx:134). Wire it to
  `/api/optimize-text` or delete it before someone notices.
- **Kill the placeholder summary.** `initialResumeState.summary` ships
  "Results-driven professional with [X]…" into previews and exports. Chat
  flow now strips it (`isPlaceholderSummary`); the wizard should too —
  placeholder belongs in the textarea's `placeholder` attr, not in data.

## P2 — Optimizer: from one-shot score to a loop

- **Eval harness before prompt edits.** The scoring prompt is a hand-rolled
  rubric with hard caps and zero regression protection. Build a golden set
  (~10 CV+JD pairs with expected score bands) and a script that runs them;
  no more blind prompt tweaks.
- **Make improvements actionable.** Score → improvement list → each one
  should be a one-click *apply* that patches `ResumeData` through the same
  `cvTools` reducer the chat uses. Optimizer output and builder data
  converge on one model; today the optimizer rewrites text blobs the builder
  can't ingest.
- **One optimizer, not three.** `/api/optimize`, `/api/analyze`,
  `/api/optimize-with-skills`, `lib/multiRole.ts` each carry their own
  prompt fork. Extract a shared scoring/rewriting module with one rubric.

## P3 — Platform hygiene

- `app/builder/page.tsx` is 1,512 lines, `EditableResumePreview.tsx` 2,751 —
  split before they rot further.
- Two store dirs (`store/`, `stores/`) — merge.
- `next lint` is broken under Next 16 (no flat config); zero tests in repo.
  Adopt eslint flat config + vitest; first test already exists in spirit
  (the `cvTools` reducer smoke test from the chat-builder PR review).
- Dep bloat: `ai@3`, `openai`, `@google/generative-ai`, plus four PDF/doc
  libs (`html2canvas`, `jspdf`, `pdf-lib`, `docx`). Audit what's actually
  imported.
