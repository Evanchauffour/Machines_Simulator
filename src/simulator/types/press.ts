import { Socket } from 'socket.io-client';

export class Presse {
  constructor(
    private id: string,
    private socket: Socket,
  ) {}

  start(): void {
    setInterval(() => {
      const payload = {
        pression: 10 + Math.random() * 20,
        cycles: Math.floor(Math.random() * 100),
        temperatureHuile: 50 + Math.random() * 10,
      };
      this.socket.emit('machine:data', {
        id: this.id,
        type: 'presse',
        timestamp: Date.now(),
        payload,
      });
    }, 3000);

    this.socket.on(`machine:command:${this.id}`, (cmd) => {
      console.log(`Commande reçue pour ${this.id}:`, cmd);
    });
  }
}
