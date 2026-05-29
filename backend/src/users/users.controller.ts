import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findAll(user);
  }

  @Get('managers')
  findManagers(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findManagers(user);
  }

  @Get(':id/collaborators')
  findCollaborators(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.usersService.findCollaborators(id, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.usersService.findOne(id, user);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.usersService.remove(id, user);
  }
}
