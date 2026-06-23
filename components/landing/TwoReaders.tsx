/**
 * TwoReaders — why the rewrite works.
 *
 * Every résumé is read twice: first by parsing software that decides whether a
 * human ever sees it, then by a recruiter who skims in seconds. The two panels
 * show the SAME line in each reader's register — the machine's (mono, dark,
 * keyword-matched) and the recruiter's (serif, paper, impact-first) — which is
 * exactly the two-voice system the rest of the page is built on.
 *
 * Static and fail-safe: content is always visible, no scroll-reveal gating.
 */

const MATCH = [
  ["Keywords matched", "9 / 9"],
  ["Section headings", "standard"],
  ["Layout", "parses cleanly"],
];

export function TwoReaders() {
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
      {/* THE MACHINE — parser register (dark card, brass ring → pops on navy) */}
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/12 bg-[#06182f] p-7 shadow-[0_36px_80px_-32px_rgba(0,0,0,0.7)] ring-1 ring-[#B8860B]/15 sm:p-9">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#D4A83F]">
          Reader 01 · the software
        </p>
        <h3 className="mt-3 font-serif text-2xl text-white sm:text-[1.7rem]">
          It scans before it forwards.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Most companies run every résumé through screening software first. It
          hunts for the right words in a structure it can actually parse.
        </p>

        {/* tokenized view */}
        <div className="mt-6 rounded-xl bg-[#030d1c] p-4 font-mono text-[13px] leading-relaxed text-white/75 ring-1 ring-white/10">
          <span className="text-white/40">&gt; parsing bullet…</span>
          <p className="mt-2">
            Cut <Token>AWS</Token> <Token>spend</Token> 31% by{" "}
            <Token>re-architecting</Token> 12 services onto{" "}
            <Token>spot instances</Token> and <Token>autoscaling</Token>.
          </p>
        </div>

        <ul className="mt-5 space-y-2.5">
          {MATCH.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white/75">
                <span className="text-[#4ade80]">✓</span>
                {k}
              </span>
              <span className="font-mono text-xs text-[#D4A83F]">{v}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* THE RECRUITER — human register (paper) */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#FDFBF6] p-7 shadow-[0_36px_80px_-32px_rgba(0,0,0,0.5)] sm:p-9">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#9a6b08]">
          Reader 02 · the recruiter
        </p>
        <h3 className="mt-3 font-serif text-2xl text-[#0A2647] sm:text-[1.7rem]">
          They skim for the one that sticks.
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#0A2647]/60">
          A recruiter gives each résumé a few seconds. They aren&rsquo;t reading
          keywords — they&rsquo;re looking for a number they&rsquo;ll repeat in the
          hiring meeting.
        </p>

        {/* what the human sees — a clean fragment */}
        <div className="mt-6 rounded-xl border border-[#0A2647]/8 bg-white p-5 shadow-[0_18px_40px_-26px_rgba(10,38,71,0.45)]">
          <p className="font-serif text-base font-semibold text-[#0A2647]">
            Senior Platform Engineer
          </p>
          <p className="mt-1 text-xs text-[#0A2647]/45">Cloudside · 2021–Present</p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#0A2647]/80">
            Cut AWS spend{" "}
            <mark className="bg-[#B8860B]/15 px-1 font-semibold text-[#9a6b08]">
              31% ($420K/yr)
            </mark>{" "}
            by re-architecting 12 services onto spot instances.
          </p>
        </div>

        <p className="mt-5 flex items-center gap-2 text-sm text-[#0A2647]/60">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#B8860B]/12 font-mono text-[10px] font-semibold text-[#9a6b08]">
            7s
          </span>
          Read in seconds — and the number is what they remember.
        </p>
      </div>
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-[#B8860B]/20 px-1 text-[#F3D58A]">{children}</span>
  );
}

export default TwoReaders;
