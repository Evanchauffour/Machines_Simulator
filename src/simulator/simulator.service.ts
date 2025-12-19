import { Injectable } from '@nestjs/common';
import * as io from 'socket.io-client';
import { Convoyeur } from './types/convoyeur';
import { Presse } from './types/press';

@Injectable()
export class SimulatorService {
  private socket;
  private machineId = process.env.MACHINE_ID || 'machine-default';
  private machineType = process.env.MACHINE_TYPE || 'convoyeur';
  private instance;

  constructor() {
    this.socket = io.connect(process.env.BACKEND_URL);
  }

  start() {
    this.socket.on('connect', () => {
      console.log(`Connected as ${this.machineId}`);

      switch (this.machineType) {
        case 'convoyeur':
          this.instance = new Convoyeur(this.machineId, this.socket);
          break;
        case 'presse':
          this.instance = new Presse(this.machineId, this.socket);
          break;
        default:
          console.error(`Type de machine inconnu : ${this.machineType}`);
          process.exit(1);
      }

      this.instance.start();
    });
  }
}
