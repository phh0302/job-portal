import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { todayVN } from '../../../common/utils/date';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MSG = 'Ngày phải có dạng YYYY-MM-DD';
/** Ngày sinh hợp lệ: từ 1940-01-01 đến hôm nay (giờ VN) – khớp kiểm tra ở web */
@ValidatorConstraint({ name: 'birthDate' })
class BirthDateRule implements ValidatorConstraintInterface {
  validate(v: unknown) {
    return typeof v === 'string' && v >= '1940-01-01' && v <= todayVN();
  }
  defaultMessage() {
    return 'Ngày sinh không hợp lệ';
  }
}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Chuỗi rỗng -> null để xoá giá trị */
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? (value.trim() === '' ? null : value.trim()) : value;

export class UpdateProfileDto {
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

  @ApiPropertyOptional({ example: '1998-05-20' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: DATE_MSG })
  @Validate(BirthDateRule)
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  locationId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(200)
  headline?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(5000)
  summary?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'VND / tháng' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000_000)
  expectedSalary?: number | null;

  @ApiPropertyOptional({ description: 'Cho phép nhà tuyển dụng tìm thấy hồ sơ' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class EducationDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên trường' })
  @MaxLength(200)
  school!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(150)
  major?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(100)
  degree?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: DATE_MSG })
  startDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: DATE_MSG })
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
export class UpdateEducationDto extends PartialType(EducationDto) {}

export class ExperienceDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên công ty' })
  @MaxLength(200)
  companyName!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập vị trí' })
  @MaxLength(150)
  position!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: DATE_MSG })
  startDate?: string | null;

  @ApiPropertyOptional({ description: 'Để trống = đang làm' })
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @Matches(DATE, { message: DATE_MSG })
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToNull)
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
export class UpdateExperienceDto extends PartialType(ExperienceDto) {}

export class UpdateSkillsDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMaxSize(30, { message: 'Tối đa 30 kỹ năng' })
  @Type(() => Number)
  @IsInt({ each: true })
  skillIds!: number[];
}
