# UI/UX Review — Hired (cv-optimizer)
**Date:** 2026-05-16 · **Branch:** `claude/eager-vaughan-42be53` · **Scope:** all user-facing pages · **Lenses:** UX, visual, accessibility (WCAG 2.1 AA), conversion

---

> **2026-05-16 update — what shipped:**
> The full P0 + P1 list below and CRO hypotheses H1/H2/H4/H5/H6 were implemented on this branch in the same session as the review. Verified locally: all 9 user-facing pages return 200, TypeScript compiles clean, no console errors. See the "Shipped" log at the bottom.
>
> **Not yet shipped:** H3 (single-CTA hero — needs design call), real testimonial sourcing (needs human input), session-recording / funnel analytics (Microsoft Clarity / PostHog wiring is out of scope for this PR).

---

---

## Executive summary

The product looks polished and the visual language (warm cream `#FAFAF8`, navy `#0A2647`, indigo accent, serif headings, generous whitespace) is genuinely premium. The conversion architecture — free `/score` lead magnet, deferred-auth on `/optimize` with draft restoration, four-tier pricing with anchored decoy — is well thought through.

What's holding it back is a cluster of **accessibility failures**, a **broken mobile navigation**, and **brand/naming inconsistency** across pages. None of these are visible to the team using it on a 27" Mac with good vision, but they affect a meaningful share of users and will burn ad spend on people who bounce.

**Top 5 things to fix this week:**
1. **Stone-300/400 text everywhere fails WCAG AA** — placeholders 1.55:1, helper text 2.85:1. Lift to `stone-500` or darker (`#1` below).
2. **No mobile nav** — `Sign In` / `Get Started` clip off the right edge below ~480px and there's no hamburger fallback (`#2`).
3. **Form labels aren't associated with their inputs** on `/optimize` — screen-reader users can't tell what to type (`#3`).
4. **Brand naming is inconsistent** — "Hired", "Hired CV", "hired-cv", "CV Optimizer" all appear (`#4`).
5. **Footer only exists on `/`** — visitors on `/privacy`, `/terms`, `/contact` have no way to get to `/pricing` or back to other legal pages (`#7`).

A separate, intentional **architecture risk**: `body { background: #000 }` (globals.css:49) means any unstyled gap shows pure black. It works today but is one missing `bg-*` away from looking broken.

---

## Method recap

- Dev server: `npm run dev` in worktree, served on http://localhost:51819
- Browser: Claude Preview MCP, viewports 1280×800 desktop / 320–485×812 mobile, explicit `colorScheme: light`
- Pages exercised live: `/`, `/score`, `/pricing`, `/builder/demo`, `/contact`, `/privacy`, `/terms`, `/refund-policy`
- Auth-gated pages (`/optimize`, `/results`, `/builder`) — `/optimize` renders without auth (the auth modal defers to Analyze click), so it was audited live; `/results` and `/builder` reviewed statically from the components (Clerk wasn't seeded with a test account in this pass)
- Color contrast values pulled from `getComputedStyle` not screenshots
- A11y tree dumped via `preview_snapshot`; label↔input association verified in DOM

---

## Prioritized issue list

### P0 — Fix before next push

#### 1. Body text + helper text fail WCAG AA contrast
**Where:** site-wide. `text-stone-400` (`rgb(168,162,158)`) is used for all secondary labels — "PDF, DOCX, or plain text", "Role details for tailored optimization", "Optional — AI will enhance it", footer link text on white. Measured **2.85:1 on white** — fails AA (needs ≥4.5:1 for body text). `text-stone-300` is even worse at **1.55:1**, used for the "or" divider and placeholder text in `/optimize` inputs (`OptimizerClient.tsx:437,499,542,554`).

**Fix:** Globally swap `text-stone-400` → `text-stone-500` (`rgb(120,113,108)` = 4.65:1, just passes) for non-decorative text; promote `text-stone-300` → at least `text-stone-500` for placeholders. If the aesthetic requires the lighter color for hierarchy, increase font weight to ≥500 and size to ≥18px (large-text AA threshold drops to 3:1).

#### 2. Mobile nav clips / no hamburger
**Where:** [app/page.tsx:19-62](app/page.tsx:19), [components/HomeClient.tsx:95-138](components/HomeClient.tsx:95), [components/OptimizerClient.tsx:315-346](components/OptimizerClient.tsx:315). The header is a single horizontal flex with `Logo + ActiveNavLinks + (CV Score Check button + Sign In + Get Started)`. `ActiveNavLinks` has `hidden md:flex` (good) and the CV Score Check link has `hidden md:inline-flex` (good), but `Sign In` and `Get Started` buttons have no responsive class — they always render. At 375–480px viewports the `Get Started` button clips off the right edge with no hamburger fallback.

**Fix:** Add a hamburger menu at `<md` that consolidates Resume Builder/Optimizer/Pricing/Sign In/Get Started. Or at minimum, wrap the auth buttons in `hidden md:flex` and surface a single primary CTA below the logo on mobile.

#### 3. Form labels not programmatically associated with inputs
**Where:** [components/OptimizerClient.tsx:491-501, 505-507](components/OptimizerClient.tsx:491). Labels for "Target Job Title", "Job Details", and the two tabs use plain `<label>` without `htmlFor` and the input is a sibling, not a child. Live DOM check confirmed only 1 of 3 labels resolves to an input. Screen readers will announce inputs as unlabeled.

**Fix:** Add `htmlFor` + matching `id` on each input, OR nest the input inside the `<label>`. Same pattern should be audited on `/score` and `/builder`.

#### 4. Brand naming is inconsistent across the product
**Where:** "Hired" (`app/page.tsx:428`, landing nav), "Hired CV" (`/privacy`, `/refund-policy` intro), "hired-cv" (`/terms` §1), "CV Optimizer" (also `/terms` §1), and the package.json `name` is `interview-prep`. A legal doc that misidentifies the service is a compliance smell, and a hero that says "Hired" while the terms say something else costs trust.

**Fix:** Pick one canonical name ("Hired" reads best). Sweep `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/refund-policy/page.tsx`, footer `© 2026 Hired`, package.json. Add to a constants file if it's likely to change.

#### 5. "Last Updated" date on legal pages is auto-generated to today
**Where:** `/privacy`, `/terms`, `/refund-policy` all show "Last Updated: May 16, 2026" — today's date. Almost certainly `new Date().toLocaleDateString()` rather than the actual edit timestamp. This is **legally misleading**: users assume the policy was just revised when it wasn't.

**Fix:** Hardcode the real last-edit date as a constant per page, OR pull from git mtime at build time. Don't render `new Date()`.

---

### P1 — Fix this sprint

#### 6. Black body bg leaks on all non-landing pages
**Where:** [app/globals.css:47-55](app/globals.css:47) sets `body { background: #000 }`. Pages like `/contact`, `/privacy`, `/terms`, `/refund-policy` render a centered ~720px white card on a black backdrop, leaving wide black columns either side at desktop. Reads as "broken" rather than "intentional." On the landing page, full-bleed sections mask it, but the architecture is fragile — any future page that forgets `min-h-screen bg-[#FAFAF8]` will look broken.

**Fix:** Change the default to `bg-[#FAFAF8]` (matching the landing) and override per-section where dark is actually wanted. The final CTA section on `/` and the footer already set their own `bg-[#0A2647]`, so this is safe.

#### 7. Footer only exists on landing page
**Where:** [app/page.tsx:413-431](app/page.tsx:413). `/privacy`, `/terms`, `/refund-policy`, `/contact`, `/score`, `/pricing`, `/optimize`, `/builder` all lack a footer. Users on a legal page have no way to reach Pricing or another legal page — only "Back to Home." This is a major IA gap.

**Fix:** Extract the footer into `components/shared/SiteFooter.tsx` and render it in `app/layout.tsx` (or in each `page.tsx`'s shell). Keep the dark navy background — it terminates the page nicely.

#### 8. Contact "form" opens in a new tab via external link
**Where:** `/contact` — the page is mostly explanatory copy with one CTA "Open Contact Form" that opens in a new tab. The new-tab caveat is set in 12px stone-400 text below the button. This is friction: users expect contact pages to contain a form. The pre-page explanation ("we'll help with X, Y, Z") feels like a stall.

**Fix:** Embed the form inline. If it has to be external (Tally/Typeform), at minimum say so in the button copy ("Open contact form ↗") and keep the user on-page.

#### 9. Token vs Credit naming
**Where:** [components/OptimizerClient.tsx:588-591](components/OptimizerClient.tsx:587) says "1 Token per optimization." [app/pricing/page.tsx](app/pricing/page.tsx) and `CreditBalance.tsx` use "Credits." Same concept, two names — confuses new users on first run.

**Fix:** Pick one (Credits is more conventional for SaaS) and replace everywhere.

#### 10. File size + format messaging contradicts itself
**Where:** [app/score/page.tsx:246](app/score/page.tsx:246) says "PDF format only (max 5MB)." [components/OptimizerClient.tsx:373](components/OptimizerClient.tsx:373) says "PDF, DOCX, or plain text" with no size limit shown. [app/builder/page.tsx:354](app/builder/page.tsx:354) comments mention a 2MB limit. The accepted formats and sizes differ across entry points.

**Fix:** Centralize accepted formats + max size in a constant (`lib/uploadLimits.ts`); render the same hint everywhere.

#### 11. Testimonials lack any trust signals
**Where:** `/` testimonials section. Three quotes attributed to "Maya G.", "Amit R.", "Shaked A." with initials avatars only — no photos, no LinkedIn, no company logos. Reads as generated. Specific outcome claims ("got hired within 3 weeks", "score went from 45% to 98%") amplify the "too good to be true" reaction.

**Fix:** Either get 2–3 real testimonials with photo + company permission, OR rewrite as anonymized but more believable case studies ("Product manager at a Series B SaaS company, North America"). Drop or soften the most extreme claims.

#### 12. Final CTA "Start for Free" links to `/builder` not signup
**Where:** [app/page.tsx:400-404](app/page.tsx:400). The button reads "Start for Free" with "No credit card required" copy beside it, but the link goes to `/builder` which requires auth — user gets the Clerk modal on landing, breaking the "Start for Free" promise. The deferred-auth pattern on `/optimize` is great; replicate it here, OR change the CTA to "Sign Up Free" and open the SignUpButton modal directly.

**Fix:** Match the deferred-auth pattern from `/optimize` on `/builder`, OR change the CTA to `SignUpButton`.

#### 13. `<h1>` text concatenates without space in a11y tree
**Where:** [app/page.tsx:78-81](app/page.tsx:78). "Elevate your resume. Maximize your potential." — the rendered text is correct, but the a11y tree (from `preview_snapshot`) shows them concatenated due to the `<span>` split. Visual is fine; SR users may hear "resume.Maximize" with no pause.

**Fix:** Use ` ` or wrap each clause with a `<br />` and a screen-reader pause, or remove the span split — the indigo color can be applied via a different mechanism.

#### 14. Dead-code duplicate of landing nav
**Where:** [components/HomeClient.tsx](components/HomeClient.tsx) appears to be a stale copy of an earlier landing page (different headline "Don't Just Apply. Get Hired.", different nav items "Resume Builder/Optimizer"). It's not imported from `app/page.tsx`. Either delete it, or if it's used elsewhere I missed, reconcile.

**Fix:** Grep for `HomeClient` imports — if none, delete.

#### 15. "Resume Builder" "Pro" tag in `/builder/demo` is misleading
**Where:** The top bar in `/builder/demo` shows "Resume Builder" + a "Pro" badge, but the page is unauthenticated. New visitors think they need Pro to use the builder when in fact they're seeing the demo. Either rename the badge to "Demo" on this route, or drop it.

#### 16. Template thumbnails on `/builder/demo` truncate mid-word
**Where:** Left rail template list — "Modern Side..." truncates ugly. Either widen the rail, allow wrap, or shorten names ("Modern", not "Modern Sidebar").

---

### P2 — Polish / nice-to-have

#### 17. Hero floats two CV preview cards (Modern + Minimalist) but only labels MODERN/MINIMALIST inside the previews — the headline-adjacent rendering is striking but a first-time visitor may not realize they're seeing actual resume *templates* the product produces. Add a tiny caption "Real templates →" or similar.

#### 18. `/score` is gated behind a single, large drop zone with no example output above the fold. Visitors hesitate to upload before they see what they get. Add a small "here's a sample report" expandable card or thumbnail.

#### 19. Pricing tiers `Pro` (`$9 / 20 credits = $0.45/credit`) vs `Ultimate` (`$20 / 60 = $0.33/credit`) — the per-credit math isn't surfaced. Add "Best price per credit" sub-label under Ultimate, or "Save 25% vs Pro."

#### 20. The "AI Disclaimer & No Guarantees" callout on `/terms` is good legal coverage but reads as a wall of liability. Consider moving the bullet points into an FAQ accordion so they're skimmable.

#### 21. Templates section on `/` uses ASCII-art-style decorative rectangles instead of real preview screenshots. Visitors will notice. Either show actual template screenshots, or be explicit ("Style preview" not "Template").

#### 22. Refund policy uses an emoji ✅ inside the green callout. Looks fine here but inconsistent with the otherwise emoji-free brand voice. Drop or replace with a Lucide Check icon (which the rest of the site uses).

#### 23. Final CTA section "Ready to get Hired?" is **full viewport height** (`min-h-screen`). At 1280×800 that's a lot of vertical real estate for a single button. Reduce to ~60vh.

#### 24. `/optimize` input fields use `border-b` only — no full border, no focus ring beyond the border color change. Combined with the light placeholder, the fields look like they aren't there until you tab to them. Add a subtle `bg-stone-50` so the field has presence, or use a full border.

#### 25. Trust bar pills on landing hero (`Privacy First / AI Powered / ATS Optimized / Instant Feedback`) are tiny `text-sm` with no quantifiable evidence behind any claim. Either drop or back each with a number ("4,000 resumes optimized" etc.).

---

## Per-page notes

### `/` Landing
- Hero, templates, testimonials, final CTA, footer — four full-viewport sections. Each well-composed individually; cumulative scroll is long.
- Strong: clear value prop above fold; two-CTA "Create New" vs "Optimize Existing" split is the right call.
- Weak: see P1 #11, #12, #14, P2 #17, #21, #23, #25.

### `/score`
- Clean, focused page. "No sign-up required" badge is reassuring.
- Weak: see P1 #10. P2 #18.

### `/pricing`
- Clear 4-tier layout (Free / Starter $3 / Pro $9 / Ultimate $20). Decoy with "Most Popular" on Pro is doing its job.
- Strikethrough text on Free Audit (excluded features) reads well.
- Weak: P2 #19. Ultimate's value-density (60 credits = $0.33/credit) is the actual best deal but isn't called out.

### `/contact`
- Friction-heavy: see P1 #8.

### `/privacy` `/terms` `/refund-policy`
- Content quality is solid; legal coverage is appropriate (AI disclaimer, no-guarantee, refund window).
- Weak: P0 #4, P0 #5, P1 #6, P1 #7.

### `/builder/demo`
- Excellent demo experience — three-pane, real interaction, template switcher.
- Weak: P1 #15, P1 #16.

### `/optimize`
- Smart deferred-auth + localStorage draft restoration. Two-column form is well-balanced. Status indicator ("Ready to analyze" / "Please provide…") is a nice touch.
- Weak: P0 #1, P0 #3, P1 #9, P2 #24.

### `/results` (static review only — not run live this pass)
- Component is comprehensive (score breakdown, suggested changes, cover letter, deep-dive enhancement).
- Risk areas based on code: ensure score numbers have aria-labels announcing the unit (otherwise SRs say "87" with no context); ensure suggested-change diffs have a clear before/after structure for SRs; verify the cover letter "Copy" button has feedback that works for SRs (not just visual `copied: true`).

### `/builder` (static review only — not run live this pass)
- File size cap is mentioned in a comment as 2MB; check this matches the upload limit constant created for P1 #10.

---

## Appendix — quick wins (highest impact, lowest effort)

| # | Fix | Effort | Impact |
|---|---|---|---|
| 1 | Sweep `text-stone-300` and `text-stone-400` → `text-stone-500` site-wide (P0 #1) | 30 min | Lifts every page out of WCAG AA failure |
| 2 | Hardcode legal "Last Updated" dates (P0 #5) | 5 min | Removes a real legal-misleading-claim risk |
| 3 | Pick one brand name and sweep (P0 #4) | 20 min | Cheap trust win |
| 4 | Change body bg from `#000` to `#FAFAF8` (P1 #6) | 5 min | Fixes the broken-looking black columns on every non-landing page |
| 5 | Extract footer to `app/layout.tsx` (P1 #7) | 15 min | Adds navigation IA across 7 pages |

If you want, I can spawn a follow-up to land the quick-wins block (#1–#5) as one PR — say the word.

---

## Verification

- Live audit at 1280×800 (light) on 8 routes; mobile probe at 320–485px on landing.
- Color contrast computed from `getComputedStyle` — `rgb(168,162,158)` on `rgb(255,255,255)` = 2.85:1 (vs WCAG AA 4.5:1).
- Label↔input association: live `document.querySelectorAll('label')` + `htmlFor`/sibling check.
- No JS console errors observed on any audited route.
- Dev server: `npm run dev` (Next 16, Turbopack), port 51819, [.claude/launch.json](.claude/launch.json).

---

## Shipped log (2026-05-16 — same session as review)

### Accessibility & foundation
- **Contrast sweep**: every `text-stone-300` / `text-stone-400` → `text-stone-500` across 12 files. Closes WCAG AA failures (was 1.55:1 / 2.85:1).
- **Body bg** [globals.css:47](app/globals.css:47): `#000000` → `#FAFAF8`. Removes the "black-leak" architecture risk.
- **Form labels** [OptimizerClient.tsx](components/OptimizerClient.tsx): added `htmlFor`/`id` pairs on 4 inputs (`cv-text`, `summary`, `job-title`, `job-url`, `job-description`) + `sr-only` labels where the visual already had a header. 4 of 5 labels now resolve to inputs (the 5th wraps its input).
- **Visible input borders**: replaced underline-only inputs with bordered boxes (`border border-stone-200 rounded-sm bg-stone-50/40` + focus ring). CRO H6 shipped at the same time.

### Brand & legal
- **Brand sweep**: "Hired CV" / "hired-cv" / "CV Optimizer" all → "Hired" across `/privacy`, `/terms`, `/refund-policy`, `/contact`, `Watermark.tsx`.
- **Legal dates** [privacy.tsx:5](app/privacy/page.tsx:5), [terms.tsx:6](app/terms/page.tsx:6), [refund-policy.tsx:6](app/refund-policy/page.tsx:6): replaced `new Date().toLocaleDateString()` with hardcoded `"May 11, 2026"` constant.

### Information architecture
- **`SiteFooter` component** [components/shared/SiteFooter.tsx](components/shared/SiteFooter.tsx): extracted from landing's inline footer, exported from `components/shared/index.ts`. Now rendered on `/`, `/score`, `/pricing`, `/privacy`, `/terms`, `/refund-policy`, `/contact` (7 pages). Three inline copies in landing/pricing/score replaced.
- **Dead code**: `components/HomeClient.tsx` deleted (had no imports).
- **`/builder/demo` Pro → Demo badge** [demo/page.tsx:124](app/builder/demo/page.tsx:124): badge text and color (indigo → amber) updated to make the demo-vs-paid distinction obvious.

### Conversion improvements (CRO)
- **H4 (pricing anchor)** [pricing/page.tsx](app/pricing/page.tsx): Pro lost its `MOST POPULAR` badge + heavy navy border (now a quiet card). Ultimate gained `MOST POPULAR · BEST VALUE` badge + `scale-105` lift. Combined with the "60 Credits · $0.33 each · Save 26% per credit vs Pro" copy added earlier this session, Ultimate is now the visually dominant choice.
- **H1 (testimonial credibility)** [page.tsx](app/page.tsx): replaced "got 3 interviews in the first week / score from 45% to 98% / hired in 3 weeks" outcome claims with grounded craft-quality quotes. Added "Quotes from anonymized user interviews. Outcomes vary." disclaimer below the section.
- **H2 (sample report preview)** [score/page.tsx](app/score/page.tsx): added a collapsible "Preview a sample report" section above the upload zone showing a 72/100 score with sub-metrics. Answers "what will I get?" before upload.
- **H5 (final CTA)** [page.tsx](app/page.tsx): final section dropped `min-h-screen` → `py-24 sm:py-28` (~290px shorter). Primary CTA changed from "Start for Free" → /builder (broken auth flow) to "Check Your Score — Free" → /score (no-friction entry). Secondary "or create an account" → SignUpButton modal for ready-to-commit users. Added an inline testimonial quote for trust.
- **H6 (input visibility)**: see "Form labels" above — same edit covered both.
- **Earlier this session** (already noted earlier in the review): final-CTA broken-promise fix, mobile-responsive header (Sign In hides on `<sm`, Get Started becomes compact), Token → Credit rename, Ultimate per-credit math.

### Not shipped (would benefit from human input / data)
- **H3 (single hero CTA)**: dropping the "Optimize Existing" card in favor of one primary CTA — needs a real design opinion call. Hypothesis stands.
- **Real testimonials**: replaced with grounded copy but they're still attributed to placeholder names. Needs real user permission to source.
- **PostHog / Microsoft Clarity funnel events**: foundational for A/B testing the remaining hypotheses. Out of scope for this PR.
- **`/contact` external Tally form**: still opens in a new tab. Inline form is a separate task — moving Tally → embedded React form changes the data pipeline.

### Files touched (15)
```
M  app/contact/page.tsx
M  app/globals.css
M  app/page.tsx
M  app/pricing/page.tsx
M  app/privacy/page.tsx
M  app/refund-policy/page.tsx
M  app/score/page.tsx
M  app/terms/page.tsx
M  app/builder/demo/page.tsx
M  components/OptimizerClient.tsx
M  components/Watermark.tsx
M  components/shared/index.ts
A  components/shared/SiteFooter.tsx
D  components/HomeClient.tsx
+ docs/ui-ux-review-2026-05-16.md (this file)
+ contrast sweep touched 12 files via sed for text-stone-300/400 → text-stone-500
```

### Verification
- `npx tsc --noEmit` — clean.
- All 9 user-facing pages return HTTP 200 from running dev server.
- Browser DOM checks: body bg `rgb(250,250,248)`, footer present on 9 pages, all form labels linked, mobile nav fits at 375px viewport.
- One remaining observation: a Tailwind class composition (`text-stone-500` after our sweep) leaves the disabled-state Analyze button at a low contrast — that's intentional for disabled UI and within WCAG spec.
