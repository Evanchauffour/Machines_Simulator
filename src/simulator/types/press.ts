import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'error';
type AlertType = 'panne' | 'pression' | 'fuite' | null;

interface PresseHydrauliqueData {
  pression: number;
  statut: MachineStatus;
  alertes: AlertType[];
}

export class PresseHydraulique {
  // Propriétés privées
  // Constructor
  // setupCommandListeners()
  // generateData()
  // start()
}
