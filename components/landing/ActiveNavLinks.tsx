"use client";

import { useState, useEffect } from "react";

const sections = [
  { id: "hero", label: "Home" },
  { id: "features", label: "Features" },
  { id: "templates", label: "Templates" },
  { id: "testimonials", label: "Testimonials" },
];

export function ActiveNavLinks() {
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const scrollContainer = document.querySelector('.snap-y');
    
    const handleScroll = () => {
      if (!scrollContainer) return;
      
      const scrollPosition = scrollContainer.scrollTop + window.innerHeight / 3;
      
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

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial position
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    const scrollContainer = document.querySelector('.snap-y');
    if (element && scrollContainer) {
      scrollContainer.scrollTo({ 
        top: element.offsetTop, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <nav className="hidden md:flex items-center gap-12 absolute left-1/2 -translate-x-1/2">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(e) => handleClick(e, section.id)}
          className={`font-serif text-sm transition-colors ${
            activeSection === section.id
              ? "text-[#0A2647] font-semibold"
              : "text-stone-500 hover:text-[#0A2647]"
          }`}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
