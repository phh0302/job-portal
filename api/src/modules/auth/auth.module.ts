import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserToken } from './entities/user-token.entity';
import { TokenService } from './token.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, UserToken])],
  controllers: [AuthController],
  providers: [AuthService, TokenService],
  exports: [TokenService],
})
export class AuthModule {}
