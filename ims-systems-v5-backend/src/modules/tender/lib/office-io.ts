/**
 * Minimal ZIP + Office XML helpers (ported from prototype zip.js).
 * Uses node:zlib inflateRawSync for deflate entries; writes stored zips.
 */
import { inflateRawSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(u8: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) {
    c = CRC_TABLE[(c ^ u8[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const enc = (s: string): Uint8Array => textEncoder.encode(s);
const dec = (u: Uint8Array): string => textDecoder.decode(u);

function inflateRaw(u8: Uint8Array): Uint8Array {
  return new Uint8Array(inflateRawSync(Buffer.from(u8)));
}

/** read(u8) → { 'word/document.xml': Uint8Array, ... } */
export function readZip(u8: Uint8Array): Record<string, Uint8Array> {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const out: Record<string, Uint8Array> = {};
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70_000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) {
    const err = new Error("Not a zip/Office file") as Error & {
      code?: string;
    };
    err.code = "bad_zip";
    throw err;
  }
  const n = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) {
      throw new Error("Bad central directory");
    }
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const off = dv.getUint32(p + 42, true);
    const name = dec(u8.subarray(p + 46, p + 46 + nlen));
    const lnlen = dv.getUint16(off + 26, true);
    const lelen = dv.getUint16(off + 28, true);
    const start = off + 30 + lnlen + lelen;
    const data = u8.subarray(start, start + csize);
    if (method === 8) out[name] = inflateRaw(data);
    else if (method === 0) out[name] = data;
    else throw new Error("Unsupported compression " + method);
    p += 46 + nlen + elen + clen;
  }
  return out;
}

/** write({ path: string|Uint8Array }) → Uint8Array (stored) */
export function writeZip(
  files: Record<string, string | Uint8Array>
): Uint8Array {
  const parts: Uint8Array[] = [];
  const cd: Uint8Array[] = [];
  let off = 0;
  const now = new Date();
  const dt =
    ((now.getHours() << 11) |
      (now.getMinutes() << 5) |
      (now.getSeconds() >> 1)) &
    0xffff;
  const dd =
    (((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate()) &
    0xffff;

  for (const [name, v] of Object.entries(files)) {
    const data = typeof v === "string" ? enc(v) : v;
    const nm = enc(name);
    const crc = crc32(data);
    const lh = new Uint8Array(30 + nm.length);
    const d = new DataView(lh.buffer);
    d.setUint32(0, 0x04034b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 0x0800, true);
    d.setUint16(8, 0, true);
    d.setUint16(10, dt, true);
    d.setUint16(12, dd, true);
    d.setUint32(14, crc, true);
    d.setUint32(18, data.length, true);
    d.setUint32(22, data.length, true);
    d.setUint16(26, nm.length, true);
    d.setUint16(28, 0, true);
    lh.set(nm, 30);
    parts.push(lh, data);

    const ch = new Uint8Array(46 + nm.length);
    const c = new DataView(ch.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, dt, true);
    c.setUint16(14, dd, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true);
    c.setUint32(24, data.length, true);
    c.setUint16(28, nm.length, true);
    c.setUint32(42, off, true);
    ch.set(nm, 46);
    cd.push(ch);
    off += lh.length + data.length;
  }

  const cdLen = cd.reduce((a, b) => a + b.length, 0);
  const e = new Uint8Array(22);
  const ed = new DataView(e.buffer);
  ed.setUint32(0, 0x06054b50, true);
  ed.setUint16(8, cd.length, true);
  ed.setUint16(10, cd.length, true);
  ed.setUint32(12, cdLen, true);
  ed.setUint32(16, off, true);

  const total = off + cdLen + 22;
  const out = new Uint8Array(total);
  let q = 0;
  for (const p of [...parts, ...cd, e]) {
    out.set(p, q);
    q += p.length;
  }
  return out;
}

const unesc = (s: string): string =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

export const escXml = (s: unknown): string =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type XmlTag = { attrs: string; inner: string };

function tags(xml: string, tag: string): XmlTag[] {
  const re = new RegExp(
    `<${tag}(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${tag}>)`,
    "g"
  );
  const out: XmlTag[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out.push({
      attrs: m[0].slice(0, m[0].indexOf(">") + 1),
      inner: m[1] || "",
    });
  }
  return out;
}

function attr(open: string, name: string): string | null {
  const m = open.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? unesc(m[1]!) : null;
}

export type XlsxSheet = {
  name: string | null;
  rows: (string | number)[][];
};

export function readXlsx(u8: Uint8Array): XlsxSheet[] {
  const z = readZip(u8);
  const wb = dec(z["xl/workbook.xml"] || new Uint8Array());
  const rels = dec(z["xl/_rels/workbook.xml.rels"] || new Uint8Array());
  const ss: string[] = [];
  if (z["xl/sharedStrings.xml"]) {
    for (const si of tags(dec(z["xl/sharedStrings.xml"]!), "si")) {
      ss.push(tags(si.inner, "t").map((t) => unesc(t.inner)).join(""));
    }
  }
  const sheets: XlsxSheet[] = [];
  for (const s of tags(wb, "sheet")) {
    const rid = attr(s.attrs, "r:id");
    const rel = tags(rels, "Relationship").find(
      (r) => attr(r.attrs, "Id") === rid
    );
    let target = rel ? attr(rel.attrs, "Target") : null;
    if (!target) continue;
    target = target.replace(/^\//, "").replace(/^(?!xl\/)/, "xl/");
    const xml = z[target] ? dec(z[target]!) : "";
    const rows: (string | number)[][] = [];
    for (const r of tags(xml, "row")) {
      const cells: (string | number | undefined)[] = [];
      for (const c of tags(r.inner, "c")) {
        const ref = attr(c.attrs, "r") || "";
        const col = ref.replace(/\d+/g, "");
        let ci = 0;
        for (const ch of col) ci = ci * 26 + (ch.charCodeAt(0) - 64);
        const t = attr(c.attrs, "t");
        const v = tags(c.inner, "v")[0];
        let val: string | number = "";
        if (t === "s" && v) val = ss[Number(v.inner)] || "";
        else if (t === "inlineStr") {
          val = tags(c.inner, "t")
            .map((x) => unesc(x.inner))
            .join("");
        } else if (v) {
          const n = Number(v.inner);
          val = Number.isNaN(n) ? unesc(v.inner) : n;
        }
        cells[ci - 1] = val;
      }
      rows.push(Array.from(cells, (x) => (x == null ? "" : x)));
    }
    sheets.push({ name: attr(s.attrs, "name"), rows });
  }
  return sheets;
}

export type DocxParagraph = {
  text: string;
  style?: string;
  table?: boolean;
  cells?: string[];
};

export function readDocx(u8: Uint8Array): DocxParagraph[] {
  const z = readZip(u8);
  const xml = dec(z["word/document.xml"] || new Uint8Array());
  const out: DocxParagraph[] = [];
  const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [0, xml])[1] as string;
  const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g;
  let m: RegExpExecArray | null;
  const ptext = (p: string) =>
    tags(p, "w:t")
      .map((t) => unesc(t.inner))
      .join("");
  while ((m = re.exec(body))) {
    const s = m[0]!;
    if (s.startsWith("<w:tbl>")) {
      for (const tr of tags(s, "w:tr")) {
        const cells = tags(tr.inner, "w:tc").map((tc) =>
          tags(tc.inner, "w:p")
            .map((p) => ptext(p.inner))
            .join(" ")
            .trim()
        );
        out.push({ text: cells.join(" | "), cells, table: true });
      }
    } else {
      const st = (s.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
      const t = ptext(s).trim();
      if (t) out.push({ text: t, style: st, table: false });
    }
  }
  return out;
}

const CT =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>';

export function writeXlsx(
  rows: (string | number)[][],
  sheetName?: string
): Buffer {
  const col = (i: number): string => {
    let s = "";
    let n = i + 1;
    while (n) {
      const r = (n - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const header = rows[0] || [];
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>' +
    header
      .map(
        (_, i) =>
          `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 10 : i === 1 ? 60 : 70}" customWidth="1"/>`
      )
      .join("") +
    "</cols><sheetData>" +
    rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">` +
          r
            .map((v, ci) =>
              typeof v === "number"
                ? `<c r="${col(ci)}${ri + 1}"${ri === 0 ? ' s="1"' : ""}><v>${v}</v></c>`
                : `<c r="${col(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ' s="2"'}><is><t xml:space="preserve">${escXml(v)}</t></is></c>`
            )
            .join("") +
          "</row>"
      )
      .join("") +
    "</sheetData></worksheet>";

  const bytes = writeZip({
    "[Content_Types].xml":
      CT +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escXml(sheetName || "Responses")}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>',
    "xl/worksheets/sheet1.xml": sheet,
  });
  return Buffer.from(bytes);
}

export type DocxBlock =
  | { h1: string }
  | { h: string }
  | { p: string }
  | { meta: string };

export function writeDocx(blocks: DocxBlock[], _title?: string): Buffer {
  const p = (
    t: string,
    opt: {
      style?: string;
      after?: number;
      b?: boolean;
      sz?: number;
      color?: string;
    } = {}
  ) =>
    `<w:p><w:pPr>${opt.style ? `<w:pStyle w:val="${opt.style}"/>` : ""}<w:spacing w:after="${opt.after == null ? 120 : opt.after}"/></w:pPr><w:r><w:rPr>${opt.b ? "<w:b/>" : ""}${opt.sz ? `<w:sz w:val="${opt.sz}"/>` : ""}${opt.color ? `<w:color w:val="${opt.color}"/>` : ""}</w:rPr><w:t xml:space="preserve">${escXml(t)}</w:t></w:r></w:p>`;

  const body = blocks
    .map((b) => {
      if ("h1" in b) return p(b.h1, { b: true, sz: 36, after: 200 });
      if ("h" in b) return p(b.h, { b: true, sz: 26, color: "4F39F6", after: 60 });
      if ("meta" in b)
        return p(b.meta, { sz: 18, color: "55597F", after: 160 });
      return p(("p" in b ? b.p : "") || "", { after: 200 });
    })
    .join("");

  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;

  const bytes = writeZip({
    "[Content_Types].xml":
      CT +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    "_rels/.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    "word/_rels/document.xml.rels":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "word/styles.xml":
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>',
    "word/document.xml": doc,
  });
  return Buffer.from(bytes);
}

export function writeCsv(rows: (string | number)[][]): Buffer {
  const lines = rows.map((r) =>
    r
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",")
  );
  return Buffer.from(lines.join("\n"), "utf8");
}

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export type ParsedUpload =
  | {
      kind: "xlsx";
      sheets: XlsxSheet[];
      rows: (string | number)[][];
    }
  | {
      kind: "docx";
      paragraphs: DocxParagraph[];
    }
  | {
      kind: "csv";
      rows: string[][];
      text: string;
    }
  | {
      kind: "txt";
      text: string;
      paragraphs: Array<{ text: string }>;
    };

export function parseUpload(name: string, buffer: Buffer): ParsedUpload {
  const lower = String(name || "").toLowerCase();
  const u8 = new Uint8Array(buffer);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm")) {
    const sheets = readXlsx(u8);
    return {
      kind: "xlsx",
      sheets,
      rows: sheets[0]?.rows || [],
    };
  }
  if (lower.endsWith(".docx")) {
    return { kind: "docx", paragraphs: readDocx(u8) };
  }
  const text = buffer.toString("utf8");
  if (lower.endsWith(".csv")) {
    return { kind: "csv", rows: parseCsvText(text), text };
  }
  return {
    kind: "txt",
    text,
    paragraphs: text.split(/\r?\n/).map((t) => ({ text: t })),
  };
}
