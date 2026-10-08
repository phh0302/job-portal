import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join, normalize, resolve, sep } from 'path';

/** File nhận từ multer (memoryStorage) */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface FileRule {
  /** Đuôi file cho phép, vd ['.pdf'] */
  exts: string[];
  mimes: string[];
  maxMb: number;
  label: string;
}

export const IMAGE_RULE: FileRule = {
  exts: ['.jpg', '.jpeg', '.png', '.webp'],
  mimes: ['image/jpeg', 'image/png', 'image/webp'],
  maxMb: 2,
  label: 'ảnh JPG, PNG hoặc WEBP',
};

export const RESUME_RULE: FileRule = {
  exts: ['.pdf', '.doc', '.docx'],
  mimes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxMb: 5,
  label: 'file PDF, DOC hoặc DOCX',
};

/**
 * Lưu file trên ổ đĩa (dev). Sau này đổi sang S3/Cloudinary chỉ cần sửa class này.
 * - uploads/public/...  : ảnh công khai, phục vụ tại /api/uploads/public/...
 * - uploads/private/... : CV, chỉ đọc qua API
 * Giá trị lưu trong DB là "key", vd "public/avatars/abc.jpg".
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.get<string>('upload.dir') ?? 'uploads');
  }

  validate(file: UploadedFileData | undefined, rule: FileRule): UploadedFileData {
    if (!file) throw new BadRequestException('Vui lòng chọn file');
    const ext = extname(file.originalname).toLowerCase();
    if (!rule.exts.includes(ext) || !rule.mimes.includes(file.mimetype)) {
      throw new BadRequestException(`Chỉ chấp nhận ${rule.label}`);
    }
    if (file.size > rule.maxMb * 1024 * 1024) {
      throw new BadRequestException(`File tối đa ${rule.maxMb}MB`);
    }
    if (!this.magicOk(file.buffer, ext)) {
      throw new BadRequestException('Nội dung file không đúng định dạng');
    }
    return file;
  }

  async save(file: UploadedFileData, folder: 'public/avatars' | 'public/logos' | 'public/covers' | 'private/resumes' | 'private/licenses'): Promise<string> {
    const key = `${folder}/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const full = this.fullPath(key);
    await fs.mkdir(join(full, '..'), { recursive: true });
    await fs.writeFile(full, file.buffer);
    return key;
  }

  async remove(key: string | null | undefined) {
    if (!key) return;
    try {
      await fs.unlink(this.fullPath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') this.logger.warn(`Không xoá được ${key}`);
    }
  }

  /** Đường dẫn tuyệt đối, chặn path traversal */
  fullPath(key: string): string {
    const full = resolve(this.root, normalize(key));
    if (!full.startsWith(this.root + sep)) throw new BadRequestException('Đường dẫn file không hợp lệ');
    return full;
  }

  /** URL công khai cho ảnh */
  publicUrl(key: string | null | undefined): string | null {
    if (!key) return null;
    if (/^https?:\/\//.test(key)) return key;
    return key.startsWith('public/') ? `/api/uploads/${key}` : null;
  }

  /** Kiểm tra vài byte đầu để chắc chắn file đúng loại (không chỉ dựa vào đuôi file) */
  private magicOk(buf: Buffer, ext: string): boolean {
    const hex = buf.subarray(0, 8).toString('hex');
    switch (ext) {
      case '.pdf':
        return buf.subarray(0, 5).toString('latin1') === '%PDF-';
      case '.docx':
        return hex.startsWith('504b0304'); // zip
      case '.doc':
        return hex.startsWith('d0cf11e0a1b11ae1'); // OLE
      case '.png':
        return hex.startsWith('89504e47');
      case '.jpg':
      case '.jpeg':
        return hex.startsWith('ffd8ff');
      case '.webp':
        return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
      default:
        return false;
    }
  }
}
