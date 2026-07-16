import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { PublicAccessCodeService } from './public-access-code.service';
import { PublicAccessController } from './public-access.controller';

@Module({
  imports: [JwtModule.register({}), MailModule],
  controllers: [PublicAccessController],
  providers: [PublicAccessCodeService],
  exports: [PublicAccessCodeService],
})
export class PublicAccessModule {}
