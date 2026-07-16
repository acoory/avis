import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationsService.findForUser(user.sub, query.take);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(id, user.sub);
  }
}
