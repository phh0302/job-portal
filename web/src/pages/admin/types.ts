export interface AdminOverview {
  users: { total: number; candidates: number; employers: number; admins: number };
  companies: { total: number; verified: number; byStatus: Record<string, number> };
  jobs: { total: number; open: number; byStatus: Record<string, number> };
  applications: { total: number };
  todo: { pendingJobs: number; pendingCompanies: number; openReports: number; pendingReviews: number; pendingOrders: number };
}

export interface AdminUserRow {
  id: number;
  email: string;
  role: 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  emailVerified: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  fullName: string | null;
  company: { id: number; name: string; slug: string } | null;
}
