import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { FaqAudience, SupportStatus } from '../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const SUPPORT_MESSAGE_MAX = 2000;

export class SupportMessageDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung' })
  @MaxLength(SUPPORT_MESSAGE_MAX, { message: `Tối đa ${SUPPORT_MESSAGE_MAX} ký tự` })
  body!: string;
}

export class FaqSearchQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: FaqAudience })
  @IsOptional()
  @IsEnum(FaqAudience)
  audience?: FaqAudience;
}

export class AdminTicketsQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: SupportStatus })
  @IsOptional()
  @IsEnum(SupportStatus)
  status?: SupportStatus;
}

export class FaqDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập câu hỏi' })
  @MaxLength(300)
  question!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập câu trả lời' })
  @MaxLength(4000)
  answer!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @ApiProperty({ enum: FaqAudience })
  @IsEnum(FaqAudience)
  audience!: FaqAudience;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
