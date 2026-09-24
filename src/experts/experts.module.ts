import { Module } from '@nestjs/common';

import { ExpertsController } from './experts.controller';
import { ExpertsService } from './experts.service';
import { FavoritesController } from './favorites.controller';

@Module({
  controllers: [ExpertsController, FavoritesController],
  providers: [ExpertsService],
  exports: [ExpertsService],
})
export class ExpertsModule {}
