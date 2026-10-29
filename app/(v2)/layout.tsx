import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Lato, Merriweather, Montserrat } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { UserSyncProvider } from "@/components/UserSyncProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { themeBootScript } from "@/components/ui/theme-toggle";
import { ClaimDrafts } from "@/components/v2/cv/ClaimDrafts";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getServerLang } from "@/lib/i18n/server";
import "@/styles/v2/app.css";
import "@/styles/v2/cv.css";

// v2 root layout. Legacy pages live under app/(legacy) with their own root
// layout and stylesheet until each one is replaced, so the two never mix.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
// CV template fonts: only the CV preview uses them, so they never block the UI paint.
const merriweather = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-merriweather", display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["300", "400", "700", "900"], variable: "--font-lato", display: "swap", preload: false });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-montserrat", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL("https://hiredcv.app"),
  title: { default: "Hired", template: "%s · Hired" },
  description: "Build your CV by talking. Tailor it to every job with changes you can trace.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default async function V2RootLayout({ children }: { children: React.ReactNode }) {
  // The language cookie picks the words; the page stays left-to-right except
  // where a translated surface sets dir itself (see LanguageProvider).
  const lang = await getServerLang();
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang={lang} dir="ltr" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        </head>
        <body className={`${sans.variable} ${mono.variable} ${merriweather.variable} ${lato.variable} ${montserrat.variable}`}>
          <AnalyticsScripts />
          <LanguageProvider initialLang={lang} applyToDocument={false}>
            <TooltipProvider>
              <UserSyncProvider>{children}</UserSyncProvider>
              <Toaster />
              <ClaimDrafts />
            </TooltipProvider>
          </LanguageProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
