import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import type { CandidateProfile } from '../pages/candidate/types';
import { api, UserError } from './api';
import { createCvPdf, imageToDataUrl, type CvSettings } from './cvPdf';
import type { Resume } from './types';

export interface QuickApplyResult {
  resumeName: string;
  /** true = vừa tạo CV từ hồ sơ vì chưa có CV nào */
  generated: boolean;
}

/**
 * "Ứng tuyển 1 chạm":
 *  - Có CV → dùng CV mặc định (hoặc CV mới nhất), không thư giới thiệu.
 *  - Chưa có CV → tự tạo CV PDF từ hồ sơ (mẫu & màu đã lưu ở "Tạo CV online"), lưu vào "CV của tôi" rồi nộp.
 */
export function useQuickApply(jobId: number, slug: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<QuickApplyResult> => {
      const resumes = (await api.get<Resume[]>('/candidate/resumes')).data;
      let resume = resumes.find((r) => r.isDefault) ?? resumes[0];
      let generated = false;

      if (!resume) {
        const [profile, settings] = await Promise.all([
          api.get<CandidateProfile>('/candidate/profile').then((r) => r.data),
          api.get<CvSettings>('/candidate/cv-settings').then((r) => r.data),
        ]);
        if (!profile.headline && !profile.skills.length && !profile.experiences.length) {
          throw new UserError('Hồ sơ còn trống nên chưa tạo được CV. Hãy bổ sung tiêu đề nghề nghiệp, kỹ năng hoặc kinh nghiệm, hoặc tải CV lên.');
        }
        const photo = settings.showPhoto ? await imageToDataUrl(profile.avatarUrl) : null;
        const blob = await createCvPdf({ profile, email: user?.email ?? '', settings, photo });
        const fd = new FormData();
        fd.append('file', new File([blob], `CV-${new Date().toISOString().slice(0, 10)}.pdf`, { type: 'application/pdf' }));
        resume = (await api.post<Resume>('/candidate/resumes', fd)).data;
        generated = true;
      }

      await api.post('/candidate/applications', { jobId, resumeId: resume.id });
      return { resumeName: resume.fileName, generated };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', slug] });
      qc.invalidateQueries({ queryKey: ['candidate', 'applications'] });
      qc.invalidateQueries({ queryKey: ['candidate', 'resumes'] });
    },
  });
}
