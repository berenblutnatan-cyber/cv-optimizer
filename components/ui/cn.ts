import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know the v2 type scale and radius names, otherwise it
// reads `text-body` as a colour and drops `text-ink` (or the reverse).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["dense", "body", "emph", "h3", "h2", "h1", "display", "hero"] }],
      rounded: [{ rounded: ["control", "card", "panel"] }],
      shadow: [{ shadow: ["card", "pop"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
