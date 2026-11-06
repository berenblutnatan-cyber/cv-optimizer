# Hired: improvement plan (5 Nov 2026)

Based on: a hands-on QA run (blank CV, Fix, export in English and Hebrew, a two-column PDF import), the Enhancv research (`replica/enhancv-recon.md`) and the owner's direction.

## Already fixed in this branch (`claude/trust-fixes`, not committed)

- **Score:** an empty CV gets 0 to 5 instead of 39 to 56. The ATS, Impact and Clarity sub-scores are visible. The top issue is the panel's main action. "Fix" opens the right section, or sends the request to Chat. All of this works without signing in.
- **Completeness:**
  - An empty role or school no longer counts.
  - An email has to look like one, and the field explains when it doesn't.
  - Paid steps (tailoring, cover letter, interview) no longer let a CV with no experience through.
- **PDF:** a real download file, made on the server from what the preview shows. The text is selectable, Hebrew included, with the template's fonts. If the server fails, there's an error with "Print instead".
- **Three bugs found during the work:**
  - The browser print path also printed in a fallback serif font.
  - The fonts were blocked by CORS.
  - Chromium wasn't being bundled with the server function.

## P0: an upload that keeps who you are

**Status (6 Nov, branch `claude/upload-keeps-design`, not committed):** built and checked in a browser on real PDFs.
- **Target job:** asked while the file is read (title, with the job ad optional). Stored on the CV (`doc.target`), read by the review and the tailor panel.
- **Design read from the PDF itself** (`lib/import/pdfDesign.ts`), not by a model:
  - sidebar side and colour, a header band, two columns;
  - accent, serif/sans/mono;
  - the photo (extracted and encoded to JPEG).
- **Mapping to a template** (`lib/import/mapDesign.ts`), with the exact colour: templates now accept any hex.
- **Structure kept:** section order and headings as written. Letter-spaced headings ("E X P E R…") are joined back at text extraction, for every upload path.
- **The review** (`/cv/[id]/review`): the free deep read before any edit, with the Opus audit and quotes from the CV.
  - Kept per content + target + language.
  - Prose is in the reader's language.
  - The editor's tailor panel shows the same score and fixes.
- **"Your file":** shown beside the Hired version while the upload is in this visit.
- **"Back to your original":** in Design.
- **Not done:**
  - DOCX design (only order and headings).
  - Hebrew CVs still render LTR (the Hebrew templates branch).
  - The production DB migration (`2026-11-07-v2-cv-review.sql`).
  - `eval:optimizer` after the audit prompt change (pronouns, Hebrew prose).

1. **Target job when uploading.**
   - One question: the job title, with a job description or link as an option. It can be skipped.
   - It stays with the CV, and every analysis is measured against it.
2. **Read the PDF as it looks, not just its text.**
   - Today `unpdf` returns one block with no line breaks.
   - Send the PDF to Claude as a document. Extract the content, plus design signals: columns, accent color, serif or sans, photo, section order and section titles as written.
3. **Keep the user's design.**
   - Map the original to the closest of our 23 templates, with its color, its section order and its photo.
   - Show "your original" next to "in Hired", and only then offer "Try a different design".
   - Enhancv discards the design ("Original formatting is not preserved"). This is a gap Hired can win.
4. **Deep analysis before any edit.**
   - The screen "This is what we read": per section, what's strong and what's missing for the target job, with a quote from the CV.
   - Only after that comes the fix list. Free, with no sign-up wall. Enhancv puts a sign-up wall in front of it.

## P1: an experience that doesn't look dated

5. **A section-aware coach** (Enhancv's best pattern):
   - Selecting a section gets one blunt line, for example "This is what the job was, not how well you did it".
   - Three ready-made actions, and the chat.
6. **A button and controls pass:**
   - The dashed "+ Add role" / "+ Add a section" boxes.
   - A top bar with 8 icons.
   - The text-only "Sign in" row.
   - 36px fields.
   - The fix: one button language (primary, secondary, quiet) with clear states, and a real "+" between sections.
7. **The chat shows raw `**` instead of bold.**
8. **Starting blank lands in Chat**, even though the tile says "type or chat". It should open where the user expects.

## P2

9. **Hebrew/RTL** (from the critique):
   - An English example CV in the Hebrew gallery.
   - `dir="ltr"` on `html`.
   - ⌘K renders as K⌘.
   - Placeholders with Israeli data on English pages.
10. **The brand inside the app:** at least the "Ready" moment after the first export.
11. **Editing directly on the page** (WYSIWYG, like Enhancv). A large change, after P0.

## Not yet checked

- PDF on Vercel itself (Linux Chromium). Local and the build pass; it needs one export on a preview deployment.
- Dark mode in the editor: the dark-mode emulation didn't take effect in my check.
- Upload through the UI with a real user, signed-in states, and voice.
