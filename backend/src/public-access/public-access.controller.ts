import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { VerifyPublicAccessCodeDto } from './dto/verify-public-access-code.dto';
import { PublicAccessCodeService } from './public-access-code.service';

@Controller('public/decision-access/:token')
export class PublicAccessController {
  constructor(private readonly publicAccessService: PublicAccessCodeService) {}

  @Get()
  inspect(@Param('token') token: string, @Req() request: Request) {
    return this.publicAccessService.inspect(token, request);
  }

  @Post('verify')
  verify(
    @Param('token') token: string,
    @Body() dto: VerifyPublicAccessCodeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publicAccessService.verify(token, dto.code, request, response);
  }

  @Post('send-code')
  sendCode(@Param('token') token: string) {
    return this.publicAccessService.sendCode(token);
  }

  @Post('forget')
  forget(
    @Param('token') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.publicAccessService.forget(token, request, response);
  }
}
