/**
 * Export an HTML element to PDF using html2canvas + jsPDF
 * This provides a direct download without print dialog
 * 
 * Uses dynamic imports to avoid SSR issues with jspdf
 */
export async function exportToPdf(
  element: HTMLElement,
  fileName: string = "Resume"
): Promise<void> {
  if (!element) {
    throw new Error("No element provided for PDF export");
  }

  // Dynamic imports to avoid SSR issues
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // A4 dimensions in mm
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;

  // Create canvas from HTML element
  const canvas = await html2canvas(element, {
    scale: 2, // Higher scale for better quality
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    // Ensure we capture the full element
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  // Calculate dimensions to fit A4
  const imgWidth = A4_WIDTH_MM;
  const imgHeight = (canvas.height * A4_WIDTH_MM) / canvas.width;

  // Create PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // If content is taller than one page, we need to handle pagination
  let heightLeft = imgHeight;
  let position = 0;
  const pageHeight = A4_HEIGHT_MM;

  // Add first page
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    0,
    position,
    imgWidth,
    imgHeight,
    undefined,
    "FAST"
  );
  heightLeft -= pageHeight;

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      0,
      position,
      imgWidth,
      imgHeight,
      undefined,
      "FAST"
    );
    heightLeft -= pageHeight;
  }

  // Download
  pdf.save(`${fileName}.pdf`);
}

/**
 * Alternative: Use print-to-PDF with automatic download
 * This opens print dialog but with PDF pre-selected
 */
export function printToPdf(element: HTMLElement): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to download PDF");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Resume</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

export default exportToPdf;
