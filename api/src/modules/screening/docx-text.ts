import { inflateRawSync } from 'zlib';

/**
 * Lấy văn bản từ file .docx (zip chứa word/document.xml) – không cần thư viện ngoài.
 * Trả về null nếu không đọc được (file hỏng, .doc cũ, có mật khẩu…).
 */
export function docxToText(buf: Buffer): string | null {
  try {
    const xml = readZipEntry(buf, 'word/document.xml');
    if (!xml) return null;
    const text = xml
      .toString('utf8')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\/>|<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Đọc 1 file trong zip theo central directory (hỗ trợ stored & deflate) */
function readZipEntry(buf: Buffer, name: string): Buffer | null {
  // Tìm End Of Central Directory từ cuối file (comment tối đa 64KB)
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const entryName = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entryName === name) {
      if (buf.readUInt32LE(localOffset) !== 0x04034b50) return null;
      const start = localOffset + 30 + buf.readUInt16LE(localOffset + 26) + buf.readUInt16LE(localOffset + 28);
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
