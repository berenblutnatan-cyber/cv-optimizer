import { saveAs } from "file-saver";
import type { ResumePreviewData } from "@/components/builder/ResumePreview";
import { wordBlob, type WordOptions } from "@/lib/export/docx";

/** Export resume data to a Word (.docx) download in the browser. */
export async function exportToWord(data: ResumePreviewData, fileName: string = "Resume", opts: WordOptions = {}) {
  saveAs(await wordBlob(data, opts), `${fileName}.docx`);
}

export default exportToWord;
