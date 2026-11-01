import type { Metadata } from "next";
import { cookies } from "next/headers";
import { inter, lato, merriweather, montserrat } from "@/lib/fonts";
import { jetbrainsMonoEager, playfair, rubikHebrew, rubikLatin } from "@/lib/fonts/legacy";
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
        <body className={`${inter.variable} ${jetbrainsMonoEager.variable} ${merriweather.variable} ${lato.variable} ${montserrat.variable} ${playfair.variable} ${rubikHebrew.variable} ${rubikLatin.variable} font-sans`}>
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
