/**
 * TemplateGallery — the artifact you walk away with.
 *
 * Not abstract gray bars: small but believable résumé documents on real paper,
 * rendered in the brand's navy/brass so they read as the premium objects they
 * are. Each one is built to clear the parser and still look composed to a human
 * — the page's two-readers thesis, applied to the template itself.
 *
 * Static + CSS hover only (fail-safe, no scroll-reveal gating).
 */

type Kind = "ivy" | "modern" | "executive" | "aurora";

const DOCS: { kind: Kind; name: string; tag: string; badge?: string }[] = [
  { kind: "ivy", name: "The Ivy", tag: "Classic" },
  { kind: "modern", name: "The Modern", tag: "Contemporary", badge: "Popular" },
  { kind: "executive", name: "Executive", tag: "Senior leadership" },
  { kind: "aurora", name: "Aurora", tag: "Creative", badge: "New" },
];

export function TemplateGallery() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {DOCS.map((d) => (
        <figure key={d.kind} className="group">
          <div className="relative overflow-hidden rounded-xl border border-[#0A2647]/10 bg-white shadow-[0_22px_50px_-30px_rgba(10,38,71,0.5)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_36px_70px_-30px_rgba(10,38,71,0.55)]">
            {d.badge && (
              <span className="absolute right-2.5 top-2.5 z-10 rounded-full bg-[#0A2647] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#F3D58A]">
                {d.badge}
              </span>
            )}
            <Doc kind={d.kind} />
          </div>
          <figcaption className="mt-3 flex items-baseline justify-between px-0.5">
            <span className="font-serif text-[15px] text-[#0A2647]">{d.name}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#0A2647]/40">
              {d.tag}
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ---- believable mini-documents, brand palette ---- */

const NAVY = "#0A2647";
const BRASS = "#B8860B";

function Line({ w, c = "rgba(10,38,71,0.14)", h = 3 }: { w: string; c?: string; h?: number }) {
  return <div style={{ width: w, height: h, background: c, borderRadius: 2 }} />;
}

function Doc({ kind }: { kind: Kind }) {
  if (kind === "modern") {
    return (
      <div className="flex aspect-[210/297] bg-white text-[0]">
        <div className="flex w-[34%] flex-col gap-2 p-2.5" style={{ background: NAVY }}>
          <div className="mx-auto mb-1 h-7 w-7 rounded-full bg-white/20" />
          <Line w="100%" c="rgba(255,255,255,0.4)" h={2.5} />
          <Line w="80%" c="rgba(255,255,255,0.25)" h={2.5} />
          <div className="mt-2 space-y-1.5">
            {[80, 65, 90, 55].map((w, i) => (
              <Line key={i} w={`${w}%`} c="rgba(243,213,138,0.5)" h={2.5} />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-1.5 p-3">
          <Line w="62%" c="rgba(10,38,71,0.8)" h={5} />
          <Line w="40%" c={BRASS} h={3} />
          <div className="h-1.5" />
          {[100, 92, 80].map((w, i) => (
            <Line key={i} w={`${w}%`} />
          ))}
          <div className="h-1.5" />
          <Line w="32%" c={BRASS} h={3} />
          {[96, 85].map((w, i) => (
            <Line key={i} w={`${w}%`} />
          ))}
        </div>
      </div>
    );
  }

  if (kind === "executive") {
    return (
      <div className="aspect-[210/297] space-y-2 bg-white p-3.5">
        <div className="border-b-2 pb-2" style={{ borderColor: BRASS }}>
          <Line w="68%" c="rgba(10,38,71,0.85)" h={6} />
          <div className="h-1.5" />
          <Line w="46%" c="rgba(10,38,71,0.3)" h={3} />
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <span style={{ width: 14, height: 3, background: BRASS, borderRadius: 2 }} />
          <Line w="30%" c="rgba(10,38,71,0.5)" h={3} />
        </div>
        {[100, 90, 96].map((w, i) => (
          <Line key={i} w={`${w}%`} />
        ))}
        <div className="flex items-center gap-1.5 pt-1.5">
          <span style={{ width: 14, height: 3, background: BRASS, borderRadius: 2 }} />
          <Line w="26%" c="rgba(10,38,71,0.5)" h={3} />
        </div>
        {[94, 100, 82].map((w, i) => (
          <Line key={i} w={`${w}%`} />
        ))}
      </div>
    );
  }

  if (kind === "aurora") {
    return (
      <div className="aspect-[210/297] bg-white">
        <div
          className="h-12"
          style={{ background: `linear-gradient(120deg, ${BRASS}, ${NAVY})` }}
        />
        <div className="space-y-1.5 p-3">
          <div className="-mt-6 mb-2 h-9 w-9 rounded-full border-2 border-white bg-[#0A2647]/80" />
          <Line w="58%" c="rgba(10,38,71,0.8)" h={5} />
          <Line w="38%" c={BRASS} h={3} />
          <div className="h-1" />
          {[100, 88].map((w, i) => (
            <Line key={i} w={`${w}%`} />
          ))}
          <div className="mt-2 flex gap-1.5">
            {[18, 14, 20].map((w, i) => (
              <span key={i} style={{ width: w, height: 7, background: "rgba(184,134,11,0.18)", borderRadius: 4 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ivy — classic centered serif
  return (
    <div className="aspect-[210/297] space-y-2 bg-white p-3.5">
      <div className="border-b pb-2 text-center" style={{ borderColor: "rgba(10,38,71,0.18)" }}>
        <div className="mx-auto" style={{ width: "55%", height: 6, background: "rgba(10,38,71,0.85)", borderRadius: 2 }} />
        <div className="mx-auto mt-1.5" style={{ width: "70%", height: 3, background: "rgba(10,38,71,0.25)", borderRadius: 2 }} />
      </div>
      <div className="flex justify-center gap-1.5">
        {[18, 18, 18].map((w, i) => (
          <Line key={i} w={`${w}px`} c="rgba(10,38,71,0.3)" h={2.5} />
        ))}
      </div>
      <Line w="22%" c="rgba(10,38,71,0.45)" h={3} />
      {[100, 92, 96].map((w, i) => (
        <Line key={i} w={`${w}%`} />
      ))}
      <Line w="26%" c="rgba(10,38,71,0.45)" h={3} />
      {[88, 100, 80].map((w, i) => (
        <Line key={i} w={`${w}%`} />
      ))}
    </div>
  );
}

export default TemplateGallery;
