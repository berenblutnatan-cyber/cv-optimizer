# Google Ads — Search Campaign Launch Guide

Paste-ready spec for the new HiredCV Search campaign. Replaces the existing Performance Max campaign (`Sales-Performance Max-2`), which is bidding on misconfigured conversion data and should be **paused** before launching this one.

**Status:** Draft — launch only after the Polar → Google Ads conversion tracking fix is merged (see [PR pending]).

Account: **hired-cv** (508-097-7894) · Currency NIS (₪)

---

## Step 0 — pre-flight (1 min)

1. **Pause** `Sales-Performance Max-2`
   - Campaigns → Sales-Performance Max-2 → three-dot menu → Pause
   - It's burning budget on broken conversion signals; today alone it spent ₪22.27 for zero real revenue
2. Open a **new campaign**: Campaigns → ➕ → New campaign

---

## Step 1 — Objective

- **Campaign objective**: Sales
- When asked for conversion goals to optimize for: **UNCHECK ALL THREE** of the current "Misconfigured" goals (Purchase / Submit lead form / Sign-up). They're not firing correctly — optimizing toward them will burn budget. We will re-enable Purchase once the tracking PR is shipped.
- Campaign type: **Search**

---

## Step 2 — Campaign settings

| Setting | Value |
|---|---|
| Campaign name | `GOOG_Search_ATS_Tripwire_2026Q2` |
| Networks — Search partners | **UNCHECK** (lower quality, no real benefit at our scale) |
| Networks — Display | **UNCHECK** (critical — Display burns budget fast and is for awareness, not intent) |
| Locations | United States, Canada, United Kingdom, Israel |
| Location options | **"Presence: People in or regularly in your targeted locations"** (NOT "interested in" — that wastes budget on people outside the geo) |
| Languages | English |
| Audience segments | Skip (or set to **Observation**, NOT Targeting) |
| Broad match | **Off** for now |

---

## Step 3 — Bidding & budget

- **Bid strategy**: **Manual CPC** (do NOT pick "Maximize conversions" or "Maximize clicks" until tracking is verified)
  - If Google won't let you pick Manual CPC initially, set "Clicks" → tick "Set a max CPC bid limit"
- **Max CPC bid**: ₪3.00 (handles US/UK/CA CPCs; for IL-only that's overkill but Google will pay less if it can)
- **Daily budget**: ₪25 (~$7)
- Delivery method: **Standard** (NOT Accelerated)

Expected: 5–15 clicks/day depending on US/UK CPC variance. Lower volume than Israel-only would be (~₪0.20 CPC) but the audience is 100x bigger.

---

## Step 4 — Ad group 1: ATS-Intent

**Keywords (phrase + exact match — paste literally):**

```
"ats resume checker"
[ats resume score]
"resume ats check"
"check my resume ats"
"ats friendly resume"
[ats optimization]
"applicant tracking system resume"
"resume scanner"
"ats resume builder"
[ats resume optimizer]
```

---

## Step 5 — Ad group 2: Job-Search-Frustration

```
"resume not getting interviews"
[why no interview callbacks]
"resume rejected"
"job application no response"
"improve my resume for ats"
[tailor resume to job description]
"resume keywords for job"
"why no callbacks resume"
```

---

## Step 6 — Negative keywords (account level — apply to all campaigns)

These filter out non-buyers, employers/recruiters, and freebie hunters:

```
free
template
templates
examples
example
-"free template"
-"resume examples"
jobs
hiring
recruiter
recruiters
recruitment
"pdf download"
"word template"
"google docs"
salary
career advice
indeed
linkedin
zety
resume.io
```

---

## Step 7 — Responsive Search Ads (3 RSAs, paste-ready)

### RSA 1 — Free-score lead

**Final URL:** `https://www.hired-cv.com/score?utm_source=google&utm_medium=cpc&utm_campaign=ats_tripwire&utm_content=rsa1`

**Display path:** `hired-cv.com` / `ATS-Check`

**Headlines (15 — max 30 chars each):**
1. Score Your Resume — Free
2. Pass the ATS Bots
3. 60-Second ATS Score
4. Free Resume Checker
5. Is Your Resume ATS-Ready?
6. Beat the Resume Bots
7. Why No Interview Calls?
8. ATS Score in 60 Seconds
9. Free Resume Audit
10. AI Resume Optimizer
11. Fix Your Resume — $1
12. No Signup. No Card.
13. Hired-CV ATS Score
14. Get Hired Faster
15. Try 3 Rewrites for $1

**Descriptions (4 — max 90 chars each):**
1. Get an instant ATS score in 60 seconds. See the keywords you're missing. No signup.
2. Free score. Then optimize with AI for $1 — 3 full rewrites. No subscription. Credits never expire.
3. Stop sending resumes into a black hole. Find out why and fix it in under 5 minutes.
4. 14-day refund. PDF & DOCX. ATS-optimized for the exact job you want.

### RSA 2 — Pain/frustration angle

**Final URL:** `https://www.hired-cv.com/score?utm_source=google&utm_medium=cpc&utm_campaign=ats_tripwire&utm_content=rsa2`

**Display path:** `hired-cv.com` / `Get-Hired`

**Headlines (15):**
1. Tired of Resume Silence?
2. Why You Get No Callbacks
3. Fix Your Resume in 60 Sec
4. Pass the ATS, Get Hired
5. Stop Applying. Start Fixing.
6. Resume Black Hole Fix
7. The ATS Sees You
8. Hire Yourself Faster
9. Tailor Resume to Job
10. AI-Powered Resume Fix
11. $1 for 3 Optimizations
12. No Subscription Resume Tool
13. ATS-Ready in Minutes
14. Skip the $300 Writer
15. Stop Editing in Word

**Descriptions:**
1. AI rewrites your resume for the exact job. ATS-tested. Downloadable in 60 seconds.
2. Free ATS score + $1 first optimization. No subscription. Credits never expire.
3. Skip the $300 resume writer. Tailored, ATS-ready resume for $1 in minutes.
4. Built for job seekers tired of being ghosted. Try free. Optimize for $1.

### RSA 3 — Brand / trust

**Final URL:** `https://www.hired-cv.com/score?utm_source=google&utm_medium=cpc&utm_campaign=ats_tripwire&utm_content=rsa3`

**Display path:** `hired-cv.com` / `AI-Resume`

**Headlines (12):**
1. Hired-CV: AI Resume Tool
2. Don't Apply. Get Hired.
3. AI Resume Optimizer
4. Free Resume Score
5. ATS-Optimized in 60s
6. $1 for 3 AI Rewrites
7. Credits Never Expire
8. No Subscription
9. 14-Day Money-Back
10. Tailor Resume Per Job
11. Built for Real Job Search
12. Try It For $1

**Descriptions:**
1. The AI resume tool built for actually getting hired. Free score, $1 to optimize.
2. Hired-CV beats the ATS, tailors per job, downloads in seconds. Try free.
3. Trusted by job seekers in tech, finance, consulting. Start with a free score.
4. Free ATS check. No card. No subscription. $1 for 3 full AI rewrites.

---

## Step 8 — Ad extensions

### Sitelinks (add 4)
| Title | URL | Description 1 | Description 2 |
|---|---|---|---|
| Free ATS Score | https://www.hired-cv.com/score | Get scored in 60 seconds | No signup, no card |
| How It Works | https://www.hired-cv.com/#how-it-works | 3 steps to a tailored CV | AI rewrites per job |
| Pricing | https://www.hired-cv.com/pricing | Start from $1 | Credits never expire |
| Templates | https://www.hired-cv.com/builder | Modern + classic | ATS-friendly designs |

### Callouts (add 6+)
- 60-Second ATS Score
- No Subscription
- Credits Never Expire
- 14-Day Money-Back
- PDF & DOCX Download
- AI-Powered Tailoring

### Structured Snippets
- **Header**: "Service catalog"
- **Values**: ATS Score, AI Optimization, PDF Export, DOCX Export, Keyword Tailoring

---

## Step 9 — Review checklist before launch

- [ ] Networks: Search ONLY (no Display, no Search partners)
- [ ] Daily budget: ₪25
- [ ] Bid strategy: Manual CPC, max ₪3
- [ ] Geo: US + CA + UK + IL, "Presence"
- [ ] Language: English only
- [ ] Conversion goals: **NONE selected** (intentional — re-enable after tracking PR)
- [ ] 2 ad groups, ~10 keywords each
- [ ] 3 RSAs per ad group (or both ad groups can share RSAs if Google's editor allows; otherwise duplicate)
- [ ] Account-level negative keyword list applied
- [ ] Sitelinks + callouts + structured snippets attached
- [ ] Final URL is `/score`, not `/optimize` (intentional — funnel through the free score first)

---

## Step 10 — Day-7 review (set a calendar reminder)

After 7 days at ₪25/day = ₪175 spent (~$50), check:

| Metric | Target | What to do if not hit |
|---|---|---|
| Avg CPC | < ₪3 | If consistently > ₪3, raise max bid OR cut expensive keywords |
| CTR | > 3% | Below 3% = wrong keyword/copy match. Pause low-CTR keywords; rewrite RSAs |
| /score completion rate (via PostHog) | > 40% of clicks | Below = landing page issue, not ads |
| Tripwire purchases | ≥ 1 | The whole point. If zero, kill or rework. |

PostHog events to watch: `landing_cta_clicked`, `optimize_started`, `purchase_completed`, `score_upsell_clicked` (filtered to `utm_source=google`).

---

## What's NOT in this campaign (and why)

- **Hebrew keywords**: not verified by a native speaker yet. Add as a separate ad group later.
- **Performance Max**: needs 30–50+ real conversions/month to train. You have 1 in 30 days. Re-evaluate once tripwire is shipped + getting 10+ purchases/week.
- **Display Network / YouTube**: awareness channels, not buy-intent. Skip until you have a working acquisition baseline.
- **Conversion optimization**: deferred until Polar webhook → Google Ads conversion is wired (separate PR).
