import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { getServerT } from "@/lib/i18n/server";

export default async function CvNotFound() {
  const { t, dir } = await getServerT();
  return (
    <div dir={dir} className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-panel border border-hairline bg-surface">
        <EmptyState
          icon={<FileQuestion />}
          title={t("This CV isn't here")}
          action={
            <Button asChild variant="primary">
              <Link href="/cv">{t("Your CVs")}</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
