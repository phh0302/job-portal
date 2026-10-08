import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const CV_TEMPLATES = ['classic', 'modern', 'minimal'] as const;

export class CvSettingsDto {
  @ApiProperty({ enum: CV_TEMPLATES })
  @IsIn(CV_TEMPLATES, { message: 'Mẫu CV không hợp lệ' })
  template!: (typeof CV_TEMPLATES)[number];

  @ApiProperty({ example: '#2563eb' })
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Màu không hợp lệ' })
  accent!: string;

  @ApiProperty()
  @IsBoolean()
  showPhoto!: boolean;

  @ApiProperty()
  @IsBoolean()
  showBirthDate!: boolean;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  certificates!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  languages!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  interests!: string;
}
