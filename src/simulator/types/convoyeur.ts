import { Socket } from 'socket.io-client';

export class Convoyeur {
  constructor(
    private id: string,
    private socket: Socket,
  ) {}

  start() {
    setInterval(() => {
      const payload = {
        vitesse: Math.random() * 3,
        temperature: 30 + Math.random() * 10,
        objetsTransportes: Math.floor(Math.random() * 50),
      };
      console.log('socketId', payload);
      this.socket.emit('machine:data', {
        id: this.socket.id,
        type: 'convoyeur',
        timestamp: Date.now(),
        payload,
      });
    }, 2000);

    this.socket.on(`pressure_changed:${this.id}`, (cmd) => {
      console.log(`Commande reçue pour ${this.id}:`, cmd);
    });
  }
}
