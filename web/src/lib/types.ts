export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Option {
  id: number;
  name: string;
  slug: string;
}

export interface CompanyCard {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  verified: boolean;
  location?: string | null;
  /** Chỉ số phản hồi ứng viên (null = chưa đủ dữ liệu) */
  response?: ResponseInfo | null;
}

export interface ResponseInfo {
  rate: number;
  avgHours: number | null;
  fast: boolean;
}

export interface JobCard {
  id: number;
  slug: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNegotiable: boolean;
  jobType: string;
  level: string;
  experienceYears: number;
  deadline: string;
  publishedAt: string | null;
  /** Tin nổi bật (gói trả phí) */
  featured?: boolean;
  location: { id: number; name: string } | null;
  skills: Option[];
  company: CompanyCard;
}

export interface JobDetail extends JobCard {
  description: string;
  requirements: string | null;
  benefits: string | null;
  quantity: number;
  workAddress: string | null;
  viewCount: number;
  categories: Option[];
  company: CompanyCard & {
    size: string | null;
    website: string | null;
    address: string | null;
    location: string | null;
    description: string | null;
  };
  myApplication: { id: number; status: string; createdAt: string } | null;
}

export interface Resume {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  isDefault: boolean;
  createdAt: string;
}
