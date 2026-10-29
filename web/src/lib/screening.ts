export type Verdict = 'STRONG' | 'POTENTIAL' | 'WEAK';
export type ReqStatus = 'MET' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';

export interface Screening {
  id: number;
  applicationId: number;
  score: number;
  verdict: Verdict;
  summary: string;
  requirements: { requirement: string; status: ReqStatus; evidence: string | null }[];
  strengths: string[];
  gaps: string[];
  interviewQuestions: string[];
  source: 'AI' | 'RULES';
  cvReadable: boolean;
  model: string | null;
  createdAt: string;
}

export interface ScreeningQuota {
  used: number;
  limit: number;
  remaining: number;
  aiEnabled: boolean;
}

export const VERDICT: Record<Verdict, { label: string; cls: string }> = {
  STRONG: { label: 'Rất phù hợp', cls: 'bg-green-100 text-green-800' },
  POTENTIAL: { label: 'Có tiềm năng', cls: 'bg-amber-100 text-amber-800' },
  WEAK: { label: 'Chưa phù hợp', cls: 'bg-slate-200 text-slate-700' },
};

export const REQ_STATUS: Record<ReqStatus, { icon: string; label: string; cls: string }> = {
  MET: { icon: '✓', label: 'Đáp ứng', cls: 'text-green-700' },
  PARTIAL: { icon: '◐', label: 'Một phần', cls: 'text-amber-700' },
  MISSING: { icon: '✗', label: 'Chưa thấy', cls: 'text-red-600' },
  UNKNOWN: { icon: '?', label: 'Chưa rõ', cls: 'text-slate-500' },
};

export const QUOTA_KEY = ['employer', 'screening', 'quota'];

// ---- Ứng viên tự kiểm tra CV với JD ----
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CvCheck {
  id: number;
  jobId: number;
  resumeId: number | null;
  matchPercent: number;
  verdict: Verdict;
  summary: string;
  requirements: { requirement: string; status: ReqStatus; evidence: string | null }[];
  strengths: string[];
  improvements: { area: string; priority: Priority; suggestion: string }[];
  cvRewriteTips: string[];
  missingKeywords: string[];
  cvReadable: boolean;
  source: 'AI' | 'RULES';
  createdAt: string;
  cached?: boolean;
}

export const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  HIGH: { label: 'Ưu tiên cao', cls: 'bg-red-100 text-red-700' },
  MEDIUM: { label: 'Nên làm', cls: 'bg-amber-100 text-amber-800' },
  LOW: { label: 'Thêm điểm cộng', cls: 'bg-slate-100 text-slate-700' },
};

export const CV_CHECK_QUOTA_KEY = ['candidate', 'cv-check', 'quota'];
