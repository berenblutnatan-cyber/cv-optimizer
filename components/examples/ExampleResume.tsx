// Server-rendered, SEO-clean visual of an example resume. Deliberately NOT the
// client A4 template components (those are heavy + "use client") — this renders
// the ResumeData as semantic HTML so the full text is in the SSR markup for
// crawlers, and it looks like a polished one-column CV. The fancy templates show
// up once the visitor clicks into the builder.

import type { ResumeData } from "@/types/resume";

function ContactLine({ data }: { data: ResumeData }) {
  const p = data.personalInfo;
  const parts = [p.email, p.phone, p.location, p.linkedin, p.website].filter(Boolean);
  return <p className="text-[13px] text-stone-500">{parts.join("  ·  ")}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0A2647] border-b border-stone-200 pb-1 mb-3 mt-6">
      {children}
    </h2>
  );
}

export function ExampleResume({ data }: { data: ResumeData }) {
  const p = data.personalInfo;
  return (
    <article className="rounded-2xl bg-white border border-stone-200 shadow-sm p-6 sm:p-8">
      <header className="text-center border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-bold text-[#0A2647]">{p.name}</h1>
        {p.title ? <p className="text-[15px] text-[#B8860B] font-medium mt-0.5">{p.title}</p> : null}
        <div className="mt-2">
          <ContactLine data={data} />
        </div>
      </header>

      {data.summary ? (
        <section>
          <SectionHeading>Summary</SectionHeading>
          <p className="text-[14px] text-stone-700 leading-relaxed">{data.summary}</p>
        </section>
      ) : null}

      {data.experience.length > 0 ? (
        <section>
          <SectionHeading>Experience</SectionHeading>
          <div className="space-y-4">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-[14px] font-semibold text-[#1a1a1a]">
                    {exp.role}
                    {exp.company ? <span className="text-stone-500 font-normal"> · {exp.company}</span> : null}
                  </h3>
                  <span className="text-[12px] text-stone-400 tabular-nums">
                    {exp.startDate}
                    {exp.startDate || exp.endDate ? " – " : ""}
                    {exp.current ? "Present" : exp.endDate}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {exp.description.filter((b) => b.trim()).map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13.5px] text-stone-700 leading-relaxed">
                      <span className="text-[#B8860B] mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.skills.length > 0 ? (
        <section>
          <SectionHeading>Skills</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-[#0A2647]/[0.06] border border-[#0A2647]/12 text-[12px] text-[#0A2647]">
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {data.education.length > 0 ? (
        <section>
          <SectionHeading>Education</SectionHeading>
          <div className="space-y-2">
            {data.education.map((edu) => (
              <div key={edu.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h3 className="text-[14px] text-[#1a1a1a]">
                  <span className="font-semibold">
                    {edu.degree}
                    {edu.field ? ` in ${edu.field}` : ""}
                  </span>
                  {edu.institution ? <span className="text-stone-500"> · {edu.institution}</span> : null}
                  {edu.gpa ? <span className="text-stone-400 text-[12px]"> · {edu.gpa}</span> : null}
                </h3>
                <span className="text-[12px] text-stone-400 tabular-nums">
                  {edu.startDate}
                  {edu.startDate || edu.endDate ? " – " : ""}
                  {edu.endDate}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {data.languages.length > 0 ? (
        <section>
          <SectionHeading>Languages</SectionHeading>
          <p className="text-[13.5px] text-stone-700">{data.languages.join("  ·  ")}</p>
        </section>
      ) : null}
    </article>
  );
}
