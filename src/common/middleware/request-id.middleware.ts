import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';

import { RequestWithId } from '../types/request-with-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const incomingId = req.header('x-request-id');
    const requestId = incomingId && incomingId.length <= 128 ? incomingId : randomUUID();

    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
