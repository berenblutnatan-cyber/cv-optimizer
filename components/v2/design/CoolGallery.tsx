"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MessageSquare, Mic, RotateCcw, Sparkles, Trash2, Type } from "lucide-react";
import { HiredMark } from "@/components/brand/HiredMark";
import { Button, CopyButton, HoldButton, Marker, MorphButton, NumberRoll, Segmented, Stamp, ThemeToggle, toast } from "@/components/ui";

// The motion and type proposals, live, before they spread through the app.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-hairline py-12 last:border-b-0">
      <h2 className="mb-8 text-h2 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Save() {
  const [state, setState] = React.useState<"idle" | "saving" | "saved">("idle");
  return (
    <MorphButton
      state={state}
      labels={{ idle: "Save", saving: "Saving…", saved: <><span className="text-success">✓</span> Saved</> }}
      onClick={() => {
        if (state !== "idle") return;
        setState("saving");
        setTimeout(() => setState("saved"), 900);
        setTimeout(() => setState("idle"), 2600);
      }}
    />
  );
}

export function CoolGallery() {
  const [mode, setMode] = React.useState<"type" | "chat" | "talk">("talk");
  const [score, setScore] = React.useState(62);
  const [stamp, setStamp] = React.useState(0);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/design" className="flex items-center gap-2.5 rounded-control">
            <HiredMark className="size-7 shrink-0" />
            <span className="text-emph font-semibold text-ink">Motion &amp; type</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 md:px-8">
        <Section title="Type">
          <p className="font-display text-display text-ink md:text-hero">
            CVs that get you <Marker>hired.</Marker>
          </p>
          <p className="mt-4 max-w-prose text-emph text-ink-2">Tell us what you did. Hired sharpens it for each job and never invents a thing.</p>
          <p className="mt-6 -rotate-2 font-pen text-[28px] leading-none text-accent-ink">+34% activation</p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg">
              Build my CV <ArrowRight data-nudge />
            </Button>
            <Button variant="secondary" size="lg">
              Optimize my CV
            </Button>
            <Save />
            <CopyButton text="https://hiredcv.app/cv/alex-morgan" label="Copy link" />
            <HoldButton hint="Hold to delete" done="Deleted" onConfirm={() => void toast("CV deleted")}>
              <Trash2 /> Delete CV
            </HoldButton>
          </div>
        </Section>

        <Section title="Switch">
          <Segmented
            aria-label="Input mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "type", label: "Type", icon: <Type /> },
              { value: "chat", label: "Chat", icon: <MessageSquare /> },
              { value: "talk", label: "Talk", icon: <Mic /> },
            ]}
          />
        </Section>

        <Section title="Numbers">
          <div className="flex flex-wrap items-end gap-8">
            <div className="flex items-baseline gap-2">
              <NumberRoll value={score} className="font-display text-[96px] leading-none text-ink" />
              <span className="text-h3 text-ink-3">/ 100</span>
            </div>
            <div className="flex gap-2 pb-3">
              <Button variant="primary" onClick={() => setScore((s) => Math.min(100, s + 15))} disabled={score >= 100}>
                <Sparkles /> Apply fix
              </Button>
              <Button variant="ghost" onClick={() => setScore(62)} aria-label="Reset">
                <RotateCcw />
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Next step">
          <div className="beam max-w-md rounded-card bg-surface p-5 shadow-card">
            <p className="text-dense font-medium text-accent-ink">Next fix · +6</p>
            <p className="mt-1 text-emph text-ink">Add a number to “Led onboarding for new users”.</p>
            <Button variant="primary" size="sm" className="mt-4">
              Apply <ArrowRight data-nudge />
            </Button>
          </div>
        </Section>

        <Section title="Big win">
          <div className="flex flex-wrap items-center gap-10">
            <div className="grid h-40 w-72 place-items-center">
              <Stamp play={stamp}>HIRED</Stamp>
            </div>
            <Button variant="secondary" onClick={() => setStamp((n) => n + 1)}>
              <RotateCcw /> Play
            </Button>
          </div>
        </Section>

        <div className="py-10">
          <Button asChild variant="ghost">
            <Link href="/design">
              <ArrowLeft className="rtl:-scale-x-100" /> Design system
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
