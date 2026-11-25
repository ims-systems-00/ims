declare module "html2pdf.js" {
  type Html2PdfOptions = {
    filename?: string;
    margin?: number | number[];
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: {
      mode?: string | string[];
      avoid?: string | string[];
    };
  };

  type Html2PdfWorker = {
    set(options: Html2PdfOptions): Html2PdfWorker;
    from(element: HTMLElement | string): Html2PdfWorker;
    save(filename?: string): Promise<void>;
    outputPdf(type: "blob"): Promise<Blob>;
  };

  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
