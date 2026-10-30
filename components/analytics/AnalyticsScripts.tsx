import Script from "next/script";
import { GclidCapture } from "@/components/GclidCapture";
import { ClarityRouteTags } from "@/components/analytics/ClarityRouteTags";

// Google Ads, Meta Pixel and Clarity, plus the gclid capture and Clarity
// route tags. One copy for every root layout (legacy and v2): a page that
// renders without these drops ad conversions silently.
// (PostHog is initialised globally in instrumentation-client.ts.)

const GOOGLE_ADS_ID = "AW-18163039044";
const CLARITY_PROJECT_ID = "wrxca8vdxy";
const META_PIXEL_ID = "990697506804808";

export function AnalyticsScripts() {
  return (
    <>
      {/* Analytics scripts are `lazyOnload`: they load after the page is
          interactive and idle, so they don't compete with the hero LCP
          paint (Clarity dashboard reports 5.2s LCP on prod — these were
          previously `afterInteractive` and contributed to the budget). */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="lazyOnload"
      />
      {/* gtag function init runs `afterInteractive` (not `lazyOnload`)
          so `window.gtag` is defined before any conversion event fires
          from a page-mount effect (e.g. `/purchase-success`). The big
          gtag.js network bundle above stays lazyOnload — that's what
          actually impacts LCP. This 4-line inline init is essentially
          free. Without this, conversion events queue into dataLayer but
          the previous `typeof window.gtag !== "function"` guard in
          lib/gtag.ts silently dropped them. */}
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
        `}
      </Script>
      {/* Meta Pixel — split exactly like the gtag init above, for the same
          reason. The fbq() stub + queue and the init/PageView run
          `afterInteractive`, so `window.fbq` is a function before any
          conversion event fires from a page-mount effect (CompleteRegistration
          + Lead in UserSyncProvider, InitiateCheckout in PolarCheckoutButton,
          Purchase on /purchase-success). Previously the whole snippet was
          `lazyOnload`, so any of those events that fired before the browser
          went idle hit the `typeof window.fbq !== "function"` guard in
          lib/fbq.ts and were silently dropped — the same class of bug the
          gtag init fixes for Google Ads. The heavy fbevents.js bundle still
          loads `lazyOnload` below so LCP is unaffected; events queued on the
          stub replay when it loads. */}
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,n){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[]}(window);
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <Script id="meta-pixel-lib" strategy="lazyOnload">
        {`
          !function(b,e,v,t,s){t=b.createElement(e);t.async=!0;t.src=v;
          s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (document,'script','https://connect.facebook.net/en_US/fbevents.js');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      {/* Clarity runs `afterInteractive` (not `lazyOnload`) so session
          replay starts right after hydration instead of after window-load +
          idle. On the heavy landing page `lazyOnload` meant recordings began
          ~6-8s in (past the 5.2s LCP), so every session "started in the
          middle" with no beginning — the main reason replays read as
          incoherent. The tag.js bundle itself stays async (`t.async=1`
          below), so this captures the session start without blocking the
          hero paint. The big gtag.js + fbevents bundles above stay lazy. */}
      <Script id="microsoft-clarity" strategy="afterInteractive">
        {`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
        `}
      </Script>
      <GclidCapture />
      <ClarityRouteTags />
    </>
  );
}
