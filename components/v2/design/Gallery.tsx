"use client";

import * as React from "react";
import {
  ArrowRight,
  Briefcase,
  Copy,
  Download,
  FileText,
  Keyboard,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import tokens from "@/replica/design/tokens.json";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CommandPalette,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  DiffLine,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ScoreBar,
  ScoreGauge,
  Segmented,
  Select,
  Sheet,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Tooltip,
  VoiceOrb,
  Waveform,
  toast,
  type VoiceState,
} from "@/components/ui";

const SECTIONS = [
  ["color", "Colour"],
  ["type", "Type"],
  ["buttons", "Buttons"],
  ["inputs", "Inputs"],
  ["navigation", "Navigation"],
  ["overlays", "Overlays"],
  ["feedback", "States"],
  ["score", "Score"],
  ["evidence", "Evidence"],
  ["voice", "Voice"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-hairline py-12 last:border-b-0">
      <h2 className="mb-6 text-h2 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-3 md:grid-cols-[160px_1fr] md:items-center">
      <span className="text-dense text-ink-3">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function Swatches() {
  const names = Object.keys(tokens.color.light) as (keyof typeof tokens.color.light)[];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {names.map((n) => (
        <div key={n} className="overflow-hidden rounded-card border border-hairline bg-surface">
          <div className="h-14 border-b border-hairline" style={{ background: `rgb(var(--c-${kebab(n)}))` }} />
          <div className="px-3 py-2">
            <div className="text-dense font-medium text-ink">{kebab(n)}</div>
            <div className="tabular font-mono text-dense text-ink-3">
              {tokens.color.light[n]} · {tokens.color.dark[n]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypeScale() {
  const rows: [string, string, string][] = [
    ["hero", "text-hero", "Talk. We'll write it."],
    ["display", "text-display", "Your CV, built by talking"],
    ["h1", "text-h1", "Senior Product Designer"],
    ["h2", "text-h2", "Tailored for Stripe"],
    ["h3", "text-h3", "Experience"],
    ["emph", "text-emph", "Led the redesign of the onboarding flow"],
    ["body", "text-body", "Cut time-to-first-invoice from 9 days to 2 by rebuilding onboarding around one action."],
    ["dense", "text-dense", "Badges, tooltips, kbd, chart labels · 14px floor"],
  ];
  return (
    <div className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
      {rows.map(([name, cls, sample]) => (
        <div key={name} className="grid items-baseline gap-2 px-5 py-4 md:grid-cols-[120px_1fr]">
          <span className="font-mono text-dense text-ink-3">{name}</span>
          <span className={`${cls} truncate font-semibold text-ink ${name === "body" || name === "dense" ? "font-normal" : ""}`}>{sample}</span>
        </div>
      ))}
    </div>
  );
}

function VoiceDemo() {
  const [state, setState] = React.useState<VoiceState>("listening");
  const [level, setLevel] = React.useState(0.3);
  const [data, setData] = React.useState<number[]>([]);
  React.useEffect(() => {
    if (state !== "listening" && state !== "speaking") return;
    let t = 0;
    const id = window.setInterval(() => {
      t += 1;
      const base = 0.35 + 0.3 * Math.sin(t / 3);
      setLevel(Math.max(0, base + (Math.random() - 0.5) * 0.3));
      setData(Array.from({ length: 64 }, (_, i) => Math.max(0, Math.min(255, 140 * base + 90 * Math.sin(i / 4 + t) + Math.random() * 40))));
    }, 90);
    return () => window.clearInterval(id);
  }, [state]);
  const states: VoiceState[] = ["idle", "connecting", "listening", "speaking", "muted", "error"];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <Card className="flex flex-col items-center justify-center gap-6 py-10">
        <VoiceOrb state={state} level={level} onClick={() => setState(state === "listening" ? "muted" : "listening")} />
        <Waveform data={state === "listening" || state === "speaking" ? data : undefined} />
      </Card>
      <div className="flex flex-col gap-4">
        <Segmented<VoiceState>
          aria-label="Voice state"
          size="sm"
          value={state}
          onChange={setState}
          options={states.map((s) => ({ value: s, label: s }))}
          className="flex-wrap"
        />
        <Card>
          <CardHeader title="Live" action={<Badge tone="accent">03:12</Badge>} />
          <CardBody className="flex flex-col gap-3">
            <p className="text-body text-ink-2">
              <span className="font-medium text-ink">Hired</span> · What changed because of that launch?
            </p>
            <p className="text-body text-ink">
              <span className="font-medium">You</span> · Signups doubled in the first quarter, about forty thousand a month.
            </p>
            <div className="flex animate-flash-patch items-center gap-2 rounded-control px-2 py-1.5 text-dense text-ink-2">
              <Pencil className="size-3.5 text-accent" aria-hidden />
              Added a bullet to Product Lead, Acme
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function Gallery() {
  const [mode, setMode] = React.useState<"type" | "chat" | "talk">("chat");
  const [sheet, setSheet] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const actions = React.useMemo(
    () => [
      { id: "new", label: "New CV", group: "Create", icon: <Plus />, shortcut: "N", run: () => toast("New CV") },
      { id: "talk", label: "Talk to build", group: "Create", icon: <Mic />, run: () => toast("Voice intake") },
      { id: "upload", label: "Upload a CV", group: "Create", icon: <Upload />, run: () => toast("Upload") },
      { id: "tailor", label: "Tailor to a job", group: "Actions", icon: <Sparkles />, shortcut: "T", run: () => toast("Tailor") },
      { id: "export", label: "Export PDF", group: "Actions", icon: <Download />, shortcut: "⌘E", run: () => toast.success("PDF ready") },
      { id: "jobs", label: "Jobs", group: "Go to", icon: <Briefcase />, run: () => toast("Jobs") },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-canvas">
      <CommandPalette actions={actions} />
      <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-shell items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-control bg-ink text-dense font-semibold text-canvas">H</span>
            <span className="truncate whitespace-nowrap text-emph font-semibold text-ink">Design system</span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" aria-label="Search" onClick={() => window.dispatchEvent(new Event("hired:command"))}>
              <Search /> <span className="hidden sm:inline">Search</span> <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-shell gap-10 px-4 md:grid-cols-[180px_1fr] md:px-8">
        <nav aria-label="Sections" className="sticky top-14 hidden h-[calc(100vh-56px)] flex-col gap-0.5 py-12 md:flex">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="rounded-control px-2.5 py-1.5 text-body text-ink-2 hover:bg-surface-2 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>

        <main className="min-w-0">
          <Section id="color" title="Colour">
            <Swatches />
          </Section>

          <Section id="type" title="Type">
            <TypeScale />
          </Section>

          <Section id="buttons" title="Buttons">
            <Row label="Variants">
              <Button variant="primary">
                Tailor to a job <ArrowRight />
              </Button>
              <Button>Export</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">Delete CV</Button>
              <Button variant="link">View changes</Button>
            </Row>
            <Row label="Sizes">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </Row>
            <Row label="States">
              <Button
                variant="primary"
                loading={busy}
                onClick={() => {
                  setBusy(true);
                  setTimeout(() => setBusy(false), 1400);
                }}
              >
                Analyze
              </Button>
              <Button disabled>Disabled</Button>
            </Row>
            <Row label="Icon">
              <IconButton label="Copy" shortcut="⌘C">
                <Copy />
              </IconButton>
              <IconButton label="Edit">
                <Pencil />
              </IconButton>
              <IconButton label="Delete">
                <Trash2 />
              </IconButton>
              <IconButton label="Keyboard shortcuts" shortcut="?" size="lg">
                <Keyboard />
              </IconButton>
            </Row>
          </Section>

          <Section id="inputs" title="Inputs">
            <div className="grid max-w-2xl gap-5 md:grid-cols-2">
              <Field label="Job title">
                <Input placeholder="Product Designer" />
              </Field>
              <Field label="Email" error="Enter a valid email">
                <Input defaultValue="dana@" type="email" />
              </Field>
              <Field label="Seniority" hint="Sets which expert rules the review applies.">
                <Select defaultValue="senior">
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="exec">Executive</option>
                </Select>
              </Field>
              <Field label="Location" optional>
                <Input placeholder="Tel Aviv" />
              </Field>
              <Field label="Job description" className="md:col-span-2">
                <Textarea placeholder="Paste the job post" />
              </Field>
              <Field label="Disabled">
                <Input disabled defaultValue="Locked" />
              </Field>
            </div>
          </Section>

          <Section id="navigation" title="Navigation">
            <Row label="Compose mode">
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
            </Row>
            <div className="mt-4 max-w-2xl">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="fit">Job fit</TabsTrigger>
                  <TabsTrigger value="fixes">
                    Fixes <Badge tone="accent">6</Badge>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="text-body text-ink-2">Overview panel</TabsContent>
                <TabsContent value="fit" className="text-body text-ink-2">Job fit panel</TabsContent>
                <TabsContent value="fixes" className="text-body text-ink-2">Fixes panel</TabsContent>
              </Tabs>
            </div>
            <Row label="Badges">
              <Badge>Draft</Badge>
              <Badge tone="accent">Tailored</Badge>
              <Badge tone="success">Applied</Badge>
              <Badge tone="warn">Missing</Badge>
              <Badge tone="danger">Rejected</Badge>
              <Badge tone="outline">PDF</Badge>
            </Row>
          </Section>

          <Section id="overlays" title="Overlays">
            <Row label="Dialog">
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Rename CV</Button>
                </DialogTrigger>
                <DialogContent
                  title="Rename"
                  size="sm"
                  footer={
                    <>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button variant="primary" onClick={() => toast.success("Renamed")}>Save</Button>
                      </DialogClose>
                    </>
                  }
                >
                  <Field label="Name">
                    <Input defaultValue="Product Designer — Stripe" autoFocus />
                  </Field>
                </DialogContent>
              </Dialog>
            </Row>
            <Row label="Sheet">
              <Button onClick={() => setSheet(true)}>Export</Button>
              <Sheet open={sheet} onOpenChange={setSheet} title="Export">
                <div className="flex flex-col gap-2 pb-2">
                  {[
                    ["PDF", "Best for applying"],
                    ["Word", "For recruiters who edit"],
                    ["Plain text", "For forms"],
                  ].map(([f, why]) => (
                    <Tooltip key={f} content={why}>
                      <button
                        onClick={() => {
                          setSheet(false);
                          toast.success(`${f} downloaded`);
                        }}
                        className="flex h-12 items-center gap-3 rounded-card border border-hairline px-4 text-body font-medium text-ink hover:bg-surface-2"
                      >
                        <FileText className="size-4 text-ink-3" /> {f}
                      </button>
                    </Tooltip>
                  ))}
                </div>
              </Sheet>
            </Row>
            <Row label="Menu">
              <Menu>
                <MenuTrigger asChild>
                  <IconButton label="More">
                    <MoreHorizontal />
                  </IconButton>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem icon={<Pencil />} shortcut="R">Rename</MenuItem>
                  <MenuItem icon={<Copy />} shortcut="⌘D">Duplicate</MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={<Trash2 />} tone="danger">Delete</MenuItem>
                </MenuContent>
              </Menu>
            </Row>
            <Row label="Popover">
              <Popover>
                <PopoverTrigger asChild>
                  <Button>Accent</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto">
                  <div className="flex gap-2">
                    {["#18181b", "#2f4fd8", "#0f766e", "#9f1239", "#7c2d12"].map((c) => (
                      <button key={c} aria-label={c} className="size-8 rounded-full border border-hairline" style={{ background: c }} />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </Row>
            <Row label="Toast">
              <Button onClick={() => toast("Fix applied", { action: { label: "Undo", onClick: () => toast("Undone") } })}>Show toast</Button>
            </Row>
            <Row label="Command">
              <Button variant="ghost" onClick={() => window.dispatchEvent(new Event("hired:command"))}>
                Open <Kbd>⌘K</Kbd>
              </Button>
            </Row>
          </Section>

          <Section id="feedback" title="States">
            <div className="grid gap-5 lg:grid-cols-3">
              <Card>
                <CardHeader title="Loading" />
                <CardBody className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="w-full" />
                  <Skeleton className="w-5/6" />
                  <Skeleton className="w-1/2" />
                </CardBody>
              </Card>
              <Card>
                <EmptyState
                  icon={<Briefcase />}
                  title="No applications yet"
                  action={
                    <Button variant="primary" size="sm">
                      <Plus /> Add application
                    </Button>
                  }
                />
              </Card>
              <div className="flex flex-col gap-4">
                <ErrorState title="Couldn't read that PDF" action={<Button size="sm">Try again</Button>} />
                <Card className="p-5">
                  <div className="mb-2 flex items-center justify-between text-dense">
                    <span className="text-ink-2">Reading your CV</span>
                    <span className="tabular text-ink-3">62%</span>
                  </div>
                  <Progress value={62} label="Reading your CV" />
                </Card>
              </div>
            </div>
          </Section>

          <Section id="score" title="Score">
            <div className="grid gap-5 xl:grid-cols-[auto_minmax(320px,1fr)]">
              <Card className="flex flex-wrap items-center gap-8 p-6">
                <ScoreGauge value={78} />
                <ScoreGauge value={52} size={88} />
                <ScoreGauge value={null} size={88} />
                <ScoreGauge value={null} size={88} loading />
              </Card>
              <Card className="flex flex-col justify-center gap-4 p-6">
                <ScoreBar label="ATS" value={84} why="Single column, standard headings, parsable dates." />
                <ScoreBar label="Impact" value={61} why="4 of 11 bullets show a measurable result." />
                <ScoreBar label="Clarity" value={73} why="Two bullets over 30 words." />
              </Card>
            </div>
          </Section>

          <Section id="evidence" title="Evidence">
            <div className="grid max-w-3xl gap-4">
              <DiffLine
                grounded
                applied={applied}
                requirement="Owns end-to-end onboarding metrics"
                before="Worked on the onboarding flow with the growth team."
                after="Rebuilt onboarding around one action, cutting time-to-first-invoice from 9 days to 2."
                evidence="we got it from nine days down to two"
                actions={
                  applied ? (
                    <Button size="sm" variant="ghost" onClick={() => setApplied(false)}>Undo</Button>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => setApplied(true)}>Apply</Button>
                  )
                }
              />
              <DiffLine
                grounded={false}
                requirement="Experience with design systems at scale"
                after="Add how many teams or products used the component library you built."
                actions={<Button size="sm">I did this</Button>}
              />
            </div>
          </Section>

          <Section id="voice" title="Voice">
            <VoiceDemo />
          </Section>
        </main>
      </div>
    </div>
  );
}
