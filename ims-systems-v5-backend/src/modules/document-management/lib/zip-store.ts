/**
 * Minimal ZIP writer using the STORE method (no compression).
 * Enough for bundling already-compressed office/PDF binaries without
 * pulling in an archive dependency.
 */

export type ZipStoreEntry = {
  /** Forward-slash path inside the archive (no leading slash). */
  path: string;
  data: Buffer;
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16LE(target: Buffer, offset: number, value: number): void {
  target.writeUInt16LE(value & 0xffff, offset);
}

function writeUInt32LE(target: Buffer, offset: number, value: number): void {
  target.writeUInt32LE(value >>> 0, offset);
}

/** Build an uncompressed ZIP archive from in-memory entries. */
export function buildZipStore(entries: ZipStoreEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.path, "utf8");
    const data = entry.data;
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    writeUInt32LE(localHeader, 0, 0x04034b50);
    writeUInt16LE(localHeader, 4, 20);
    writeUInt16LE(localHeader, 6, 0);
    writeUInt16LE(localHeader, 8, 0); // STORE
    writeUInt16LE(localHeader, 10, 0);
    writeUInt16LE(localHeader, 12, 0);
    writeUInt32LE(localHeader, 14, checksum);
    writeUInt32LE(localHeader, 18, data.length);
    writeUInt32LE(localHeader, 22, data.length);
    writeUInt16LE(localHeader, 26, nameBuf.length);
    writeUInt16LE(localHeader, 28, 0);
    nameBuf.copy(localHeader, 30);

    localParts.push(localHeader, data);

    const central = Buffer.alloc(46 + nameBuf.length);
    writeUInt32LE(central, 0, 0x02014b50);
    writeUInt16LE(central, 4, 20);
    writeUInt16LE(central, 6, 20);
    writeUInt16LE(central, 8, 0);
    writeUInt16LE(central, 10, 0);
    writeUInt16LE(central, 12, 0);
    writeUInt16LE(central, 14, 0);
    writeUInt32LE(central, 16, checksum);
    writeUInt32LE(central, 20, data.length);
    writeUInt32LE(central, 24, data.length);
    writeUInt16LE(central, 28, nameBuf.length);
    writeUInt16LE(central, 30, 0);
    writeUInt16LE(central, 32, 0);
    writeUInt16LE(central, 34, 0);
    writeUInt16LE(central, 36, 0);
    writeUInt32LE(central, 38, 0);
    writeUInt32LE(central, 42, offset);
    nameBuf.copy(central, 46);
    centralParts.push(central);

    offset += localHeader.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  writeUInt32LE(end, 0, 0x06054b50);
  writeUInt16LE(end, 4, 0);
  writeUInt16LE(end, 6, 0);
  writeUInt16LE(end, 8, entries.length);
  writeUInt16LE(end, 10, entries.length);
  writeUInt32LE(end, 12, centralDirectory.length);
  writeUInt32LE(end, 16, offset);
  writeUInt16LE(end, 20, 0);

  return Buffer.concat([...localParts, centralDirectory, end]);
}
