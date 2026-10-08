import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ChangeRoleDto, InvitationTokenDto, InviteDto } from './dto/team.dto';
import { EmployerTeamService } from './team.service';

@ApiTags('employer')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer/team')
export class EmployerTeamController {
  constructor(private readonly team: EmployerTeamService) {}

  @Get()
  get(@CurrentUser() u: AuthUser) {
    return this.team.team(u.id);
  }

  @Post('invitations')
  @RateLimit({ limit: 20, windowSec: 3600 })
  invite(@CurrentUser() u: AuthUser, @Body() dto: InviteDto) {
    return this.team.invite(u.id, dto.email, dto.role);
  }

  @Delete('invitations/:id')
  @HttpCode(204)
  revoke(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.team.revokeInvitation(u.id, id);
  }

  @Post('invitations/accept')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 600 })
  accept(@CurrentUser() u: AuthUser, @Body() dto: InvitationTokenDto) {
    return this.team.accept(u.id, dto.token);
  }

  @Patch('members/:userId')
  changeRole(@CurrentUser() u: AuthUser, @Param('userId', ParseIntPipe) memberId: number, @Body() dto: ChangeRoleDto) {
    return this.team.changeRole(u.id, memberId, dto.role);
  }

  @Delete('members/:userId')
  remove(@CurrentUser() u: AuthUser, @Param('userId', ParseIntPipe) memberId: number) {
    return this.team.removeMember(u.id, memberId);
  }

  @Post('leave')
  @HttpCode(200)
  leave(@CurrentUser() u: AuthUser) {
    return this.team.leave(u.id);
  }
}

/** Xem trước lời mời (trang tham gia, chưa cần đăng nhập) */
@ApiTags('employer')
@Public()
@Controller('team-invitations')
export class TeamInvitationPublicController {
  constructor(private readonly team: EmployerTeamService) {}

  @Get('preview')
  @RateLimit({ limit: 30, windowSec: 600 })
  preview(@Query() q: InvitationTokenDto) {
    return this.team.preview(q.token);
  }
}
