import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BedDouble, Plus } from 'lucide-react';
import { getWardById, getRoomsForWard, getBedsForWard, getAdmissions } from '../../services/wardService';
import type { Ward, Bed, Admission } from '../../types/ward';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

interface Room {
  room_id: string;
  room_number: string;
  room_type: string;
  total_beds: number;
  available_beds: number;
}

const BED_STYLES: Record<string, string> = {
  Available: 'border-green-200 bg-green-50 dark:bg-green-900/20',
  Occupied: 'border-red-200 bg-red-50 dark:bg-red-900/20',
  Maintenance: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20',
  Reserved: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20',
  available: 'border-green-200 bg-green-50 dark:bg-green-900/20',
  occupied: 'border-red-200 bg-red-50 dark:bg-red-900/20',
  maintenance: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20',
  reserved: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20',
};

export default function WardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ward, setWard] = useState<Ward | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getWardById(id),
      getRoomsForWard(id),
      getBedsForWard(id),
      getAdmissions({ status: 'active' }),
    ])
      .then(([w, r, b, a]) => {
        setWard(w);
        setRooms(r);
        setBeds(b);
        setAdmissions(a.filter((adm) => adm.wardId === id || adm.wardId === ''));
      })
      .catch(() => setError('Could not load ward details'))
      .finally(() => setIsLoading(false));
  }, [id]);

  function getAdmissionForBed(bedId: string) {
    return admissions.find((a) => a.bedId === bedId);
  }

  if (isLoading) return <Layout><p className="text-gray-500">Loading ward...</p></Layout>;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{ward?.wardName ?? 'Ward'}</h1>
          {ward && (
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {ward.wardType} ward
            </p>
          )}
        </div>
        <Button onClick={() => navigate(`/admissions/new?wardId=${id}`)}>
          <span className="flex items-center gap-1.5"><Plus size={16} />Admit patient</span>
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {ward && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-primary">{ward.availableBeds}</p>
            <p className="text-xs text-gray-500 mt-1">Available</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-danger">{ward.occupiedBeds}</p>
            <p className="text-xs text-gray-500 mt-1">Occupied</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">{ward.totalBeds}</p>
            <p className="text-xs text-gray-500 mt-1">Total</p>
          </div>
        </div>
      )}

      {rooms.length === 0 && (
        <Card>
          <p className="text-gray-500 text-sm text-center py-4">No rooms set up in this ward yet.</p>
        </Card>
      )}

      <div className="space-y-6">
        {rooms.map((room) => {
          const roomBeds = beds.filter((b) => b.id.startsWith(room.room_id) || true);
          return (
            <Card key={room.room_id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BedDouble size={18} className="text-primary" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Room {room.room_number}</p>
                    <p className="text-xs text-gray-500">{room.room_type} · {room.available_beds}/{room.total_beds} available</p>
                  </div>
                </div>
              </div>
              {roomBeds.length === 0 && (
                <p className="text-xs text-gray-400">No beds in this room yet.</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {beds.map((bed) => {
                  const admission = getAdmissionForBed(bed.id);
                  const bedStatus = bed.status.charAt(0).toUpperCase() + bed.status.slice(1);
                  return (
                    <div
                      key={bed.id}
                      className={`rounded-xl border p-3 ${BED_STYLES[bed.status] ?? ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {bed.bedNumber}
                        </p>
                        <StatusBadge status={bed.status.toLowerCase()} />
                      </div>
                      {admission && (
                        <button
                          onClick={() => navigate(`/patients/${admission.patientId}`)}
                          className="w-full text-left mt-1"
                        >
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                            {admission.patientName}
                          </p>
                          <p className="text-xs text-gray-400">Since {admission.admissionDate}</p>
                        </button>
                      )}
                      {!admission && (bed.status === 'Available' || bed.status === 'available') && (
                        <button
                          onClick={() => navigate(`/admissions/new?bedId=${bed.id}&wardId=${id}`)}
                          className="text-xs text-primary font-medium mt-1 hover:underline"
                        >
                          Admit patient
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}