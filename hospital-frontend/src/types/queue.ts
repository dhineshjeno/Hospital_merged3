export interface QueueEntry {
  id: number;
  tokenNumber: number;
  patientName: string;
  priority: 'normal' | 'emergency';
  status: 'waiting' | 'called' | 'completed';
  checkedInAt: string;
  hospitalId: number;
}

export interface QueueListResponse { queue: QueueEntry[]; }
export interface QueueResponse { entry: QueueEntry; }
export interface CheckInRequest {
  patientName: string;
  priority: 'normal' | 'emergency';
}
export interface UpdateQueueStatusRequest {
  status: 'waiting' | 'called' | 'completed';
}