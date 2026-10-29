import { inflateSync, constants } from 'zlib';

/**
 * Trích chữ từ PDF (đủ dùng cho so khớp từ khoá khi chưa bật AI).
 * Hỗ trợ: PDF 1.4–1.7 không mã hoá, stream FlateDecode, object stream (ObjStm),
 * font có bảng ToUnicode (CV xuất từ Word, Chrome, Canva, LaTeX…).
 * Không hỗ trợ: PDF mã hoá, PDF ảnh scan (cần OCR) → trả chuỗi rỗng.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_TEXT = 60_000;

type Obj = { dict: string; stream?: Buffer };

function inflate(buf: Buffer): Buffer | null {
  try {
    return inflateSync(buf, { finishFlush: constants.Z_SYNC_FLUSH });
  } catch {
    return null;
  }
}

function ascii85(buf: Buffer): Buffer | null {
  const s = buf.toString('latin1').replace(/\s/g, '').replace(/^<~/, '').replace(/~>.*$/, '');
  const out: number[] = [];
  let group: number[] = [];
  for (const ch of s) {
    if (ch === 'z' && !group.length) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const c = ch.charCodeAt(0) - 33;
    if (c < 0 || c > 84) return null;
    group.push(c);
    if (group.length === 5) {
      const n = group.reduce((a, d) => a * 85 + d, 0);
      out.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
      group = [];
    }
  }
  if (group.length) {
    const k = group.length;
    while (group.length < 5) group.push(84);
    const n = group.reduce((a, d) => a * 85 + d, 0);
    out.push(...[(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].slice(0, k - 1));
  }
  return Buffer.from(out);
}

/** Tách "N G obj ... endobj" (kể cả bên trong object stream) */
function readObjects(pdf: Buffer): Map<number, Obj> {
  const objs = new Map<number, Obj>();
  const s = pdf.toString('latin1');
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const id = Number(m[1]);
    const start = m.index + m[0].length;
    const end = s.indexOf('endobj', start);
    if (end < 0) break;
    const body = s.slice(start, end);
    const si = body.search(/\bstream\r?\n/);
    if (si < 0) {
      objs.set(id, { dict: body });
    } else {
      const dict = body.slice(0, si);
      const dataStart = start + si + body.slice(si).match(/^stream\r?\n/)![0].length;
      const len = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
      let dataEnd = len ? dataStart + Number(len[1]) : start + body.lastIndexOf('endstream');
      if (dataEnd > end || dataEnd < dataStart) dataEnd = start + body.lastIndexOf('endstream');
      const filters = /\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dict)?.[1].match(/\/\w+/g) ?? [];
      let raw: Buffer | null = pdf.subarray(dataStart, dataEnd);
      for (const f of filters) {
        if (!raw) break;
        if (f === '/FlateDecode' || f === '/Fl') raw = inflate(raw);
        else if (f === '/ASCII85Decode' || f === '/A85') raw = ascii85(raw);
        else raw = null; // bộ lọc khác (ảnh JPEG…) – bỏ qua
      }
      objs.set(id, { dict, stream: raw ?? undefined });
    }
    re.lastIndex = end;
  }
  // Object stream: nhiều object nén chung một stream
  for (const o of [...objs.values()]) {
    if (!o.stream || !/\/Type\s*\/ObjStm/.test(o.dict)) continue;
    const n = Number(/\/N\s+(\d+)/.exec(o.dict)?.[1] ?? 0);
    const first = Number(/\/First\s+(\d+)/.exec(o.dict)?.[1] ?? 0);
    const txt = o.stream.toString('latin1');
    const nums = txt.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const id = nums[2 * i];
      const off = first + nums[2 * i + 1];
      const next = i + 1 < n ? first + nums[2 * i + 3] : txt.length;
      if (!objs.has(id)) objs.set(id, { dict: txt.slice(off, next) });
    }
  }
  return objs;
}

const ref = (s: string | undefined) => (s ? Number(/(\d+)\s+\d+\s+R/.exec(s)?.[1] ?? NaN) : NaN);

/** Lấy nội dung "<< ... >>" sau khoá /Key (có xử lý lồng nhau) hoặc object được tham chiếu */
function dictValue(objs: Map<number, Obj>, dict: string, key: string): string | undefined {
  const i = dict.search(new RegExp(`/${key}(?![A-Za-z])`));
  if (i < 0) return undefined;
  let j = i + key.length + 1;
  while (/\s/.test(dict[j] ?? '')) j++;
  if (dict.startsWith('<<', j)) {
    let depth = 0;
    for (let k = j; k < dict.length - 1; k++) {
      if (dict.startsWith('<<', k)) {
        depth++;
        k++;
      } else if (dict.startsWith('>>', k)) {
        depth--;
        k++;
        if (!depth) return dict.slice(j, k + 1);
      }
    }
    return undefined;
  }
  const r = /^(\d+)\s+\d+\s+R/.exec(dict.slice(j));
  return r ? objs.get(Number(r[1]))?.dict : undefined;
}

// ---- ToUnicode CMap ----
type CMap = { bytes: number; map: Map<number, string> };

function hexToUtf16(hex: string): string {
  const h = hex.length % 4 ? hex.padStart(Math.ceil(hex.length / 4) * 4, '0') : hex;
  let out = '';
  for (let i = 0; i < h.length; i += 4) out += String.fromCharCode(parseInt(h.slice(i, i + 4), 16));
  return out;
}

function parseCMap(src: string): CMap {
  const map = new Map<number, string>();
  const cs = /begincodespacerange\s*<([0-9A-Fa-f]+)>/.exec(src);
  const bytes = cs ? Math.max(1, cs[1].length / 2) : 2;
  for (const block of src.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const m of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(parseInt(m[1], 16), hexToUtf16(m[2]));
  }
  for (const block of src.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    for (const m of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1], 16);
      const hi = Math.min(parseInt(m[2], 16), lo + 65535);
      if (m[3].startsWith('[')) {
        const items = [...m[3].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => hexToUtf16(x[1]));
        items.forEach((t, k) => lo + k <= hi && map.set(lo + k, t));
      } else {
        const base = m[3].slice(1, -1);
        const head = base.slice(0, -4);
        const last = parseInt(base.slice(-4) || '0', 16);
        for (let c = lo; c <= hi; c++) map.set(c, hexToUtf16(head + (last + c - lo).toString(16).padStart(4, '0')));
      }
    }
  }
  return { bytes, map };
}

// ---- Bộ tách token cho content stream ----
type Tok = { t: 'num'; v: number } | { t: 'str'; v: Buffer } | { t: 'name'; v: string } | { t: 'op'; v: string } | { t: 'arr'; v: Tok[] };

function tokenize(b: Buffer): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[][] = [out];
  const push = (x: Tok) => stack[stack.length - 1].push(x);
  const isWs = (c: number) => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
  const isDelim = (c: number) => '()<>[]{}/%'.includes(String.fromCharCode(c));
  let i = 0;
  while (i < b.length) {
    const c = b[i];
    if (isWs(c)) i++;
    else if (c === 37) while (i < b.length && b[i] !== 10 && b[i] !== 13) i++; // % chú thích
    else if (c === 40) {
      // (chuỗi) – có thể lồng ngoặc và ký tự thoát
      const bytes: number[] = [];
      let depth = 1;
      i++;
      while (i < b.length && depth) {
        const d = b[i];
        if (d === 92) {
          const n = b[++i];
          const esc: Record<number, number> = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 };
          if (n in esc) bytes.push(esc[n]);
          else if (n >= 48 && n <= 55) {
            let oct = '';
            while (oct.length < 3 && b[i] >= 48 && b[i] <= 55) oct += String.fromCharCode(b[i++]);
            bytes.push(parseInt(oct, 8) & 255);
            continue;
          } else if (n === 13 || n === 10) {
            if (n === 13 && b[i + 1] === 10) i++;
          } else bytes.push(n);
          i++;
        } else {
          if (d === 40) depth++;
          if (d === 41 && !--depth) {
            i++;
            break;
          }
          bytes.push(d);
          i++;
        }
      }
      push({ t: 'str', v: Buffer.from(bytes) });
    } else if (c === 60 && b[i + 1] === 60) {
      // << dict >> trong content (BDC…) – bỏ qua
      let depth = 0;
      while (i < b.length) {
        if (b[i] === 60 && b[i + 1] === 60) {
          depth++;
          i += 2;
        } else if (b[i] === 62 && b[i + 1] === 62) {
          i += 2;
          if (!--depth) break;
        } else i++;
      }
    } else if (c === 60) {
      const end = b.indexOf(62, i);
      const hex = b.toString('latin1', i + 1, end < 0 ? b.length : end).replace(/[^0-9A-Fa-f]/g, '');
      push({ t: 'str', v: Buffer.from(hex.length % 2 ? hex + '0' : hex, 'hex') });
      i = end < 0 ? b.length : end + 1;
    } else if (c === 91) {
      const arr: Tok[] = [];
      stack.push(arr);
      i++;
    } else if (c === 93) {
      const arr = stack.length > 1 ? stack.pop()! : [];
      push({ t: 'arr', v: arr });
      i++;
    } else if (c === 47) {
      let j = i + 1;
      while (j < b.length && !isWs(b[j]) && !isDelim(b[j])) j++;
      push({ t: 'name', v: b.toString('latin1', i + 1, j) });
      i = j;
    } else {
      let j = i;
      while (j < b.length && !isWs(b[j]) && !isDelim(b[j])) j++;
      if (j === i) {
        i++;
        continue;
      }
      const w = b.toString('latin1', i, j);
      i = j;
      if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(w)) push({ t: 'num', v: Number(w) });
      else if (w === 'BI') {
        // ảnh nhúng: bỏ qua tới EI
        const ei = b.indexOf('EI', i, 'latin1');
        i = ei < 0 ? b.length : ei + 2;
      } else push({ t: 'op', v: w });
    }
  }
  return out;
}

// ---- Font: bảng ToUnicode + độ rộng glyph (để xếp chữ đúng vị trí) ----
type FontInfo = { cmap?: CMap; bytes: number; widths: Map<number, number>; dw: number; scale: number };
const DEFAULT_FONT: FontInfo = { bytes: 1, widths: new Map(), dw: 500, scale: 0.001 };

/** Mảng số (có thể lồng 1 cấp) sau /Key, nội tuyến hoặc qua tham chiếu */
function arrayTokens(objs: Map<number, Obj>, dict: string, key: string): (number | number[])[] | undefined {
  const m = new RegExp(`/${key}\\s*(\\[|(\\d+)\\s+\\d+\\s+R)`).exec(dict);
  if (!m) return undefined;
  let src = m[2] ? (objs.get(Number(m[2]))?.dict ?? '') : dict.slice(m.index + m[0].length - 1);
  src = src.slice(src.indexOf('['));
  const out: (number | number[])[] = [];
  let inner: number[] | null = null;
  let depth = 0;
  for (const t of src.matchAll(/\[|\]|[-+]?(?:\d+\.?\d*|\.\d+)/g)) {
    if (t[0] === '[') {
      if (++depth === 2) inner = [];
    } else if (t[0] === ']') {
      if (depth-- === 2 && inner) {
        out.push(inner);
        inner = null;
      }
      if (!depth) break;
    } else (inner ?? out).push(Number(t[0]));
  }
  return out;
}

function buildFont(objs: Map<number, Obj>, id: number): FontInfo {
  const fd = objs.get(id)?.dict ?? '';
  const toUni = (d: string) => objs.get(ref(/\/ToUnicode\s+(\d+\s+\d+\s+R)/.exec(d)?.[1]))?.stream;
  const widths = new Map<number, number>();
  if (/\/Subtype\s*\/Type0/.test(fd)) {
    const desc = objs.get(ref(/\/DescendantFonts\s*(?:\[\s*)?(\d+\s+\d+\s+R)/.exec(fd)?.[1]))?.dict ?? '';
    const tu = toUni(fd) ?? toUni(desc);
    const cmap = tu ? parseCMap(tu.toString('latin1')) : undefined;
    const w = arrayTokens(objs, desc, 'W') ?? [];
    for (let i = 0; i < w.length; ) {
      const a = w[i];
      const b = w[i + 1];
      if (typeof a !== 'number') break;
      if (Array.isArray(b)) {
        b.forEach((v, k) => widths.set(a + k, v));
        i += 2;
      } else if (typeof b === 'number' && typeof w[i + 2] === 'number') {
        for (let c = a; c <= Math.min(b, a + 65535); c++) widths.set(c, w[i + 2] as number);
        i += 3;
      } else break;
    }
    return { cmap, bytes: cmap?.bytes ?? 2, widths, dw: Number(/\/DW\s+(\d+)/.exec(desc)?.[1] ?? 1000), scale: 0.001 };
  }
  const tu = toUni(fd);
  const cmap = tu ? parseCMap(tu.toString('latin1')) : undefined;
  const first = Number(/\/FirstChar\s+(\d+)/.exec(fd)?.[1] ?? 0);
  (arrayTokens(objs, fd, 'Widths') ?? []).forEach((v, k) => typeof v === 'number' && widths.set(first + k, v));
  const fm = /\/Subtype\s*\/Type3/.test(fd) ? arrayTokens(objs, fd, 'FontMatrix') : undefined;
  const scale = typeof fm?.[0] === 'number' ? Math.abs(fm[0]) : 0.001;
  const known = [...widths.values()].filter((v) => v > 0);
  const avg = known.length ? known.reduce((x, y) => x + y, 0) / known.length : 0.5 / scale;
  return { cmap: cmap && { ...cmap, bytes: 1 }, bytes: 1, widths, dw: Number(/\/MissingWidth\s+(\d+)/.exec(fd)?.[1] ?? 0) || avg, scale };
}

// ---- Dựng lại dòng chữ từ vị trí từng glyph ----
type M6 = [number, number, number, number, number, number];
const I6: M6 = [1, 0, 0, 1, 0, 0];
const mul = (m: M6, n: M6): M6 => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
type Glyph = { x: number; y: number; w: number; h: number; t: string };

function pageGlyphs(content: Buffer, fonts: Map<string, FontInfo>, glyphs: Glyph[]) {
  let ctm: M6 = I6;
  const gstack: M6[] = [];
  let tm: M6 = I6;
  let tlm: M6 = I6;
  let font = DEFAULT_FONT;
  let fs = 10;
  let tc = 0;
  let tw = 0;
  let th = 1;
  let tl = 0;
  let rise = 0;
  const stack: Tok[] = [];

  const show = (s: Buffer) => {
    const n = font.bytes;
    for (let i = 0; i + n <= s.length; i += n) {
      const code = n === 1 ? s[i] : n === 2 ? s.readUInt16BE(i) : s.readUIntBE(i, n);
      const text = font.cmap ? (font.cmap.map.get(code) ?? '') : String.fromCharCode(code);
      const w0 = (font.widths.get(code) ?? font.dw) * font.scale;
      const m = mul(tm, ctm);
      const sx = Math.hypot(m[0], m[1]);
      const trm = mul([fs * th, 0, 0, fs, 0, rise], m);
      if (text) glyphs.push({ x: trm[4], y: trm[5], w: w0 * fs * th * sx, h: Math.abs(fs * Math.hypot(m[2], m[3])) || 1, t: text });
      const tx = (w0 * fs + tc + (n === 1 && code === 32 ? tw : 0)) * th;
      tm = mul([1, 0, 0, 1, tx, 0], tm);
    }
  };
  const td = (x: number, y: number) => {
    tlm = mul([1, 0, 0, 1, x, y], tlm);
    tm = tlm;
  };

  for (const tok of tokenize(content)) {
    if (tok.t !== 'op') {
      stack.push(tok);
      continue;
    }
    const args = stack.splice(0);
    const num = (k: number) => (args[k]?.t === 'num' ? (args[k] as { v: number }).v : 0);
    const six = (): M6 => [num(0), num(1), num(2), num(3), num(4), num(5)];
    const lastStr = () => {
      const a = args[args.length - 1];
      return a?.t === 'str' ? a.v : null;
    };
    switch (tok.v) {
      case 'q':
        gstack.push(ctm);
        break;
      case 'Q':
        ctm = gstack.pop() ?? I6;
        break;
      case 'cm':
        ctm = mul(six(), ctm);
        break;
      case 'BT':
        tm = tlm = I6;
        break;
      case 'Tf':
        font = (args[0]?.t === 'name' && fonts.get(args[0].v)) || DEFAULT_FONT;
        fs = num(1);
        break;
      case 'Tc':
        tc = num(0);
        break;
      case 'Tw':
        tw = num(0);
        break;
      case 'Tz':
        th = num(0) / 100;
        break;
      case 'TL':
        tl = num(0);
        break;
      case 'Ts':
        rise = num(0);
        break;
      case 'Td':
        td(num(0), num(1));
        break;
      case 'TD':
        tl = -num(1);
        td(num(0), num(1));
        break;
      case 'Tm':
        tm = tlm = six();
        break;
      case 'T*':
        td(0, -tl);
        break;
      case "'": {
        td(0, -tl);
        const s = lastStr();
        if (s) show(s);
        break;
      }
      case '"': {
        tw = num(0);
        tc = num(1);
        td(0, -tl);
        const s = lastStr();
        if (s) show(s);
        break;
      }
      case 'Tj': {
        const s = lastStr();
        if (s) show(s);
        break;
      }
      case 'TJ':
        if (args[0]?.t === 'arr')
          for (const x of args[0].v) {
            if (x.t === 'str') show(x.v);
            else if (x.t === 'num') tm = mul([1, 0, 0, 1, (-x.v / 1000) * fs * th, 0], tm);
          }
        break;
    }
    if (glyphs.length > MAX_TEXT) break;
  }
}

/** Gom glyph thành dòng (trên → dưới), trong dòng xếp trái → phải, chèn dấu cách theo khoảng trống */
function layout(glyphs: Glyph[]): string {
  const sorted = [...glyphs].sort((a, b) => b.y - a.y);
  const lines: Glyph[][] = [];
  for (const g of sorted) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - g.y) < 0.5 * Math.max(line[0].h, g.h)) line.push(g);
    else lines.push([g]);
  }
  return lines
    .map((line) => {
      line.sort((a, b) => a.x - b.x);
      let s = '';
      let end = -Infinity;
      for (const g of line) {
        if (s && !/\s$/.test(s) && !/^\s/.test(g.t) && g.x - end > 0.2 * g.h) s += ' ';
        s += g.t;
        end = Math.max(end, g.x + g.w);
      }
      return s;
    })
    .join('\n');
}

export function pdfToText(pdf: Buffer): string {
  if (pdf.length > MAX_BYTES || pdf.subarray(0, 1024).indexOf('%PDF') < 0) return '';
  if (/\/Encrypt\s/.test(pdf.toString('latin1', Math.max(0, pdf.length - 4096)))) return '';
  try {
    const objs = readObjects(pdf);
    const fontCache = new Map<number, FontInfo>();
    const fontOf = (id: number) => {
      if (!fontCache.has(id)) fontCache.set(id, buildFont(objs, id));
      return fontCache.get(id)!;
    };
    const resourcesOf = (pageDict: string): string | undefined => {
      let d: string | undefined = pageDict;
      for (let k = 0; d && k < 10; k++) {
        const r = dictValue(objs, d, 'Resources');
        if (r) return r;
        d = objs.get(ref(/\/Parent\s+(\d+\s+\d+\s+R)/.exec(d)?.[1]))?.dict;
      }
      return undefined;
    };
    // Trang theo thứ tự trong cây /Kids
    const pages: number[] = [];
    const walk = (id: number, depth = 0) => {
      const d = objs.get(id)?.dict ?? '';
      if (depth > 20) return;
      if (/\/Type\s*\/Pages\b/.test(d)) {
        const kids = /\/Kids\s*\[([^\]]*)\]/.exec(d)?.[1] ?? '';
        for (const m of kids.matchAll(/(\d+)\s+\d+\s+R/g)) walk(Number(m[1]), depth + 1);
      } else if (/\/Type\s*\/Page\b/.test(d)) pages.push(id);
    };
    const catalog = [...objs.values()].find((o) => /\/Type\s*\/Catalog/.test(o.dict));
    walk(ref(/\/Pages\s+(\d+\s+\d+\s+R)/.exec(catalog?.dict ?? '')?.[1]));
    if (!pages.length) for (const [id, o] of objs) if (/\/Type\s*\/Page\b/.test(o.dict)) pages.push(id);

    const texts: string[] = [];
    let total = 0;
    for (const pid of pages) {
      const pd = objs.get(pid)!.dict;
      const fonts = new Map<string, FontInfo>();
      const fontDict = dictValue(objs, resourcesOf(pd) ?? '', 'Font') ?? '';
      for (const m of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) fonts.set(m[1], fontOf(Number(m[2])));
      const c = /\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/.exec(pd)?.[1] ?? '';
      const parts = [...c.matchAll(/(\d+)\s+\d+\s+R/g)].map((m) => objs.get(Number(m[1]))?.stream).filter((x): x is Buffer => !!x);
      const glyphs: Glyph[] = [];
      pageGlyphs(Buffer.concat(parts.flatMap((p) => [p, Buffer.from('\n')])), fonts, glyphs);
      const t = layout(glyphs);
      texts.push(t);
      total += t.length;
      if (total > MAX_TEXT) break;
    }
    return texts
      .join('\n\n')
      .replace(/[ \t\u00a0]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .normalize('NFC')
      .slice(0, MAX_TEXT);
  } catch {
    return '';
  }
}
