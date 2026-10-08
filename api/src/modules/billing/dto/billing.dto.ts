import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { OrderStatus } from '../../../common/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateOrderDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  planId!: number;
}

export class OrdersQuery extends PaginationDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Mã đơn / tên công ty' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdatePlanDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên gói' })
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  price!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  featuredCredits!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  contactCredits!: number;

  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
