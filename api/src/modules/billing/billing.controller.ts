import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { BillingService } from './billing.service';
import { CancelOrderDto, CreateOrderDto, OrdersQuery, UpdatePlanDto } from './dto/billing.dto';

@ApiTags('billing')
@Public()
@Controller('plans')
export class PublicPlansController {
  constructor(private readonly service: BillingService) {}

  @Get()
  list() {
    return this.service.publicPlans();
  }
}

@ApiTags('billing')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer')
export class EmployerBillingController {
  constructor(private readonly service: BillingService) {}

  @Get('billing')
  overview(@CurrentUser() u: AuthUser) {
    return this.service.overview(u.id);
  }

  @Post('billing/orders')
  @RateLimit({ limit: 10, windowSec: 3600 })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateOrderDto) {
    return this.service.createOrder(u.id, dto.planId);
  }

  @Post('billing/orders/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelOwnOrder(u.id, id);
  }

  @Post('jobs/:id/feature')
  @HttpCode(200)
  feature(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.featureJob(u.id, id);
  }

  @Post('candidates/:id/unlock')
  @HttpCode(200)
  @RateLimit({ limit: 60, windowSec: 600 })
  unlock(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.unlockCandidate(u.id, id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/billing')
export class AdminBillingController {
  constructor(private readonly service: BillingService) {}

  @Get('orders')
  orders(@Query() q: OrdersQuery) {
    return this.service.adminOrders(q);
  }

  @Post('orders/:id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.confirm(u, id, req.ip);
  }

  @Post('orders/:id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CancelOrderDto, @Req() req: Request) {
    return this.service.adminCancel(u, id, dto.reason, req.ip);
  }

  @Get('plans')
  plans() {
    return this.service.adminPlans();
  }

  @Put('plans/:id')
  updatePlan(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePlanDto, @Req() req: Request) {
    return this.service.updatePlan(u, id, dto, req.ip);
  }
}
