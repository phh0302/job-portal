import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { EmailStatus } from '../../mail/entities/email-outbox.entity';
import { CompanyVerification, JobStatus, ReportStatus, UserRole, UserStatus } from '../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

// ===== Người dùng =====
export class AdminUsersQuery extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ enum: UserRole }) @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class LockUserDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do khóa' })
  @MaxLength(500)
  reason!: string;
}

export class CreateAdminDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/, { message: 'Mật khẩu 8–64 ký tự, gồm cả chữ và số' })
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}

// ===== Kiểm duyệt =====
export class AdminJobsQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus }) @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) q?: string;
}

export class AdminCompaniesQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: CompanyVerification }) @IsOptional() @IsEnum(CompanyVerification) status?: CompanyVerification;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) q?: string;
}

export class AdminReportsQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: ReportStatus }) @IsOptional() @IsEnum(ReportStatus) status?: ReportStatus;
}

export class ReasonDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập lý do' })
  @MaxLength(500)
  reason!: string;
}

export const REPORT_ACTIONS = ['NONE', 'HIDE_JOB', 'WARN', 'LOCK_USER'] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export class ResolveReportDto {
  @ApiProperty({ enum: REPORT_ACTIONS, description: 'NONE: chỉ đánh dấu đã xử lý; HIDE_JOB: ẩn tin; WARN: gửi cảnh cáo NTD; LOCK_USER: khóa tài khoản NTD' })
  @IsIn(REPORT_ACTIONS)
  action!: ReportAction;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập ghi chú xử lý' })
  @MaxLength(1000)
  note!: string;
}

// ===== Danh mục =====
export class CategoryDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên' }) @MaxLength(150) name!: string;
  @ApiPropertyOptional() @IsOptional() @Transform(emptyToNull) @ValidateIf((_, v) => v !== null) @IsString() @MaxLength(100) icon?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class NameDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tên' }) @MaxLength(100) name!: string;
}

export class LocationDto extends NameDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000) sortOrder?: number;
}

// ===== Nội dung =====
export class PageDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề' }) @MaxLength(200) title!: string;
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Vui lòng nhập nội dung' }) @MaxLength(100000) content!: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class AuditQuery extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() actorId?: number;
}

export class EmailQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: EmailStatus }) @IsOptional() @IsEnum(EmailStatus) status?: EmailStatus;
}

export class GrowthQuery {
  @ApiPropertyOptional({ enum: ['day', 'month'] }) @IsOptional() @IsIn(['day', 'month']) period: 'day' | 'month' = 'day';
}
