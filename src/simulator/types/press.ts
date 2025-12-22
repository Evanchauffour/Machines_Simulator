import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'finished' | 'error';
type AlertType = 'panne' | 'pression' | 'fuite' | 'fini' | null;

interface PresseHydrauliqueData {
  pression: number; // en bar
  statut: MachineStatus;
  alertes: AlertType[];
}

export class PresseHydraulique {
  private pressionCible: number = 50; // bar par défaut
  private pressionActuelle: number = 0;
  private statut: MachineStatus = 'stopped';
  private panneSimulee: boolean = false;
  private fuiteSimulee: boolean = false;
  private readonly pressionMax: number = 100; // seuil d'alerte
  private readonly pressionMin: number = 10; // pression minimale de fonctionnement
  private cyclesCompletes: number = 0;
  private cycleEnCours: boolean = false;

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
        this.cycleEnCours = true;
        console.log(`[${this.id}] Presse démarrée`);
      }
    });

    this.socket.on(`machine:command:${this.id}:stop`, () => {
      this.statut = 'stopped';
      this.cycleEnCours = false;
      console.log(`[${this.id}] Presse arrêtée`);
    });

    // Commande Gérer la pression
    this.socket.on(
      `machine:command:${this.id}:pression`,
      (data: { pression: number }) => {
        if (data.pression >= 0 && data.pression <= 150) {
          this.pressionCible = data.pression;
          console.log(
            `[${this.id}] Pression cible changée à ${this.pressionCible} bar`,
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

  private generateData(): PresseHydrauliqueData {
    // Simulation de la pression
    if (this.statut === 'running' && !this.panneSimulee && this.cycleEnCours) {
      // La presse augmente progressivement la pression vers la cible
      const difference = this.pressionCible - this.pressionActuelle;
      const variation = difference * 0.1; // convergence progressive

      // Si fuite simulée, la pression baisse
      if (this.fuiteSimulee) {
        this.pressionActuelle = Math.max(0, this.pressionActuelle - 2); // perte de pression
      } else {
        this.pressionActuelle += variation;
      }

      // Limites physiques
      this.pressionActuelle = Math.max(0, Math.min(150, this.pressionActuelle));

      // Simulation d'un cycle complet (montée puis descente)
      if (this.pressionActuelle >= this.pressionCible * 0.95) {
        // Cycle presque terminé, on baisse la pression
        this.pressionActuelle = Math.max(0, this.pressionActuelle - 5);

        if (this.pressionActuelle <= 5) {
          // Cycle terminé
          this.cyclesCompletes++;
          this.pressionActuelle = 0;

          // Pour simuler plusieurs cycles, on relance automatiquement
          if (this.statut === 'running') {
            this.cycleEnCours = true;
          }
        }
      }
    } else if (this.statut === 'stopped') {
      // Si arrêtée, la pression redescend à zéro
      this.pressionActuelle = Math.max(0, this.pressionActuelle - 5);
    }

    // Détection des alertes
    const alertes: AlertType[] = [];

    if (this.panneSimulee) {
      alertes.push('panne');
    }

    // Alerte si pression trop élevée
    if (this.pressionActuelle > this.pressionMax) {
      alertes.push('pression');
    }

    // Alerte si fuite détectée
    if (this.fuiteSimulee) {
      alertes.push('fuite');
    }

    // Note: Pour "fini", on pourrait ajouter une condition comme un nombre de cycles max
    // Mais selon les spécifications, "fini" semble être pour l'impression 3D
    // On le garde pour cohérence si besoin

    // Si panne, mettre statut en error
    if (this.panneSimulee) {
      this.statut = 'error';
    }

    return {
      pression: Math.round(this.pressionActuelle * 100) / 100,
      statut: this.statut,
      alertes,
    };
  }

  start() {
    // Envoi des données toutes les 2 secondes
    setInterval(() => {
      const data = this.generateData();

      this.socket.emit('machine:data', {
        id: this.id,
        type: 'presse-hydraulique',
        timestamp: Date.now(),
        payload: data,
      });
    }, 2000);
  }
}
