import { Socket } from 'socket.io-client';

type MachineStatus = 'running' | 'stopped' | 'error';
type AlertType = 'panne' | 'temperature' | null;

interface CompresseurFrigorifiqueData {
  temperature: number;
  statut: MachineStatus;
  alertes: AlertType[];
}

export class CompresseurFrigorifique {
  // Propriétés privées
  // Constructor
  // setupCommandListeners()
  // generateData()
  // start()
}
