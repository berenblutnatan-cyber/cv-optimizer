"use client";

import * as React from "react";
import { Command as C } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { Kbd } from "./kbd";

export type CommandAction = {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
};

/** ⌘K palette. Opens on ⌘K / Ctrl+K from anywhere. */
export function CommandPalette({ actions }: { actions: CommandAction[] }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hired:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hired:command", onOpen);
    };
  }, []);

  const groups = React.useMemo(() => {
    const m = new Map<string, CommandAction[]>();
    for (const a of actions) m.set(a.group, [...(m.get(a.group) ?? []), a]);
    return [...m.entries()];
  }, [actions]);

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <D.Content className="fixed inset-x-0 top-[14vh] z-50 mx-auto w-[calc(100vw-32px)] max-w-xl overflow-hidden rounded-panel border border-hairline bg-surface shadow-pop focus-visible:outline-none data-[state=open]:animate-pop-in">
          <D.Title className="sr-only">Command menu</D.Title>
          <D.Description className="sr-only">Search actions and pages</D.Description>
          <C loop className="flex flex-col">
            <div className="flex h-13 items-center gap-3 border-b border-hairline px-4">
              <Search className="size-[18px] text-ink-3" aria-hidden />
              <C.Input autoFocus placeholder="Search or jump to…" className="h-full flex-1 bg-transparent text-emph text-ink outline-none placeholder:text-ink-3" />
              <Kbd>esc</Kbd>
            </div>
            <C.List className="max-h-[50vh] overflow-y-auto p-1.5">
              <C.Empty className="px-3 py-8 text-center text-body text-ink-2">No matches</C.Empty>
              {groups.map(([group, items]) => (
                <C.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-dense [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3"
                >
                  {items.map((a) => (
                    <C.Item
                      key={a.id}
                      value={`${a.label} ${(a.keywords ?? []).join(" ")}`}
                      onSelect={() => {
                        setOpen(false);
                        a.run();
                      }}
                      className="flex h-10 cursor-default select-none items-center gap-3 rounded-control px-2.5 text-body text-ink data-[selected=true]:bg-surface-2 [&_svg]:size-4"
                    >
                      <span className="text-ink-3">{a.icon}</span>
                      <span className="flex-1">{a.label}</span>
                      {a.shortcut && <Kbd>{a.shortcut}</Kbd>}
                    </C.Item>
                  ))}
                </C.Group>
              ))}
            </C.List>
          </C>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
