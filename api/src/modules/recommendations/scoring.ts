/**
 * Chấm điểm độ phù hợp ứng viên ↔ tin tuyển dụng (0–100).
 * Hàm thuần, không phụ thuộc DB -> dễ test, dễ tinh chỉnh trọng số.
 */

export interface CandidateFeatures {
  skillIds: Set<number>;
  /** Từ khóa trong tiêu đề nghề nghiệp, vd "lap trinh vien frontend" -> {lap, trinh, vien, frontend} */
  headlineTokens: Set<string>;
  locationId: number | null;
  yearsOfExperience: number;
  /** VND/tháng */
  expectedSalary: number | null;
  /** Ngành nghề rút ra từ lịch sử ứng tuyển / lưu việc: categoryId -> số lần */
  categoryAffinity: Map<number, number>;
}

export interface JobFeatures {
  id: number;
  title: string;
  skillIds: number[];
  categoryIds: number[];
  locationId: number | null;
  jobType: string;
  experienceYears: number;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
}

export const WEIGHTS = { skills: 40, title: 15, category: 15, location: 10, experience: 10, salary: 10 } as const;
export type ScoreKey = keyof typeof WEIGHTS;

export interface MatchScore {
  total: number;
  breakdown: Record<ScoreKey, number>;
  matchedSkillIds: number[];
  missingSkillIds: number[];
}

const STOPWORDS = new Set([
  'va', 'cho', 'cua', 'tai', 'nhan', 'vien', 'chuyen', 'tuyen', 'dung', 'cong', 'ty', 'the', 'and', 'of', 'for', 'in', 'a', 'an',
  'ho', 'tro', 'lam', 'viec', 'nguoi', 'thuc', 'tap', 'sinh',
]);

/** "Lập trình viên ReactJS" -> {lap, trinh, reactjs}; bỏ dấu, bỏ từ quá chung */
export function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const norm = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
  return new Set(norm.split(/[^a-z0-9+#.]+/).filter((w) => w.length >= 2 && !STOPWORDS.has(w)));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreJob(c: CandidateFeatures, j: JobFeatures): MatchScore {
  // 1) Kỹ năng: tỷ lệ kỹ năng của tin mà ứng viên có
  const jobSkills = [...new Set(j.skillIds)];
  const matched = jobSkills.filter((id) => c.skillIds.has(id));
  const missing = jobSkills.filter((id) => !c.skillIds.has(id));
  let skills: number;
  if (jobSkills.length === 0) skills = c.skillIds.size ? WEIGHTS.skills * 0.4 : WEIGHTS.skills * 0.3; // tin không ghi kỹ năng: điểm trung tính
  else skills = WEIGHTS.skills * (matched.length / jobSkills.length);

  // 2) Chức danh khớp tiêu đề nghề nghiệp
  const titleTokens = tokenize(j.title);
  let title = 0;
  if (c.headlineTokens.size && titleTokens.size) {
    const overlap = [...titleTokens].filter((t) => c.headlineTokens.has(t)).length;
    title = WEIGHTS.title * Math.min(1, overlap / Math.min(titleTokens.size, c.headlineTokens.size));
  }

  // 3) Ngành nghề từng quan tâm (ứng tuyển / lưu)
  let category = 0;
  if (c.categoryAffinity.size) {
    const maxAff = Math.max(...c.categoryAffinity.values());
    const best = Math.max(0, ...j.categoryIds.map((id) => c.categoryAffinity.get(id) ?? 0));
    category = WEIGHTS.category * (best / maxAff);
  } else {
    category = WEIGHTS.category * 0.3; // chưa có lịch sử: trung tính
  }

  // 4) Địa điểm
  let location: number;
  if (j.jobType === 'REMOTE') location = WEIGHTS.location;
  else if (!c.locationId || !j.locationId) location = WEIGHTS.location * 0.5;
  else location = c.locationId === j.locationId ? WEIGHTS.location : 0;

  // 5) Kinh nghiệm: đủ yêu cầu = tối đa; thiếu 1 năm = một nửa; quá dư (> 5 năm) giảm nhẹ
  const gap = j.experienceYears - c.yearsOfExperience;
  let experience: number;
  if (gap <= 0) experience = c.yearsOfExperience - j.experienceYears > 5 ? WEIGHTS.experience * 0.6 : WEIGHTS.experience;
  else if (gap === 1) experience = WEIGHTS.experience * 0.5;
  else experience = 0;

  // 6) Lương so với mong muốn
  let salary: number;
  const top = j.salaryMax ?? j.salaryMin;
  if (!c.expectedSalary || j.salaryNegotiable || top == null) salary = WEIGHTS.salary * 0.6;
  else if (top >= c.expectedSalary) salary = WEIGHTS.salary;
  else if (top >= c.expectedSalary * 0.85) salary = WEIGHTS.salary * 0.5;
  else salary = 0;

  const breakdown = {
    skills: round1(skills),
    title: round1(title),
    category: round1(category),
    location: round1(location),
    experience: round1(experience),
    salary: round1(salary),
  };
  const total = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
  return { total: Math.min(100, total), breakdown, matchedSkillIds: matched, missingSkillIds: missing };
}

/** Lý do dễ hiểu (dùng khi không có / chưa có giải thích của AI) */
export function ruleReasons(
  s: MatchScore,
  ctx: { matchedSkillNames: string[]; sameLocation: boolean; remote: boolean; salaryOk: boolean; expOk: boolean; categoryHit: boolean },
): string[] {
  const out: string[] = [];
  if (ctx.matchedSkillNames.length) out.push(`Bạn có ${ctx.matchedSkillNames.length} kỹ năng tin yêu cầu: ${ctx.matchedSkillNames.slice(0, 4).join(', ')}`);
  if (s.breakdown.title >= WEIGHTS.title * 0.5) out.push('Chức danh khớp với tiêu đề nghề nghiệp của bạn');
  if (ctx.categoryHit) out.push('Cùng ngành với các việc bạn từng ứng tuyển / lưu');
  if (ctx.remote) out.push('Làm từ xa');
  else if (ctx.sameLocation) out.push('Cùng tỉnh/thành với bạn');
  if (ctx.expOk) out.push('Kinh nghiệm của bạn đáp ứng yêu cầu');
  if (ctx.salaryOk) out.push('Mức lương đáp ứng mong muốn của bạn');
  return out;
}
