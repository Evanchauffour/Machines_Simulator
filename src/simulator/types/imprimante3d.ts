import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'finished' | 'error';
type AlertType = 'manque_matiere' | 'fini' | 'panne' | null;

interface Imprimante3DData {
  progression: number; // en pourcentage (0-100)
  tempsPasse: number; // en secondes
  tempsRestant: number; // en secondes (estimé)
  statut: MachineStatus;
  alertes: AlertType[];
}

export class Imprimante3D {
  private statut: MachineStatus = 'stopped';
  private progression: number = 0;
  private tempsDebut: number | null = null;
  private dureeTotale: number = 3600; // 1 heure par défaut (en secondes)
  private precision: number = 0.1; // précision de l'impression (mm)
  private matierePremiere: number = 100; // pourcentage de matière première (0-100)
  private panneSimulee: boolean = false;
  private manqueMatiere: boolean = false;

  constructor(
    private id: string,
    private socket: Socket,
  ) {
    this.setupCommandListeners();
  }

  private setupCommandListeners() {
    // Commande Marche/Arrêt
    this.socket.on(`machine:command:${this.id}:start`, () => {
      if (
        !this.panneSimulee &&
        !this.manqueMatiere &&
        this.matierePremiere > 0
      ) {
        this.statut = 'running';
        this.tempsDebut = Date.now();
        console.log(`[${this.id}] Impresson démarrée`);
      }
    });

    this.socket.on(`machine:command:${this.id}:stop`, () => {
      this.statut = 'stopped';
      console.log(`[${this.id}] Impression arrêtée`);
    });

    // Commande Réglage de la précision
    this.socket.on(
      `machine:command:${this.id}:precision`,
      (data: { precision: number }) => {
        if (data.precision > 0 && data.precision <= 0.5) {
          this.precision = data.precision;
          // Plus la précision est élevée (valeur basse), plus c'est long
          this.dureeTotale = 3600 / this.precision;
          console.log(`[${this.id}] Précision changée à ${this.precision} mm`);
        }
      },
    );

    // Commande Simuler un manque de matière première
    this.socket.on(`machine:command:${this.id}:manque_matiere`, () => {
      this.manqueMatiere = true;
      this.matierePremiere = 0;
      if (this.statut === 'running') {
        this.statut = 'error';
      }
      console.log(`[${this.id}] Manque de matière première simulé`);
    });

    // Commande Rajouter de la matière première
    this.socket.on(
      `machine:command:${this.id}:ajouter_matiere`,
      (data?: { quantite?: number }) => {
        const quantite = data?.quantite || 100;
        this.matierePremiere = Math.min(100, this.matierePremiere + quantite);
        this.manqueMatiere = false;

        if (this.statut === 'error' && this.manqueMatiere === false) {
          this.statut = 'running';
        }
        console.log(
          `[${this.id}] Matière première ajoutée: ${this.matierePremiere}%`,
        );
      },
    );

    // Commande Simuler une panne
    this.socket.on(`machine:command:${this.id}:panne`, () => {
      this.panneSimulee = true;
      this.statut = 'error';
      console.log(`[${this.id}] Panne simulée`);
    });
  }

  private generateData(): Imprimante3DData {
    // Calcul de la progression si en cours d'impression
    if (
      this.statut === 'running' &&
      this.tempsDebut &&
      !this.panneSimulee &&
      !this.manqueMatiere
    ) {
      const tempsEcoule = (Date.now() - this.tempsDebut) / 1000; // en secondes
      this.progression = Math.min(100, (tempsEcoule / this.dureeTotale) * 100);

      // Consommation de matière première (proportionnelle à la progression)
      const consommation = (this.progression / 100) * 20; // consomme 20% au total
      this.matierePremiere = Math.max(0, 100 - consommation);

      // Si la matière première est épuisée
      if (this.matierePremiere <= 0) {
        this.manqueMatiere = true;
        this.statut = 'error';
      }

      // Si la progression atteint 100%
      if (this.progression >= 100) {
        this.statut = 'finished';
        this.progression = 100;
      }
    }

    // Calcul du temps passé et restant
    const tempsPasse = this.tempsDebut
      ? Math.floor((Date.now() - this.tempsDebut) / 1000)
      : 0;

    const tempsRestant =
      this.statut === 'running'
        ? Math.max(0, Math.floor(this.dureeTotale - tempsPasse))
        : 0;

    // Détection des alertes
    const alertes: AlertType[] = [];

    if (this.panneSimulee) {
      alertes.push('panne');
    }

    if (this.manqueMatiere || this.matierePremiere <= 0) {
      alertes.push('manque_matiere');
    }

    if (this.statut === 'finished') {
      alertes.push('fini');
    }

    return {
      progression: Math.round(this.progression * 100) / 100,
      tempsPasse,
      tempsRestant,
      statut: this.statut,
      alertes,
    };
  }

  start() {
    setInterval(() => {
      const data = this.generateData();

      this.socket.emit('sensor_data', {
        machineCode: this.id,
        status: data.statut,
        sensors: {
          progression: data.progression,
          tempsPasse: data.tempsPasse,
          tempsRestant: data.tempsRestant,
          matierePremiere: this.matierePremiere,
        },
        timestamp: new Date().toISOString(),
      });
    }, 2000);
  }
}
