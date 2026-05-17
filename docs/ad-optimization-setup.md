# Ad campaign → Purchase optimization setup

Code is wired. This doc is the manual side: what to click in Google Ads + Meta Ads Manager so the algorithms optimize toward **Purchase**, not signups or clicks.

What's already in the code:

- **Google Ads** `AW-18163039044` loaded sitewide. Conversions firing client-side:
  - `purchase` on `/purchase-success` (label `M5VrCP727q0cEMT259RD`)
  - `signup` on first user sync (label `7YKyCPv27q0cEMT259RD`)
- **Meta Pixel** `990697506804808` loaded sitewide. Standard events firing:
  - `PageView` on every route
  - `Lead` + `CompleteRegistration` on first user sync
  - `InitiateCheckout` when user clicks Buy on `/pricing`
  - `Purchase` on `/purchase-success` (with `value` + `currency` + `content_ids`)

You still need to: (1) enable enhanced/server-side signals, (2) tell each platform that **Purchase** is the conversion that matters, (3) move bidding to a value-based / conversion-based strategy.

---

## 1. Google Ads

### a) Confirm the Purchase conversion is the Primary goal

1. Google Ads → **Goals → Summary**.
2. Find the `purchase` conversion action (the one tied to `AW-18163039044/M5VrCP727q0cEMT259RD`).
3. Mark it as **Primary**. Mark `signup` and `score_generated` as **Secondary** (still tracked, but doesn't drive bidding).
4. Status should read **Recording conversions** within ~24h after your next test purchase.

### b) Enable Enhanced Conversions (first-party data)

Critical in 2026 — without it Smart Bidding is starved of signal post-cookie-deprecation.

1. **Goals → Summary → click `purchase` → Settings → Turn on Enhanced Conversions**.
2. Choose **Google tag** (you already have gtag installed — no extra code needed).
3. Our code already sends `gtag('set', 'user_data', { email })` before the conversion fires in `lib/gtag.ts:31`, so email matching will work automatically.
4. After 24-48h the status should show **Recording enhanced conversions**.

### c) Conversion goal + bidding on the campaign

For each campaign that should drive purchases:

1. Campaign → **Settings → Conversion goals → Use this campaign-specific account-default goal**, then deselect everything except **Purchase**.
2. **Bidding** → switch to **Maximize conversions** for ~2 weeks (let it learn).
3. Once you have **≥30 conversions in 30 days**, switch to **Target CPA**. Set the target within 10-20% of your current actual CPA — too aggressive and the algo restricts impressions ([source](https://ppc.land/googles-smart-bidding-secrets-what-advertisers-get-wrong-in-2026/)).
4. If/when you start sending conversion **values** consistently (we already do — purchases include `value: planConfig.amount`), upgrade to **Maximize conversion value** → **Target ROAS**.

### d) Upload offline conversions (optional, big upside)

If you want even better signal: weekly export your `Purchase` table from `/admin` and upload to Google Ads → **Goals → Uploads** with GCLIDs. Skip for now — only worth it once you're spending >$2k/mo.

---

## 2. Meta Ads

### a) Verify the domain

1. Business Manager → **Brand Safety → Domains**.
2. Add `hired-cv.com`. Verify via DNS TXT record (Cloudflare/whoever runs your DNS).
3. Without this, iOS users get aggregated only and the Purchase event is unreliable.

### b) Configure events in Aggregated Event Measurement (AEM)

1. **Events Manager → Pixel `990697506804808` → Aggregated Event Measurement → Configure web events**.
2. Add `hired-cv.com`. Rank events in this order (highest = priority for iOS users):
   1. **Purchase** ← top priority
   2. InitiateCheckout
   3. Lead
   4. CompleteRegistration
   5. PageView
3. Check **Use value optimization** for Purchase (sends `value` for VBB).

### c) Add CAPI (server-side fallback)

The browser Pixel alone misses ~30-40% of conversions on iOS Safari. To close the gap, add CAPI on the Polar webhook (server fires the Purchase event directly to Meta). I haven't wired this yet — when you're ready, ask me and I'll add it. It will need:

- `META_CAPI_ACCESS_TOKEN` env var (generate in Events Manager → Settings → Conversions API).
- `META_PIXEL_ID` env var (`990697506804808` — same as client).

Target **Event Match Quality ≥ 6.0** ([source](https://www.wetracked.io/post/what-is-capi-meta-facebook-conversion-api)). Higher EMQ = lower CPA.

### d) Turn on Automatic Advanced Matching

1. Events Manager → Pixel → **Settings → Automatic Advanced Matching → ON**.
2. Toggle on **Email**, **First name**, **Last name**, **External ID** (Clerk user ID).
3. This hashes and sends user data with every browser event, dramatically improving match rate.

### e) Build the campaign

Inside Ads Manager when you create the campaign:

1. **Objective** → **Sales**.
2. **Buying type** → Auction.
3. **Conversion location** → **Website**.
4. **Performance goal** → **Maximize number of conversions** (move to **Maximize value of conversions** once you have ≥50 purchases/week).
5. **Conversion event** → **Purchase**.
6. **Pixel** → `990697506804808`.
7. **Attribution setting** → **7-day click, 1-day view** (Meta default).
8. **Advantage+ audience** → ON. Don't constrain audience early — let Meta find the lookalike of your purchasers.
9. **Advantage+ placements** → ON.

### f) Stay out of the Learning Phase trap

- Each ad set needs **~50 Purchase events per 7 days** to exit Learning ([source](https://www.modernmarketinginstitute.com/blog/how-to-exit-the-meta-ads-learning-phase-fast-and-start-scaling-profitably-in-2026)).
- If you're below that volume, **optimize for InitiateCheckout** instead — same algorithm, more events, easier to escape Learning. Switch back to Purchase once volume justifies.
- Don't edit ad sets that are exiting Learning — every edit restarts it.

---

## 3. Smoke test (do this once both platforms are configured)

1. Open hired-cv.com in an incognito window with **Meta Pixel Helper** (Chrome extension) + **Google Tag Assistant** running.
2. Sign up → check Pixel Helper shows `Lead` + `CompleteRegistration`, and Tag Assistant shows the `signup` conversion fired.
3. Click a paid plan on `/pricing` → check Pixel Helper shows `InitiateCheckout`.
4. Complete a sandbox/$3 starter purchase → after redirect to `/purchase-success`, check Pixel Helper shows **Purchase** with the right `value` + `currency`, and Tag Assistant shows the `purchase` Google Ads conversion.
5. In Events Manager → Test Events tab, the Purchase event should appear within a few seconds.
6. In Google Ads → Goals → the `purchase` conversion count should bump within 6-24h.

---

## 4. What to watch in `/admin`

The dashboard I just built shows what matters for ad optimization:

- **Signup → Purchase rate** in the 30-day funnel. If ads are working but this number is dropping, the funnel is the bottleneck, not the ads.
- **Latest purchases** to spot-check whether the user emails match the ad source you'd expect (no UTM tracking yet — let me know if you want it).
- **Optimizations per signup**: low = product engagement problem, not an ad problem.
