import type { Metadata } from "next";
import { CoolGallery } from "@/components/v2/design/CoolGallery";
import { caveat, instrumentSerif } from "@/lib/fonts/landing";

export const metadata: Metadata = { title: "Motion & type", robots: { index: false } };

export default function CoolPage() {
  return (
    <div className={`${instrumentSerif.variable} ${caveat.variable}`}>
      <CoolGallery />
    </div>
  );
}
