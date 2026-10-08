import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import InfoCard from './profile/InfoCard';
import SkillsCard from './profile/SkillsCard';
import TimelineCard from './profile/TimelineCard';
import { PROFILE_KEY, type CandidateProfile, type EducationItem, type ExperienceItem } from './types';

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: async () => (await api.get<CandidateProfile>('/candidate/profile')).data,
  });

  if (isLoading) return <p className="text-slate-500">Đang tải…</p>;
  if (isError || !profile) return <p className="text-red-600">Không tải được hồ sơ.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Hồ sơ của tôi</h1>
      <InfoCard key={profile.id} profile={profile} />
      <SkillsCard skills={profile.skills} />
      <TimelineCard<ExperienceItem>
        title="Kinh nghiệm làm việc"
        endpoint="/candidate/experiences"
        items={profile.experiences}
        endLabel="Hiện tại"
        fields={[
          { key: 'position', label: 'Vị trí', required: true, maxLength: 150 },
          { key: 'companyName', label: 'Công ty', required: true, maxLength: 200 },
        ]}
        titleOf={(i) => i.position}
        subtitleOf={(i) => i.companyName}
      />
      <TimelineCard<EducationItem>
        title="Học vấn"
        endpoint="/candidate/educations"
        items={profile.educations}
        endLabel="Đang học"
        fields={[
          { key: 'school', label: 'Trường', required: true, maxLength: 200 },
          { key: 'major', label: 'Chuyên ngành', maxLength: 150 },
          { key: 'degree', label: 'Bằng cấp', maxLength: 100 },
        ]}
        titleOf={(i) => i.school}
        subtitleOf={(i) => [i.major, i.degree].filter(Boolean).join(' · ')}
      />
    </div>
  );
}
