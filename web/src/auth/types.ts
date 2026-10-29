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

/**
 * Trang đích sau khi đăng nhập: quay lại `from` nếu trang đó thuộc khu vực của vai trò vừa đăng nhập
 * (hoặc là trang chung), ngược lại về trang chủ của vai trò.
 * Tránh trường hợp người trước đăng xuất ở /candidate/... rồi NTD đăng nhập bị đưa vào /403.
 */
export function homeAfterLogin(role: UserRole, from?: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return ROLE_HOME[role];
  const owner = (Object.keys(ROLE_HOME) as UserRole[]).find((r) => {
    const home = ROLE_HOME[r];
    return from === home || from.startsWith(home + '/') || from.startsWith(home + '?');
  });
  return owner && owner !== role ? ROLE_HOME[role] : from;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  CANDIDATE: 'Ứng viên',
  EMPLOYER: 'Nhà tuyển dụng',
  ADMIN: 'Quản trị viên',
};
