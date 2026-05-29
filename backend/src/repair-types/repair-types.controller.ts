import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateRepairTypeDto } from './dto/create-repair-type.dto';
import { UpdateRepairTypeDto } from './dto/update-repair-type.dto';
import { RepairTypesService } from './repair-types.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('repair-types')
export class RepairTypesController {
  constructor(private readonly repairTypesService: RepairTypesService) {}

  @Get()
  findAll() {
    return this.repairTypesService.findAll();
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateRepairTypeDto) {
    return this.repairTypesService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRepairTypeDto) {
    return this.repairTypesService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.repairTypesService.remove(id);
  }
}
