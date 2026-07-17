import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, Calendar, Plus } from 'lucide-react';
import { getQueue } from '../../services/queueService';
import { getAppointments } from '../../services/appointmentService';
import type { QueueEntry } from '../../types/queue';
import type { Appointment } from '../../types/appointment';
import { todayString } from '../../utils/date';
import { useAuth } from '../../store/AuthContext';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Alert from '../../components/Alert';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';

export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getQueue(), getAppointments()])
      .then(([q, a]) => { setQueue(q); setAppointments(a); })
      .catch(() => setError('Could not load front-desk data'))
      .finally(() => setIsLoading(false));
  }, []);

  const waiting = queue.filter((q) => q.status === 'waiting').length;
  const beingServed = queue.filter((q) => q.status === 'called').length;
  const todaysAppointments = appointments.filter((a) => a.date === todayString());

  if (isLoading) return <p className="text-gray-500">Loading front-desk view...</p>;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Front-desk overview for today.</p>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {!error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Waiting now" value={waiting} icon={<Users size={18} />} />
            <StatCard label="Being seen" value={beingServed} icon={<UserCheck size={18} />} />
            <StatCard label="Today's appointments" value={todaysAppointments.length} icon={<Calendar size={18} />} />
          </div>
          <div className="mb-6">
            <Button onClick={() => navigate('/queue')}>
              <span className="flex items-center gap-1.5"><Plus size={16} />Check in a walk-in</span>
            </Button>
          </div>
          <Card>
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Today's appointments</h2>
            {todaysAppointments.length === 0 && <p className="text-gray-500 text-sm">No appointments scheduled for today.</p>}
            <div className="space-y-1">
              {todaysAppointments.map((a) => (
                <div key={a.id} onClick={() => navigate(`/appointments/${a.id}`)} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{a.patientName}</p>
                    <p className="text-xs text-gray-500">with {a.doctorName} at {a.time}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}