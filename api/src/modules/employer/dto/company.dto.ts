import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';
import { CompanySize } from '../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value === '' ? null : value;

export class CompanyDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên công ty' })
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(/^\d{10}(-\d{3})?$/, { message: 'Mã số thuế gồm 10 số (hoặc 10 số-3 số)' })
  taxCode?: string | null;

  @ApiPropertyOptional({ enum: CompanySize })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsEnum(CompanySize)
  size?: CompanySize | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsUrl({ require_protocol: true }, { message: 'Website phải bắt đầu bằng http:// hoặc https://' })
  @MaxLength(255)
  website?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  address?: string | null;

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
  @IsString()
  @MaxLength(10000)
  description?: string | null;
}
export class UpdateCompanyDto extends PartialType(CompanyDto) {}

export class EmployerProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(/^[0-9+\-\s().]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  position?: string | null;
}
