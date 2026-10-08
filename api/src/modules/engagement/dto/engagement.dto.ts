import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { AlertFrequency } from '../../../common/enums';

const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value === '' ? null : value;

export class JobAlertDto {
  @ApiPropertyOptional({ description: 'Từ khóa (chức danh, kỹ năng…)' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  keyword?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  locationId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @ApiPropertyOptional({ enum: AlertFrequency })
  @IsOptional()
  @IsEnum(AlertFrequency)
  frequency?: AlertFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
