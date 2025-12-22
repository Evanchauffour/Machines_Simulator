import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'error';
type AlertType = 'panne' | 'temperature' | null;

interface CompresseurFrigorifiqueData {
  temperature: number; // en °C
  statut: MachineStatus;
  alertes: AlertType[];
}

export class CompresseurFrigorifique {
  private temperatureCible: number = 5; // °C par défaut
  private temperatureActuelle: number = 20; // température ambiante au démarrage
  private statut: MachineStatus = 'stopped';
  private panneSimulee: boolean = false;
  private fuiteSimulee: boolean = false;
  private temperatureMin: number = -10; // seuil d'alerte température basse
  private temperatureMax: number = 10; // seuil d'alerte température haute

  constructor(
    private id: string,
    private socket: Socket,
  ) {
    this.setupCommandListeners();
  }

  private setupCommandListeners() {
    // Commande Marche/Arrêt
    this.socket.on(`machine:command:${this.id}:start`, () => {
      if (!this.panneSimulee) {
        this.statut = 'running';
        console.log(`[${this.id}] Compresseur démarré`);
      }
    });

    this.socket.on(`machine:command:${this.id}:stop`, () => {
      this.statut = 'stopped';
      console.log(`[${this.id}] Compresseur arrêté`);
    });

    // Commande Modifier la température
    this.socket.on(
      `machine:command:${this.id}:temperature`,
      (data: { temperature: number }) => {
        if (data.temperature >= -20 && data.temperature <= 20) {
          this.temperatureCible = data.temperature;
          console.log(
            `[${this.id}] Température cible changée à ${this.temperatureCible}°C`,
          );
        }
      },
    );

    // Commande Simuler une fuite
    this.socket.on(`machine:command:${this.id}:fuite`, () => {
      this.fuiteSimulee = true;
      console.log(`[${this.id}] Fuite simulée`);
    });

    // Commande Simuler une panne
    this.socket.on(`machine:command:${this.id}:panne`, () => {
      this.panneSimulee = true;
      this.statut = 'error';
      console.log(`[${this.id}] Panne simulée`);
    });
  }

  private generateData(): CompresseurFrigorifiqueData {
    // Simulation de la température
    if (this.statut === 'running' && !this.panneSimulee) {
      // Le compresseur fait baisser la température vers la cible
      const difference = this.temperatureCible - this.temperatureActuelle;
      const variation = difference * 0.05; // convergence progressive

      // Si fuite simulée, la température remonte
      if (this.fuiteSimulee) {
        this.temperatureActuelle += 0.5; // remontée lente de température
      } else {
        this.temperatureActuelle += variation;
      }

      // Limites physiques
      this.temperatureActuelle = Math.max(
        -20,
        Math.min(30, this.temperatureActuelle),
      );
    } else {
      // Si arrêté, la température remonte progressivement vers l'ambiante
      const temperatureAmbiante = 20;
      const difference = temperatureAmbiante - this.temperatureActuelle;
      this.temperatureActuelle += difference * 0.01;
    }

    // Détection des alertes
    const alertes: AlertType[] = [];

    if (this.panneSimulee) {
      alertes.push('panne');
    }

    // Alerte si température hors des seuils acceptables
    if (
      this.temperatureActuelle < this.temperatureMin ||
      this.temperatureActuelle > this.temperatureMax
    ) {
      alertes.push('temperature');
    }

    // Si panne, mettre statut en error
    if (this.panneSimulee) {
      this.statut = 'error';
    }

    return {
      temperature: Math.round(this.temperatureActuelle * 100) / 100,
      statut: this.statut,
      alertes,
    };
  }

  start() {
    // Envoi des données toutes les 2 secondes (24/24h)
    setInterval(() => {
      const data = this.generateData();

      this.socket.emit('machine:data', {
        id: this.id,
        type: 'compresseur-frigorifique',
        timestamp: Date.now(),
        payload: data,
      });
    }, 2000);
  }
}
