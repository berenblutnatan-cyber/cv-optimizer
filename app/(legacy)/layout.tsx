import type { Metadata } from "next";
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
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { WelcomeOfferBanner } from "@/components/WelcomeOfferBanner";
import { FlashSaleBanner } from "@/components/FlashSaleBanner";
import "./globals.css";


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

// Mono paints above the fold (the landing eyebrows / funnel step labels are
// font-mono), so it's in the LCP region and preloads with Inter + Playfair.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// CV fonts — only used inside the builder + analysis, never in hero or first
// paint. `preload: false` keeps them out of the LCP critical path (previously
// these fonts all preloaded by default and contributed to the 5.2s LCP
// measured in Clarity).

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
          <AnalyticsScripts />
          <LanguageProvider initialLang={lang}>
            {/* In-app-webview heads-up (Google OAuth breaks in Meta/TikTok/etc.
                webviews). Compact one-line bar, rendered IN FLOW above the page
                so it pushes content down instead of covering the header; only
                for signed-out visitors (it's about signing in), and dismissal
                persists across the webview's routine reloads. The detailed
                variant lives on the sign-in/sign-up pages. */}
            <SignedOut>
              <InAppBrowserAlert variant="banner" />
            </SignedOut>
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
