import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicAccessCodeService } from '../public-access/public-access-code.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { VehicleCheckConversationsService } from './vehicle-check-conversations.service';

@Controller('public/vehicle-check-conversations/:token')
export class VehicleCheckConversationsPublicController {
  constructor(
    private readonly conversationsService: VehicleCheckConversationsService,
    private readonly publicAccessService: PublicAccessCodeService,
  ) {}

  @Get()
  async findOne(@Param('token') token: string, @Req() request: Request) {
    const access = await this.publicAccessService.requireAccess(token, request);
    return this.conversationsService.findOne(
      access.vehicleCheckId,
      access.user,
    );
  }

  @Post('messages')
  async createMessage(
    @Param('token') token: string,
    @Body() dto: CreateMessageDto,
    @Req() request: Request,
  ) {
    const access = await this.publicAccessService.requireAccess(token, request);
    return this.conversationsService.createMessage(
      access.vehicleCheckId,
      dto,
      access.user,
    );
  }

  @Post('read')
  async markRead(@Param('token') token: string, @Req() request: Request) {
    const access = await this.publicAccessService.requireAccess(token, request);
    return this.conversationsService.markRead(
      access.vehicleCheckId,
      access.user,
    );
  }

  @Post('attachment-signature')
  async attachmentSignature(
    @Param('token') token: string,
    @Req() request: Request,
  ) {
    const access = await this.publicAccessService.requireAccess(token, request);
    return this.conversationsService.attachmentSignature(
      access.vehicleCheckId,
      access.user,
    );
  }

  @Patch('status')
  async updateStatus(
    @Param('token') token: string,
    @Body() dto: UpdateConversationStatusDto,
    @Req() request: Request,
  ) {
    const access = await this.publicAccessService.requireAccess(token, request);
    return this.conversationsService.updateStatus(
      access.vehicleCheckId,
      dto,
      access.user,
    );
  }
}
