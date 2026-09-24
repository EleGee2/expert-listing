import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticatedUser } from '../types/authenticated-user';
import { RequestWithId } from '../types/request-with-id';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<RequestWithId>();

    if (!request.user) {
      throw new Error('CurrentUser decorator used without an authenticated request');
    }

    return request.user;
  },
);
