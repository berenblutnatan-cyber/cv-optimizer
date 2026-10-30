"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { DesignState } from "@/lib/resume/document";
import type { TemplateData } from "@/lib/resume/view";
import { Button, Dialog, DialogContent, IconButton, Menu, MenuContent, MenuItem, MenuTrigger, toast } from "@/components/ui";
import { CvThumbnail } from "./CvThumbnail";
import { RelativeTime } from "./RelativeTime";

export function CvCard({
  id,
  title,
  meta,
  updatedAt,
  data,
  design,
  eager,
}: {
  id: string;
  title: string;
  meta: string;
  updatedAt: string;
  data: TemplateData;
  design: DesignState;
  eager?: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [gone, setGone] = React.useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/cv/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't delete it. Try again.");
      setGone(true);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  if (gone) return null;
  return (
    <li className="group relative">
      <Link
        href={`/cv/${id}`}
        className="flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-surface shadow-card transition-[border-color,transform] duration-micro hover:-translate-y-0.5 hover:border-hairline-strong"
      >
        <span className="relative block h-48 overflow-hidden border-b border-hairline bg-surface-2 px-6 pt-5">
          <span className="block overflow-hidden rounded-t-[3px] shadow-card">
            <CvThumbnail data={data} design={design} eager={eager} />
          </span>
        </span>
        <span className="block min-w-0 px-4 py-3.5 pe-12">
          <span className="block truncate text-emph font-semibold text-ink">{title}</span>
          <span className="block truncate text-dense text-ink-2">
            {meta} · <RelativeTime iso={updatedAt} />
          </span>
        </span>
      </Link>
      <div className="absolute bottom-3 end-2">
        <Menu>
          <MenuTrigger asChild>
            <IconButton label="CV actions">
              <MoreHorizontal />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end">
            {/* Open after the menu has closed and returned focus; opening in the
                same tick lets the menu's focus return dismiss the dialog. */}
            <MenuItem icon={<Trash2 />} tone="danger" onSelect={() => setTimeout(() => setConfirming(true), 0)}>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          size="sm"
          title={`Delete “${title}”?`}
          description="Its versions go too. This can’t be undone."
          showDescription
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deleting} onClick={() => void remove()}>
                Delete
              </Button>
            </>
          }
        />
      </Dialog>
    </li>
  );
}
