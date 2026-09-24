import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppController } from '@/app.controller';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string | string[]> = {
                'app.name': 'expert-listing',
                'app.apiPrefix': 'api',
                'app.apiVersion': '1',
                'app.corsOrigins': [],
              };

              return values[key];
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api (GET)', async () => {
    const httpServer = app.getHttpServer() as unknown as Parameters<typeof request>[0];

    await request(httpServer)
      .get('/api')
      .expect(200)
      .expect(({ body }) => {
        expect(body.success).toBe(true);
        expect(body.data.name).toBe('expert-listing');
      });
  });
});
