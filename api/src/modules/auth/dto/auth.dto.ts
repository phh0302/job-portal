import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
const PASSWORD_MSG = 'Mật khẩu 8–64 ký tự, gồm cả chữ và số';
const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'uv.moi@example.com' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'Matkhau123' })
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  password!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên' })
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ enum: [UserRole.CANDIDATE, UserRole.EMPLOYER] })
  @IsIn([UserRole.CANDIDATE, UserRole.EMPLOYER], { message: 'Vai trò không hợp lệ' })
  role!: UserRole.CANDIDATE | UserRole.EMPLOYER;
}

export class LoginDto {
  @ApiProperty({ example: 'uv1@demo.local' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: 'Demo@123' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu' })
  password!: string;
}

export class EmailDto {
  @ApiProperty()
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}

export class TokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Vui lòng nhập mật khẩu hiện tại' })
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_RULE, { message: PASSWORD_MSG })
  newPassword!: string;
}
