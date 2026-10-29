"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronDown, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { cn, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui";

/** Textarea that grows with its content (no inner scrollbar, no layout jump). */
export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, value, ...props }, forwarded) => {
    const ref = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(forwarded, () => ref.current as HTMLTextAreaElement);
    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }, [value]);
    return (
      <textarea
        ref={ref}
        rows={1}
        value={value}
        className={cn(
          "w-full resize-none overflow-hidden rounded-control border border-hairline-strong bg-surface px-3 py-2 text-body leading-[22px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] hover:border-control focus-visible:border-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20",
          className,
        )}
        {...props}
      />
    );
  },
);
AutoTextarea.displayName = "AutoTextarea";

/** Plain text input with the v2 field look; label is visually hidden when `srLabel`. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  srLabel,
  className,
  inputRef,
  type = "text",
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  srLabel?: boolean;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("text-dense font-medium text-ink-2", srLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-control border border-hairline-strong bg-surface px-3 text-body text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] hover:border-control focus-visible:border-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-2"
      />
    </div>
  );
}

/**
 * One bullet per row. Enter adds a bullet below, Backspace on an empty bullet
 * removes it and returns to the previous one. Empty trailing bullets are kept
 * while editing (the preview ignores them).
 */
export function BulletList({
  label,
  items,
  onChange,
  placeholder,
  addLabel = "Add bullet",
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const refs = React.useRef<(HTMLTextAreaElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);
  // Draft rows: the stored list never contains empty strings (the reducer
  // drops them), but the editor needs a blank row to type into. Resync from
  // props only when the content changed from outside (chat, another tab).
  const [rows, setRows] = React.useState<string[]>(items);
  React.useEffect(() => {
    const filled = rows.filter((r) => r !== "");
    if (filled.length !== items.length || filled.some((r, i) => r !== items[i])) setRows(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  React.useEffect(() => {
    if (focusIndex == null) return;
    const el = refs.current[focusIndex];
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusIndex(null);
  }, [focusIndex, rows.length]);

  const commit = (next: string[]) => {
    setRows(next);
    onChange(next.filter((r) => r !== ""));
  };
  const update = (i: number, text: string) => commit(rows.map((b, k) => (k === i ? text : b)));
  const insertAfter = (i: number) => {
    const next = rows.slice();
    next.splice(i + 1, 0, "");
    setRows(next);
    setFocusIndex(i + 1);
  };
  const remove = (i: number) => {
    commit(rows.filter((_, k) => k !== i));
    setFocusIndex(Math.max(0, i - 1));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-dense font-medium text-ink-2">{label}</legend>
      {rows.map((b, i) => (
        <div key={i} className="group flex items-start gap-2">
          <span aria-hidden className="mt-[17px] size-1.5 shrink-0 rounded-full bg-ink-3" />
          <AutoTextarea
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-label={`${label} ${i + 1}`}
            value={b}
            placeholder={i === 0 ? placeholder : undefined}
            onChange={(e) => update(i, e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                insertAfter(i);
              } else if (e.key === "Backspace" && b === "" && rows.length > 1) {
                e.preventDefault();
                remove(i);
              }
            }}
          />
          <IconButton label="Remove bullet" className="mt-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100" onClick={() => remove(i)}>
            <X />
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        onClick={() => insertAfter(rows.length - 1)}
        className="inline-flex h-9 w-fit items-center gap-1.5 rounded-control px-2 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <Plus className="size-4" /> {addLabel}
      </button>
    </fieldset>
  );
}

/** Chips with an inline input. Enter or comma adds, Backspace on empty removes the last. */
export function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = React.useState("");
  const id = React.useId();
  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(values.map((v) => v.toLowerCase()));
    const fresh = parts.filter((p) => !seen.has(p.toLowerCase()) && (seen.add(p.toLowerCase()), true));
    if (fresh.length) onChange([...values, ...fresh]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-control border border-hairline-strong bg-surface p-1.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/20 hover:border-control">
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex h-7 items-center gap-1 rounded-[5px] bg-surface-2 pe-1 ps-2.5 text-dense font-medium text-ink">
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((_, k) => k !== i))}
              className="grid size-5 place-items-center rounded-[4px] text-ink-3 hover:bg-hairline hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) commit(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && draft === "" && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => commit(draft)}
          className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-body text-ink outline-none placeholder:text-ink-3"
        />
      </div>
    </div>
  );
}

/** A collapsible entry (one role, one degree…) with reorder and delete in a menu. */
export function EntryCard({
  title,
  meta,
  open,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
  autoFocus,
  children,
}: {
  title: string;
  meta?: string;
  open: boolean;
  /** Move focus to the first field when the card opens (a freshly added entry). */
  autoFocus?: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open || !autoFocus) return;
    const first = bodyRef.current?.querySelector<HTMLElement>("input, textarea");
    first?.focus();
    bodyRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, autoFocus]);
  return (
    <div className={cn("rounded-card border bg-surface transition-colors", open ? "border-hairline-strong" : "border-hairline")}>
      <div className="flex items-center gap-1 pe-1.5">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-13 min-w-0 flex-1 items-center gap-3 rounded-card px-4 text-start">
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-body font-medium", title ? "text-ink" : "text-ink-3")}>{title || "Untitled"}</span>
            {meta && <span className="block truncate text-dense text-ink-2">{meta}</span>}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform duration-panel", open && "rotate-180")} aria-hidden />
        </button>
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="Entry actions">
              <MoreHorizontal />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={<ArrowUp />} disabled={!onMoveUp} onSelect={onMoveUp}>
              Move up
            </MenuItem>
            <MenuItem icon={<ArrowDown />} disabled={!onMoveDown} onSelect={onMoveDown}>
              Move down
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 />} tone="danger" onSelect={onDelete}>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {open && (
        <div ref={bodyRef} className="flex flex-col gap-4 border-t border-hairline px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

/** Ghost "+ Add …" row at the end of a section. */
export function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-hairline-strong text-body font-medium text-ink-2 transition-colors hover:border-control hover:bg-surface hover:text-ink"
    >
      <Plus className="size-4" /> {label}
    </button>
  );
}
