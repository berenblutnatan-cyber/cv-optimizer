"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

const sections = [
  { id: "hero", label: "Home" },
  { id: "rewrite", label: "How it works" },
  { id: "templates", label: "Templates" },
  { id: "stories", label: "Stories" },
];

export function ActiveNavLinks() {
  const { t } = useT();
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 3;
      
      // Find which section we're currently in
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      // Account for fixed header height (80px = h-20)
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <nav className="hidden min-[1140px]:flex flex-1 items-center justify-center gap-7 xl:gap-10">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => handleClick(e, section.id)}
          className={`whitespace-nowrap font-serif text-sm transition-colors ${
            activeSection === section.id
              ? "text-[#0A2647] font-semibold"
              : "text-stone-500 hover:text-[#0A2647]"
          }`}
        >
          {t(section.label)}
        </a>
      ))}
    </nav>
  );
}
