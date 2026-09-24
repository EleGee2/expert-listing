import { Request } from 'express';

import { AuthenticatedUser } from './authenticated-user';

export type RequestWithId = Request & {
  id?: string;
  user?: AuthenticatedUser;
};
