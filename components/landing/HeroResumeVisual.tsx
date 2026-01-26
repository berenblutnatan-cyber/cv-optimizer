"use client";

import { motion, useAnimationFrame } from "framer-motion";
import { useState, useRef } from "react";

/**
 * HeroResumeVisual - Spinning Template Carousel
 * 
 * Continuous rotation with different templates on front/back
 * Templates swap when card is edge-on (not visible)
 */

const templates = [
  {
    id: "modern",
    name: "Modern",
    accent: "#6366f1",
    type: "sidebar",
    sidebarColor: "#0A2647",
  },
  {
    id: "minimalist", 
    name: "Minimalist",
    accent: "#1a1a1a",
    type: "classic",
  },
  {
    id: "executive",
    name: "Executive", 
    accent: "#B8860B",
    type: "classic",
  },
  {
    id: "creative",
    name: "Creative",
    accent: "#ec4899",
    type: "sidebar",
    sidebarColor: "#1f2937",
  },
  {
    id: "techie",
    name: "Techie",
    accent: "#10b981",
    type: "classic",
  },
];

// Sample CV data
const cvData = {
  name: "Sarah Mitchell",
  title: "Senior Product Designer",
  location: "San Francisco, CA",
  email: "sarah@email.com",
  phone: "+1 (555) 123-4567",
  linkedin: "linkedin.com/in/sarah",
  summary: "Creative product designer with 7+ years crafting user-centered digital experiences. Led design systems at Fortune 500 companies.",
  experience: [
    {
      role: "Lead Product Designer",
      company: "Spotify",
      period: "2021 - Present",
      bullet: "Redesigned mobile app increasing engagement by 45%"
    },
    {
      role: "Senior UX Designer", 
      company: "Airbnb",
      period: "2018 - 2021",
      bullet: "Built design system used by 200+ designers"
    }
  ],
  skills: ["Figma", "User Research", "Prototyping", "Design Systems", "A/B Testing"],
};

function ModernSidebarTemplate({ accent, sidebarColor, name }: { accent: string; sidebarColor: string; name: string }) {
  return (
    <div className="flex h-full relative">
      {/* Sidebar */}
      <div className="w-24 h-full p-3 flex flex-col" style={{ backgroundColor: sidebarColor }}>
        {/* Photo */}
        <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/80">
            <circle cx="12" cy="8" r="4" fill="currentColor" />
            <path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z" fill="currentColor" />
          </svg>
        </div>
        
        {/* Contact */}
        <div className="space-y-1.5 text-white/80 text-[7px] mb-4">
          <p className="truncate">{cvData.email}</p>
          <p>{cvData.phone}</p>
          <p className="truncate">{cvData.linkedin}</p>
        </div>
        
        {/* Skills */}
        <div className="mt-auto">
          <p className="text-[8px] font-bold text-white/90 uppercase mb-2">Skills</p>
          <div className="space-y-1">
            {cvData.skills.slice(0, 4).map((skill, i) => (
              <p key={i} className="text-[7px] text-white/70">{skill}</p>
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4">
        <h2 className="text-sm font-bold text-slate-900">{cvData.name}</h2>
        <p className="text-[10px] font-medium mb-1" style={{ color: accent }}>{cvData.title}</p>
        <p className="text-[8px] text-slate-500 mb-3">{cvData.location}</p>
        
        {/* Summary */}
        <div className="mb-3">
          <p className="text-[8px] font-bold uppercase mb-1" style={{ color: accent }}>Summary</p>
          <p className="text-[7px] text-slate-600 leading-relaxed">{cvData.summary}</p>
        </div>
        
        {/* Experience */}
        <div>
          <p className="text-[8px] font-bold uppercase mb-2" style={{ color: accent }}>Experience</p>
          {cvData.experience.map((exp, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between items-start">
                <p className="text-[9px] font-semibold text-slate-900">{exp.role}</p>
                <p className="text-[7px] text-slate-400">{exp.period}</p>
              </div>
              <p className="text-[8px] font-medium" style={{ color: accent }}>{exp.company}</p>
              <p className="text-[7px] text-slate-600">• {exp.bullet}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Template Name Badge */}
      <div 
        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-sm text-[10px] font-bold text-white tracking-wide uppercase"
        style={{ backgroundColor: accent }}
      >
        {name}
      </div>
    </div>
  );
}

function ClassicTemplate({ accent, name }: { accent: string; name: string }) {
  return (
    <div className="p-5 h-full flex flex-col relative">
      {/* Header - Centered */}
      <div className="text-center mb-3 pb-2 border-b" style={{ borderColor: accent + "30" }}>
        <h2 className="text-base font-bold text-slate-900">{cvData.name}</h2>
        <p className="text-[10px] font-medium" style={{ color: accent }}>{cvData.title}</p>
      </div>
      
      {/* Contact Row */}
      <div className="flex justify-center flex-wrap gap-2 mb-3 text-[7px] text-slate-500">
        <span>{cvData.email}</span>
        <span>•</span>
        <span>{cvData.phone}</span>
        <span>•</span>
        <span>{cvData.location}</span>
      </div>
      
      {/* Summary */}
      <div className="mb-3">
        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: accent }}>Professional Summary</p>
        <p className="text-[7px] text-slate-600 leading-relaxed">{cvData.summary}</p>
      </div>
      
      {/* Experience */}
      <div className="mb-3 flex-1">
        <p className="text-[9px] font-bold uppercase mb-2" style={{ color: accent }}>Experience</p>
        {cvData.experience.map((exp, i) => (
          <div key={i} className="mb-2">
            <div className="flex justify-between items-start">
              <p className="text-[9px] font-semibold text-slate-900">{exp.role}</p>
              <p className="text-[7px] text-slate-400">{exp.period}</p>
            </div>
            <p className="text-[8px] font-medium" style={{ color: accent }}>{exp.company}</p>
            <p className="text-[7px] text-slate-600">• {exp.bullet}</p>
          </div>
        ))}
      </div>
      
      {/* Skills */}
      <div className="mt-auto">
        <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: accent }}>Skills</p>
        <div className="flex flex-wrap gap-1">
          {cvData.skills.map((skill, i) => (
            <span 
              key={i} 
              className="px-1.5 py-0.5 text-[7px] font-medium rounded"
              style={{ backgroundColor: accent + "15", color: accent }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
      
      {/* Template Name Badge */}
      <div 
        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-sm text-[10px] font-bold text-white tracking-wide uppercase"
        style={{ backgroundColor: accent }}
      >
        {name}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: typeof templates[0] }) {
  return (
    <div className="w-full h-full bg-white rounded-xl overflow-hidden">
      {template.type === "sidebar" ? (
        <ModernSidebarTemplate 
          accent={template.accent} 
          sidebarColor={template.sidebarColor || "#0A2647"} 
          name={template.name}
        />
      ) : (
        <ClassicTemplate accent={template.accent} name={template.name} />
      )}
    </div>
  );
}

export function HeroResumeVisual() {
  const [rotation, setRotation] = useState(0);
  const [frontIndex, setFrontIndex] = useState(0);
  const [backIndex, setBackIndex] = useState(1);
  const lastHalfRotation = useRef(0);
  
  const rotationSpeed = 0.4; // degrees per frame (~24 deg/sec = 15 sec per rotation)

  useAnimationFrame(() => {
    setRotation(prev => {
      const newRotation = prev + rotationSpeed;
      
      // Check which half-rotation we're in (0, 1, 2, 3, ...)
      const currentHalfRotation = Math.floor(newRotation / 180);
      
      // If we crossed into a new half-rotation, swap the hidden face
      if (currentHalfRotation > lastHalfRotation.current) {
        lastHalfRotation.current = currentHalfRotation;
        
        // Determine which face is now hidden and update it
        if (currentHalfRotation % 2 === 1) {
          // Front face is now hidden, update it
          setFrontIndex(prev => (prev + 2) % templates.length);
        } else {
          // Back face is now hidden, update it
          setBackIndex(prev => (prev + 2) % templates.length);
        }
      }
      
      return newRotation;
    });
  });

  return (
    <div 
      className="relative w-full h-full min-h-[540px] flex items-center justify-center"
      style={{ perspective: "1200px" }}
    >
      {/* Main Rotating Card */}
      <div
        className="relative w-[280px] sm:w-[320px]"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateY(${rotation}deg)`,
          aspectRatio: "210/297",
        }}
      >
        {/* Front Face */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-stone-200"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.15)",
          }}
        >
          <TemplateCard template={templates[frontIndex]} />
        </div>

        {/* Back Face */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden border border-stone-200"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.15)",
          }}
        >
          <TemplateCard template={templates[backIndex]} />
        </div>
      </div>

      {/* Decorative Floating Particles */}
      <motion.div
        animate={{ 
          y: [0, -20, 0],
          opacity: [0.2, 0.5, 0.2],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-16 left-8 w-2 h-2 rounded-full bg-indigo-400"
      />
      <motion.div
        animate={{ 
          y: [0, 15, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-24 right-12 w-3 h-3 rounded-full bg-cyan-400"
      />
      <motion.div
        animate={{ 
          y: [0, -12, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/3 right-4 w-1.5 h-1.5 rounded-full bg-[#B8860B]"
      />
    </div>
  );
}
