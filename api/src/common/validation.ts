import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Gom lỗi validate thành danh sách câu thông báo.
 * Với mỗi trường: nếu có câu tiếng Việt tự viết (decorator có `message`) thì chỉ trả các câu đó,
 * bỏ các câu mặc định tiếng Anh của class-validator ("reason must be a string"…) bị sinh kèm
 * khi thiếu hẳn trường. Trường chỉ có câu mặc định thì giữ nguyên.
 */
export function validationMessages(errors: ValidationError[], parent = ''): string[] {
  const out: string[] = [];
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    const msgs = Object.values(e.constraints ?? {});
    // Câu mặc định của class-validator luôn bắt đầu bằng tên trường
    const custom = msgs.filter((m) => !m.startsWith(`${e.property} `));
    const picked = custom.length ? custom : msgs.map((m) => (parent ? `${parent}.${m}` : m));
    out.push(...picked);
    if (e.children?.length) out.push(...validationMessages(e.children, path));
  }
  return out;
}

export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException(validationMessages(errors));
