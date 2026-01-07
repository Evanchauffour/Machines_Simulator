import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SimulatorService } from './simulator/simulator.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const simulatorService = app.get(SimulatorService);
  simulatorService.start();
}
bootstrap();
