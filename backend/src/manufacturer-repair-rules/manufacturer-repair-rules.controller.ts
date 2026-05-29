import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateManufacturerRepairRuleDto } from './dto/create-manufacturer-repair-rule.dto';
import { UpdateManufacturerRepairRuleDto } from './dto/update-manufacturer-repair-rule.dto';
import { ManufacturerRepairRulesService } from './manufacturer-repair-rules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ManufacturerRepairRulesController {
  constructor(private readonly manufacturerRepairRulesService: ManufacturerRepairRulesService) {}

  @Get('manufacturers/:manufacturerId/repair-rules')
  findByManufacturer(@Param('manufacturerId') manufacturerId: string) {
    return this.manufacturerRepairRulesService.findByManufacturer(manufacturerId);
  }

  @Roles(Role.ADMIN)
  @Post('manufacturers/:manufacturerId/repair-rules')
  create(@Param('manufacturerId') manufacturerId: string, @Body() dto: CreateManufacturerRepairRuleDto) {
    return this.manufacturerRepairRulesService.create(manufacturerId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('manufacturer-repair-rules/:id')
  update(@Param('id') id: string, @Body() dto: UpdateManufacturerRepairRuleDto) {
    return this.manufacturerRepairRulesService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('manufacturer-repair-rules/:id')
  remove(@Param('id') id: string) {
    return this.manufacturerRepairRulesService.remove(id);
  }
}
