import { BadRequestException } from '@nestjs/common';
import { IMAGE_RULE, RESUME_RULE, StorageService } from './storage.service';

const svc = new StorageService({ get: () => 'uploads' } as never);
const file = (name: string, mimetype: string, buffer: Buffer, size = buffer.length) => ({ originalname: name, mimetype, buffer, size });

describe('StorageService', () => {
  it('nhận PDF hợp lệ', () => {
    expect(() => svc.validate(file('cv.pdf', 'application/pdf', Buffer.from('%PDF-1.7 ...')), RESUME_RULE)).not.toThrow();
  });
  it('từ chối file đổi đuôi (exe giả pdf)', () => {
    expect(() => svc.validate(file('cv.pdf', 'application/pdf', Buffer.from('MZ\x90\x00')), RESUME_RULE)).toThrow(BadRequestException);
  });
  it('từ chối sai loại / quá dung lượng / thiếu file', () => {
    expect(() => svc.validate(file('a.txt', 'text/plain', Buffer.from('x')), RESUME_RULE)).toThrow(BadRequestException);
    expect(() => svc.validate(file('a.png', 'image/png', Buffer.from('89504e470d0a1a0a', 'hex'), 3 * 1024 * 1024), IMAGE_RULE)).toThrow(/2MB/);
    expect(() => svc.validate(undefined, IMAGE_RULE)).toThrow(BadRequestException);
  });
  it('chặn path traversal', () => {
    expect(() => svc.fullPath('../../etc/passwd')).toThrow(BadRequestException);
    expect(svc.fullPath('private/resumes/a.pdf')).toMatch(/uploads[\\/]private[\\/]resumes[\\/]a\.pdf$/);
  });
  it('URL công khai chỉ cho thư mục public', () => {
    expect(svc.publicUrl('public/avatars/a.jpg')).toBe('/api/uploads/public/avatars/a.jpg');
    expect(svc.publicUrl('private/resumes/a.pdf')).toBeNull();
  });
});
