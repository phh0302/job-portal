import type { CandidateProfile, EducationItem, ExperienceItem } from '../pages/candidate/types';

export type CvTemplate = 'classic' | 'modern' | 'minimal';

export interface CvSettings {
  template: CvTemplate;
  accent: string;
  showPhoto: boolean;
  showBirthDate: boolean;
  certificates: string;
  languages: string;
  interests: string;
}

export const CV_TEMPLATES: { value: CvTemplate; label: string; hint: string }[] = [
  { value: 'modern', label: 'Hiện đại', hint: 'Cột bên có màu, ảnh đại diện' },
  { value: 'classic', label: 'Cổ điển', hint: 'Căn giữa, trang trọng' },
  { value: 'minimal', label: 'Tối giản', hint: 'Gọn gàng, nhiều khoảng trắng' },
];

export const CV_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#be123c', '#c2410c', '#334155'];

export interface CvInput {
  profile: CandidateProfile;
  email: string;
  settings: CvSettings;
  /** Ảnh đại diện dạng data URL (pdfmake không tải URL ngoài) */
  photo: string | null;
}

// ---------- Tiện ích định dạng ----------

const monthYear = (d: string | null) => {
  if (!d) return '';
  const [y, m] = d.split('-');
  return m ? `${m}/${y}` : y;
};
const period = (it: { startDate: string | null; endDate: string | null }) => {
  const s = monthYear(it.startDate);
  const e = it.endDate ? monthYear(it.endDate) : 'Hiện tại';
  return s ? `${s} – ${e}` : e;
};
const fullDate = (d: string | null) => (d ? d.split('-').reverse().join('/') : '');
const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Nhạt màu (trộn với trắng) để làm nền */
function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ---------- Khối nội dung dùng chung ----------

type Node = Record<string, unknown> | string;

function contactItems(i: CvInput): string[] {
  const p = i.profile;
  return [
    i.email && `Email: ${i.email}`,
    p.phone && `Điện thoại: ${p.phone}`,
    (p.address || p.location) && `Địa chỉ: ${[p.address, p.location?.name].filter(Boolean).join(', ')}`,
    i.settings.showBirthDate && p.dateOfBirth && `Ngày sinh: ${fullDate(p.dateOfBirth)}`,
  ].filter(Boolean) as string[];
}

function experienceBlock(list: ExperienceItem[], accent: string): Node[] {
  return list.map((e) => ({
    margin: [0, 0, 0, 8],
    stack: [
      {
        columns: [
          { text: e.position, bold: true, width: '*' },
          { text: period(e), width: 'auto', color: '#64748b', fontSize: 9 },
        ],
      },
      { text: e.companyName, color: accent, margin: [0, 1, 0, 2] },
      ...(e.description ? [{ text: e.description, color: '#334155' }] : []),
    ],
  }));
}

function educationBlock(list: EducationItem[], accent: string): Node[] {
  return list.map((e) => ({
    margin: [0, 0, 0, 8],
    stack: [
      {
        columns: [
          { text: e.school, bold: true, width: '*' },
          { text: period(e), width: 'auto', color: '#64748b', fontSize: 9 },
        ],
      },
      ...([e.degree, e.major].some(Boolean) ? [{ text: [e.degree, e.major].filter(Boolean).join(' – '), color: accent, margin: [0, 1, 0, 2] }] : []),
      ...(e.description ? [{ text: e.description, color: '#334155' }] : []),
    ],
  }));
}

function extras(s: CvSettings) {
  return [
    { title: 'Chứng chỉ', items: lines(s.certificates) },
    { title: 'Ngoại ngữ', items: lines(s.languages) },
    { title: 'Sở thích', items: lines(s.interests) },
  ].filter((x) => x.items.length);
}

// ---------- Mẫu "Hiện đại": cột bên màu nhạt ----------

function modern(i: CvInput) {
  const { profile: p, settings: s } = i;
  const accent = s.accent;
  const SIDE = 190;
  const sideHeading = (t: string) => ({ text: t.toUpperCase(), bold: true, color: accent, fontSize: 10, margin: [0, 14, 0, 4], characterSpacing: 0.5 });
  const heading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, color: accent, fontSize: 11, characterSpacing: 0.5 },
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 320, y2: 2, lineWidth: 1, lineColor: tint(accent, 0.6) }] },
    ],
    margin: [0, 12, 0, 6],
  });

  const side: Node[] = [
    ...(s.showPhoto && i.photo ? [{ image: i.photo, width: 110, height: 110, alignment: 'center', margin: [0, 0, 0, 6] }] : []),
    sideHeading('Liên hệ'),
    ...contactItems(i).map((t) => ({ text: t, fontSize: 9, margin: [0, 0, 0, 3] })),
    ...(p.skills.length ? [sideHeading('Kỹ năng'), { ul: p.skills.map((k) => k.name), fontSize: 9, markerColor: accent }] : []),
    ...extras(s).flatMap((x) => [sideHeading(x.title), { ul: x.items, fontSize: 9, markerColor: accent }]),
  ];
  const main: Node[] = [
    { text: p.fullName, fontSize: 24, bold: true, color: '#0f172a' },
    ...(p.headline ? [{ text: p.headline, fontSize: 13, color: accent, margin: [0, 2, 0, 0] }] : []),
    ...(p.summary ? [heading('Giới thiệu'), { text: p.summary, color: '#334155' }] : []),
    ...(p.experiences.length ? [heading('Kinh nghiệm làm việc'), ...experienceBlock(p.experiences, accent)] : []),
    ...(p.educations.length ? [heading('Học vấn'), ...educationBlock(p.educations, accent)] : []),
  ];

  return {
    pageMargins: [0, 30, 30, 30],
    background: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: SIDE + 20, h: 842, color: tint(accent, 0.9) }] }),
    content: [
      {
        columns: [
          { width: SIDE, stack: side, margin: [20, 0, 10, 0] },
          { width: '*', stack: main, margin: [20, 0, 0, 0] },
        ],
      },
    ],
  };
}

// ---------- Mẫu "Cổ điển": căn giữa ----------

function classic(i: CvInput) {
  const { profile: p, settings: s } = i;
  const accent = s.accent;
  const heading = (t: string) => ({
    stack: [
      { text: t.toUpperCase(), bold: true, fontSize: 11, color: accent, characterSpacing: 1 },
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 515, y2: 2, lineWidth: 0.8, lineColor: accent }] },
    ],
    margin: [0, 12, 0, 6],
  });
  return {
    pageMargins: [40, 36, 40, 36],
    content: [
      ...(s.showPhoto && i.photo ? [{ image: i.photo, width: 80, height: 80, alignment: 'center', margin: [0, 0, 0, 6] }] : []),
      { text: p.fullName.toUpperCase(), fontSize: 22, bold: true, alignment: 'center', characterSpacing: 1 },
      ...(p.headline ? [{ text: p.headline, alignment: 'center', color: accent, fontSize: 12, margin: [0, 2, 0, 0] }] : []),
      { text: contactItems(i).join('   |   '), alignment: 'center', fontSize: 9, color: '#475569', margin: [0, 6, 0, 0] },
      ...(p.summary ? [heading('Mục tiêu nghề nghiệp'), { text: p.summary }] : []),
      ...(p.experiences.length ? [heading('Kinh nghiệm làm việc'), ...experienceBlock(p.experiences, accent)] : []),
      ...(p.educations.length ? [heading('Học vấn'), ...educationBlock(p.educations, accent)] : []),
      ...(p.skills.length ? [heading('Kỹ năng'), { text: p.skills.map((k) => k.name).join('  •  ') }] : []),
      ...extras(s).flatMap((x) => [heading(x.title), { ul: x.items, markerColor: accent }]),
    ],
  };
}

// ---------- Mẫu "Tối giản" ----------

function minimal(i: CvInput) {
  const { profile: p, settings: s } = i;
  const accent = s.accent;
  const row = (title: string, body: Node[]) => ({
    columns: [
      { width: 110, text: title.toUpperCase(), fontSize: 9, bold: true, color: '#94a3b8', characterSpacing: 1 },
      { width: '*', stack: body },
    ],
    margin: [0, 14, 0, 0],
  });
  return {
    pageMargins: [48, 48, 48, 48],
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: p.fullName, fontSize: 26, bold: true },
              ...(p.headline ? [{ text: p.headline, fontSize: 12, color: accent, margin: [0, 2, 0, 0] }] : []),
              { text: contactItems(i).join('  ·  '), fontSize: 9, color: '#64748b', margin: [0, 6, 0, 0] },
            ],
          },
          ...(s.showPhoto && i.photo ? [{ width: 70, image: i.photo, fit: [70, 70] }] : []),
        ],
      },
      ...(p.summary ? [row('Giới thiệu', [{ text: p.summary }])] : []),
      ...(p.experiences.length ? [row('Kinh nghiệm', experienceBlock(p.experiences, accent))] : []),
      ...(p.educations.length ? [row('Học vấn', educationBlock(p.educations, accent))] : []),
      ...(p.skills.length ? [row('Kỹ năng', [{ text: p.skills.map((k) => k.name).join(', ') }])] : []),
      ...extras(s).map((x) => row(x.title, [{ text: x.items.join('\n') }])),
    ],
  };
}

export function buildCvDocument(i: CvInput): object {
  const body = i.settings.template === 'classic' ? classic(i) : i.settings.template === 'minimal' ? minimal(i) : modern(i);
  return {
    pageSize: 'A4',
    info: { title: `CV - ${i.profile.fullName}`, author: i.profile.fullName, creator: 'JobPortal' },
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25, color: '#1e293b' },
    ...body,
  };
}

// ---------- Tạo PDF (tải thư viện khi cần, ~1MB) ----------

type PdfMake = typeof import('pdfmake/build/pdfmake').default;
let loader: Promise<PdfMake> | null = null;

function loadPdfMake(): Promise<PdfMake> {
  loader ??= Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([m, f]) => {
    const pdfMake = ((m as { default?: PdfMake }).default ?? m) as PdfMake;
    // vfs_fonts xuất ra khác nhau giữa các phiên bản → thử lần lượt
    const raw = ((f as { default?: unknown }).default ?? f) as Record<string, unknown>;
    const vfs = ((raw.pdfMake as { vfs?: unknown } | undefined)?.vfs ?? raw.vfs ?? raw) as Record<string, string>;
    if (pdfMake.addVirtualFileSystem) pdfMake.addVirtualFileSystem(vfs);
    else pdfMake.vfs = vfs;
    return pdfMake;
  });
  return loader;
}

export async function createCvPdf(i: CvInput): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const doc = pdfMake.createPdf(buildCvDocument(i));
  return new Promise<Blob>((resolve, reject) => {
    try {
      const r = doc.getBlob((b) => resolve(b));
      if (r && typeof (r as Promise<Blob>).then === 'function') (r as Promise<Blob>).then(resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

/** Tải ảnh (URL công khai) → data URL cho pdfmake; lỗi thì bỏ ảnh */
export async function imageToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!/^image\/(jpeg|png)$/.test(blob.type)) {
      // pdfmake chỉ đọc JPEG/PNG → chuyển WEBP sang PNG qua canvas
      const bmp = await createImageBitmap(blob);
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext('2d')!.drawImage(bmp, 0, 0);
      return c.toDataURL('image/png');
    }
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
