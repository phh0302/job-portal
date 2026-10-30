import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
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
import { JobLevel, JobStatus, JobType } from '../../../common/enums';
import { toOptionalInt } from '../../../common/utils/optional-int';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value === '' ? null : value;

export class JobDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập chức danh' })
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mô tả công việc' })
  @MaxLength(20000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20000)
  requirements?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(20000)
  benefits?: string | null;

  @ApiPropertyOptional({ description: 'VND/tháng' })
  @IsOptional()
  @Transform(toOptionalInt)
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10_000_000_000)
  salaryMin?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalInt)
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(10_000_000_000)
  salaryMax?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  salaryNegotiable?: boolean;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType, { message: 'Vui lòng chọn loại hình' })
  jobType!: JobType;

  @ApiProperty({ enum: JobLevel })
  @IsEnum(JobLevel, { message: 'Vui lòng chọn cấp bậc' })
  level!: JobLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  experienceYears?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @ApiProperty({ example: '2026-12-31' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Hạn nộp phải có dạng YYYY-MM-DD' })
  deadline!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalInt)
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  locationId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  workAddress?: string | null;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Chọn ít nhất 1 ngành nghề' })
  @ArrayMaxSize(3, { message: 'Tối đa 3 ngành nghề' })
  @Type(() => Number)
  @IsInt({ each: true })
  categoryIds!: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15, { message: 'Tối đa 15 kỹ năng' })
  @Type(() => Number)
  @IsInt({ each: true })
  skillIds?: number[];

  /** true = gửi duyệt luôn, false/không có = lưu nháp */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class UpdateJobDto extends PartialType(JobDto) {}

export class ExtendJobDto {
  @ApiProperty({ example: '2026-12-31' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Hạn nộp phải có dạng YYYY-MM-DD' })
  deadline!: string;
}

export class MyJobsQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}
