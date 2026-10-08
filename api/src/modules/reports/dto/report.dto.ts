import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportTargetType } from '../../../common/enums';

export const REPORT_REASONS = [
  'Tin tuyển dụng lừa đảo',
  'Yêu cầu đóng phí / đặt cọc',
  'Thông tin sai sự thật',
  'Nội dung phản cảm, phân biệt đối xử',
  'Tin trùng lặp / spam',
  'Lý do khác',
] as const;

export class CreateReportDto {
  @ApiProperty({ enum: ReportTargetType })
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @ApiProperty({ description: 'id tin tuyển dụng hoặc công ty' })
  @Type(() => Number)
  @IsInt()
  targetId!: number;

  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn(REPORT_REASONS, { message: 'Vui lòng chọn lý do' })
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(2000)
  details?: string;
}
