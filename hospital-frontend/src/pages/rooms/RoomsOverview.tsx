import { useEffect, useState } from 'react';
import { BedDouble, Users } from 'lucide-react';
import { getAvailableRooms, getOccupiedRooms, getRoomOccupancyStatus, checkOutRoom } from '../../services/roomService';
import type { Room, RoomOccupancyStatus } from '../../types/room';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatCard from '../../components/StatCard';
import { TableSkeleton } from '../../components/Skeleton';

export default function RoomsOverview() {
  const [available, setAvailable] = useState<Room[]>([]);
  const [occupied, setOccupied] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomOccupancyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'available' | 'occupied'>('available');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([getAvailableRooms(), getOccupiedRooms(), getRoomOccupancyStatus()])
      .then(([a, o, s]) => { setAvailable(a); setOccupied(o); setStats(s); })
      .catch(() => setError('Could not load room data'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCheckOut(roomId: string, roomNumber: string) {
    if (!window.confirm(`Check out patient from room ${roomNumber}?`)) return;
    setCheckingOut(roomId);
    try {
      await checkOutRoom(roomId);
      load();
    } catch {
      setError('Could not check out — please try again');
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Rooms</h1>
      {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}
      {isLoading && <TableSkeleton />}
      {!isLoading && !error && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total rooms" value={stats.totalRooms} icon={<BedDouble size={18} />} />
            <StatCard label="Available" value={stats.availableRooms} icon={<BedDouble size={18} />} />
            <StatCard label="Occupied" value={stats.occupiedRooms} icon={<Users size={18} />} />
            <StatCard label="Occupancy" value={`${stats.occupancyPercentage}%`} icon={<Users size={18} />} />
          </div>

          <div className="flex gap-2 mb-4">
            {(['available', 'occupied'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl border text-sm font-medium transition capitalize ${tab === t ? 'border-primary bg-primary/5 text-primary' : 'border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                {t} ({t === 'available' ? available.length : occupied.length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(tab === 'available' ? available : occupied).map((room) => (
              <Card key={room.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{room.roomNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{room.roomTypeName} · Floor {room.floor} · Wing {room.wing}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${room.status === 'available' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
                    {room.status}
                  </span>
                </div>
                {room.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.amenities.slice(0, 3).map((a) => (
                      <span key={a} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                    {room.amenities.length > 3 && <span className="text-xs text-gray-400">+{room.amenities.length - 3}</span>}
                  </div>
                )}
                {room.isEmergencyWard && (
                  <span className="mt-2 inline-block text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">Emergency ward</span>
                )}
                {room.checkInDate && (
                  <p className="text-xs text-gray-500 mt-2">Checked in: {room.checkInDate} · Expected out: {room.expectedCheckOutDate}</p>
                )}
                {room.dailyRate && (
                  <p className="text-xs text-gray-500 mt-1 font-mono">₹{room.dailyRate.toLocaleString('en-IN')}/day</p>
                )}
                {room.status === 'occupied' && (
                  <div className="mt-3">
                    <Button size="sm" variant="secondary"
                      onClick={() => handleCheckOut(room.id, room.roomNumber)}
                      disabled={checkingOut === room.id}>
                      {checkingOut === room.id ? 'Checking out...' : 'Check out'}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}