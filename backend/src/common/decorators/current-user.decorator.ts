import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../../prisma/generated/client.cjs';

export type CurrentUserPayload = {
  sub: string;
  email: string;
  role: Role;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserPayload }>();
    return request.user;
  },
);
