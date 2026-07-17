import authApi from './api';
import type { Room, RoomType, RoomOccupancyStatus } from '../types/room';

interface P2Response<T> {
  success: boolean;
  data: T;
  count?: number;
}

export async function getRoomTypes(): Promise<RoomType[]> {
  const response = await authApi.get<P2Response<RoomType[]>>('/rooms/types');
  return response.data.data;
}

export async function getAvailableRooms(roomTypeId?: string): Promise<Room[]> {
  const params = roomTypeId ? { roomTypeId } : {};
  const response = await authApi.get<P2Response<Room[]>>('/rooms/available', { params });
  return response.data.data;
}

export async function getOccupiedRooms(): Promise<Room[]> {
  const response = await authApi.get<P2Response<Room[]>>('/rooms/occupied');
  return response.data.data;
}

export async function getRoomOccupancyStatus(): Promise<RoomOccupancyStatus> {
  const response = await authApi.get<P2Response<RoomOccupancyStatus>>('/rooms/occupancy-status');
  return response.data.data;
}

export async function getEmergencyWards(): Promise<Room[]> {
  const response = await authApi.get<P2Response<Room[]>>('/rooms/emergency-wards');
  return response.data.data;
}

export async function checkInRoom(data: {
  roomId: string; patientId: string;
  expectedCheckOutDate: string; dailyRate: number;
}): Promise<{ room: Room; reservation: unknown }> {
  const response = await authApi.post<P2Response<{ room: Room; reservation: unknown }>>('/rooms/check-in', {
    roomId: data.roomId,
    patientId: data.patientId,
    expectedCheckOutDate: data.expectedCheckOutDate,
    dailyRate: data.dailyRate,
  });
  return response.data.data;
}

export async function checkOutRoom(roomId: string): Promise<{ room: Room; bill: unknown }> {
  const response = await authApi.post<P2Response<{ room: Room; bill: unknown }>>('/rooms/check-out', { roomId });
  return response.data.data;
}
