export interface RoomType {
  id: string;
  name: string;
  capacity: number;
  amenities: string[];
  basePrice: number;
  description: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  floor: string | number;
  wing: string;
  roomTypeName: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  currentPatientId?: string;
  bedCount: number;
  amenities: string[];
  isEmergencyWard: boolean;
  checkInDate?: string;
  expectedCheckOutDate?: string;
  dailyRate?: number;
}

export interface RoomOccupancyStatus {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  occupancyPercentage: string;
  availabilityPercentage: string;
}