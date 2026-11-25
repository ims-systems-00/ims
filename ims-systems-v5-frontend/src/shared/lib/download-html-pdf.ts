/**
 * Render a full HTML document (auditor pack chrome) to a PDF that matches
 * the on-screen / print layout, then trigger a download.
 */
export async function downloadHtmlDocumentAsPdf(
  html: string,
  filename: string
): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const styleText = parsed.head.querySelector("style")?.textContent ?? "";
  const sheet = parsed.getElementById("auditor-pack-sheet") || parsed.body;

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-12000px;top:0;width:920px;background:#fff;pointer-events:none;opacity:0;";
  const styleEl = document.createElement("style");
  styleEl.textContent = `${styleText}
    body, .sheet { background:#fff !important; }
    .sheet { margin:0 !important; box-shadow:none !important; border:none !important; max-width:none !important; }
    .pack-toolbar, .no-print { display:none !important; }
  `;
  host.appendChild(styleEl);

  const mount = document.createElement("div");
  mount.innerHTML = sheet.outerHTML;
  const target = mount.firstElementChild as HTMLElement | null;
  if (!target) {
    throw new Error("Auditor pack content was empty");
  }
  host.appendChild(target);
  document.body.appendChild(host);

  const safeName = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;

  try {
    await html2pdf()
      .set({
        filename: safeName,
        margin: [8, 8, 8, 8],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".section", ".summary", "tr", ".masthead"],
        },
      })
      .from(target)
      .save();
  } finally {
    host.remove();
  }
}
