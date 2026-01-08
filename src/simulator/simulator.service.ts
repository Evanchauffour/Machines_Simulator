import { Injectable } from '@nestjs/common';
import { Socket, io } from 'socket.io-client';
import { Convoyeur } from './types/convoyeur';
import { PresseHydraulique } from './types/press';
import { Imprimante3D } from './types/imprimante3d';
import { CompresseurFrigorifique } from './types/compresseur-frigorifique';

@Injectable()
export class SimulatorService {
  private readonly socket: Socket;
  private readonly machineId = process.env.MACHINE_ID || 'machine-default';
  private readonly machineType = process.env.MACHINE_TYPE || 'convoyeur';
  private instance:
    | Convoyeur
    | PresseHydraulique
    | Imprimante3D
    | CompresseurFrigorifique;

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
        case 'presse':
        case 'presse-hydraulique':
          this.instance = new PresseHydraulique(this.machineId, this.socket);
          break;
        case 'imprimante':
        case 'imprimante-3d':
          this.instance = new Imprimante3D(this.machineId, this.socket);
          break;
        case 'compresseur':
        case 'compresseur-frigorifique':
          this.instance = new CompresseurFrigorifique(
            this.machineId,
            this.socket,
          );
          break;
        default:
          console.error(`Type de machine inconnu : ${this.machineType}`);
          console.log(
            'Types disponibles: convoyeur, presse-hydraulique, imprimante3d, compresseur-frigorifique',
          );
          process.exit(1);
      }

      this.instance.start();
    });
  }
}
