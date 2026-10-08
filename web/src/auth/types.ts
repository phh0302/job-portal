export type UserRole = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  fullName: string;
  companyId: number | null;
  isSuperAdmin?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export const ROLE_HOME: Record<UserRole, string> = {
  CANDIDATE: '/candidate',
  EMPLOYER: '/employer',
  ADMIN: '/admin',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  CANDIDATE: 'Ứng viên',
  EMPLOYER: 'Nhà tuyển dụng',
  ADMIN: 'Quản trị viên',
};
