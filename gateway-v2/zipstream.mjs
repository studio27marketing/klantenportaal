/* =============================================================================
 * zipstream.mjs — Streaming ZIP builder for Cloudflare Workers
 * -----------------------------------------------------------------------------
 * Produces a valid ZIP (STORE, no compression) as a ReadableStream without
 * buffering file data. Uses data descriptors (GP bit 3) so CRC/sizes in the
 * local file header can be zero; they are written after each file's bytes.
 *
 * Public API:
 *   zipStream(files) → ReadableStream<Uint8Array>
 *   files: Array<{ name: string, stream: ReadableStream<Uint8Array>, sizeHint?: number }>
 *
 * Constraints / guarantees:
 *   - STORE compression (method 0) — JPEG/PNG are already compressed
 *   - UTF-8 filenames (GP bit 11)
 *   - Data descriptors (GP bit 3): local header has crc32=0, sizes=0
 *   - Valid central directory + end-of-central-directory at the end
 *   - No ZIP64; guard: throws if any single file exceeds 0xFFFFFFFF bytes
 *   - No external dependencies; pure ES-module; standard Web Streams only
 *   - DOS date hardcoded to 2026-01-01 (safe in all Worker environments)
 * ============================================================================= */

/* ---- CRC-32 ---------------------------------------------------------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32Update(crc, buf) {
  let c = crc ^ 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---- DOS date/time (hardcoded 2026-01-01 00:00:00) ----------------------- */
// DOS time: bits 15-11=hour, 10-5=minute, 4-0=second/2  → 0x0000
// DOS date: bits 15-9=year-1980, 8-5=month, 4-0=day     → year=46, month=1, day=1
//   = (46 << 9) | (1 << 5) | 1 = 0x5C21
const DOS_DATE = 0x5C21;
const DOS_TIME = 0x0000;

/* ---- Little-endian write helpers ----------------------------------------- */

function u16le(v) {
  const b = new Uint8Array(2);
  b[0] = v & 0xFF; b[1] = (v >>> 8) & 0xFF;
  return b;
}

function u32le(v) {
  const b = new Uint8Array(4);
  b[0] = v & 0xFF; b[1] = (v >>> 8) & 0xFF;
  b[2] = (v >>> 16) & 0xFF; b[3] = (v >>> 24) & 0xFF;
  return b;
}

function concat(...arrays) {
  let len = 0;
  for (const a of arrays) len += a.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

/* ---- Filename sanitize ---------------------------------------------------- */

function sanitizeName(name) {
  // Encode as UTF-8, strip null bytes and path separators that could escape
  return name.replace(/\x00/g, '').replace(/\\/g, '/').replace(/^\/+/, '');
}

/* ---- Local file header (data descriptor variant) -------------------------- */
// GP flags: bit 3 (data descriptor) | bit 11 (UTF-8 name)
const GP_FLAGS = 0x0808; // 0x0008 | 0x0800

function localFileHeader(nameBytes) {
  return concat(
    new Uint8Array([0x50, 0x4B, 0x03, 0x04]), // local file header sig
    u16le(20),           // version needed: 2.0
    u16le(GP_FLAGS),     // general purpose bit flag
    u16le(0),            // compression method: STORE
    u16le(DOS_TIME),
    u16le(DOS_DATE),
    u32le(0),            // crc-32 (0 = data descriptor)
    u32le(0),            // compressed size (0)
    u32le(0),            // uncompressed size (0)
    u16le(nameBytes.length),
    u16le(0),            // extra field length
    nameBytes,
  );
}

/* ---- Data descriptor ------------------------------------------------------ */

function dataDescriptor(crc, size) {
  if (size > 0xFFFFFFFF) throw new RangeError(`ZIP: file too large (${size} bytes), ZIP64 not supported`);
  return concat(
    new Uint8Array([0x50, 0x4B, 0x07, 0x08]), // data descriptor signature
    u32le(crc),
    u32le(size),   // compressed size (= uncompressed for STORE)
    u32le(size),   // uncompressed size
  );
}

/* ---- Central directory entry --------------------------------------------- */

function centralDirEntry(nameBytes, crc, size, localHeaderOffset) {
  return concat(
    new Uint8Array([0x50, 0x4B, 0x01, 0x02]), // central dir sig
    u16le(20),           // version made by: 2.0 / MS-DOS
    u16le(20),           // version needed
    u16le(GP_FLAGS),
    u16le(0),            // compression: STORE
    u16le(DOS_TIME),
    u16le(DOS_DATE),
    u32le(crc),
    u32le(size),         // compressed
    u32le(size),         // uncompressed
    u16le(nameBytes.length),
    u16le(0),            // extra field length
    u16le(0),            // file comment length
    u16le(0),            // disk number start
    u16le(0),            // internal attributes
    u32le(0),            // external attributes
    u32le(localHeaderOffset),
    nameBytes,
  );
}

/* ---- End of central directory --------------------------------------------- */

function endOfCentralDir(entryCount, centralDirSize, centralDirOffset) {
  return concat(
    new Uint8Array([0x50, 0x4B, 0x05, 0x06]), // EOCD sig
    u16le(0),            // disk number
    u16le(0),            // disk with start of central dir
    u16le(entryCount),
    u16le(entryCount),
    u32le(centralDirSize),
    u32le(centralDirOffset),
    u16le(0),            // comment length
  );
}

/* ---- Main export ---------------------------------------------------------- */

/**
 * Build a streaming ZIP from an array of files.
 *
 * @param {Array<{ name: string, stream: ReadableStream<Uint8Array>, sizeHint?: number }>} files
 * @returns {ReadableStream<Uint8Array>}
 */
export function zipStream(files) {
  if (!Array.isArray(files)) throw new TypeError('zipStream: files must be an array');
  if (files.length >= 65535) throw new RangeError('zipStream: too many files (max 65534)');

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let offset = 0; // current byte offset in the output stream

      // Metadata collected per file for the central directory
      const centralEntries = [];

      try {
        for (const file of files) {
          const rawName = sanitizeName(String(file.name || 'file'));
          const nameBytes = encoder.encode(rawName);

          // 1. Local file header
          const header = localFileHeader(nameBytes);
          controller.enqueue(header);
          const localHeaderOffset = offset;
          offset += header.length;

          // 2. Stream file data, accumulate CRC and size
          let crc = 0;
          let size = 0;

          const reader = file.stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!(value instanceof Uint8Array)) {
                throw new TypeError(`zipStream: expected Uint8Array chunk for file "${rawName}"`);
              }
              crc = crc32Update(crc, value);
              size += value.length;
              if (size > 0xFFFFFFFF) {
                throw new RangeError(`zipStream: file "${rawName}" exceeds 4 GB, ZIP64 not supported`);
              }
              controller.enqueue(value);
              offset += value.length;
            }
          } finally {
            reader.releaseLock();
          }

          // 3. Data descriptor
          const dd = dataDescriptor(crc, size);
          controller.enqueue(dd);
          offset += dd.length;

          centralEntries.push({ nameBytes, crc, size, localHeaderOffset });
        }

        // 4. Central directory
        const centralDirOffset = offset;
        let centralDirSize = 0;
        for (const e of centralEntries) {
          const entry = centralDirEntry(e.nameBytes, e.crc, e.size, e.localHeaderOffset);
          controller.enqueue(entry);
          centralDirSize += entry.length;
          offset += entry.length;
        }

        // 5. End of central directory
        const eocd = endOfCentralDir(centralEntries.length, centralDirSize, centralDirOffset);
        controller.enqueue(eocd);

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
