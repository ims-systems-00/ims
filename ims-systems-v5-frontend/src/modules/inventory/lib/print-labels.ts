export type PrintableLabel = {
  tag: string;
  name: string;
  category: string;
  qrDataUrl: string;
  scanUrl: string;
};

const IFRAME_ID = "ims-inventory-label-print-frame";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLabelSheetHtml(
  labels: PrintableLabel[],
  orgName?: string
): string {
  const title = orgName
    ? `Inventory labels — ${orgName}`
    : "Inventory QR labels";

  const tiles = labels
    .map((label) => {
      const qr = label.qrDataUrl
        ? `<img class="qr" src="${label.qrDataUrl}" alt="QR ${escapeHtml(label.tag)}" />`
        : `<div class="qr missing">QR</div>`;
      return `<article class="label">
  ${qr}
  <div class="meta">
    <div class="tag">${escapeHtml(label.tag)}</div>
    <div class="name">${escapeHtml(label.name)}</div>
    <div class="cat">${escapeHtml(label.category)}</div>
    <div class="url">${escapeHtml(label.scanUrl)}</div>
  </div>
</article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    color: #111;
    background: #fff;
  }
  .sheet-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin: 0 0 8mm;
    padding-bottom: 3mm;
    border-bottom: 0.4pt solid #ccc;
  }
  .sheet-head h1 {
    margin: 0;
    font-size: 12pt;
    font-weight: 700;
  }
  .sheet-head p {
    margin: 2px 0 0;
    font-size: 8.5pt;
    color: #555;
  }
  .count { font-size: 8.5pt; color: #555; white-space: nowrap; }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5mm;
  }
  .label {
    break-inside: avoid;
    page-break-inside: avoid;
    display: grid;
    grid-template-columns: 36mm minmax(0, 1fr);
    gap: 4mm;
    align-items: center;
    min-height: 42mm;
    padding: 4mm;
    border: 0.6pt dashed #999;
    border-radius: 2mm;
    background: #fff;
  }
  .qr {
    width: 36mm;
    height: 36mm;
    object-fit: contain;
    image-rendering: pixelated;
  }
  .qr.missing {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0.4pt solid #ddd;
    font-size: 8pt;
    color: #888;
  }
  .tag {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    line-height: 1.15;
  }
  .name {
    margin-top: 1mm;
    font-size: 8.5pt;
    font-weight: 600;
    line-height: 1.25;
    max-height: 2.6em;
    overflow: hidden;
  }
  .cat {
    margin-top: 1mm;
    font-size: 7.5pt;
    color: #444;
  }
  .url {
    margin-top: 1.5mm;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 5.5pt;
    color: #666;
    word-break: break-all;
    line-height: 1.3;
  }
</style>
</head>
<body>
  <header class="sheet-head">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>Scan QR → asset status card · Cut along dashed lines · Affix to equipment</p>
    </div>
    <div class="count">${labels.length} label${labels.length === 1 ? "" : "s"}</div>
  </header>
  <div class="grid">
    ${tiles}
  </div>
</body>
</html>`;
}

/**
 * Prints a dedicated cuttable label sheet via a hidden iframe
 * (avoids pop-up blockers; does not print the Inventory hub UI).
 */
export function openInventoryLabelPrintSheet(
  labels: PrintableLabel[],
  orgName?: string
): void {
  if (!labels.length) return;

  const html = buildLabelSheetHtml(labels, orgName);

  let iframe = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = IFRAME_ID;
    iframe.setAttribute("title", "Inventory label print sheet");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);
  }

  const frame = iframe;
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    throw new Error("Unable to prepare print sheet");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      throw new Error("Unable to open the print dialog");
    }
  };

  // Wait for images (QR data URLs) to settle before printing.
  const images = Array.from(doc.images);
  if (images.length === 0) {
    setTimeout(triggerPrint, 50);
    return;
  }

  let remaining = images.length;
  let printed = false;
  const done = () => {
    if (printed) return;
    remaining -= 1;
    if (remaining <= 0) {
      printed = true;
      setTimeout(triggerPrint, 50);
    }
  };

  for (const img of images) {
    if (img.complete) {
      done();
    } else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }

  // Safety timeout if load events never fire.
  setTimeout(() => {
    if (!printed) {
      printed = true;
      triggerPrint();
    }
  }, 1500);
}
