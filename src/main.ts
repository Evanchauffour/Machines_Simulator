import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SimulatorService } from './simulator/simulator.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const simulatorService = app.get(SimulatorService);
  console.log('BACKEND_URL', process.env.BACKEND_URL);
  simulatorService.start();
}
bootstrap();
