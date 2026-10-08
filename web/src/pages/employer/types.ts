export interface EmployerCompany {
  id: number;
  name: string;
  slug: string;
  taxCode: string | null;
  size: string | null;
  website: string | null;
  address: string | null;
  locationId: number | null;
  location: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote: string | null;
  hasLicense: boolean;
  verifiedAt: string | null;
}

export interface EmployerMe {
  profile: { fullName: string; phone: string | null; position: string | null; companyRole: 'OWNER' | 'MEMBER' | null };
  company: EmployerCompany | null;
}

export interface EmployerJobRow {
  id: number;
  slug: string;
  title: string;
  status: string;
  rejectReason: string | null;
  deadline: string;
  publishedAt: string | null;
  featuredUntil: string | null;
  updatedAt: string;
  viewCount: number;
  location: string | null;
  applications: number;
  newApplications: number;
}

export interface EmployerJobDetail {
  id: number;
  slug: string;
  title: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  jobType: string;
  level: string;
  experienceYears: number;
  quantity: number;
  deadline: string;
  locationId: number | null;
  workAddress: string | null;
  status: string;
  rejectReason: string | null;
  categoryIds: number[];
  skillIds: number[];
}

export interface CandidateView {
  id: number;
  fullName: string;
  headline: string | null;
  summary: string | null;
  avatarUrl: string | null;
  location: string | null;
  yearsOfExperience: number;
  expectedSalary: number | null;
  dateOfBirth: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  skills: { id: number; name: string }[];
  educations: { id: number; school: string; major: string | null; degree: string | null; startDate: string | null; endDate: string | null; description: string | null }[];
  experiences: { id: number; companyName: string; position: string; startDate: string | null; endDate: string | null; description: string | null }[];
}
