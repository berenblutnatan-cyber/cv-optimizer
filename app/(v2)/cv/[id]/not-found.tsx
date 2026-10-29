import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

export default function CvNotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-panel border border-hairline bg-surface">
        <EmptyState
          icon={<FileQuestion />}
          title="This CV isn't here"
          action={
            <Button asChild variant="primary">
              <Link href="/cv">Your CVs</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
