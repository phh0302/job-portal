import type { Option } from '../../lib/types';

export interface TimelineItem {
  id: number;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
}
export interface EducationItem extends TimelineItem {
  school: string;
  major: string | null;
  degree: string | null;
}
export interface ExperienceItem extends TimelineItem {
  companyName: string;
  position: string;
}

export interface CandidateProfile {
  id: number;
  fullName: string;
  phone: string | null;
  dateOfBirth: string | null;
  address: string | null;
  locationId: number | null;
  location: { id: number; name: string } | null;
  avatarUrl: string | null;
  headline: string | null;
  summary: string | null;
  yearsOfExperience: number;
  expectedSalary: number | null;
  isPublic: boolean;
  skills: Option[];
  educations: EducationItem[];
  experiences: ExperienceItem[];
}

export const PROFILE_KEY = ['candidate', 'profile'];
