import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Merriweather, Lato, Montserrat, Playfair_Display } from "next/font/google";
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
import { WelcomeOfferBanner } from "@/components/WelcomeOfferBanner";
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
  title: "Hired - AI Resume Builder & Optimizer",
  description: "Don't just apply. Get Hired. Build a resume that gets you hired with our AI-powered resume builder and optimizer.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A2647",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en" className="scroll-smooth">
        <body className={`${inter.variable} ${jetbrainsMono.variable} ${merriweather.variable} ${lato.variable} ${montserrat.variable} ${playfair.variable} font-sans`}>
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
          <Script id="meta-pixel" strategy="lazyOnload">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
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
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
            `}
          </Script>
          <InAppBrowserAlert />
          <GclidCapture />
          <UserSyncProvider>
            {children}
          </UserSyncProvider>
          <ResumeSync />
          <SignedIn>
            <WelcomeOfferBanner />
          </SignedIn>
          <Toaster position="top-center" richColors />
          {/* Global Feedback Widget */}
          <RatingWidget source="global" />
        </body>
      </html>
    </ClerkProvider>
  );
}
