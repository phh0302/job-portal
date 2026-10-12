/** Tìm FAQ phù hợp với câu hỏi (không cần AI): so khớp từ khoá đã bỏ dấu tiếng Việt */

export interface FaqLike {
  id: number;
  question: string;
  answer: string;
  keywords: string | null;
}

const STOP = new Set(
  'toi ban minh la co khong ko k the nao lam sao cua cho va de duoc gi o voi nhu thi ma nay do roi a a oi nhe nha vay sao giup hay muon can phai bi duoc cac nhung mot cai em anh chi admin ad hoi xin chao cam on'.split(' '),
);

export function normalizeVi(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return normalizeVi(s)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Cặp từ liền nhau ("quen mat", "mat khau") – khớp cụm cho điểm cao hơn */
function bigrams(list: string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < list.length - 1; i++) out.add(`${list[i]} ${list[i + 1]}`);
  return out;
}

/** Điểm 0..1: tỉ lệ từ của câu hỏi xuất hiện trong FAQ (từ khoá & câu hỏi nặng hơn câu trả lời) */
export function scoreFaq(query: string, f: FaqLike): number {
  const q = tokens(query);
  if (!q.length) return 0;
  const qText = new Set(tokens(f.question));
  const kText = new Set(tokens(f.keywords ?? ''));
  const aText = new Set(tokens(f.answer));
  let hit = 0;
  for (const t of q) {
    if (kText.has(t)) hit += 1.2;
    else if (qText.has(t)) hit += 1;
    else if (aText.has(t)) hit += 0.35;
  }
  const qb = bigrams(q);
  const fb = new Set([...bigrams(tokens(f.question)), ...bigrams(tokens(f.keywords ?? ''))]);
  let bonus = 0;
  for (const b of qb) if (fb.has(b)) bonus += 0.5;
  return Math.min(1, (hit + bonus) / (q.length + 0.5));
}

export function searchFaqs<T extends FaqLike>(query: string, list: T[], limit = 5): { faq: T; score: number }[] {
  return list
    .map((faq) => ({ faq, score: scoreFaq(query, faq) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Người dùng chủ động muốn gặp người thật */
export function wantsHuman(text: string): boolean {
  const n = normalizeVi(text);
  return /\b(gap|noi chuyen|chat|lien he|ket noi|chuyen).{0,15}\b(nhan vien|nguoi that|admin|quan tri|tu van vien|cskh|ho tro vien)\b/.test(n) || /\bnhan vien ho tro\b/.test(n);
}
