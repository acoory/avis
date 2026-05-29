import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '../../prisma/generated/client.cjs';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpsertManufacturerRuleDto } from './dto/upsert-manufacturer-rule.dto';
import { ManufacturerRulesService } from './manufacturer-rules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('manufacturers/:manufacturerId/rules')
export class ManufacturerRulesController {
  constructor(private readonly manufacturerRulesService: ManufacturerRulesService) {}

  @Get()
  findOne(@Param('manufacturerId') manufacturerId: string) {
    return this.manufacturerRulesService.findOne(manufacturerId);
  }

  @Roles(Role.ADMIN)
  @Post()
  upsert(@Param('manufacturerId') manufacturerId: string, @Body() dto: UpsertManufacturerRuleDto) {
    return this.manufacturerRulesService.upsert(manufacturerId, dto);
  }

  @Roles(Role.ADMIN)
  @Patch()
  update(@Param('manufacturerId') manufacturerId: string, @Body() dto: UpsertManufacturerRuleDto) {
    return this.manufacturerRulesService.upsert(manufacturerId, dto);
  }
}
