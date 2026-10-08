import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const MESSAGE_MAX = 2000;

export class SendMessageDto {
  @ApiProperty({ maxLength: MESSAGE_MAX })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung tin nhắn' })
  @MaxLength(MESSAGE_MAX, { message: `Tin nhắn tối đa ${MESSAGE_MAX} ký tự` })
  body!: string;
}

export class MessagesQuery {
  /** Lấy các tin cũ hơn tin có id này (cuộn lên xem thêm) */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;
}

export class ConversationsQuery extends PaginationDto {}
