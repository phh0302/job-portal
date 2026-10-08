import { UserRole } from '../enums';

/** Thông tin user gắn vào request sau khi xác thực JWT */
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}
