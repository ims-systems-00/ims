import pdfPlaceholder from "../assets/image/pdf-placeholder.png";
import jpgPlaceholder from "../assets/image/jpg-placeholder.png";
import pngPlaceholder from "../assets/image/png-placeholder.png";
import xlsxPlaceholder from "../assets/image/xlsx-placeholder.png";
import pptxPlaceholder from "../assets/image/pptx-placeholder.png";
import docxPlaceholder from "../assets/image/docx-placeholder.png";
export function getAttachmentImage(filename) {
  if (!filename) return docxPlaceholder;
  let filenameSplit = filename.split(".");
  let ext = filenameSplit[filenameSplit.length - 1];
  if (ext === "docx") return docxPlaceholder;
  if (ext === "pdf") return pdfPlaceholder;
  if (ext === "xlsx") return xlsxPlaceholder;
  if (ext === "pptx") return pptxPlaceholder;
  if (ext === "jpg" || ext === "jpeg") return jpgPlaceholder;
  if (ext === "png") return pngPlaceholder;
  return;
}
