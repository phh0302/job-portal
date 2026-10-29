import { ForbiddenException } from '@nestjs/common';

/** Mã lỗi để web nhận biết tài khoản bị khoá (đăng xuất + báo cho người dùng) */
export const ACCOUNT_LOCKED = 'ACCOUNT_LOCKED';

export const accountLocked = (message = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên') =>
  new ForbiddenException({ message, code: ACCOUNT_LOCKED });
