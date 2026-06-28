import type { Metadata } from "next";
import Script from "next/script";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono, Merriweather, Lato, Montserrat, Playfair_Display, Rubik } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { LANG_COOKIE, dirFor, isLang, DEFAULT_LANG } from "@/lib/i18n/config";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { RatingWidget } from "@/components/feedback";
import { ResumeSync } from "@/components/ResumeSync";
import { Toaster } from "sonner";
import { UserSyncProvider } from "@/components/UserSyncProvider";
import { InAppBrowserAlert } from "@/components/InAppBrowserAlert";
import { GclidCapture } from "@/components/GclidCapture";
import { ClarityRouteTags } from "@/components/analytics/ClarityRouteTags";
import { WelcomeOfferBanner } from "@/components/WelcomeOfferBanner";
import { FlashSaleBanner } from "@/components/FlashSaleBanner";
import "./globals.css";

const GOOGLE_ADS_ID = "AW-18163039044";
const CLARITY_PROJECT_ID = "wrxca8vdxy";
const META_PIXEL_ID = "990697506804808";

// Above-the-fold fonts — preload (default). These two carry the LCP paint.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

// Hebrew-capable UI font. Rubik ships both Latin and Hebrew glyphs, so the RTL
// UI keeps the same clean geometric feel as Inter. Applied to <body> only when
// dir="rtl" (see globals.css), so English paint is unaffected — not preloaded.
const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hebrew",
  display: "swap",
  preload: false,
});

// Resume / code fonts — only used inside the builder + analysis, never in
// hero or first paint. `preload: false` keeps them out of the LCP critical
// path (previously these six fonts all preloaded by default and contributed
// to the 5.2s LCP measured in Clarity).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
  display: "swap",
  preload: false,
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hiredcv.app"),
  title: "Hired - AI Resume Builder & Optimizer",
  description: "Don't just apply. Get Hired. Build a resume that gets you hired with our AI-powered resume builder and optimizer.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A2647",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the persisted language choice so SSR emits the correct lang/dir on the
  // first paint (no English→Hebrew flash for returning Hebrew users).
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE)?.value;
  const lang = isLang(cookieLang) ? cookieLang : DEFAULT_LANG;
  const dir = dirFor(lang);

  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang={lang} dir={dir} className="scroll-smooth">
        <body className={`${inter.variable} ${jetbrainsMono.variable} ${merriweather.variable} ${lato.variable} ${montserrat.variable} ${playfair.variable} ${rubik.variable} font-sans`}>
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
          <LanguageProvider initialLang={lang}>
            <InAppBrowserAlert />
            <GclidCapture />
            <ClarityRouteTags />
            <UserSyncProvider>
              {children}
            </UserSyncProvider>
            <ResumeSync />
            <SignedIn>
              <WelcomeOfferBanner />
            </SignedIn>
            {/* Engagement flash sale — self-hides until the builder arms it (a few
                real actions). Outside SignedIn so anon builders get it too; claim
                routes through sign-in. */}
            <FlashSaleBanner />
            <Toaster position="top-center" richColors />
            {/* Global Feedback Widget */}
            <RatingWidget source="global" />
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
