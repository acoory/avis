import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateConversationParticipantsDto } from './dto/update-conversation-participants.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { VehicleCheckConversationsService } from './vehicle-check-conversations.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicle-checks/:vehicleCheckId/conversation')
export class VehicleCheckConversationsController {
  constructor(
    private readonly conversationsService: VehicleCheckConversationsService,
  ) {}

  @Get()
  findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
  ) {
    return this.conversationsService.findOne(vehicleCheckId, user);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversationsService.create(vehicleCheckId, dto, user);
  }

  @Post('messages')
  createMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.conversationsService.createMessage(vehicleCheckId, dto, user);
  }

  @Post('read')
  markRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
  ) {
    return this.conversationsService.markRead(vehicleCheckId, user);
  }

  @Post('attachment-signature')
  attachmentSignature(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
  ) {
    return this.conversationsService.attachmentSignature(vehicleCheckId, user);
  }

  @Patch('participants')
  updateParticipants(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
    @Body() dto: UpdateConversationParticipantsDto,
  ) {
    return this.conversationsService.updateParticipants(
      vehicleCheckId,
      dto,
      user,
    );
  }

  @Patch('status')
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('vehicleCheckId') vehicleCheckId: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.conversationsService.updateStatus(vehicleCheckId, dto, user);
  }
}
