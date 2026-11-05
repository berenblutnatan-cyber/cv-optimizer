# Enhancv recon (for Hired)

Date: 2026-11-05. Sources: public pages, the guest onboarding at app.enhancv.com (no account made, no CV uploaded), public dev docs, Trustpilot. Screenshots: `replica/screens/enhancv/01-16*.jpg` (reference only, never shipped).

Not verified (blocked by signup, or would need a real CV upload): the actual checker report screen, the tailoring diff UI, and how the parser maps an upload onto a template. Everything about those comes from Enhancv's own copy plus third-party reviews.

## 1. Upload / import flow

- **Guest-first, signup later.** `app.enhancv.com/onboarding` is a numbered stepper with a coach photo and one question per screen. You get into the editor and job board without an account.
- **Exact order on the "No resume" path** (screens 01, 03-07):
  1. "Do you have an existing resume to use as a starting point?" Yes / No
  2. Position: free-text input, "...so I can recommend templates", with *Skip this step*. No autocomplete.
  3. Goal: "Impress Recruiters" vs "Pass ATS". After you pick, a one-line affirmation and a cited stat ("more than 92%... in the hands of recruiters").
  4. Template grid. The heading says "You can always change it later". Every card carries an "ATS" badge, and the hover CTA is "Use This Template".
  5. LinkedIn URL import, with *Skip This Step*. The stepper count went from 4 to 5 here.
  6. You land on the dashboard. The job board is pre-searched with your position plus your geo-IP city ("Product Manager in Tel Aviv"), and a spotlight highlights "My Documents".
- **"Yes" path:** "Great. Please upload it for a quick start." is a dropzone (.pdf/.docx, 2MB) with the privacy line "never share... or use it for AI model training" (screen 02).
- **The upload flow never asks for a job description.** The JD only comes in later, through "Check & Tailor", the job board's per-job "Tailor Resume" button, or the "Paste link or entire job ad" box (⌘V hint) on the dashboard (screen 08).
- Seniority and experience level are never asked.

## 2. Analysis after reading a CV ("Resume Checker")

- Public page: https://enhancv.com/resources/resume-checker/. It offers **27 checks in 7 groups**:
  - ATS essentials (6): format/size, ATS-friendly design, professional email, header links, file name, date/link consistency
  - Sections (3): essential sections, contact info, section order
  - Content (5): parse rate, quantified impact with AI rewrites, repetition, spelling/grammar, bullet length
  - Job tailoring (4): hard skills, soft skills, action verbs, tailored job title
  - Recruiter red flags (4): credibility, interview risk, peer benchmarking, LinkedIn match
  - Bias (2): age/date bias, gaps
  - Seniority (3): progression, skills evidence, leadership signals
- **The score has two parts:** the share of the content they can parse, plus a content-quality score. They openly say "no such thing as an ATS score", and that above 80 is "mostly good".
- **Output** is a score on the left plus "a personalized report with an actionable tasklist". In the editor, "The checklist updates in real time as you work" ([tailoring page](https://enhancv.com/features/tailor-resume-to-job-description/)).
- **Free vs paid:**
  - The FAQ says free covers the ATS/next-step items. Paid adds the human-reader layer: red flags, age bias, gaps, progression, leadership.
  - The [pricing page](https://enhancv.com/pricing/) lists "ATS check" under Pro only. Free is "Valid for 7 days", carries branding and is capped at 12 section items.
  - Reviewers say the full word-by-word report sits behind an unlock.
  - In the guest editor, "Fix Mistakes" and "Check & Tailor" both open a signup wall ("Save & Run ATS Checks", screen 10).
- **Primary action** after the report: continue in the builder and fix the tasks.
- The counts don't agree across their own pages (13-point, 16, 19 and 27 checks). Their messaging is inconsistent.

## 3. Layout / design preservation on PDF upload

- **They do not preserve the original design.** Their public API docs say "Original formatting is not preserved (Enhancv styling is applied)" and "Creative or highly designed resumes may not parse perfectly" (https://developers.enhancv.com/api/upload).
- A reusable "custom template" applied on import exists only on the Business plan (help.enhancv.com article 11588565).
- **Switching templates after import:**
  - The toolbar's "Templates" button opens a left drawer of thumbnails. One click re-renders the live document, and a green check marks the current one.
  - The same drawer holds an A4 / US Letter segmented control and a resume-language select (screen 12).
  - Content carries over and the layout reflows, for example from two-column to Ivy League single column.
- **Section order is user-owned:**
  - "Rearrange" opens a modal: "Hold & Drag the boxes to rearrange the sections".
  - The modal shows a page minimap with each box sized to its section's length, column-aware, with the header locked (screen 11).

## 4. Tailoring to a job

- **Inputs:**
  - A pasted JD or job link, or a job from their own job board. There's a Chrome extension and a job tracker (in the nav: "My Applications").
  - A **master resume** that keeps everything you've ever added.
- **Flow** (from Enhancv's copy): add the job → ATS/match score against it → checklist of fixes → "the AI does the rewrite" from master resume + JD.
- **Rewrites:** keyword-rich title, tailored summary, key achievements, bullets and skills. The keyword gap is shown as skills "you already have or are missing".
- **Accept/reject:** "Every change is highlighted, so you accept or reject each one", with one-click apply/undo per suggestion. I could not see this UI without signing up.
- **Target score:** "aim for a score above 70%" before applying.
- **Job board cards** show "ATS score –" with "Tailor Resume" as the primary button and Apply as secondary. The header line reads "12 matches · 8% likely ghost jobs flagged".

## 5. UI craft (what makes it feel modern)

- **The editor is WYSIWYG on the real page** (screen 09). There's no form-left / preview-right split. You type straight into the document, with placeholder copy that coaches ("Highlight your accomplishments, using numbers if possible").
- **Top toolbar** has labelled icon buttons: AI Assistant | Fix Mistakes | Check & Tailor | Rearrange | Templates | Design & Font, plus undo/redo and **History**. Labels collapse to icons when a drawer is open. Drawers sync to the URL (`?activeToolboxPanel=TEMPLATES|DESIGN|AI_CHAT`).
- **Floating contextual toolbar** on the selected entry: green "+ Entry" pill, ▾, T (format), calendar (dates), trash, gear. The selected entry gets a green outline (screen 14).
- **Between-section insert:** a hairline with a ⊕ that splits on click into "New Section" | "+ Experience" (screen 15).
- **Section gallery modal:** a 3-column grid of real rendered previews. Hovering a card shows "Add to Resume", and a crown corner badge marks Pro sections (screen 16).
- **Design & Font drawer** (screen 13):
  - Stepped sliders with end labels: margins narrow↔wide, spacing compact↔more space, font size −A/+A
  - 10 colour swatches plus "Use custom color"
  - A font select that renders in the font itself
- **Context-aware AI coach panel:**
  - The coach's headline changes with the selected section. Nothing selected: "the page as a whole is still too thin to send". Experience selected: "That is what the job was. Not how well you did it."
  - It has a fill meter ("Empty"), three suggestion chips ("Experience — what am I missing?", "Ask me questions and write it for me", "Would this get me an interview?") and a chat box.
  - This is the strongest pattern in the product.
- **Persistent right rail:** preview (eye), download, share link, Reddit/feedback, crown (upgrade).
- **Save state:**
  - A persistent red "Sign up to save your work" nudge in the header.
  - Signup modals are titled after the action you tried ("Save & Run ATS Checks", "Save & Check").
  - Google and LinkedIn OAuth come first.
- **What looks dated:** the stock-photo coach avatar in onboarding, mixed green and purple primaries (Yes is green, No is purple; Impress is green, Pass ATS is purple, so there are two competing primaries), dense marketing pages, and small 11-12px meta text in the editor.

## 6. Complaints and praise

Trustpilot gives 4.6/5 from 1,009 reviews (79% 5★, 6% 1★): https://www.trustpilot.com/review/enhancv.com

- **Praise:**
  - Ease of use ("Very user friendly UI")
  - Templates that stand out
  - Tailoring while job hunting
  - Value if you make many versions
- **Complaints:**
  - Generic AI rewrites ("AI slop")
  - AI adds wrong fields and gives contradictory critiques
  - Formatting bugs and altered dates
  - The workflow "is always changing"
  - US-centric formats (GPA wrong for Germany, UK CV norms)
  - Slow or non-human support
  - Price, auto-renew surprises, and cancel/refund friction (monthly plans are non-refundable, per [help](https://help.enhancv.com/en/articles/2792040-how-can-i-get-a-refund))
  - The free-plan watermark
  - The 7-day free plan feels like a bait

## What Hired should copy / avoid (ranked by impact)

**Copy**
1. **A context-aware coach on the selected section**: a blunt one-line diagnosis, 3 chips, and chat. This beats a static score.
2. **Live checklist with a score that moves as you edit**, split into "can a machine read it" and "would a human be impressed". Be honest that the ATS score is a proxy.
3. **Per-change accept/reject on tailoring, with a highlighted diff**, generated from a master CV so it never invents experience.
4. **WYSIWYG editing on the real page**, with a floating entry toolbar and a ⊕ insert between sections.
5. **One-click template switching in a drawer** that keeps content, plus a proportional drag-and-drop section minimap.
6. **Guest-first:** the user is in the editor before any signup, and the signup wall is titled after the action they tried.
7. **Paste a JD anywhere** (⌘V), with the tailor CTA attached to each job.

**Avoid / beat them**
1. **Forcing a template on upload.** Enhancv discards the user's design. Hired should keep the original section order and structure (and the look, as far as possible), then offer switching as an option. This is the clearest gap to win on.
2. **Hiding the checker behind signup and then behind paywalls.** Give a real, complete first report free.
3. **Generic AI voice.** This is their #1 complaint. Keep the user's voice and show a diff.
4. **Two competing primaries in one row**, stock-photo coaches, inconsistent check counts, and tiny meta text.
5. **US-only norms.** Hired should be locale-native (Hebrew/RTL, Israeli CV norms, A4).
6. **Billing friction.** Make renewal clear and cancel take one click.
