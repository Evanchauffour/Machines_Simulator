import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'error';
type ConveyorDirection = 'forward' | 'backward';
type AlertType = 'poids' | 'vitesse' | 'panne' | null;

interface ConvoyeurData {
  vitesse: number; // en m/s
  sens: ConveyorDirection;
  poidsTotal: number; // en kg
  statut: MachineStatus;
  alertes: AlertType[];
  panneSimulee: boolean;
}

export class Convoyeur {
  private vitesse: number = 1.5; // m/s par défaut
  private sens: ConveyorDirection = 'forward';
  private statut: MachineStatus = 'stopped';
  private readonly poidsMax: number = 1000; // kg - seuil d'alerte
  private readonly vitesseMax: number = 3; // m/s - seuil d'alerte
  private panneSimulee: boolean = false;

  constructor(
    private readonly id: string,
    private readonly socket: Socket,
  ) {
    this.setupCommandListeners();
  }

  private setupCommandListeners() {
    // Commande Marche/Arrêt
    this.socket.on(`machine:command:${this.id}:start`, () => {
      if (!this.panneSimulee) {
        this.statut = 'running';
        console.log(`[${this.id}] Machine démarrée`);
      }
    });

    this.socket.on(`machine:command:${this.id}:stop`, () => {
      this.statut = 'stopped';
      console.log(`[${this.id}] Machine arrêtée`);
    });

    // Commande Changer la vitesse
    this.socket.on(
      `machine:command:${this.id}:vitesse`,
      (data: { vitesse: number }) => {
        if (data.vitesse >= 0 && data.vitesse <= 5) {
          this.vitesse = data.vitesse;
          console.log(`[${this.id}] Vitesse changée à ${this.vitesse} m/s`);
        }
      },
    );

    // Commande Inverser le sens
    this.socket.on(`machine:command:${this.id}:inverser`, () => {
      this.sens = this.sens === 'forward' ? 'backward' : 'forward';
      console.log(`[${this.id}] Sens inversé: ${this.sens}`);
    });

    // Commande Simuler une panne
    this.socket.on(`machine:command:${this.id}:panne`, () => {
      this.panneSimulee = true;
      this.statut = 'error';
      console.log(`[${this.id}] Panne simulée`);
    });

    // Commande Arrêter simulation - annule les simulations sans changer le statut
    this.socket.on(`machine:command:${this.id}:reset`, () => {
      this.panneSimulee = false;
      // Si la machine était en erreur (panne), on la remet en stopped
      if (this.statut === 'error') {
        this.statut = 'stopped';
        this.vitesse = 0;
      }
      console.log(`[${this.id}] Simulation annulée - statut: ${this.statut}`);
    });
  }

  private generateData(): ConvoyeurData {
    // Génération du poids total (fluctuations réalistes)
    const poidsTotal = 200 + Math.random() * 800; // entre 200 et 1000 kg

    // Génération de la vitesse (peut varier légèrement si en marche)
    let vitesseActuelle = 0;
    if (this.statut === 'running' && !this.panneSimulee) {
      vitesseActuelle = this.vitesse * (0.95 + Math.random() * 0.1); // variation de ±5%
    }

    // Détection des alertes
    const alertes: AlertType[] = [];

    if (this.panneSimulee) {
      alertes.push('panne');
    }

    if (poidsTotal > this.poidsMax) {
      alertes.push('poids');
    }

    if (vitesseActuelle > this.vitesseMax) {
      alertes.push('vitesse');
    }

    // Si panne, mettre statut en error
    if (this.panneSimulee) {
      this.statut = 'error';
    }

    return {
      vitesse: Math.round(vitesseActuelle * 100) / 100,
      sens: this.sens,
      poidsTotal: Math.round(poidsTotal * 100) / 100,
      statut: this.statut,
      alertes,
      panneSimulee: this.panneSimulee,
    };
  }

  start() {
    setInterval(() => {
      const data = this.generateData();

      this.socket.emit('sensor_data', {
        machineCode: this.id,
        status: data.statut,
        sensors: {
          vitesse: data.vitesse,
          poidsTotal: data.poidsTotal,
          sens: data.sens === 'forward' ? 1 : -1,
          panneSimulee: data.panneSimulee,
        },
        timestamp: new Date().toISOString(),
      });
    }, 2000);
  }
}
