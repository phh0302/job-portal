import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ReviewRelation, ReviewStatus } from '../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpsertReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt({ message: 'Vui lòng chọn số sao' })
  @Min(1, { message: 'Số sao từ 1 đến 5' })
  @Max(5, { message: 'Số sao từ 1 đến 5' })
  rating!: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề' })
  @MaxLength(150)
  title!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(20, { message: 'Điểm tốt: tối thiểu 20 ký tự' })
  @MaxLength(2000)
  pros!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(20, { message: 'Điểm chưa tốt: tối thiểu 20 ký tự' })
  @MaxLength(2000)
  cons!: string;

  @ApiProperty({ enum: ReviewRelation })
  @IsEnum(ReviewRelation, { message: 'Vui lòng chọn mối quan hệ với công ty' })
  relation!: ReviewRelation;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class ReplyReviewDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  /** Rỗng = xoá phản hồi */
  reply!: string;
}

export class AdminReviewsQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}
