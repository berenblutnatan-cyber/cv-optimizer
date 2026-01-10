export { HarvardTemplate } from "./HarvardTemplate";
export { ModernTemplate } from "./ModernTemplate";
export { CreativeTemplate } from "./CreativeTemplate";

export type TemplateType = "harvard" | "modern" | "creative";

export const TEMPLATE_INFO: Record<TemplateType, { name: string; description: string }> = {
  harvard: {
    name: "Harvard Classic",
    description: "Professional serif design. Ideal for legal, academic & corporate roles.",
  },
  modern: {
    name: "Modern",
    description: "Clean sans-serif with purple accents. Great for tech & creative roles.",
  },
  creative: {
    name: "Creative",
    description: "Two-column with dark sidebar. Perfect for designers & marketers.",
  },
};

