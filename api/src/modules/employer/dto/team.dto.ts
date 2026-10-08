import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { CompanyRole } from '../../../common/enums';

export class InviteDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ enum: CompanyRole, default: CompanyRole.MEMBER })
  @IsEnum(CompanyRole, { message: 'Vai trò không hợp lệ' })
  role: CompanyRole = CompanyRole.MEMBER;
}

export class InvitationTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  token!: string;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: CompanyRole })
  @IsEnum(CompanyRole, { message: 'Vai trò không hợp lệ' })
  role!: CompanyRole;
}
