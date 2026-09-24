import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns API metadata', () => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'app.name': 'expert-listing',
          'app.apiPrefix': 'api',
          'app.apiVersion': '1',
        };

        return values[key];
      }),
    };

    return Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: ConfigService, useValue: config }],
    })
      .compile()
      .then((moduleRef) => {
        const controller = moduleRef.get(AppController);
        expect(controller.getRoot()).toEqual({
          name: 'expert-listing',
          version: '0.1.0',
          docs: '/docs',
          health: '/api/v1/health',
        });
      });
  });
});
