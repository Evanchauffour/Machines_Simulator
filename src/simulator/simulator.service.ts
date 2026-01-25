import { Injectable } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { Convoyeur } from './types/convoyeur';
import { Imprimante3D } from './types/imprimante3d';

@Injectable()
export class SimulatorService {
  private readonly socket: Socket;
  private readonly machineId = process.env.MACHINE_ID || 'machine-default';
  private readonly machineType = process.env.MACHINE_TYPE || 'convoyeur';
  private instance: Convoyeur | Imprimante3D;

  constructor() {
    this.socket = io(process.env.BACKEND_URL || '', {
      auth: {
        machineId: this.machineId,
        machineType: this.machineType,
      },
    });
  }

  start() {
    this.socket.on('connect', () => {
      console.log(`Connected as ${this.machineId} (type: ${this.machineType})`);

      switch (this.machineType) {
        case 'convoyeur':
        case 'convoyeur-bande':
          this.instance = new Convoyeur(this.machineId, this.socket);
          break;
        case 'imprimante3d':
        case 'imprimante-3d':
          this.instance = new Imprimante3D(this.machineId, this.socket);
          break;
        default:
          console.error(`Type de machine inconnu : ${this.machineType}`);
          console.log('Types disponibles: convoyeur, imprimante3d');
          process.exit(1);
      }

      this.instance.start();
    });
  }
}
