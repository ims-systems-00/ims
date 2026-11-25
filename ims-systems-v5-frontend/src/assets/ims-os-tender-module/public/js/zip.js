/*  iMS OS · minimal ZIP + Office XML helpers (no dependencies)
 *  Works in Node (zlib) and the browser (DecompressionStream). UMD: window.IMSZip / require().
 *  Read: entries of a .xlsx/.docx (deflate or stored). Write: stored (uncompressed) zip with CRC32 — valid for Excel/Word.
 */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.IMSZip = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const enc = s => new TextEncoder().encode(s), dec = u => new TextDecoder().decode(u);
  async function inflateRaw(u8) {
    if (isNode) return new Uint8Array(require('zlib').inflateRawSync(Buffer.from(u8)));
    const ds = new DecompressionStream('deflate-raw'); const w = ds.writable.getWriter(); w.write(u8); w.close();
    const ab = await new Response(ds.readable).arrayBuffer(); return new Uint8Array(ab);
  }
  /** read(u8) → { 'word/document.xml': Uint8Array, ... } */
  async function read(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); const out = {};
    // find end of central directory
    let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
    if (eocd < 0) throw Object.assign(new Error('Not a zip/Office file'), { code: 'bad_zip' });
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Bad central directory');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec(u8.subarray(p + 46, p + 46 + nlen));
      const lnlen = dv.getUint16(off + 26, true), lelen = dv.getUint16(off + 28, true); const start = off + 30 + lnlen + lelen; const data = u8.subarray(start, start + csize);
      out[name] = method === 8 ? await inflateRaw(data) : method === 0 ? data : (() => { throw new Error('Unsupported compression ' + method); })();
      p += 46 + nlen + elen + clen;
    }
    return out;
  }
  /** write({ 'path': string|Uint8Array }) → Uint8Array (stored) */
  function write(files) {
    const parts = [], cd = []; let off = 0; const now = new Date(); const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF, dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    for (const [name, v] of Object.entries(files)) {
      const data = typeof v === 'string' ? enc(v) : v, nm = enc(name), crc = crc32(data);
      const lh = new Uint8Array(30 + nm.length); const d = new DataView(lh.buffer);
      d.setUint32(0, 0x04034b50, true); d.setUint16(4, 20, true); d.setUint16(6, 0x0800, true); d.setUint16(8, 0, true); d.setUint16(10, dt, true); d.setUint16(12, dd, true); d.setUint32(14, crc, true); d.setUint32(18, data.length, true); d.setUint32(22, data.length, true); d.setUint16(26, nm.length, true); d.setUint16(28, 0, true); lh.set(nm, 30);
      parts.push(lh, data);
      const ch = new Uint8Array(46 + nm.length); const c = new DataView(ch.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true); ch.set(nm, 46);
      cd.push(ch); off += lh.length + data.length;
    }
    const cdLen = cd.reduce((a, b) => a + b.length, 0); const e = new Uint8Array(22); const ed = new DataView(e.buffer);
    ed.setUint32(0, 0x06054b50, true); ed.setUint16(8, cd.length, true); ed.setUint16(10, cd.length, true); ed.setUint32(12, cdLen, true); ed.setUint32(16, off, true);
    const total = off + cdLen + 22; const out = new Uint8Array(total); let q = 0; for (const p of [...parts, ...cd, e]) { out.set(p, q); q += p.length; } return out;
  }
  // ---- tiny XML helpers (enough for Office files we read) ----
  const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function tags(xml, tag) { const re = new RegExp('<' + tag + '(?:\\s[^>]*)?(?:/>|>([\\s\\S]*?)</' + tag + '>)', 'g'); const out = []; let m; while ((m = re.exec(xml))) out.push({ attrs: m[0].slice(0, m[0].indexOf('>') + 1), inner: m[1] || '' }); return out; }
  function attr(open, name) { const m = open.match(new RegExp('\\s' + name + '="([^"]*)"')); return m ? unesc(m[1]) : null; }
  /** .xlsx → [{ name, rows: [[cell,...],...] }] (strings/numbers; first sheet first) */
  async function readXlsx(u8) {
    const z = await read(u8); const wb = dec(z['xl/workbook.xml'] || new Uint8Array()); const rels = dec(z['xl/_rels/workbook.xml.rels'] || new Uint8Array());
    const ss = []; if (z['xl/sharedStrings.xml']) for (const si of tags(dec(z['xl/sharedStrings.xml']), 'si')) ss.push(tags(si.inner, 't').map(t => unesc(t.inner)).join(''));
    const sheets = [];
    for (const s of tags(wb, 'sheet')) { const rid = attr(s.attrs, 'r:id'); const rel = tags(rels, 'Relationship').find(r => attr(r.attrs, 'Id') === rid); let target = rel ? attr(rel.attrs, 'Target') : null; if (!target) continue; target = target.replace(/^\//, '').replace(/^(?!xl\/)/, 'xl/'); const xml = z[target] ? dec(z[target]) : ''; const rows = [];
      for (const r of tags(xml, 'row')) { const cells = []; for (const c of tags(r.inner, 'c')) { const ref = attr(c.attrs, 'r') || ''; const col = ref.replace(/\d+/g, ''); let ci = 0; for (const ch of col) ci = ci * 26 + (ch.charCodeAt(0) - 64); const t = attr(c.attrs, 't'); const v = tags(c.inner, 'v')[0]; let val = ''; if (t === 's' && v) val = ss[Number(v.inner)] || ''; else if (t === 'inlineStr') val = tags(c.inner, 't').map(x => unesc(x.inner)).join(''); else if (v) { const n = Number(v.inner); val = isNaN(n) ? unesc(v.inner) : n; } cells[ci - 1] = val; } rows.push(Array.from(cells, x => x == null ? '' : x)); }
      sheets.push({ name: attr(s.attrs, 'name'), rows }); }
    return sheets;
  }
  /** .docx → [{ text, style, table:bool }] paragraphs (table cells flattened as rows joined by " | ") */
  async function readDocx(u8) {
    const z = await read(u8); const xml = dec(z['word/document.xml'] || new Uint8Array()); const out = [];
    const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [0, xml])[1];
    // tables: each row → one line
    const re = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g; let m;
    const ptext = p => tags(p, 'w:t').map(t => unesc(t.inner)).join('');
    while ((m = re.exec(body))) { const s = m[0]; if (s.startsWith('<w:tbl>')) { for (const tr of tags(s, 'w:tr')) { const cells = tags(tr.inner, 'w:tc').map(tc => tags(tc.inner, 'w:p').map(p => ptext(p.inner)).join(' ').trim()); out.push({ text: cells.join(' | '), cells, table: true }); } }
      else { const st = (s.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || ''; const t = ptext(s).trim(); if (t) out.push({ text: t, style: st, table: false }); } }
    return out;
  }
  const CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>';
  /** rows: [[...],...] → .xlsx bytes (one sheet, inline strings, header bold via style 1) */
  function writeXlsx(rows, sheetName) {
    const col = i => { let s = ''; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
    const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>' + rows[0].map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${i === 0 ? 10 : i === 1 ? 60 : 70}" customWidth="1"/>`).join('') + '</cols><sheetData>' + rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => typeof v === 'number' ? `<c r="${col(ci)}${ri + 1}"${ri === 0 ? ' s="1"' : ''}><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ' s="2"'}><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join('') + '</row>').join('') + '</sheetData></worksheet>';
    return write({
      '[Content_Types].xml': CT + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName || 'Responses')}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>',
      'xl/worksheets/sheet1.xml': sheet
    });
  }
  /** blocks: [{h:'Heading'}|{p:'text'}|{meta:'small'}] → .docx bytes */
  function writeDocx(blocks, title) {
    const p = (t, opt = {}) => `<w:p><w:pPr>${opt.style ? `<w:pStyle w:val="${opt.style}"/>` : ''}<w:spacing w:after="${opt.after == null ? 120 : opt.after}"/></w:pPr><w:r><w:rPr>${opt.b ? '<w:b/>' : ''}${opt.sz ? `<w:sz w:val="${opt.sz}"/>` : ''}${opt.color ? `<w:color w:val="${opt.color}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
    const body = blocks.map(b => b.h1 ? p(b.h1, { b: true, sz: 36, after: 200 }) : b.h ? p(b.h, { b: true, sz: 26, color: '4F39F6', after: 60 }) : b.meta ? p(b.meta, { sz: 18, color: '55597F', after: 160 }) : p(b.p || '', { after: 200 })).join('');
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
    return write({
      '[Content_Types].xml': CT + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
      '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'word/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>',
      'word/document.xml': doc
    });
  }
  return { read, write, crc32, readXlsx, readDocx, writeXlsx, writeDocx, esc, unesc };
});
