import type { Metadata } from "next";
import { Gallery } from "@/components/v2/design/Gallery";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

export default function DesignPage() {
  return <Gallery />;
}
