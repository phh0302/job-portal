import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ApplyDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  jobId!: number;

  @ApiProperty({ description: 'CV đã upload' })
  @Type(() => Number)
  @IsInt({ message: 'Vui lòng chọn CV' })
  resumeId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(3000, { message: 'Thư giới thiệu tối đa 3000 ký tự' })
  coverLetter?: string;
}

export class MyApplicationsQuery extends PaginationDto {}
