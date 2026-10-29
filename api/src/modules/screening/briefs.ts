import { readFile } from 'fs/promises';
import { extname } from 'path';
import { htmlToPlainText } from '../../common/utils/rich-text';
import type { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import type { Job } from '../jobs/entities/job.entity';
import type { StorageService } from '../storage/storage.service';
import { docxToText } from './docx-text';
import type { CandidateBrief, CvContent, JobBrief } from './screening.engine';

/** Tin tuyển dụng → dữ liệu gửi AI (cần nạp sẵn skills, categories) */
export function toJobBrief(job: Job): JobBrief {
  return {
    title: job.title,
    level: job.level,
    experienceYears: job.experienceYears,
    skills: (job.skills ?? []).map((s) => s.name),
    categories: (job.categories ?? []).map((x) => x.name),
    description: htmlToPlainText(job.description).slice(0, 6000),
    requirements: htmlToPlainText(job.requirements).slice(0, 6000),
  };
}

/** Hồ sơ ứng viên → dữ liệu gửi AI, KHÔNG có họ tên, ngày sinh, liên hệ, địa chỉ, ảnh */
export function toCandidateBrief(c: CandidateProfile, coverLetter: string | null = null): CandidateBrief {
  return {
    headline: c.headline,
    summary: c.summary?.slice(0, 2000) ?? null,
    yearsOfExperience: c.yearsOfExperience,
    skills: (c.skills ?? []).map((s) => s.name),
    experiences: (c.experiences ?? []).map((e) => ({ position: e.position, company: e.companyName, from: e.startDate, to: e.endDate, description: e.description?.slice(0, 800) ?? null })),
    educations: (c.educations ?? []).map((e) => ({ school: e.school, degree: e.degree, major: e.major })),
    coverLetter: coverLetter?.slice(0, 3000) ?? null,
  };
}

/** PDF → gửi nguyên file cho AI; DOCX → lấy văn bản; DOC cũ / lỗi → không đọc được */
export async function readCv(storage: StorageService, key: string | null | undefined): Promise<CvContent> {
  if (!key) return { kind: 'none' };
  try {
    const buf = await readFile(storage.fullPath(key));
    const ext = extname(key).toLowerCase();
    if (ext === '.pdf') return { kind: 'pdf', base64: buf.toString('base64') };
    if (ext === '.docx') {
      const text = docxToText(buf);
      return text ? { kind: 'text', text } : { kind: 'none' };
    }
  } catch {
    // file mất / không đọc được → đánh giá theo hồ sơ
  }
  return { kind: 'none' };
}
