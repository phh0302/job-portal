import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { JobLevel, JobType } from '../../../common/enums';

export const JOB_SORTS = ['newest', 'salary', 'relevant'] as const;
export type JobSort = (typeof JOB_SORTS)[number];

export class SearchJobsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Từ khóa: chức danh, công ty, kỹ năng' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  jobType?: JobType;

  @ApiPropertyOptional({ enum: JobLevel })
  @IsOptional()
  @IsEnum(JobLevel)
  level?: JobLevel;

  @ApiPropertyOptional({ description: 'Lương tối thiểu mong muốn (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Số năm kinh nghiệm hiện có — lọc job yêu cầu <= giá trị này' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiPropertyOptional({ description: 'Lọc theo công ty' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @ApiPropertyOptional({ description: 'Chỉ nhà tuyển dụng phản hồi nhanh (≥ 80% hồ sơ, trung bình ≤ 3 ngày)' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  fastResponse?: boolean;

  @ApiPropertyOptional({ enum: JOB_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn(JOB_SORTS)
  sort: JobSort = 'newest';
}
