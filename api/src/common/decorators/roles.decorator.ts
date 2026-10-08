import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../enums';

export const ROLES_KEY = 'roles';
/** Chỉ cho phép các vai trò được liệt kê, vd: @Roles(UserRole.ADMIN) */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
