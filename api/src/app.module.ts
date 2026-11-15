import { Module } from '@nestjs/common';
import { DemoStoreService } from './demo/demo-store.service';
import { RenachController } from './renach/renach.controller';
import { RenachService } from './renach/renach.service';

@Module({
  controllers: [RenachController],
  providers: [DemoStoreService, RenachService],
})
export class AppModule {}
