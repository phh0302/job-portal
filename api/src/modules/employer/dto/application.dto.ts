import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ApplicationStatus } from '../../../common/enums';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

/** Trạng thái NTD được phép đặt */
export const EMPLOYER_STATUSES = [
  ApplicationStatus.VIEWED,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFERED,
  ApplicationStatus.REJECTED,
] as const;

export class EmployerApplicationsQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jobId?: number;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Tên ứng viên' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Chỉ hồ sơ chờ phản hồi quá 3 ngày */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  pending?: boolean;

  /** newest (mặc định) | ai = điểm AI chấm CV cao nhất trước */
  @ApiPropertyOptional({ enum: ['newest', 'ai'] })
  @IsOptional()
  @IsIn(['newest', 'ai'])
  sort?: 'newest' | 'ai';
}

export class InterviewDto {
  @ApiProperty({ example: '09:00 thứ Hai, 20/10/2026' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập thời gian phỏng vấn' })
  @MaxLength(200)
  time!: string;

  @ApiProperty({ example: 'Tầng 8, 123 Láng Hạ / Google Meet' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập địa điểm / hình thức phỏng vấn' })
  @MaxLength(300)
  location!: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: EMPLOYER_STATUSES })
  @IsIn(EMPLOYER_STATUSES, { message: 'Trạng thái không hợp lệ' })
  status!: (typeof EMPLOYER_STATUSES)[number];

  /** Lời nhắn đưa vào email gửi ứng viên */
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(3000)
  message?: string | null;

  @ApiPropertyOptional({ type: InterviewDto })
  @ValidateIf((o: UpdateApplicationStatusDto) => o.status === ApplicationStatus.INTERVIEW)
  @IsDefined({ message: 'Vui lòng nhập thông tin phỏng vấn' })
  @ValidateNested()
  @Type(() => InterviewDto)
  interview?: InterviewDto;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class ApplicationNoteDto {
  @ApiProperty()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  employerNote!: string | null;
}
