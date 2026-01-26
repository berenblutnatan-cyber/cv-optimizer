import type { Metadata } from "next";
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
import "./globals.css";

// Primary UI font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Code font
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

// Resume fonts - Serif (for traditional/elegant templates)
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
});

// Resume fonts - Sans-serif alternative
const lato = Lato({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-lato",
});

// Resume fonts - Modern headings
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

// Premium serif for elegant headings
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Hired - AI Resume Builder & Optimizer",
  description: "Don't just apply. Get Hired. Build a resume that gets you hired with our AI-powered resume builder and optimizer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="scroll-smooth">
        <body className={`${inter.variable} ${jetbrainsMono.variable} ${merriweather.variable} ${lato.variable} ${montserrat.variable} ${playfair.variable} font-sans`}>
          {children}
          {/* Global Feedback Widget */}
          <RatingWidget source="global" />
        </body>
      </html>
    </ClerkProvider>
  );
}
